import {
  PlaywrightCrawler,
  RequestQueue,
  Request,
  PlaywrightCrawlingContext,
} from "crawlee";
import { Page } from "playwright";
import { BaseExtractor } from "../extractors/base-extractor";
import { ScrapeJobRequest, ScrapedPackage } from "../types";
import {
  PLAYWRIGHT_DEFAULT_OPTIONS,
  DEFAULT_HEADERS,
  getRandomUserAgent,
} from "../config/crawlee-config";
import { logger, createJobLogger } from "../utils/logger";
import { load } from "cheerio";

// ============================================================
// Playwright Crawler Service
// Handles JavaScript-rendered pages that require a real browser.
// Uses Crawlee's PlaywrightCrawler with stealth and session pooling.
// ============================================================

type BatchCallback = (packages: ScrapedPackage[]) => Promise<void>;

export class PlaywrightCrawlerService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    // Playwright browsers are launched on-demand per crawl
    this.isInitialized = true;
    logger.info("PlaywrightCrawlerService initialized");
  }

  async close(): Promise<void> {
    logger.info("PlaywrightCrawlerService closed");
  }

  // ============================================================
  // Main Crawl Entry Point
  // ============================================================

  /**
   * Run a Playwright-based crawl for a given job request.
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
    const BATCH_FLUSH_SIZE = 10;

    const requestQueue = await RequestQueue.open(`playwright-${request.jobId}`);
    await requestQueue.addRequest({ url: request.targetUrl, label: "LIST" });

    const crawler = new PlaywrightCrawler({
      ...PLAYWRIGHT_DEFAULT_OPTIONS,
      maxRequestsPerCrawl:
        request.maxRequests || PLAYWRIGHT_DEFAULT_OPTIONS.maxRequestsPerCrawl,
      requestQueue,

      // Pre-navigation hook — set headers and user agent
      preNavigationHooks: [
        async ({ page }: { page: Page }) => {
          await page.setExtraHTTPHeaders({
            ...DEFAULT_HEADERS,
            "User-Agent": getRandomUserAgent(),
          });
        },
      ],

      async requestHandler({
        request: req,
        page,
        enqueueLinks,
        log,
      }: PlaywrightCrawlingContext) {
        const url = req.url;
        const label = req.label || "DETAIL";

        log.info(`Processing [${label}]: ${url}`);

        // ── LIST PAGE ──────────────────────────────────────
        if (label === "LIST") {
          const content = await page.content();
          const $ = load(content);

          // Extract package links via extractor
          const links = await extractor.extractPackageLinks(url, $, page);
          jobLog.info(`Found ${links.length} package links`, { url });

          // Enqueue each package detail page
          for (const link of links) {
            if (!visitedDetailPages.has(link)) {
              visitedDetailPages.add(link);
              await requestQueue.addRequest({ url: link, label: "DETAIL" });
            }
          }

          // Also check for pagination
          await enqueueLinks({
            selector: 'a.next, .pagination .next, [aria-label="Next"]',
            label: "LIST",
          });

          // ── DETAIL PAGE ────────────────────────────────────
        } else if (label === "DETAIL") {
          const content = await page.content();
          const $ = load(content);

          const partial = await extractor.extractPackage(url, $, page);
          if (partial && partial.packageName) {
            const pkg = partial as ScrapedPackage;
            pendingBatch.push(pkg);
            allPackages.push(pkg);

            // Flush batch when threshold reached
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

    // Flush any remaining packages
    if (pendingBatch.length > 0) {
      await onBatch(pendingBatch).catch((err: Error) => {
        jobLog.error("Final batch callback failed", { error: err.message });
      });
    }

    jobLog.info("Playwright crawl complete", {
      totalPackages: allPackages.length,
    });
    return allPackages;
  }
}
