import Bull, { Job, Queue, QueueOptions } from 'bull';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';
import { ScrapeJobRequest, JobPriority } from '../types';

// ============================================================
// Configuration
// ============================================================

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = process.env.SCRAPE_QUEUE_NAME || 'scrape-jobs';
const MAX_JOB_ATTEMPTS = parseInt(process.env.MAX_JOB_ATTEMPTS || '3', 10);
const JOB_BACKOFF_DELAY_MS = parseInt(process.env.JOB_BACKOFF_DELAY_MS || '5000', 10);
const JOB_TTL_MS = parseInt(process.env.JOB_TTL_MS || String(24 * 60 * 60 * 1000), 10); // 24h
const CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || '3', 10);

// ============================================================
// Priority Mapping
// Bull uses numeric priority: lower = higher priority
// ============================================================

const PRIORITY_MAP: Record<JobPriority, number> = {
  CRITICAL: 1,
  HIGH: 5,
  NORMAL: 10,
  LOW: 20,
};

// ============================================================
// Job Data Shape (stored in Bull queue)
// ============================================================

export interface QueueJobData {
  jobId: string;
  request: ScrapeJobRequest;
  enqueuedAt: string;
}

// ============================================================
// Queue Manager Class
// Manages the Bull queue lifecycle for scraping jobs.
// ============================================================

export class QueueManager {
  private queue: Queue<QueueJobData>;
  private redisClient: IORedis;
  private isInitialized = false;

  // Callback invoked by Orchestrator when a job is dequeued
  private jobProcessor?: (jobData: QueueJobData, bullJob: Job<QueueJobData>) => Promise<void>;

