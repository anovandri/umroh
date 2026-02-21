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
// Site-Specific Extractor: hajj-plus (hajjplus.id)
// Uses Playwright since the site requires JS rendering.
// ============================================================

export class HajjPlusExtractor extends BaseExtractor {
  constructor() {
    super(SITE_CONFIGS['hajj-plus']);
  }

  async extractPackageLinks(url: string, $: CheerioAPI, page?: Page): Promise<string[]> {
    // For JS-rendered pages, prefer extracting links from the live DOM
    if (page) {
      const links = await page.evaluate((): string[] => {
        const anchors = document.querySelectorAll('.card-paket a, .btn-detail, [href*="paket"]');
        return Array.from(anchors)
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((href) => href && !href.includes('#') && !href.includes('javascript:'));
      });
      const uniqueLinks = [...new Set(links)];
      this.log('info', `Found ${uniqueLinks.length} links via Playwright`, { url });
      return uniqueLinks;
    }

    // Fallback to Cheerio
    const { selectors } = this.config;
    const links = this.extractLinks($, selectors.packageLinkSelector || 'a[href*="paket"]');
    this.log('info', `Found ${links.length} links via Cheerio`, { url });
    return links;
  }

  async extractPackage(
    url: string,
    $: CheerioAPI,
    page?: Page,
  ): Promise<Partial<ScrapedPackage> | null> {
    try {
      const { selectors } = this.config;

      // For JS-rendered content, use Playwright evaluate when available
      let rawData: Partial<Record<string, string>> = {};
      if (page) {
        rawData = await page.evaluate((sel: typeof selectors) => ({
          packageName: document.querySelector(sel.packageName || 'h1')?.textContent?.trim() || '',
          price: document.querySelector(sel.price || '.harga-paket')?.textContent?.trim() || '',
          duration: document.querySelector(sel.duration || '.durasi')?.textContent?.trim() || '',
          description: document.querySelector(sel.description || '.desc-paket')?.textContent?.trim() || '',
          operatorName: document.querySelector(sel.operatorName || '.nama-travel')?.textContent?.trim() || '',
          rating: document.querySelector(sel.rating || '.rating-value')?.textContent?.trim() || '',
        }), selectors);
      }

      const packageName = rawData.packageName || this.getText($, selectors.packageName || 'h1');
      if (!packageName) {
        this.log('warn', 'No package name found', { url });
        return null;
      }

      const priceText = rawData.price || this.getText($, selectors.price || '.harga-paket');
      const priceAmount = parseIdrPrice(priceText);

      const durationText = rawData.duration || this.getText($, selectors.duration || '.durasi');
      const durationDays = parseDurationDays(durationText) || 9;

      const description = rawData.description || this.getText($, selectors.description || '.desc-paket');
      const operatorName = rawData.operatorName || this.getText($, selectors.operatorName || '.nama-travel');
      const ratingText = rawData.rating || this.getText($, selectors.rating || '.rating-value');
      const rating = ratingText ? parseFloat(ratingText.replace(',', '.')) : undefined;

      // Departure dates
      const departureDates: ScrapedPackage['departureDates'] = [];
      $(selectors.departureDates || '.jadwal-berangkat').each((_: number, el: unknown) => {
        const text = $(el as Parameters<typeof $>[0]).text().trim();
        const parsed = parseDate(text);
        if (parsed) {
          const seatsEl = $(el as Parameters<typeof $>[0]).find('[class*="seat"], [class*="sisa"]');
          const seatsText = seatsEl.text().replace(/\D/g, '');
          departureDates.push({
            date: parsed,
            available: true,
            seatsLeft: seatsText ? parseInt(seatsText, 10) : undefined,
          });
        }
      });

      // Hotels — Hajj packages often list Makkah + Madinah hotels
      const hotels: ScrapedPackage['hotels'] = [];
      $(selectors.hotels || '.hotel-info').each((_: number, el: unknown) => {
        const hotelEl = $(el as Parameters<typeof $>[0]);
        const name = hotelEl.find('[class*="name"], h4').text().trim()
          || hotelEl.text().substring(0, 80).trim();
        const starText = hotelEl.find('[class*="star"]').text().trim()
          || hotelEl.attr('data-stars') || '';
        const cityAttr = hotelEl.attr('data-city') || hotelEl.find('[class*="city"]').text();

        if (!name) return;

        const city: ScrapedPackage['hotels'][0]['city'] =
          /makkah|mecca/i.test(cityAttr) ? 'MAKKAH'
            : /madinah|medina/i.test(cityAttr) ? 'MADINAH'
              : 'OTHER';

        hotels.push({
          city,
          hotelName: name,
          starRating: parseStarRating(starText),
        });
      });

      // Airlines
      const airlines: ScrapedPackage['airlines'] = [];
      $(selectors.airlines || '.airline').each((_: number, el: unknown) => {
        const text = $(el as Parameters<typeof $>[0]).text().trim();
        if (text) airlines.push({ name: text, flightClass: 'ECONOMY', direct: false });
      });

      const facilities = this.getListItems($, selectors.facilities || '.fasilitas ul li');
      const inclusions = this.getListItems($, selectors.inclusions || '.include-list li');
      const exclusions = this.getListItems($, selectors.exclusions || '.exclude-list li');

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
        departureCities: ['Jakarta', 'Surabaya', 'Bandung'],
        hotels,
        airlines,
        facilities,
        inclusions,
        exclusions,
        operator: {
          name: operatorName || this.siteName,
          website: this.config.baseUrl,
          rating: (rating && !isNaN(rating)) ? rating : undefined,
        },
        rawContent: {
          title: packageName,
          description: description || undefined,
        },
      };
    } catch (err) {
      this.log('error', 'HajjPlusExtractor failed', {
        url,
        error: (err as Error).message,
      });
      return null;
    }
  }
}
