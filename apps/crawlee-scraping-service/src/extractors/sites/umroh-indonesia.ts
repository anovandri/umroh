import { CheerioAPI } from 'cheerio';
import { Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { BaseExtractor } from '../base-extractor';
import { ScrapedPackage } from '../../types';
import { SITE_CONFIGS } from '../../config/scraper-configs';
import {
  parseIdrPrice,
  parseDurationDays,
  parseDate,
  parseStarRating,
  detectPackageCategory,
} from '../../utils/data-validator';

// ============================================================
// Site-Specific Extractor: umroh-indonesia (umroh.com)
// ============================================================

export class UmrohIndonesiaExtractor extends BaseExtractor {
  constructor() {
    super(SITE_CONFIGS['umroh-indonesia']);
  }

  async extractPackageLinks(url: string, $: CheerioAPI): Promise<string[]> {
    const { selectors } = this.config;
    const links = this.extractLinks($, selectors.packageLinkSelector || 'a');

    // Filter to only package detail pages
    const packageLinks = links.filter((href) =>
      /\/paket\/|\/package\//i.test(href),
    );

    this.log('info', `Found ${packageLinks.length} package links`, { url });
    return packageLinks;
  }

  async extractPackage(
    url: string,
    $: CheerioAPI,
    _page?: Page,
  ): Promise<Partial<ScrapedPackage> | null> {
    try {
      const { selectors } = this.config;

      // Package name
      const packageName = this.getText($, selectors.packageName || 'h1');
      if (!packageName) {
        this.log('warn', 'No package name found', { url });
        return null;
      }

      // Price
      const priceText = this.getText($, selectors.price || '[class*="price"]');
      const priceAmount = parseIdrPrice(priceText);

      // Duration
      const durationText = this.getText($, selectors.duration || '[class*="duration"]');
      const durationDays = parseDurationDays(durationText) || 9;

      // Departure dates
      const departureDates: ScrapedPackage['departureDates'] = [];
      $(selectors.departureDates || '.departure-date').each((_: number, el: unknown) => {
        const text = $(el as Parameters<typeof $>[0]).text().trim();
        const parsed = parseDate(text);
        if (parsed) departureDates.push({ date: parsed, available: true });
      });

      // Hotels
      const hotels: ScrapedPackage['hotels'] = [];
      $(selectors.hotels || '.hotel-item').each((_: number, el: unknown) => {
        const hotelEl = $(el as Parameters<typeof $>[0]);
        const name = hotelEl.find('[class*="name"], h3, h4').first().text().trim()
          || hotelEl.text().trim();
        const cityText = hotelEl.find('[class*="city"], [class*="kota"]').first().text().trim()
          || hotelEl.attr('data-city') || '';
        const starText = hotelEl.find('[class*="star"], [class*="bintang"]').first().text().trim();

        if (!name) return;

        const city: ScrapedPackage['hotels'][0]['city'] =
          /makkah|mecca/i.test(cityText) ? 'MAKKAH'
            : /madinah|medina/i.test(cityText) ? 'MADINAH'
              : /jeddah/i.test(cityText) ? 'JEDDAH'
                : 'OTHER';

        hotels.push({
          city,
          hotelName: name.substring(0, 100),
          starRating: parseStarRating(starText),
        });
      });

      // Airlines
      const airlines: ScrapedPackage['airlines'] = [];
      $(selectors.airlines || '.airline-info').each((_: number, el: unknown) => {
        const text = $(el as Parameters<typeof $>[0]).text().trim();
        if (text) {
          airlines.push({ name: text, flightClass: 'ECONOMY', direct: false });
        }
      });

      // Operator
      const operatorName = this.getText($, selectors.operatorName || '.operator-name');
      const operatorPhone = this.getText($, selectors.operatorPhone || '.operator-phone');

      // Lists
      const facilities = this.getListItems($, selectors.facilities || '.facilities li');
      const inclusions = this.getListItems($, selectors.inclusions || '.inclusions li');
      const exclusions = this.getListItems($, selectors.exclusions || '.exclusions li');
      const description = this.getText($, selectors.description || '.package-description');

      const category = detectPackageCategory(`${packageName} ${description}`);

      return {
        id: uuidv4(),
        sourceUrl: url,
        siteId: this.siteId,
        siteName: this.siteName,
        scrapedAt: new Date().toISOString(),
        packageName,
        category,
        duration: durationDays,
        price: {
          amount: priceAmount || 0,
          currency: 'IDR',
          priceType: 'PER_PERSON',
        },
        departureDates,
        departureCities: ['Jakarta'],
        hotels,
        airlines,
        facilities,
        inclusions,
        exclusions,
        operator: {
          name: operatorName || this.siteName,
          phone: operatorPhone || undefined,
          website: this.config.baseUrl,
        },
        rawContent: {
          title: packageName,
          description: description || undefined,
        },
      };
    } catch (err) {
      this.log('error', 'UmrohIndonesiaExtractor failed', {
        url,
        error: (err as Error).message,
      });
      return null;
    }
  }
}
