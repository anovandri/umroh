import { CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { BaseExtractor } from './base-extractor';
import { ScrapedPackage, SiteConfig } from '../types';
import {
  parseIdrPrice,
  parseDurationDays,
  parseDate,
  parseStarRating,
  detectPackageCategory,
} from '../utils/data-validator';

// ============================================================
// Generic Extractor
// AI-powered / heuristic fallback extractor.
// Used when no site-specific extractor is registered for a URL.
// Applies broad pattern matching to extract structured data.
// ============================================================

// Default "unknown site" config
const GENERIC_CONFIG: SiteConfig = {
  siteId: 'generic',
  siteName: 'Generic',
  baseUrl: '',
  crawlerType: 'CHEERIO',
  startUrls: [],
  allowedDomains: [],
  selectors: {},
};

export class GenericExtractor extends BaseExtractor {
  constructor(siteId?: string, siteName?: string) {
    super({
      ...GENERIC_CONFIG,
      siteId: siteId || 'generic',
      siteName: siteName || 'Generic',
    });
  }

  // ============================================================
  // Package Link Discovery
  // ============================================================

  async extractPackageLinks(url: string, $: CheerioAPI): Promise<string[]> {
    const links: string[] = [];
    const baseUrl = new URL(url).origin;

    // Try common patterns for package list links
    const packagePatterns = [
      'a[href*="paket"]',
      'a[href*="package"]',
      'a[href*="umroh"]',
      'a[href*="haji"]',
      '.package-card a',
      '.paket-card a',
      '.package-item a',
      '.product-card a',
      'article a',
      '.card a.btn-detail',
      '.card a.btn-info',
      'a.read-more',
    ];

    for (const pattern of packagePatterns) {
      $(pattern).each((_: number, el: AnyNode) => {
        const href = $(el as unknown as Parameters<typeof $>[0]).attr('href')?.trim();
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          const absolute = href.startsWith('http') ? href
            : href.startsWith('/') ? `${baseUrl}${href}`
              : `${baseUrl}/${href}`;
          links.push(absolute);
        }
      });

      if (links.length > 0) break;
    }

    this.log('debug', `GenericExtractor found ${links.length} links`, { url });
    return [...new Set(links)];
  }

  // ============================================================
  // Package Data Extraction
  // ============================================================

  async extractPackage(
    url: string,
    $: CheerioAPI,
    _page?: Page,
  ): Promise<Partial<ScrapedPackage> | null> {
    try {
      const packageName = this.extractPackageName($);
      if (!packageName) {
        this.log('debug', 'Could not find package name, skipping', { url });
        return null;
      }

      const rawPriceText = this.extractPriceText($);
      const priceAmount = rawPriceText ? parseIdrPrice(rawPriceText) : undefined;

      const durationText = this.extractDurationText($);
      const durationDays = durationText ? parseDurationDays(durationText) : undefined;

      const operatorName = this.extractOperatorName($);
      const rawDescription = this.extractDescription($);
      const category = detectPackageCategory(
        `${packageName} ${rawDescription || ''}`,
      );

      const hotels = this.extractHotels($);
      const airlines = this.extractAirlines($);
      const facilities = this.extractFacilities($);
      const inclusions = this.extractInclusions($);
      const exclusions = this.extractExclusions($);
      const departureDates = this.extractDepartureDates($);

      const partial: Partial<ScrapedPackage> = {
        id: uuidv4(),
        sourceUrl: url,
        siteId: this.siteId,
        siteName: this.siteName,
        scrapedAt: new Date().toISOString(),
        packageName,
        category,
        duration: durationDays || 9, // Default umroh duration
        price: {
          amount: priceAmount || 0,
          currency: 'IDR',
          priceType: 'PER_PERSON',
        },
        hotels,
        airlines,
        facilities,
        inclusions,
        exclusions,
        departureDates,
        departureCities: ['Jakarta', 'Surabaya'], // Common default
        operator: {
          name: operatorName || this.siteName,
        },
        rawContent: {
          title: packageName,
          description: rawDescription || undefined,
        },
      };

      return partial;
    } catch (err) {
      this.log('error', 'GenericExtractor failed', { url, error: (err as Error).message });
      return null;
    }
  }

  // ============================================================
  // Private Extraction Helpers
  // ============================================================

  private extractPackageName($: CheerioAPI): string {
    const selectors = [
      'h1',
      '[class*="package-name"]',
      '[class*="paket-name"]',
      '[class*="product-name"]',
      '[class*="package-title"]',
      '.paket-nama',
      'title',
    ];

    for (const sel of selectors) {
      const text = $(sel).first().text().replace(/\s+/g, ' ').trim();
      if (text && text.length > 3 && text.length < 300) return text;
    }

    return '';
  }

  private extractPriceText($: CheerioAPI): string {
    const selectors = [
      '[class*="price"]',
      '[class*="harga"]',
      '[class*="biaya"]',
      '[data-price]',
      '.amount',
      '.cost',
    ];

    for (const sel of selectors) {
      const text = $(sel).first().text().replace(/\s+/g, ' ').trim();
      if (text && /\d/.test(text)) return text;
      const attr = $(sel).first().attr('data-price') || $(sel).first().attr('content');
      if (attr && /\d/.test(attr)) return attr;
    }

    // Last resort: scan text nodes for price patterns (Rp, IDR)
    const bodyText = $('body').text();
    const priceMatch = bodyText.match(/(?:Rp\.?\s?|IDR\s?)[\d.,]+/i);
    return priceMatch ? priceMatch[0] : '';
  }

  private extractDurationText($: CheerioAPI): string {
    const selectors = [
      '[class*="duration"]',
      '[class*="durasi"]',
      '[class*="hari"]',
      '[class*="days"]',
    ];

    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text && /\d/.test(text)) return text;
    }

    const bodyText = $('body').text();
    const durationMatch = bodyText.match(/(\d+)\s*(?:hari|days?|malam|night)/i);
    return durationMatch ? durationMatch[0] : '';
  }

  private extractOperatorName($: CheerioAPI): string {
    return this.getTextFirst(
      $,
      '[class*="operator"]',
      '[class*="travel"]',
      '[class*="company"]',
      '[class*="penyelenggara"]',
      'footer .company-name',
      'header .brand',
    );
  }

  private extractDescription($: CheerioAPI): string {
    return this.getTextFirst(
      $,
      '[class*="description"]',
      '[class*="deskripsi"]',
      '[class*="keterangan"]',
      '.content p',
      'article p',
    );
  }

  private extractHotels($: CheerioAPI): ScrapedPackage['hotels'] {
    const hotels: ScrapedPackage['hotels'] = [];

    const cityPatterns: Record<'MAKKAH' | 'MADINAH' | 'JEDDAH', RegExp> = {
      MAKKAH: /makkah|mecca|mekkah/i,
      MADINAH: /madinah|medina|medinah/i,
      JEDDAH: /jeddah|jeddah/i,
    };

    $('[class*="hotel"]').each((_: number, el: AnyNode) => {
      const hotelText = $(el as unknown as Parameters<typeof $>[0]).text().replace(/\s+/g, ' ').trim();
      if (!hotelText) return;

      let city: 'MAKKAH' | 'MADINAH' | 'JEDDAH' | 'OTHER' = 'OTHER';
      for (const [cityName, pattern] of Object.entries(cityPatterns)) {
        if (pattern.test(hotelText)) {
          city = cityName as 'MAKKAH' | 'MADINAH' | 'JEDDAH';
          break;
        }
      }

      hotels.push({
        city,
        hotelName: hotelText.substring(0, 100),
        starRating: parseStarRating(hotelText),
      });
    });

    return hotels;
  }

  private extractAirlines($: CheerioAPI): ScrapedPackage['airlines'] {
    const airlines: ScrapedPackage['airlines'] = [];
    const airlinePatterns = ['garuda', 'lion', 'batik', 'saudia', 'emirates', 'flynas', 'air asia'];

    const bodyText = $('body').text().toLowerCase();
    for (const airline of airlinePatterns) {
      if (bodyText.includes(airline)) {
        airlines.push({
          name: airline.charAt(0).toUpperCase() + airline.slice(1),
          flightClass: 'ECONOMY',
          direct: false,
        });
      }
    }

    return airlines;
  }

  private extractFacilities($: CheerioAPI): string[] {
    return this.getListItems(
      $,
      '[class*="facilit"] li, [class*="fasilitas"] li, [class*="layanan"] li',
    );
  }

  private extractInclusions($: CheerioAPI): string[] {
    return this.getListItems(
      $,
      '[class*="includ"] li, [class*="termasuk"] li, [class*="include"] li',
    );
  }

  private extractExclusions($: CheerioAPI): string[] {
    return this.getListItems(
      $,
      '[class*="exclud"] li, [class*="tidak-termasuk"] li, [class*="exclude"] li',
    );
  }

  private extractDepartureDates($: CheerioAPI): ScrapedPackage['departureDates'] {
    const dates: ScrapedPackage['departureDates'] = [];
    const selectors = [
      '[class*="departure"] [class*="date"]',
      '[class*="keberangkatan"]',
      '[class*="jadwal"]',
      '[class*="tanggal"]',
    ];

    for (const sel of selectors) {
      $(sel).each((_: number, el: AnyNode) => {
        const text = $(el as unknown as Parameters<typeof $>[0]).text().trim();
        const parsed = parseDate(text);
        if (parsed) {
          dates.push({ date: parsed, available: true });
        }
      });
      if (dates.length > 0) break;
    }

    return dates;
  }
}
