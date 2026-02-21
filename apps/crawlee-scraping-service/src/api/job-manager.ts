import { orchestrator } from '../crawlers/orchestrator';
import { queueManager } from '../crawlers/queue-manager';
import { JobState, JobStatus } from '../types';
import { logger } from '../utils/logger';

// ============================================================
// Job Manager
// In-memory job state management + queue bridge.
// Provides a clean interface for the API routes to manage jobs.
// ============================================================

export class JobManager {
  // ============================================================
  // Job Queries
  // ============================================================

  /**
   * Get the current state of a specific job.
   */
  getJob(jobId: string): JobState | undefined {
    return orchestrator.getJobState(jobId);
  }

  /**
   * Get all jobs, optionally filtered by status.
   */
  getAllJobs(statusFilter?: JobStatus): JobState[] {
    const all = orchestrator.getAllJobStates();
    if (!statusFilter) return all;
    return all.filter((j) => j.status === statusFilter);
  }

  /**
   * Get queue statistics.
   */
  async getQueueStats(): Promise<{
    depth: number;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const counts = await queueManager.getJobCounts();
    return {
      depth: counts.waiting + counts.delayed,
      ...counts,
    };
  }

  // ============================================================
  // Job Actions
  // ============================================================

  /**
   * Cancel a queued (not running) job.
   */
  async cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const job = this.getJob(jobId);

    if (!job) {
      return { success: false, message: `Job ${jobId} not found` };
    }

    if (job.status === 'RUNNING') {
      return { success: false, message: 'Cannot cancel a running job' };
    }

    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      return { success: false, message: `Job is already ${job.status}` };
    }

    const cancelled = await orchestrator.cancelJob(jobId);
    return cancelled
      ? { success: true, message: 'Job cancelled' }
      : { success: false, message: 'Could not cancel job' };
  }

  /**
   * Retry a failed job.
   */
  async retryJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const job = this.getJob(jobId);

    if (!job) {
      return { success: false, message: `Job ${jobId} not found` };
    }

    if (job.status !== 'FAILED') {
      return { success: false, message: `Job is not in FAILED state (current: ${job.status})` };
    }

    if (job.retryCount >= job.maxRetries) {
      return { success: false, message: `Job has exceeded max retries (${job.maxRetries})` };
    }

    const retried = await queueManager.retryJob(jobId);
    return retried
      ? { success: true, message: 'Job queued for retry' }
      : { success: false, message: 'Could not retry job' };
  }

  /**
   * Pause the processing queue.
   */
  async pauseQueue(): Promise<void> {
    await queueManager.pause();
    logger.info('Queue paused via JobManager');
  }

  /**
   * Resume the processing queue.
   */
  async resumeQueue(): Promise<void> {
    await queueManager.resume();
    logger.info('Queue resumed via JobManager');
  }

  /**
   * Clean old completed/failed jobs from the queue.
   */
  async cleanQueue(gracePeriodMs: number = 0): Promise<void> {
    await queueManager.clean(gracePeriodMs);
    logger.info('Queue cleaned via JobManager');
  }
}

// Export singleton
export const jobManager = new JobManager();
