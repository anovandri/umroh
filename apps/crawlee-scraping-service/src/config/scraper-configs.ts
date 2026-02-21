import { SiteConfig } from "../types";

// ============================================================
// Site-Specific Scraper Configurations
// Defines how each target website should be crawled & parsed
// ============================================================

export const SITE_CONFIGS: Record<string, SiteConfig> = {
  // ── DreamTour Umroh ──────────────────────────────────────
  // Listing : https://dreamtour.co/paket
  // Detail  : https://dreamtour.co/paketumroh/{id}_{slug}
  // Rendered by a JS framework — Playwright required.
  "dreamtour-umroh": {
    siteId: "dreamtour-umroh",
    siteName: "Dream Tour – Paket Umroh",
    baseUrl: "https://dreamtour.co",
    crawlerType: "PLAYWRIGHT",
    startUrls: ["https://dreamtour.co/paket"],
    allowedDomains: ["dreamtour.co"],
    maxConcurrency: 2,
    requestDelay: 2000,
    maxDepth: 2,
    navigationTimeout: 45000,
    selectors: {
      // Listing page — Bootstrap grid cards
      // Each package lives inside a col that contains:
      //   img.img-fluid  →  package image
      //   h5 (1st)       →  package name
      //   h5 (2nd)       →  price  (starts with "Rp")
      //   plain text     →  hotel / airline / train info
      //   a[href*="/paketumroh/"]  →  detail link
      packageCard: 'div.col:has(a[href*="/paketumroh/"])',
      packageLinkSelector: 'a[href*="/paketumroh/"]',

      // Detail page selectors
      // Price block: "From IDR 92.500.000" or "From USD 31.500"
      price: '.booking-form .from-price, h4:contains("From"), .price-box',
      // Package name heading on detail page
      packageName: "h4.card-title, h2.paket-title, .booking-form h4",
      // Duration extracted from package name text (e.g. "09Hr", "11Hr")
      duration: ".duration-info, .tour-duration",
      // Departure date picker (JS widget — extracted via Playwright evaluation)
      departureDates: '.departure-select option, [class*="departure"] option',
      // Hotel blocks: "Hotel Makkah (N Mlm)\n{Hotel Name}" pattern
      hotels: ".hotel-info, .facilities-box p, .paket-info p",
      // Airline: "By {Airline} ({Class})" pattern
      airlines: ".airline-info, .maskapai, .facilities-box p",
      // Tabs on detail page
      facilities: ".tab-content #termasuk li, .include-list li",
      inclusions: '.tab-content #termasuk li, [id*="termasuk"] li',
      exclusions: '.tab-content #tidak-termasuk li, [id*="tidak"] li',
      description: ".tab-content #rincian, .itinerary-section",
      // Operator is Dream Tour itself
      operatorName: ".operator-name",
      operatorPhone: ".contact-info .phone",
      nextPageSelector:
        '.pagination .page-item.active + .page-item a, a[rel="next"]',
    },
    useProxy: false,
    rotateUserAgent: true,
    humanizeMouseMovement: false,
  },

  // ── DreamTour Haji ───────────────────────────────────────
  // Listing : https://dreamtour.co/hajj
  // Detail  : https://dreamtour.co/paketumroh/{id}_{slug}
  // Price in USD. Same card structure as umroh listing.
  "dreamtour-hajj": {
    siteId: "dreamtour-hajj",
    siteName: "Dream Tour – Paket Haji",
    baseUrl: "https://dreamtour.co",
    crawlerType: "PLAYWRIGHT",
    startUrls: ["https://dreamtour.co/hajj"],
    allowedDomains: ["dreamtour.co"],
    maxConcurrency: 2,
    requestDelay: 2000,
    maxDepth: 2,
    navigationTimeout: 45000,
    selectors: {
      // Same Bootstrap card grid as umroh listing
      packageCard: 'div.col:has(a[href*="/paketumroh/"])',
      packageLinkSelector: 'a[href*="/paketumroh/"]',

      // Detail page — same structure, price in USD
      price: '.booking-form .from-price, h4:contains("From"), .price-box',
      packageName: "h4.card-title, h2.paket-title, .booking-form h4",
      duration: ".duration-info, .tour-duration",
      departureDates: '.departure-select option, [class*="departure"] option',
      hotels: ".hotel-info, .facilities-box p, .paket-info p",
      airlines: ".airline-info, .maskapai, .facilities-box p",
      facilities: ".tab-content #termasuk li, .include-list li",
      inclusions: '.tab-content #termasuk li, [id*="termasuk"] li',
      exclusions: '.tab-content #tidak-termasuk li, [id*="tidak"] li',
      description: ".tab-content #rincian, .itinerary-section",
      operatorName: ".operator-name",
      operatorPhone: ".contact-info .phone",
      nextPageSelector:
        '.pagination .page-item.active + .page-item a, a[rel="next"]',
    },
    useProxy: false,
    rotateUserAgent: true,
    humanizeMouseMovement: false,
  },

  "kemenag-haji": {
    siteId: "kemenag-haji",
    siteName: "Kemenag Haji",
    baseUrl: "https://haji.kemenag.go.id",
    crawlerType: "CHEERIO",
    startUrls: ["https://haji.kemenag.go.id/v5/content/paket-haji-khusus"],
    allowedDomains: ["haji.kemenag.go.id"],
    maxConcurrency: 2,
    requestDelay: 3000, // Government site — be very polite
    maxDepth: 2,
    selectors: {
      packageCard: ".views-row, .package-row, tr.package",
      packageLinkSelector: 'a[href*="paket"], a[href*="haji"]',
      packageName: "h2, h3, .field-title",
      price: '.field-price, .biaya, [class*="biaya"]',
      duration: ".field-duration, .hari",
      operatorName: ".field-travel, .nama-phsi",
      operatorPhone: ".field-phone, .telp",
      nextPageSelector: ".pager-next a",
    },
    useProxy: false,
    rotateUserAgent: false,
  },
};

// ============================================================
// URL Pattern to Site ID Mapping
// Used for auto-detecting siteId from a given URL
// ============================================================

export const URL_SITE_MAPPING: Array<{ pattern: RegExp; siteId: string }> = [
  // dreamtour.co/paket → umroh packages
  { pattern: /dreamtour\.co\/(paket|paketumroh)/i, siteId: "dreamtour-umroh" },
  // dreamtour.co/hajj → hajj packages
  { pattern: /dreamtour\.co\/hajj/i, siteId: "dreamtour-hajj" },
  { pattern: /kemenag\.go\.id.*haji/i, siteId: "kemenag-haji" },
];

/**
 * Detect siteId from a URL based on pattern matching.
 * Returns undefined if no matching config is found.
 */
export function detectSiteIdFromUrl(url: string): string | undefined {
  const match = URL_SITE_MAPPING.find(({ pattern }) => pattern.test(url));
  return match?.siteId;
}

/**
 * Get site config by siteId. Returns undefined if not found.
 */
export function getSiteConfig(siteId: string): SiteConfig | undefined {
  return SITE_CONFIGS[siteId];
}

/**
 * Get all registered site IDs.
 */
export function getAllSiteIds(): string[] {
  return Object.keys(SITE_CONFIGS);
}
