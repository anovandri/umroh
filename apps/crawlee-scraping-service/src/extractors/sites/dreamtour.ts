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
//  Departure date picker:
//    <select class="form-control" onchange="pemberangkatan(this)">
//      <option>Pilih waktu pemberangkatan...</option>
//      <option value="2608">25 November 2026</option>
//    </select>
//  After selecting an option, #resultbody renders:
//    <div id="resultbody">
//      <table>
//        <tr><td>Pemberangkatan</td><td>: 25 NOV 26 - </td></tr>
//        <tr><td>Harga Quad</td>  <td>: Rp38.500.000,-</td></tr>
//        <tr><td>Harga Triple</td><td>: Rp40.500.000,-</td></tr>
//        <tr><td>Harga Double</td><td>: Rp43.500.000,-</td></tr>
//        <tr><td colspan="2">... - 44 Seat available</td></tr>
//      </table>
//    </div>
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
      const itinerary = this.parseItinerary($);

      // If the static "From IDR …" text wasn't found, derive the lowest
      // Quad price from the per-date data collected by the date picker loop.
      const resolvedPrice: PriceInfo =
        price.amount > 0
          ? price
          : this.lowestPriceFromDates(departureDates, price.currency);

      return {
        id: this.extractPackageIdFromUrl(url),
        packageName,
        category,
        price: resolvedPrice,
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
          descriptionLines: itinerary.length > 0 ? itinerary : undefined,
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
   * Iterate every option in the departure <select onchange="pemberangkatan(this)">,
   * select it, wait for #resultbody to re-render, then scrape:
   *   - date text from the option label  e.g. "25 November 2026"
   *   - Harga Quad / Triple / Double from the result table
   *   - seat count from "N Seat available" text
   */
  private async parseDepartureDatesFromPage(
    page: Page,
  ): Promise<DepartureDate[]> {
    try {
      // Wait for the departure select to appear
      const selectHandle = await page
        .waitForSelector('select[onchange*="pemberangkatan"]', {
          timeout: 8000,
        })
        .catch(() => null);

      if (!selectHandle) {
        logger.debug("DreamtourExtractor: departure select not found");
        return [];
      }

      // Collect all real option values + labels (skip the placeholder)
      const options = await page.evaluate(() => {
        const sel = document.querySelector<HTMLSelectElement>(
          'select[onchange*="pemberangkatan"]',
        );
        if (!sel) return [] as { value: string; label: string }[];
        return Array.from(sel.options)
          .filter((o) => o.value && o.value !== "")
          .map((o) => ({ value: o.value, label: o.text.trim() }));
      });

      if (options.length === 0) return [];

      const results: DepartureDate[] = [];

      for (const opt of options) {
        // Select the option value
        await page.selectOption(
          'select[onchange*="pemberangkatan"]',
          opt.value,
        );

        // Wait for #resultbody to contain the pricing table
        await page
          .waitForFunction(
            () =>
              document
                .querySelector("#resultbody")
                ?.textContent?.includes("Harga"),
            { timeout: 5000 },
          )
          .catch(() => null);

        // Scrape the rendered #resultbody
        const scraped = await page.evaluate(() => {
          const body = document.querySelector("#resultbody");
          if (!body) return null;

          const parseRp = (td: Element | null): number => {
            if (!td) return 0;
            const raw = td.textContent ?? "";
            return parseInt(raw.replace(/[^0-9]/g, ""), 10) || 0;
          };

          // Build a row map: label text → value text
          const rows: Record<string, string> = {};
          body.querySelectorAll("tr").forEach((tr) => {
            const tds = tr.querySelectorAll("td");
            if (tds.length >= 2) {
              const key = (tds[0].textContent ?? "")
                .replace(/[^a-zA-Z]/g, "")
                .toLowerCase();
              rows[key] = tds[1].textContent ?? "";
            }
          });

          const quad = parseRp(
            body.querySelector("tr:nth-child(2) td:nth-child(2)"),
          );
          const triple = parseRp(
            body.querySelector("tr:nth-child(3) td:nth-child(2)"),
          );
          const double = parseRp(
            body.querySelector("tr:nth-child(4) td:nth-child(2)"),
          );

          // "44 Seat available"  or  "44 Kursi tersedia"
          const seatText =
            body.querySelector("tr:last-child td")?.textContent ?? "";
          const seatMatch = seatText.match(/(\d+)\s*[Ss]eat/);
          const seatsLeft = seatMatch ? parseInt(seatMatch[1], 10) : undefined;

          return { quad, triple, double, seatsLeft };
        });

        const isoDate = this.normalizeDateToISO(opt.label);
        if (!isoDate) continue;

        results.push({
          date: isoDate,
          available: scraped
            ? scraped.seatsLeft === undefined || scraped.seatsLeft > 0
            : true,
          seatsLeft: scraped?.seatsLeft,
          priceQuad: scraped?.quad || undefined,
          priceTriple: scraped?.triple || undefined,
          priceDouble: scraped?.double || undefined,
        });
      }

      return results;
    } catch (err) {
      logger.warn("DreamtourExtractor: parseDepartureDatesFromPage failed", {
        err,
      });
      return [];
    }
  }

  /**
   * Pick the lowest Quad price across all departure dates as the package
   * starting-from price. Falls back to 0 if no pricing data is available.
   */
  private lowestPriceFromDates(
    dates: DepartureDate[],
    currency: string,
  ): PriceInfo {
    const amounts = dates.map((d) => d.priceQuad ?? 0).filter((a) => a > 0);
    const amount = amounts.length > 0 ? Math.min(...amounts) : 0;
    return { amount, currency, priceType: "STARTING_FROM" };
  }

  /**
   * Convert raw date strings from the page into YYYY-MM-DD format.
   * Handles Indonesian month names: "15 Maret 2026" → "2026-03-15"
   * Handles month-year only: "Maret 2026" → "2026-03-01"
   * Handles already-ISO: "2026-03-15" → "2026-03-15"
   * Returns null if the string cannot be parsed.
   */
  private normalizeDateToISO(raw: string): string | null {
    const ID_MONTHS: Record<string, string> = {
      januari: "01",
      februari: "02",
      maret: "03",
      april: "04",
      mei: "05",
      juni: "06",
      juli: "07",
      agustus: "08",
      september: "09",
      oktober: "10",
      november: "11",
      desember: "12",
    };

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const lower = raw.toLowerCase().trim();

    // "15 maret 2026" or "15 maret 2026 wib"
    const idFull = lower.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
    if (idFull) {
      const month = ID_MONTHS[idFull[2]];
      if (month) return `${idFull[3]}-${month}-${idFull[1].padStart(2, "0")}`;
    }

    // "maret 2026" — no day, use first of month
    const idMonthYear = lower.match(/^([a-z]+)\s+(\d{4})$/);
    if (idMonthYear) {
      const month = ID_MONTHS[idMonthYear[1]];
      if (month) return `${idMonthYear[2]}-${month}-01`;
    }

    // Last resort: native Date parse (handles English formats)
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 10);

    return null;
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

  /**
   * Parse the "Rincian Perjalanan" itinerary section into an array of lines.
   * Each <p>, <br>-separated segment, or block-level element becomes one entry.
   * Returns a flat array of non-empty trimmed strings.
   */
  private parseItinerary($: CheerioAPI): string[] {
    const lines: string[] = [];

    // Find the last "Rincian Perjalanan" heading that actually precedes Day content
    let itinerarySection = $();
    $("h2, h3, h4").each((_i: number, el: AnyNode) => {
      const text = $(el).text().toLowerCase();
      if (text.includes("rincian") || text.includes("itinerary")) {
        itinerarySection = $(el);
      }
    });

    if (!itinerarySection.length) return [];

    // Walk all siblings after the heading until the next same-level heading or footer
    let node = itinerarySection.next();
    while (node.length && !node.is("h2,h3,h4,footer,.footer")) {
      const tagName = (
        node[0] as unknown as { tagName?: string }
      ).tagName?.toLowerCase();

      if (tagName === "p" || tagName === "div" || tagName === "li") {
        // Replace <br> with newline, then split so each visual line is separate
        const html = node.html() ?? "";
        const withBreaks = html.replace(/<br\s*\/?>/gi, "\n");
        // Strip remaining HTML tags
        const plain = withBreaks.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        plain
          .split("\n")
          .map((l: string) => l.trim())
          .filter(Boolean)
          .forEach((l: string) => lines.push(l));
      } else {
        const t = node.text().trim();
        if (t) lines.push(t);
      }

      node = node.next();
    }

    return lines;
  }
}