  constructor() {
    // Create Redis connection
    this.redisClient = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required for Bull
      enableReadyCheck: false,
    });

    const queueOptions: QueueOptions = {
      createClient: (type) => {
        switch (type) {
          case 'client':
            return new IORedis(REDIS_URL, {
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            });
          case 'subscriber':
            return new IORedis(REDIS_URL, {
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            });
          case 'bclient':
            return new IORedis(REDIS_URL, {
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            });
          default:
            return this.redisClient;
        }
      },
      defaultJobOptions: {
        attempts: MAX_JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: JOB_BACKOFF_DELAY_MS,
        },
        removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
        removeOnFail: { count: 200 },     // Keep last 200 failed jobs
        timeout: JOB_TTL_MS,
      },
    };

    this.queue = new Bull<QueueJobData>(QUEUE_NAME, queueOptions);
    this.attachEventListeners();
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  /**
   * Initialize the queue and register the job processor function.
   * Must be called before the queue starts processing.
   */
  async initialize(
    processor: (jobData: QueueJobData, bullJob: Job<QueueJobData>) => Promise<void>,
  ): Promise<void> {
    if (this.isInitialized) return;

    this.jobProcessor = processor;

    // Register processor with Bull — this starts consuming the queue
    this.queue.process(CONCURRENCY, async (bullJob: Job<QueueJobData>) => {
      logger.info('Processing job from queue', {
        jobId: bullJob.data.jobId,
        bullJobId: bullJob.id,
        attempt: bullJob.attemptsMade + 1,
        maxAttempts: bullJob.opts.attempts,
      });

      if (!this.jobProcessor) {
        throw new Error('Job processor not registered');
      }

      await this.jobProcessor(bullJob.data, bullJob);
    });

    this.isInitialized = true;
    logger.info('QueueManager initialized', {
      queueName: QUEUE_NAME,
      concurrency: CONCURRENCY,
      redis: REDIS_URL,
    });
  }

  // ============================================================
  // Queue Operations
  // ============================================================

  /**
   * Add a new scraping job to the queue.
   * Returns the Bull job ID.
   */
  async enqueue(
    jobId: string,
    request: ScrapeJobRequest,
    priority: JobPriority = 'NORMAL',
  ): Promise<string> {
    const jobData: QueueJobData = {
      jobId,
      request,
      enqueuedAt: new Date().toISOString(),
    };

    const bullJob = await this.queue.add(jobData, {
      jobId: `scrape-${jobId}`, // Deterministic Bull job ID
      priority: PRIORITY_MAP[priority],
    });

    logger.info('Job enqueued', {
      jobId,
      bullJobId: bullJob.id,
      priority,
      targetUrl: request.targetUrl,
    });

    return String(bullJob.id);
  }

  /**
   * Cancel a job by its jobId.
   * Works for jobs that are waiting (not yet running).
   */
  async cancel(jobId: string): Promise<boolean> {
    const bullJobId = `scrape-${jobId}`;
    const bullJob = await this.queue.getJob(bullJobId);

    if (!bullJob) {
      logger.warn('Job not found for cancellation', { jobId });
      return false;
    }

    const state = await bullJob.getState();

    if (state === 'waiting' || state === 'delayed') {
      await bullJob.remove();
      logger.info('Job cancelled', { jobId, state });
      return true;
    }

    logger.warn('Cannot cancel job in current state', { jobId, state });
    return false;
  }

  /**
   * Get the current queue depth (waiting + delayed jobs).
   */
  async getQueueDepth(): Promise<number> {
    const counts = await this.queue.getJobCounts();
    return counts.waiting + counts.delayed;
  }

  /**
   * Get full job counts by state.
   */
  async getJobCounts(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return this.queue.getJobCounts();
  }

  /**
   * Retry a failed job by jobId.
   */
  async retryJob(jobId: string): Promise<boolean> {
    const bullJobId = `scrape-${jobId}`;
    const bullJob = await this.queue.getJob(bullJobId);

    if (!bullJob) {
      logger.warn('Job not found for retry', { jobId });
      return false;
    }

    await bullJob.retry();
    logger.info('Job queued for retry', { jobId });
    return true;
  }

  /**
   * Clear all completed and failed jobs from the queue.
   * Useful for maintenance/cleanup operations.
   */
  async clean(gracePeriodMs: number = 0): Promise<void> {
    await this.queue.clean(gracePeriodMs, 'completed');
    await this.queue.clean(gracePeriodMs, 'failed');
    logger.info('Queue cleaned');
  }

  /**
   * Pause the queue — no new jobs will be picked up.
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    logger.info('Queue paused');
  }

  /**
   * Resume a paused queue.
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    logger.info('Queue resumed');
  }

  /**
   * Graceful shutdown — wait for active jobs to complete.
   */
  async close(): Promise<void> {
    logger.info('Closing queue...');
    await this.queue.close();
    await this.redisClient.quit();
    logger.info('Queue closed');
  }

  // ============================================================
  // Event Listeners
  // ============================================================

  private attachEventListeners(): void {
    this.queue.on('completed', (job: Job<QueueJobData>) => {
      logger.info('Bull job completed', {
        jobId: job.data.jobId,
        bullJobId: job.id,
      });
    });

    this.queue.on('failed', (job: Job<QueueJobData>, err: Error) => {
      logger.error('Bull job failed', {
        jobId: job.data.jobId,
        bullJobId: job.id,
        attempt: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: err.message,
      });
    });

    this.queue.on('stalled', (job: Job<QueueJobData>) => {
      logger.warn('Bull job stalled — will be retried', {
        jobId: job.data.jobId,
        bullJobId: job.id,
      });
    });

    this.queue.on('error', (err: Error) => {
      logger.error('Queue error', { error: err.message, stack: err.stack });
    });

    this.queue.on('waiting', (jobId: string) => {
      logger.debug('Job waiting', { bullJobId: jobId });
    });

    this.queue.on('active', (job: Job<QueueJobData>) => {
      logger.debug('Job started', {
        jobId: job.data.jobId,
        bullJobId: job.id,
      });
    });
  }

  // ============================================================
  // Getters
  // ============================================================

  get bullQueue(): Queue<QueueJobData> {
    return this.queue;
  }

  get concurrency(): number {
    return CONCURRENCY;
  }
}

// Export singleton instance
export const queueManager = new QueueManager();
