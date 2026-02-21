// ============================================================
// Core Domain Types
// ============================================================

export interface ScrapedPackage {
  id: string;
  sourceUrl: string;
  siteName: string;
  siteId: string;
  scrapedAt: string; // ISO 8601

  // Package identity
  packageName: string;
  packageCode?: string;
  category: PackageCategory;
  subCategory?: string;

  // Pricing
  price: PriceInfo;

  // Duration & Schedule
  duration: number; // in days
  departureDates: DepartureDate[];
  departureCities: string[];

  // Hotel info
  hotels: HotelInfo[];

  // Airline info
  airlines: AirlineInfo[];

  // Services & inclusions
  facilities: string[];
  inclusions: string[];
  exclusions: string[];

  // Operator info
  operator: OperatorInfo;

  // Classification metadata
  classification?: PackageClassification;

  // Raw content for ML processing
  rawContent?: RawContent;
}

export type PackageCategory =
  | "UMROH_REGULER"
  | "UMROH_PLUS"
  | "UMROH_KHUSUS"
  | "HAJI_REGULER"
  | "HAJI_PLUS"
  | "HAJI_FURODA"
  | "UNKNOWN";

export interface PriceInfo {
  amount: number;
  currency: string; // 'IDR', 'USD', 'SAR'
  priceType: "PER_PERSON" | "PER_PACKAGE" | "STARTING_FROM";
  originalAmount?: number; // before discount
  discountPercent?: number;
}

export interface DepartureDate {
  date: string; // YYYY-MM-DD
  available: boolean;
  seatsLeft?: number;
  quota?: number;
}

export interface HotelInfo {
  city: "MAKKAH" | "MADINAH" | "JEDDAH" | "OTHER";
  hotelName: string;
  starRating?: number; // 1-5
  distanceToHaram?: string; // e.g. "300m"
  nights?: number;
}

export interface AirlineInfo {
  name: string;
  code?: string;
  flightClass: "ECONOMY" | "BUSINESS" | "FIRST";
  direct: boolean;
}

export interface OperatorInfo {
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  ijinKemenag?: string; // Government license number
  rating?: number;
  reviewCount?: number;
}

export interface PackageClassification {
  qualityTier: "BUDGET" | "STANDARD" | "PREMIUM" | "LUXURY";
  serviceLevel: "BASIC" | "STANDARD" | "FULL_SERVICE" | "VIP";
  targetSegment:
    | "FIRST_TIMER"
    | "EXPERIENCED"
    | "SENIOR"
    | "GROUP"
    | "CORPORATE";
  confidenceScore: number; // 0-1
}

export interface RawContent {
  title?: string;
  description?: string;
  testimonials?: string[];
  images?: string[];
  breadcrumbs?: string[];
}

// ============================================================
// Scraping Job Types
// ============================================================

export type JobStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type JobPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type CrawlerType = "PLAYWRIGHT" | "CHEERIO" | "AUTO";

export interface ScrapeJobRequest {
  jobId?: string; // If not provided, will be generated
  targetUrl: string;
  siteId?: string; // If not provided, auto-detected from URL
  crawlerType?: CrawlerType;
  priority?: JobPriority;
  maxDepth?: number; // How many pages deep to crawl
  maxRequests?: number; // Max requests per job
  callbackUrl?: string; // Override default Spring Boot callback
  metadata?: Record<string, unknown>; // Pass-through metadata
}

export interface ScrapeJobResponse {
  jobId: string;
  status: JobStatus;
  message: string;
  estimatedStartTime?: string;
}

export interface JobState {
  jobId: string;
  status: JobStatus;
  request: ScrapeJobRequest;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;

  // Progress tracking
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  packagesFound: number;

  // Results
  packages?: ScrapedPackage[];
  errors?: JobError[];

  // Retry tracking
  retryCount: number;
  maxRetries: number;
}

export interface JobError {
  url: string;
  message: string;
  stack?: string;
  timestamp: string;
}

// ============================================================
// Site Configuration Types
// ============================================================

export interface SiteConfig {
  siteId: string;
  siteName: string;
  baseUrl: string;
  crawlerType: CrawlerType;
  startUrls: string[];
  allowedDomains: string[];

  // Selectors for data extraction
  selectors: SiteSelectors;

  // Crawl behavior
  maxConcurrency?: number;
  requestDelay?: number; // ms between requests
  maxDepth?: number;
  navigationTimeout?: number;

  // Anti-bot settings
  useProxy?: boolean;
  rotateUserAgent?: boolean;
  humanizeMouseMovement?: boolean;
}

export interface SiteSelectors {
  // List page — package cards
  packageListContainer?: string;
  packageCard?: string;
  packageLinkSelector?: string;

  // Detail page — package info
  packageName?: string;
  price?: string;
  currency?: string;
  duration?: string;
  departureDates?: string;
  hotels?: string;
  airlines?: string;
  facilities?: string;
  inclusions?: string;
  exclusions?: string;
  description?: string;
  operatorName?: string;
  operatorPhone?: string;
  rating?: string;

  // Pagination
  nextPageSelector?: string;
  paginationPattern?: string; // URL pattern with {page}
}

// ============================================================
// Callback / Spring Boot Integration Types
// ============================================================

export interface SpringBootCallback {
  jobId: string;
  siteId: string;
  siteName: string;
  packages: ScrapedPackage[];
  batchNumber: number;
  isFinalBatch: boolean;
  totalPackagesInJob: number;
  scrapedAt: string;
  processingTimeMs: number;
}

export interface SpringBootJobComplete {
  jobId: string;
  status: "COMPLETED";
  totalPackages: number;
  totalRequests: number;
  processingTimeMs: number;
  completedAt: string;
}

export interface SpringBootJobFailed {
  jobId: string;
  status: "FAILED";
  error: string;
  failedAt: string;
  retryCount: number;
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}
