import { Page } from "playwright";
import { CheerioAPI } from "cheerio";
import { AnyNode } from "domhandler";
import { BaseExtractor } from "../base-extractor";
import {
  ScrapedPackage,
  SiteConfig,
  HotelInfo,
  AirlineInfo,
  PriceInfo,
  DepartureDate,
  PackageCategory,
} from "../../types";
import { logger } from "../../utils/logger";

// ============================================================
// DreamTour Extractor
// Handles both:
//   Listing : https://dreamtour.co/paket  (umroh)
//             https://dreamtour.co/hajj   (hajj)
//   Detail  : https://dreamtour.co/paketumroh/\{id\}_\{slug\}
//
// HTML structure observed from live pages:
//
//  LISTING CARD
//  -----------------------------------------------------------
//  <div class="col ...">
//    <img class="img-fluid" />
//    <h5>Exclusive Ramadhan 09Hr GA Med</h5>   <- name
//    <h5>Rp52.950.000,-</h5>                   <- price IDR
//    or <h5>USD 31.500,-</h5>                  <- price USD
//    [plain text nodes: hotel / airline info]
//    <a href="/paketumroh/1031_...">Detail</a> <- detail link
//  </div>
//
//  DETAIL PAGE
//  -----------------------------------------------------------
//  <h4 class="card-title">Pesan {Package Name}</h4>
//  Text: "From IDR 92.500.000" or "From USD 31.500"
//  Text: "Hotel Makkah (04 Mlm)\n{Hotel Name}"
//  Text: "Hotel Madinah (03 Mlm)\n{Hotel Name}"
//  Text: "By {Airline} ({Class})"
//  Date picker widget (Playwright)
//  Tabs: Rincian Perjalanan | Termasuk | Tidak Termasuk
// ============================================================

export class DreamtourExtractor extends BaseExtractor {
  // -----------------------------------------------------------
  // 1. Extract detail-page links from a listing page
  // -----------------------------------------------------------
  async extractPackageLinks(
    _url: string,
    $: CheerioAPI,
    _page?: Page,
  ): Promise<string[]> {
    const links: string[] = [];
    $('a[href*="/paketumroh/"]').each((_i: number, el: AnyNode) => {
      const href = $(el).attr("href");
      if (href) {
        const absolute = href.startsWith("http")
          ? href
          : `https://dreamtour.co${href}`;
        if (!links.includes(absolute)) links.push(absolute);
      }
    });
    return links;
  }

  // -----------------------------------------------------------
  // 2. Extract package data from a detail page
  // -----------------------------------------------------------
  async extractPackage(
    url: string,
    $: CheerioAPI,
    page?: Page,
  ): Promise<Partial<ScrapedPackage> | null> {
    try {
      // Package name: "Pesan Exclusive 09Hr GA Med" -> strip "Pesan "
      const rawTitle =
        $("h4.card-title").first().text().trim() ||
        $("h2").first().text().trim() ||
        $("title")
          .text()
          .replace(/[-|].*$/, "")
          .trim();
      const packageName = rawTitle.replace(/^Pesan\s+/i, "").trim();
      if (!packageName) return null;

      const price = this.parsePriceFromPage($);
      const duration = this.parseDurationFromText(packageName);
      const category = this.resolveCategory(url, packageName);
      const hotels = this.parseHotelsFromPage($);
      const airlines = this.parseAirlinesFromPage($);
      const departureDates: DepartureDate[] = page
        ? await this.parseDepartureDatesFromPage(page)
        : [];
      const inclusions = this.parseTabList($, "termasuk");
      const exclusions = this.parseTabList($, "tidak");
      const description = this.parseItinerary($);

      return {
        id: this.extractPackageIdFromUrl(url),
        packageName,
        category,
        price,
        duration,
        hotels,
        airlines,
        departureDates,
        departureCities: ["Jakarta", "Surabaya"],
        inclusions,
        exclusions,
        facilities: [],
        operator: {
          name: "Dream Tour",
          website: "https://dreamtour.co",
          phone: "08119333000",
          email: "info@dreamtour.co",
          address: "Jalan Matraman No 7, Jakarta Timur",
        },
        rawContent: {
          title: packageName,
          description,
        },
        sourceUrl: url,
        siteId: this.config.siteId,
        siteName: this.config.siteName,
        scrapedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.error("DreamtourExtractor: detail extraction failed", {
        err,
        url,
      });
      return null;
    }
  }

  // -----------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------

  private extractPackageIdFromUrl(url: string): string {
    const m = url.match(/\/paketumroh\/(\d+)_/);
    return m ? `dreamtour-${m[1]}` : `dreamtour-${Date.now()}`;
  }

  private resolveCategory(url: string, name: string): PackageCategory {
    const isHajj =
      /hajj|haji|furodah|furoda/i.test(url) ||
      /haji|furodah|furoda/i.test(name);
    if (isHajj) {
      if (/furodah|furoda/i.test(name)) return "HAJI_FURODA";
      if (/plus/i.test(name)) return "HAJI_PLUS";
      return "HAJI_REGULER";
    }
    if (/plus|turkey|cairo|aqsa/i.test(name)) return "UMROH_PLUS";
    if (/khusus|special|vip|priority|ultimate/i.test(name))
      return "UMROH_KHUSUS";
    return "UMROH_REGULER";
  }

  /**
   * Find "From IDR 92.500.000" or "From USD 31.500" in page text.
   */
  private parsePriceFromPage($: CheerioAPI): PriceInfo {
    let raw = "";
    let currency = "IDR";

    $("*").each((_i: number, el: AnyNode) => {
      if (raw) return;
      const text = $(el).clone().children().remove().end().text().trim();
      if (/From\s+(IDR|USD)\s+[\d.,]+/i.test(text)) {
        raw = text;
        currency = /USD/i.test(text) ? "USD" : "IDR";
      }
    });

    const numStr = raw
      .replace(/From\s+(IDR|USD)\s+/i, "")
      .replace(/[^0-9.]/g, "");
    const amount = parseFloat(numStr) || 0;

    return { amount, currency, priceType: "STARTING_FROM" };
  }

  /**
   * Parse duration days from package name text.
   * Handles: "09Hr", "09Hri", "11Hr", "17-22 Hari", "Estimasi 17-22 Hari"
   */
  private parseDurationFromText(text: string): number {
    const rangeMatch = text.match(/(\d+)-\d+\s*Hari/i);
    if (rangeMatch) return parseInt(rangeMatch[1], 10);
    const hrMatch = text.match(/(\d+)\s*Hr/i);
    if (hrMatch) return parseInt(hrMatch[1], 10);
    const hariMatch = text.match(/(\d+)\s*Hari/i);
    if (hariMatch) return parseInt(hariMatch[1], 10);
    return 0;
  }

  /**
   * Parse "Hotel Makkah (04 Mlm)\n{Hotel Name}" patterns from body text.
   */
  private parseHotelsFromPage($: CheerioAPI): HotelInfo[] {
    const hotels: HotelInfo[] = [];
    const bodyText = $("body").text();
    const pattern =
      /Hotel\s+(Makkah|Madinah)\s*\((\d+)\s*Mlm\)\s*[\n\r]+\s*([^\n\r]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(bodyText)) !== null) {
      const city = m[1].toUpperCase() as "MAKKAH" | "MADINAH";
      const nights = parseInt(m[2], 10);
      const hotelName = m[3].replace(/\s*\/\s*Setaraf.*/i, "").trim();
      hotels.push({
        city,
        hotelName,
        nights,
        starRating: this.inferHotelStars(hotelName),
      });
    }
    return hotels;
  }

