import { BaseExtractor } from "../base-extractor";
import { GenericExtractor } from "../generic-extractor";
import { DreamtourExtractor } from "./dreamtour";
import {
  detectSiteIdFromUrl,
  SITE_CONFIGS,
} from "../../config/scraper-configs";
import { logger } from "../../utils/logger";

// ============================================================
// Extractor Registry
// Maps siteId → Extractor instance (singleton per site)
// ============================================================

const extractorRegistry = new Map<string, BaseExtractor>();

function initializeRegistry(): void {
  // dreamtour.co — one extractor handles both umroh and hajj listings
  extractorRegistry.set(
    "dreamtour-umroh",
    new DreamtourExtractor(SITE_CONFIGS["dreamtour-umroh"]),
  );
  extractorRegistry.set(
    "dreamtour-hajj",
    new DreamtourExtractor(SITE_CONFIGS["dreamtour-hajj"]),
  );
  // kemenag-haji uses GenericExtractor (HTML-only, no custom logic needed)
}

// Initialize once on module load
initializeRegistry();

// ============================================================
// Public API
// ============================================================

/**
 * Get the appropriate extractor for a given siteId.
 * Falls back to GenericExtractor if no specific extractor is registered.
 *
 * @param siteId - The site identifier (e.g. 'umroh-indonesia')
 * @returns A BaseExtractor instance
 */
export function getSiteExtractor(siteId: string): BaseExtractor {
  const extractor = extractorRegistry.get(siteId);

  if (extractor) {
    logger.debug(`Using site-specific extractor`, { siteId });
    return extractor;
  }

  logger.debug(
    `No specific extractor for siteId "${siteId}", using GenericExtractor`,
  );
  return new GenericExtractor(siteId);
}

/**
 * Get extractor by URL — auto-detects the siteId first.
 * Falls back to GenericExtractor if URL doesn't match any known site.
 *
 * @param url - The target URL to get an extractor for
 * @returns A BaseExtractor instance
 */
export function getExtractorForUrl(url: string): BaseExtractor {
  const detectedSiteId = detectSiteIdFromUrl(url);

  if (detectedSiteId) {
    return getSiteExtractor(detectedSiteId);
  }

  logger.debug(`No siteId detected from URL, using GenericExtractor`, { url });
  return new GenericExtractor();
}

/**
 * Get all registered site IDs that have dedicated extractors.
 */
export function getRegisteredSiteIds(): string[] {
  return Array.from(extractorRegistry.keys());
}

/**
 * Register a new extractor at runtime.
 * Useful for plugin-style extractor loading.
 */
export function registerExtractor(
  siteId: string,
  extractor: BaseExtractor,
): void {
  extractorRegistry.set(siteId, extractor);
  logger.info(`Registered extractor for siteId "${siteId}"`);
}

export { BaseExtractor };
export { DreamtourExtractor, GenericExtractor };
