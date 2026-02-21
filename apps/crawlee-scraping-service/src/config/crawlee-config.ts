import { Configuration } from "crawlee";

// ============================================================
// Global Crawlee Configuration
// ============================================================

export const CRAWLEE_DEFAULT_OPTIONS = {
  // Request queue
  maxRequestsPerCrawl: parseInt(
    process.env.MAX_REQUESTS_PER_CRAWL || "500",
    10,
  ),
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || "5", 10),
  minConcurrency: 1,

  // Timeouts (shared — no requestTimeoutSecs here; it's HTTP-only, not valid for PlaywrightCrawler)
  navigationTimeoutSecs: parseInt(
    process.env.NAVIGATION_TIMEOUT_SECS || "60",
    10,
  ),

  // Retry behavior
  maxRequestRetries: parseInt(process.env.MAX_REQUEST_RETRIES || "3", 10),
  requestHandlerTimeoutSecs: 120,

  // Politeness
  sameDomainDelaySecs: parseFloat(process.env.SAME_DOMAIN_DELAY_SECS || "1"),
};

export const PLAYWRIGHT_DEFAULT_OPTIONS = {
  ...CRAWLEE_DEFAULT_OPTIONS,

  // Browser settings
  launchContext: {
    launchOptions: {
      headless: process.env.HEADLESS !== "false",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    },
  },

  // Use stealth to avoid bot detection
  useSessionPool: true,
  persistCookiesPerSession: true,
};

export const CHEERIO_DEFAULT_OPTIONS = {
  ...CRAWLEE_DEFAULT_OPTIONS,

  // HTTP-only timeout option — valid for CheerioCrawler, not PlaywrightCrawler
  requestTimeoutSecs: parseInt(process.env.REQUEST_TIMEOUT_SECS || "30", 10),

  // Additional headers for HTML-only crawlers
  additionalMimeTypes: ["application/json", "text/plain"],
  ignoreSslErrors: process.env.IGNORE_SSL_ERRORS === "true",
};

// ============================================================
// Storage Configuration
// ============================================================

export const STORAGE_CONFIG = {
  // Where Crawlee stores its request queues, key-value stores, datasets
  storageDir: process.env.CRAWLEE_STORAGE_DIR || "./crawlee-storage",

  // Purge on start (true = fresh start each run)
  purgeOnStart: process.env.CRAWLEE_PURGE_ON_START === "true",
};

// Configure Crawlee globally
export function configureCrawlee(): void {
  Configuration.getGlobalConfig().set("storageClientOptions", {
    localDataDirectory: STORAGE_CONFIG.storageDir,
  });

  if (STORAGE_CONFIG.purgeOnStart) {
    Configuration.getGlobalConfig().set("purgeOnStart", true);
  }
}

// ============================================================
// User Agent Rotation Pool
// ============================================================

export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ============================================================
// HTTP Headers
// ============================================================

export const DEFAULT_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Cache-Control": "max-age=0",
};
