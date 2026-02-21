import axios, { AxiosInstance, AxiosResponse } from "axios";
import { logger } from "./logger";
import {
  SpringBootCallback,
  SpringBootJobComplete,
  SpringBootJobFailed,
} from "../types";

// ============================================================
// Spring Boot HTTP Client
// Handles all callbacks from Crawlee service → Spring Boot
// ============================================================

const SPRING_BOOT_BASE_URL =
  process.env.SPRING_BOOT_URL || "http://localhost:8080";
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || "dev-service-token";
const CALLBACK_TIMEOUT_MS = parseInt(
  process.env.CALLBACK_TIMEOUT_MS || "10000",
  10,
);
const CALLBACK_MAX_RETRIES = parseInt(
  process.env.CALLBACK_MAX_RETRIES || "3",
  10,
);

// ============================================================
// Axios Instance with defaults
// ============================================================

export const springBootClient: AxiosInstance = axios.create({
  baseURL: SPRING_BOOT_BASE_URL,
  timeout: CALLBACK_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    "X-Service-Token": SERVICE_TOKEN,
    "X-Source-Service": "crawlee-scraping-service",
  },
});

// ============================================================
// Request/Response Interceptors for logging
// ============================================================

springBootClient.interceptors.request.use(
  (config) => {
    logger.debug("Calling Spring Boot", {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL}${config.url}`,
    });
    return config;
  },
  (error) => {
    logger.error("Spring Boot request failed to send", {
      error: error.message,
    });
    return Promise.reject(error);
  },
);

springBootClient.interceptors.response.use(
  (response: AxiosResponse) => {
    logger.debug("Spring Boot response received", {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    logger.error("Spring Boot callback failed", {
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
        logger.warn(
          `Callback attempt ${attempt}/${retries} failed, retrying in ${backoff}ms`,
          {
            error: (err as Error).message,
          },
        );
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
  // ── Compact summary (always visible at info level) ──────────
  logger.info("→ Sending batch to Spring Boot", {
    endpoint: `POST ${SPRING_BOOT_BASE_URL}/api/scraping/receive`,
    jobId: payload.jobId,
    siteId: payload.siteId,
    batchNumber: payload.batchNumber,
    isFinalBatch: payload.isFinalBatch,
    packageCount: payload.packages.length,
    packageNames: payload.packages.map((p) => p.packageName),
  });

  // ── Full payload dump (only visible when LOG_LEVEL=debug) ───
  logger.debug("→ Full callback payload /api/scraping/receive", {
    payload: JSON.stringify(payload, null, 2),
  });

  // ── Per-package departure date summary (debug) ──────────────
  logger.debug("→ Departure dates per package", {
    packages: payload.packages.map((p) => ({
      id: p.id,
      packageName: p.packageName,
      departureDates: p.departureDates.map((d) => ({
        date: d.date,
        available: d.available,
        seatsLeft: d.seatsLeft,
        priceQuad: d.priceQuad,
        priceTriple: d.priceTriple,
        priceDouble: d.priceDouble,
      })),
    })),
  });

  await callWithRetry(() =>
    springBootClient.post("/api/scraping/receive", payload),
  );

  logger.info("✓ Batch acknowledged by Spring Boot", {
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
  logger.info("→ Sending job complete to Spring Boot", {
    endpoint: `POST ${SPRING_BOOT_BASE_URL}/api/scraping/complete`,
    jobId: payload.jobId,
    totalPackages: payload.totalPackages,
    processingTimeMs: payload.processingTimeMs,
  });

  logger.debug("→ Full callback payload /api/scraping/complete", {
    payload: JSON.stringify(payload, null, 2),
  });

  await callWithRetry(() =>
    springBootClient.post("/api/scraping/complete", payload),
  );

  logger.info("✓ Job complete acknowledged by Spring Boot", {
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
  logger.error("→ Sending job failed to Spring Boot", {
    endpoint: `POST ${SPRING_BOOT_BASE_URL}/api/scraping/failed`,
    jobId: payload.jobId,
    error: payload.error,
    retryCount: payload.retryCount,
  });

  logger.debug("→ Full callback payload /api/scraping/failed", {
    payload: JSON.stringify(payload, null, 2),
  });

  await callWithRetry(() =>
    springBootClient.post("/api/scraping/failed", payload),
  );

  logger.error("✓ Job failed acknowledged by Spring Boot", {
    jobId: payload.jobId,
    error: payload.error,
  });
}
