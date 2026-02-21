import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from './logger';
import {
  SpringBootCallback,
  SpringBootJobComplete,
  SpringBootJobFailed,
} from '../types';

// ============================================================
// Spring Boot HTTP Client
// Handles all callbacks from Crawlee service → Spring Boot
// ============================================================

const SPRING_BOOT_BASE_URL = process.env.SPRING_BOOT_URL || 'http://localhost:8080';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'dev-service-token';
const CALLBACK_TIMEOUT_MS = parseInt(process.env.CALLBACK_TIMEOUT_MS || '10000', 10);
const CALLBACK_MAX_RETRIES = parseInt(process.env.CALLBACK_MAX_RETRIES || '3', 10);

// ============================================================
// Axios Instance with defaults
// ============================================================

export const springBootClient: AxiosInstance = axios.create({
  baseURL: SPRING_BOOT_BASE_URL,
  timeout: CALLBACK_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'X-Service-Token': SERVICE_TOKEN,
    'X-Source-Service': 'crawlee-scraping-service',
  },
});

// ============================================================
// Request/Response Interceptors for logging
// ============================================================

springBootClient.interceptors.request.use(
  (config) => {
    logger.debug('Calling Spring Boot', {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL}${config.url}`,
    });
    return config;
  },
  (error) => {
    logger.error('Spring Boot request failed to send', { error: error.message });
    return Promise.reject(error);
  },
);

springBootClient.interceptors.response.use(
  (response: AxiosResponse) => {
    logger.debug('Spring Boot response received', {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    logger.error('Spring Boot callback failed', {
      status,
      url,
      message: error.message,
    });
    return Promise.reject(error);
  },
);

// ============================================================
// Callback Helper with retry logic
// ============================================================

async function callWithRetry<T>(
  fn: () => Promise<AxiosResponse<T>>,
  retries: number = CALLBACK_MAX_RETRIES,
  delayMs: number = 1000,
): Promise<AxiosResponse<T>> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      const isLastAttempt = attempt === retries;

      if (!isLastAttempt) {
        const backoff = delayMs * attempt;
        logger.warn(`Callback attempt ${attempt}/${retries} failed, retrying in ${backoff}ms`, {
          error: (err as Error).message,
        });
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw lastError;
}

// ============================================================
// Typed Callback Functions
// ============================================================

/**
 * Send scraped packages batch to Spring Boot for processing.
 * Spring Boot endpoint: POST /api/scraping/receive
 */
export async function sendPackagesToSpringBoot(
  payload: SpringBootCallback,
): Promise<void> {
  await callWithRetry(() =>
    springBootClient.post('/api/scraping/receive', payload),
  );

  logger.info('Packages sent to Spring Boot', {
    jobId: payload.jobId,
    packageCount: payload.packages.length,
    batchNumber: payload.batchNumber,
    isFinal: payload.isFinalBatch,
  });
}

/**
 * Notify Spring Boot that a job has completed successfully.
 * Spring Boot endpoint: POST /api/scraping/complete
 */
export async function notifyJobComplete(
  payload: SpringBootJobComplete,
): Promise<void> {
  await callWithRetry(() =>
    springBootClient.post('/api/scraping/complete', payload),
  );

  logger.info('Job complete notification sent', {
    jobId: payload.jobId,
    totalPackages: payload.totalPackages,
  });
}

/**
 * Notify Spring Boot that a job has failed.
 * Spring Boot endpoint: POST /api/scraping/failed
 */
export async function notifyJobFailed(
  payload: SpringBootJobFailed,
): Promise<void> {
  await callWithRetry(() =>
    springBootClient.post('/api/scraping/failed', payload),
  );

  logger.error('Job failed notification sent', {
    jobId: payload.jobId,
    error: payload.error,
  });
}
