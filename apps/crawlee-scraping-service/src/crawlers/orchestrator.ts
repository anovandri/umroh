import { v4 as uuidv4 } from 'uuid';
import { Job } from 'bull';
import { logger, createJobLogger } from '../utils/logger';
import { queueManager, QueueJobData } from './queue-manager';
import { PlaywrightCrawlerService } from './playwright-crawler';
import { CheerioCrawlerService } from './cheerio-crawler';
import { getSiteExtractor, getExtractorForUrl } from '../extractors/sites';
import { getSiteConfig, detectSiteIdFromUrl } from '../config/scraper-configs';
import {
  sendPackagesToSpringBoot,
  notifyJobComplete,
  notifyJobFailed,
} from '../utils/http-client';
import { validatePackageBatch } from '../utils/data-validator';
import {
  ScrapeJobRequest,
  ScrapeJobResponse,
  JobState,
  ScrapedPackage,
  CrawlerType,
  JobPriority,
} from '../types';

// ============================================================
// Configuration
// ============================================================

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '20', 10);
const CALLBACK_URL = process.env.SPRING_BOOT_URL || 'http://localhost:8080';
const MAX_RETRIES = parseInt(process.env.MAX_JOB_RETRIES || '3', 10);

// ============================================================
// Orchestrator
// Central coordinator for all scraping operations.
//
// Responsibilities:
//  1. Accept job requests from the API layer
//  2. Enqueue jobs into Bull queue via QueueManager
//  3. Dequeue and dispatch to appropriate Crawler (Playwright/Cheerio)
//  4. Coordinate with site-specific Extractors
//  5. Validate extracted packages
//  6. Batch-send results to Spring Boot via HTTP callbacks
//  7. Track job state in memory (+ Redis via Bull)
// ============================================================

export class Orchestrator {
  private jobStateMap = new Map<string, JobState>();
  private playwrightCrawler: PlaywrightCrawlerService;
  private cheerioCrawler: CheerioCrawlerService;
  private isStarted = false;

  constructor() {
    this.playwrightCrawler = new PlaywrightCrawlerService();
    this.cheerioCrawler = new CheerioCrawlerService();
  }

  // ============================================================
  // Startup
  // ============================================================

  /**
   * Start the orchestrator — initializes crawlers and queue.
   */
  async start(): Promise<void> {
    if (this.isStarted) return;

    logger.info('Starting Orchestrator...');

    // Initialize crawlers
    await this.playwrightCrawler.initialize();
    await this.cheerioCrawler.initialize();

    // Register job processor with queue manager
    await queueManager.initialize(
      async (jobData: QueueJobData, bullJob: Job<QueueJobData>) => {
        await this.processJob(jobData, bullJob);
      },
    );

    this.isStarted = true;
    logger.info('Orchestrator started successfully', {
      queueConcurrency: queueManager.concurrency,
      batchSize: BATCH_SIZE,
    });
  }

  /**
   * Graceful shutdown.
   */
  async stop(): Promise<void> {
    logger.info('Stopping Orchestrator...');
    await queueManager.close();
    await this.playwrightCrawler.close();
    await this.cheerioCrawler.close();
    logger.info('Orchestrator stopped');
  }

  // ============================================================
  // Job Submission
  // ============================================================

  /**
   * Submit a new scraping job.
   * Validates the request, creates job state, enqueues into Bull.
   *
   * @param request - The scraping job request from the API
   * @returns Job response with jobId and initial status
   */
  async submitJob(request: ScrapeJobRequest): Promise<ScrapeJobResponse> {
    const jobId = request.jobId || uuidv4();
    const priority = request.priority || 'NORMAL';

    // Auto-detect siteId if not provided
    const siteId = request.siteId || detectSiteIdFromUrl(request.targetUrl) || 'generic';
    const siteConfig = getSiteConfig(siteId);
    const siteName = siteConfig?.siteName || siteId;

    logger.info('Job submitted', {
      jobId,
      targetUrl: request.targetUrl,
      siteId,
      priority,
    });

    // Create initial job state
    const jobState: JobState = {
      jobId,
      status: 'QUEUED',
      request: { ...request, jobId, siteId },
      createdAt: new Date().toISOString(),
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      packagesFound: 0,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
    };

    this.jobStateMap.set(jobId, jobState);

    // Enqueue into Bull
    await queueManager.enqueue(jobId, { ...request, jobId, siteId }, priority as JobPriority);

    return {
      jobId,
      status: 'QUEUED',
      message: `Job queued for site: ${siteName}`,
    };
  }

  // ============================================================
  // Job Processing (called by QueueManager)
  // ============================================================