  private inferHotelStars(name: string): number {
    if (
      /fairmont|swiss|pullman|raffles|hilton|marriott|intercontinental/i.test(
        name,
      )
    )
      return 5;
    if (/shahd|rotana|anjum|movenpick|sheraton|millennium/i.test(name))
      return 4;
    return 3;
  }

  /**
   * Parse "By {Airline} ({Class})" patterns from page text.
   */
  private parseAirlinesFromPage($: CheerioAPI): AirlineInfo[] {
    const airlines: AirlineInfo[] = [];
    const seen = new Set<string>();

    $("*").each((_i: number, el: AnyNode) => {
      const text = $(el).clone().children().remove().end().text().trim();
      const m = text.match(/By\s+(.+?)\s*\((.+?Class)\)/);
      if (m) {
        const name = m[1].trim();
        const classRaw = m[2].trim().toUpperCase();
        const key = `${name}|${classRaw}`;
        if (!seen.has(key)) {
          seen.add(key);
          airlines.push({
            name,
            code: this.inferAirlineCode(name),
            flightClass: classRaw.includes("BUSINESS")
              ? "BUSINESS"
              : classRaw.includes("FIRST")
                ? "FIRST"
                : "ECONOMY",
            direct: false,
          });
        }
      }
    });

    return airlines;
  }

  private inferAirlineCode(name: string): string {
    if (/garuda/i.test(name)) return "GA";
    if (/saudia/i.test(name)) return "SV";
    if (/emirates/i.test(name)) return "EK";
    if (/etihad/i.test(name)) return "EY";
    if (/qatar/i.test(name)) return "QR";
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Extract departure dates from the Playwright-rendered date picker.
   */
  private async parseDepartureDatesFromPage(
    page: Page,
  ): Promise<DepartureDate[]> {
    try {
      await page
        .waitForSelector('[class*="departure"], .keberangkatan', {
          timeout: 8000,
        })
        .catch(() => null);

      const rawDates = await page.evaluate(() => {
        const results: string[] = [];
        document
          .querySelectorAll("select option, .departure-option, [data-date]")
          .forEach((el) => {
            const v =
              (el as HTMLElement).getAttribute("data-date") ||
              (el as HTMLElement).textContent?.trim();
            if (v && v.length > 3 && !results.includes(v)) results.push(v);
          });
        if (results.length === 0) {
          document
            .querySelectorAll(
              '[class*="jadwal"], [class*="tanggal"], [class*="date"]',
            )
            .forEach((el) => {
              const t = (el as HTMLElement).textContent?.trim();
              if (t && t.length > 3 && !results.includes(t)) results.push(t);
            });
        }
        return results;
      });

      return rawDates.map((d) => ({ date: d, available: true }));
    } catch {
      return [];
    }
  }

  private parseTabList($: CheerioAPI, tabKeyword: string): string[] {
    const items: string[] = [];
    $(`[id*="${tabKeyword}"] li, [aria-label*="${tabKeyword}"] li`).each(
      (_i: number, el: AnyNode) => {
        const text = $(el).text().trim();
        if (text) items.push(text);
      },
    );
    return items;
  }

  private parseItinerary($: CheerioAPI): string {
    let itinerary = "";
    $("h2, h3, h4").each((_i: number, el: AnyNode) => {
      const heading = $(el).text().toLowerCase();
      if (heading.includes("rincian") || heading.includes("itinerary")) {
        const parts: string[] = [];
        let node = $(el).next();
        while (node.length && !node.is("h2,h3,h4,footer,.footer")) {
          const t = node.text().trim();
          if (t) parts.push(t);
          node = node.next();
        }
        itinerary = parts.join("\n");
        return false;
      }
    });
    return itinerary.substring(0, 2000);
  }
}
