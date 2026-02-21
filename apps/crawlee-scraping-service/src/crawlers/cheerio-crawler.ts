import {
  CheerioCrawler,
  RequestQueue,
  Request,
  CheerioCrawlingContext,
} from "crawlee";
import { CheerioAPI } from "cheerio";
import { BaseExtractor } from "../extractors/base-extractor";
import { ScrapeJobRequest, ScrapedPackage } from "../types";
import {
  CHEERIO_DEFAULT_OPTIONS,
  DEFAULT_HEADERS,
  getRandomUserAgent,
} from "../config/crawlee-config";
import { logger, createJobLogger } from "../utils/logger";

// ============================================================
// Cheerio Crawler Service
// Lightweight HTML-only crawler for sites that don't require JS.
// Much faster and less resource-intensive than Playwright.
// Uses Crawlee's CheerioCrawler.
// ============================================================

type BatchCallback = (packages: ScrapedPackage[]) => Promise<void>;

export class CheerioCrawlerService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    logger.info("CheerioCrawlerService initialized");
  }

  async close(): Promise<void> {
    logger.info("CheerioCrawlerService closed");
  }

  // ============================================================
  // Main Crawl Entry Point
  // ============================================================

  /**
   * Run a Cheerio-based crawl for a given job request.
   *
   * @param request - The scraping job request
   * @param extractor - Site-specific or generic extractor
   * @param onBatch - Callback invoked when a batch of packages is ready
   * @returns All scraped packages from this crawl run
   */
  async crawl(
    request: ScrapeJobRequest,
    extractor: BaseExtractor,
    onBatch: BatchCallback,
  ): Promise<ScrapedPackage[]> {
    const jobLog = createJobLogger({
      jobId: request.jobId || "unknown",
      siteId: request.siteId || "generic",
    });

    const allPackages: ScrapedPackage[] = [];
    const visitedDetailPages = new Set<string>();
    const pendingBatch: ScrapedPackage[] = [];
    const BATCH_FLUSH_SIZE = 15; // Cheerio is faster, larger batches are fine

    const requestQueue = await RequestQueue.open(`cheerio-${request.jobId}`);
    await requestQueue.addRequest({ url: request.targetUrl, label: "LIST" });

    const crawler = new CheerioCrawler({
      ...CHEERIO_DEFAULT_OPTIONS,
      maxRequestsPerCrawl:
        request.maxRequests || CHEERIO_DEFAULT_OPTIONS.maxRequestsPerCrawl,
      requestQueue,

      // Custom headers
      additionalMimeTypes: ["application/json"],
      preNavigationHooks: [
        async ({ request: req }: { request: Request }) => {
          req.headers = {
            ...DEFAULT_HEADERS,
            "User-Agent": getRandomUserAgent(),
          };
        },
      ],

      async requestHandler({
        request: req,
        $,
        enqueueLinks,
        log,
      }: CheerioCrawlingContext) {
        const url = req.url;
        const label = req.label || "DETAIL";
        const cheerio = $ as unknown as CheerioAPI;

        log.info(`Processing [${label}]: ${url}`);

        // ── LIST PAGE ──────────────────────────────────────
        if (label === "LIST") {
          // Use extractor to discover package links
          const links = await extractor.extractPackageLinks(url, cheerio);
          jobLog.info(`Found ${links.length} package links`, { url });

          for (const link of links) {
            if (!visitedDetailPages.has(link)) {
              visitedDetailPages.add(link);
              await requestQueue.addRequest({ url: link, label: "DETAIL" });
            }
          }

          // Enqueue next page (pagination)
          await enqueueLinks({
            selector:
              'a.next, .pagination .next, [aria-label="Next"], .next-page',
            label: "LIST",
          });

          // ── DETAIL PAGE ────────────────────────────────────
        } else if (label === "DETAIL") {
          const partial = await extractor.extractPackage(url, cheerio);

          if (partial && partial.packageName) {
            const pkg = partial as ScrapedPackage;
            pendingBatch.push(pkg);
            allPackages.push(pkg);

            if (pendingBatch.length >= BATCH_FLUSH_SIZE) {
              const toFlush = pendingBatch.splice(0, pendingBatch.length);
              await onBatch(toFlush).catch((err: Error) => {
                jobLog.error("Batch callback failed", { error: err.message });
              });
            }
          }
        }
      },

      failedRequestHandler(inputs: { request: Request }) {
        jobLog.error("Request failed", {
          url: inputs.request.url,
          retries: inputs.request.retryCount,
        });
      },
    });

    await crawler.run();

    // Flush remaining
    if (pendingBatch.length > 0) {
      await onBatch(pendingBatch).catch((err: Error) => {
        jobLog.error("Final batch callback failed", { error: err.message });
      });
    }

    jobLog.info("Cheerio crawl complete", {
      totalPackages: allPackages.length,
    });
    return allPackages;
  }
}