  /**
   * Process a dequeued job.
   * This is the main scraping execution path.
   */
  private async processJob(
    jobData: QueueJobData,
    bullJob: Job<QueueJobData>,
  ): Promise<void> {
    const { jobId, request } = jobData;
    const jobLog = createJobLogger({ jobId, siteId: request.siteId || 'unknown' });

    // Update job state to RUNNING
    this.updateJobState(jobId, {
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
    });

    const startTime = Date.now();
    const allPackages: ScrapedPackage[] = [];

    try {
      jobLog.info('Job processing started', { targetUrl: request.targetUrl });

      // Determine which crawler to use
      const crawlerType = this.resolveCrawlerType(request);
      jobLog.info(`Using ${crawlerType} crawler`);

      // Get extractor
      const extractor = request.siteId
        ? getSiteExtractor(request.siteId)
        : getExtractorForUrl(request.targetUrl);

      // Execute crawl
      const packages = crawlerType === 'PLAYWRIGHT'
        ? await this.playwrightCrawler.crawl(request, extractor, (batch) => {
          return this.sendBatch(jobId, request.siteId || 'generic', batch, false, allPackages);
        })
        : await this.cheerioCrawler.crawl(request, extractor, (batch) => {
          return this.sendBatch(jobId, request.siteId || 'generic', batch, false, allPackages);
        });

      allPackages.push(...packages);

      const processingTimeMs = Date.now() - startTime;

      // Send final batch (if any remaining)
      const validPackages = validatePackageBatch(allPackages, jobId);

      if (validPackages.length > 0) {
        await this.sendBatch(jobId, request.siteId || 'generic', validPackages, true, []);
      } else {
        // Still need to send a final notification even with 0 packages
        await this.sendFinalBatch(jobId, request.siteId || 'generic', validPackages);
      }

      // Update job state
      this.updateJobState(jobId, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        packagesFound: validPackages.length,
        totalRequests: request.maxRequests || 0,
      });

      // Notify Spring Boot job completed
      await notifyJobComplete({
        jobId,
        status: 'COMPLETED',
        totalPackages: validPackages.length,
        totalRequests: this.getJobState(jobId)?.totalRequests || 0,
        processingTimeMs,
        completedAt: new Date().toISOString(),
      });

      jobLog.info('Job completed', {
        packages: validPackages.length,
        processingTimeMs,
      });

      // Report progress to Bull
      await bullJob.progress(100);

    } catch (err) {
      const error = err as Error;
      const processingTimeMs = Date.now() - startTime;

      jobLog.error('Job failed', {
        error: error.message,
        stack: error.stack,
        processingTimeMs,
      });

      this.updateJobState(jobId, {
        status: 'FAILED',
        failedAt: new Date().toISOString(),
        errors: [
          {
            url: request.targetUrl,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      // Notify Spring Boot job failed
      await notifyJobFailed({
        jobId,
        status: 'FAILED',
        error: error.message,
        failedAt: new Date().toISOString(),
        retryCount: bullJob.attemptsMade,
      }).catch((callbackErr) => {
        jobLog.error('Failed to send failure callback', {
          error: (callbackErr as Error).message,
        });
      });

      // Rethrow so Bull retries the job
      throw error;
    }
  }

  // ============================================================
  // Batch Sending
  // ============================================================

  /**
   * Send a batch of scraped packages to Spring Boot.
   * This is called periodically during crawling for real-time streaming.
   */
  private async sendBatch(
    jobId: string,
    siteId: string,
    packages: ScrapedPackage[],
    isFinal: boolean,
    accumulator: ScrapedPackage[],
  ): Promise<void> {
    if (packages.length === 0) return;

    const jobState = this.getJobState(jobId);
    const batchNumber = Math.ceil((jobState?.packagesFound || 0) / BATCH_SIZE) + 1;

    accumulator.push(...packages);

    if (accumulator.length >= BATCH_SIZE || isFinal) {
      const toSend = accumulator.splice(0, accumulator.length);
      const validated = validatePackageBatch(toSend, jobId);

      if (validated.length === 0) return;

      await sendPackagesToSpringBoot({
        jobId,
        siteId,
        siteName: getSiteConfig(siteId)?.siteName || siteId,
        packages: validated,
        batchNumber,
        isFinalBatch: isFinal,
        totalPackagesInJob: (jobState?.packagesFound || 0) + validated.length,
        scrapedAt: new Date().toISOString(),
        processingTimeMs: 0,
      });

      this.updateJobState(jobId, {
        packagesFound: (jobState?.packagesFound || 0) + validated.length,
      });
    }
  }

  private async sendFinalBatch(
    jobId: string,
    siteId: string,
    packages: ScrapedPackage[],
  ): Promise<void> {
    await sendPackagesToSpringBoot({
      jobId,
      siteId,
      siteName: getSiteConfig(siteId)?.siteName || siteId,
      packages,
      batchNumber: 1,
      isFinalBatch: true,
      totalPackagesInJob: packages.length,
      scrapedAt: new Date().toISOString(),
      processingTimeMs: 0,
    });
  }

  // ============================================================
  // Crawler Type Resolution
  // ============================================================

  /**
   * Decide which crawler to use for a given request.
   * Priority: explicit request.crawlerType → site config → heuristic → default CHEERIO
   */
  private resolveCrawlerType(request: ScrapeJobRequest): CrawlerType {
    if (request.crawlerType && request.crawlerType !== 'AUTO') {
      return request.crawlerType;
    }

    const siteConfig = getSiteConfig(request.siteId || '');
    if (siteConfig && siteConfig.crawlerType !== 'AUTO') {
      return siteConfig.crawlerType;
    }

    // Heuristic: sites known to use heavy JS frameworks need Playwright
    const jsHeavySites = ['react', 'vue', 'angular', 'next', 'nuxt'];
    const url = request.targetUrl.toLowerCase();
    if (jsHeavySites.some((fw) => url.includes(fw))) {
      return 'PLAYWRIGHT';
    }

    return 'CHEERIO'; // Default — lighter, faster
  }

  // ============================================================
  // Job State Management
  // ============================================================

  getJobState(jobId: string): JobState | undefined {
    return this.jobStateMap.get(jobId);
  }

  getAllJobStates(): JobState[] {
    return Array.from(this.jobStateMap.values());
  }

  private updateJobState(jobId: string, updates: Partial<JobState>): void {
    const existing = this.jobStateMap.get(jobId);
    if (existing) {
      this.jobStateMap.set(jobId, { ...existing, ...updates });
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const state = this.getJobState(jobId);
    if (!state || state.status === 'RUNNING') return false;

    const cancelled = await queueManager.cancel(jobId);
    if (cancelled) {
      this.updateJobState(jobId, { status: 'CANCELLED' });
    }
    return cancelled;
  }
}

// Export singleton instance
export const orchestrator = new Orchestrator();
