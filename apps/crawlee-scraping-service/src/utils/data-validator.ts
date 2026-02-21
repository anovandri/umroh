import { z } from 'zod';
import { ScrapedPackage, PriceInfo, HotelInfo, AirlineInfo, DepartureDate } from '../types';
import { logger } from './logger';

// ============================================================
// Zod Schemas for runtime validation
// ============================================================

export const PriceInfoSchema = z.object({
  amount: z.number().min(0),
  currency: z.string().min(1).default('IDR'),
  priceType: z.enum(['PER_PERSON', 'PER_PACKAGE', 'STARTING_FROM']).default('PER_PERSON'),
  originalAmount: z.number().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export const DepartureDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  available: z.boolean().default(true),
  seatsLeft: z.number().int().min(0).optional(),
  quota: z.number().int().min(0).optional(),
});

export const HotelInfoSchema = z.object({
  city: z.enum(['MAKKAH', 'MADINAH', 'JEDDAH', 'OTHER']),
  hotelName: z.string().min(1),
  starRating: z.number().int().min(1).max(5).optional(),
  distanceToHaram: z.string().optional(),
  nights: z.number().int().min(0).optional(),
});

export const AirlineInfoSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  flightClass: z.enum(['ECONOMY', 'BUSINESS', 'FIRST']).default('ECONOMY'),
  direct: z.boolean().default(false),
});

export const OperatorInfoSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  ijinKemenag: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
});

export const ScrapedPackageSchema = z.object({
  id: z.string().uuid(),
  sourceUrl: z.string().url(),
  siteName: z.string().min(1),
  siteId: z.string().min(1),
  scrapedAt: z.string().datetime(),

  packageName: z.string().min(1),
  packageCode: z.string().optional(),
  category: z.enum([
    'UMROH_REGULER', 'UMROH_PLUS', 'UMROH_KHUSUS',
    'HAJI_REGULER', 'HAJI_PLUS', 'HAJI_FURODA', 'UNKNOWN',
  ]).default('UNKNOWN'),
  subCategory: z.string().optional(),

  price: PriceInfoSchema,
  duration: z.number().int().min(1).max(90),
  departureDates: z.array(DepartureDateSchema).default([]),
  departureCities: z.array(z.string()).default([]),

  hotels: z.array(HotelInfoSchema).default([]),
  airlines: z.array(AirlineInfoSchema).default([]),

  facilities: z.array(z.string()).default([]),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),

  operator: OperatorInfoSchema,

  rawContent: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    testimonials: z.array(z.string()).optional(),
    images: z.array(z.string().url()).optional(),
    breadcrumbs: z.array(z.string()).optional(),
  }).optional(),
});

// ============================================================
// Validation Result Type
// ============================================================

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: string[];
}

// ============================================================
// Validation Functions
// ============================================================

export function validateScrapedPackage(
  raw: unknown,
): ValidationResult<ScrapedPackage> {
  const result = ScrapedPackageSchema.safeParse(raw);

  if (result.success) {
    return { valid: true, data: result.data as ScrapedPackage };
  }

  const errors = result.error.errors.map(
    (e) => `${e.path.join('.')}: ${e.message}`,
  );

  logger.debug('Package validation failed', { errors });
  return { valid: false, errors };
}

/**
 * Validate multiple packages and return only valid ones.
 * Logs count of invalid packages.
 */
export function validatePackageBatch(
  raw: unknown[],
  jobId?: string,
): ScrapedPackage[] {
  const valid: ScrapedPackage[] = [];
  let invalidCount = 0;

  for (const item of raw) {
    const result = validateScrapedPackage(item);
    if (result.valid && result.data) {
      valid.push(result.data);
    } else {
      invalidCount++;
    }
  }

  if (invalidCount > 0) {
    logger.warn('Some packages failed validation', {
      jobId,
      total: raw.length,
      valid: valid.length,
      invalid: invalidCount,
    });
  }

  return valid;
}

// ============================================================
// Data Normalisation Helpers
// ============================================================

/**
 * Parse IDR price string to number.
 * e.g. "Rp 25.000.000" → 25000000
 *      "25,000,000" → 25000000
 */
export function parseIdrPrice(raw: string): number | undefined {
  if (!raw) return undefined;
  // Remove currency symbols and letters
  const cleaned = raw.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return undefined;

  // Handle Indonesian format: 25.000.000
  const noThousands = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(noThousands);
  return isNaN(num) ? undefined : Math.round(num);
}

/**
 * Parse duration string to number of days.
 * e.g. "9 hari", "9D/8N", "9 days" → 9
 */
export function parseDurationDays(raw: string): number | undefined {
  if (!raw) return undefined;
  const match = raw.match(/(\d+)\s*(hari|day|d\/|D\/|hr)/i);
  if (match) return parseInt(match[1], 10);
  // Fallback: first number
  const numMatch = raw.match(/\d+/);
  return numMatch ? parseInt(numMatch[0], 10) : undefined;
}

/**
 * Parse a date string in various Indonesian/international formats.
 * Returns YYYY-MM-DD or undefined.
 */
export function parseDate(raw: string): string | undefined {
  if (!raw) return undefined;

  const indonesianMonths: Record<string, string> = {
    januari: '01', februari: '02', maret: '03', april: '04',
    mei: '05', juni: '06', juli: '07', agustus: '08',
    september: '09', oktober: '10', november: '11', desember: '12',
  };

  // Try ISO format first
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  // Try Indonesian format: "15 Januari 2025"
  const indoMatch = raw.toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (indoMatch) {
    const month = indonesianMonths[indoMatch[2]];
    if (month) {
      return `${indoMatch[3]}-${month}-${indoMatch[1].padStart(2, '0')}`;
    }
  }

  // Try DD/MM/YYYY
  const slashMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  }

  return undefined;
}

/**
 * Detect hotel star rating from string.
 * e.g. "★★★★★", "5 bintang", "Hotel Bintang 4" → 5, 5, 4
 */
export function parseStarRating(raw: string): number | undefined {
  if (!raw) return undefined;
  const starCount = (raw.match(/★/g) || []).length;
  if (starCount > 0) return Math.min(starCount, 5);
  const match = raw.match(/(\d)\s*bintang|bintang\s*(\d)|(\d)\s*star/i);
  if (match) return parseInt(match[1] || match[2] || match[3], 10);
  return undefined;
}

/**
 * Detect package category from package name/description text.
 */
export function detectPackageCategory(
  text: string,
): ScrapedPackage['category'] {
  const lower = text.toLowerCase();
  if (lower.includes('furoda') || lower.includes('non kuota')) return 'HAJI_FURODA';
  if (lower.includes('haji plus') || lower.includes('haji khusus')) return 'HAJI_PLUS';
  if (lower.includes('haji')) return 'HAJI_REGULER';
  if (lower.includes('umroh plus') || lower.includes('umrah plus')) return 'UMROH_PLUS';
  if (lower.includes('umroh khusus') || lower.includes('umrah khusus')) return 'UMROH_KHUSUS';
  if (lower.includes('umroh') || lower.includes('umrah')) return 'UMROH_REGULER';
  return 'UNKNOWN';
}

// Type exports for convenience
export type { PriceInfo, HotelInfo, AirlineInfo, DepartureDate };
