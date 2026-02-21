import { Router, Request, Response } from 'express';
import { orchestrator } from '../crawlers/orchestrator';
import { jobManager } from './job-manager';
import { ScrapeJobRequest, ApiResponse, JobStatus } from '../types';
import { logger } from '../utils/logger';

// ============================================================
// Express Routes
// All routes are prefixed with /api (registered in server.ts)
// ============================================================

export const router = Router();

// ============================================================
// Health & Status
// ============================================================

/**
 * GET /api/health
 * Health check endpoint for Docker/K8s probes.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'crawlee-scraping-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * GET /api/status
 * Service status including queue stats.
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const queueStats = await jobManager.getQueueStats();
    const activeJobs = jobManager.getAllJobs('RUNNING').length;
    const totalJobs = jobManager.getAllJobs().length;

    const response: ApiResponse = {
      success: true,
      data: {
        service: 'crawlee-scraping-service',
        queue: queueStats,
        jobs: {
          total: totalJobs,
          active: activeJobs,
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

// ============================================================
// Job Management
// ============================================================

/**
 * POST /api/jobs
 * Submit a new scraping job.
 *
 * Body: ScrapeJobRequest
 * Returns: ScrapeJobResponse
 */
router.post('/jobs', async (req: Request, res: Response) => {
  try {
    const request = req.body as ScrapeJobRequest;

    // Basic validation
    if (!request.targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'targetUrl is required',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Validate URL format
    try {
      new URL(request.targetUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'targetUrl must be a valid URL',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const jobResponse = await orchestrator.submitJob(request);

    logger.info('Job submitted via API', {
      jobId: jobResponse.jobId,
      targetUrl: request.targetUrl,
      remoteIp: req.ip,
    });

    return res.status(202).json({
      success: true,
      data: jobResponse,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (err) {
    logger.error('Failed to submit job', { error: (err as Error).message });
    return res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

/**
 * GET /api/jobs
 * List all jobs, optionally filtered by status.
 *
 * Query params:
 *   status?: JobStatus
 */
router.get('/jobs', (req: Request, res: Response) => {
  const statusFilter = req.query['status'] as JobStatus | undefined;
  const jobs = jobManager.getAllJobs(statusFilter);

  res.json({
    success: true,
    data: jobs,
    total: jobs.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/jobs/:jobId
 * Get the state of a specific job.
 */
router.get('/jobs/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: `Job ${jobId} not found`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  return res.json({
    success: true,
    data: job,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

/**
 * DELETE /api/jobs/:jobId
 * Cancel a queued job.
 */
router.delete('/jobs/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const result = await jobManager.cancelJob(jobId);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.message,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  return res.json({
    success: true,
    message: result.message,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

/**
 * POST /api/jobs/:jobId/retry
 * Retry a failed job.
 */
router.post('/jobs/:jobId/retry', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const result = await jobManager.retryJob(jobId);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.message,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  return res.json({
    success: true,
    message: result.message,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// ============================================================
// Queue Management
// ============================================================

/**
 * GET /api/queue/stats
 * Get queue depth and job counts.
 */
router.get('/queue/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await jobManager.getQueueStats();
    return res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

/**
 * POST /api/queue/pause
 * Pause the job queue (stops picking up new jobs).
 */
router.post('/queue/pause', async (_req: Request, res: Response) => {
  await jobManager.pauseQueue();
  return res.json({
    success: true,
    message: 'Queue paused',
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

/**
 * POST /api/queue/resume
 * Resume a paused queue.
 */
router.post('/queue/resume', async (_req: Request, res: Response) => {
  await jobManager.resumeQueue();
  return res.json({
    success: true,
    message: 'Queue resumed',
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

/**
 * POST /api/queue/clean
 * Remove old completed/failed jobs.
 *
 * Body: { gracePeriodMs?: number }
 */
router.post('/queue/clean', async (req: Request, res: Response) => {
  const gracePeriodMs = (req.body as { gracePeriodMs?: number }).gracePeriodMs || 0;
  await jobManager.cleanQueue(gracePeriodMs);
  return res.json({
    success: true,
    message: 'Queue cleaned',
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});
