import { CheerioAPI, Cheerio } from 'cheerio';
import type { Element } from 'domhandler';
import { Page } from 'playwright';
import { ScrapedPackage, SiteConfig } from '../types';
import { logger } from '../utils/logger';

// ============================================================
// Base Extractor Abstract Class
// All site-specific and generic extractors extend this class.
// Provides common helpers for parsing HTML content.
// ============================================================

export abstract class BaseExtractor {
  protected siteId: string;
  protected siteName: string;
  protected config: SiteConfig;

  constructor(config: SiteConfig) {
    this.siteId = config.siteId;
    this.siteName = config.siteName;
    this.config = config;
  }

  /**
   * Extract package data from a detail page.
   * Implemented by each site-specific extractor.
   *
   * @param url - The URL of the page being scraped
   * @param $ - Cheerio API instance (for CheerioCrawler)
   * @param page - Playwright Page instance (for PlaywrightCrawler), optional
   */
  abstract extractPackage(
    url: string,
    $: CheerioAPI,
    page?: Page,
  ): Promise<Partial<ScrapedPackage> | null>;

  /**
   * Extract package listing URLs from a list/category page.
   * Returns an array of absolute URLs to individual package pages.
   *
   * @param url - The list page URL
   * @param $ - Cheerio API instance
   * @param page - Playwright Page instance (optional)
   */
  abstract extractPackageLinks(
    url: string,
    $: CheerioAPI,
    page?: Page,
  ): Promise<string[]>;

  // ============================================================
  // Protected Helper Methods
  // ============================================================

  /**
   * Safe text extraction with fallback.
   * Trims whitespace and normalizes spaces.
   */
  protected getText($: CheerioAPI, selector: string, context?: Cheerio<Element>): string {
    const el = context ? context.find(selector) : $(selector);
    return el.first().text().replace(/\s+/g, ' ').trim();
  }

  /**
   * Get text content of the first matching element.
   */
  protected getTextFirst($: CheerioAPI, ...selectors: string[]): string {
    for (const selector of selectors) {
      const text = $(selector).first().text().replace(/\s+/g, ' ').trim();
      if (text) return text;
    }
    return '';
  }

  /**
   * Get attribute value from the first matching element.
   */
  protected getAttr($: CheerioAPI, selector: string, attr: string): string {
    return $(selector).first().attr(attr)?.trim() || '';
  }

  /**
   * Extract all text items from a list.
   * e.g. <ul><li>Item 1</li><li>Item 2</li></ul>
   */
  protected getListItems($: CheerioAPI, selector: string): string[] {
    const items: string[] = [];
    $(selector).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text) items.push(text);
    });
    return items;
  }

  /**
   * Make a relative URL absolute using the site's base URL.
   */
  protected makeAbsoluteUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${this.config.baseUrl}${url}`;
    return `${this.config.baseUrl}/${url}`;
  }

  /**
   * Extract all href links matching a selector and make them absolute.
   */
  protected extractLinks($: CheerioAPI, selector: string, baseUrl?: string): string[] {
    const links: string[] = [];
    $(selector).each((_, el) => {
      const href = $(el).attr('href')?.trim();
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        links.push(this.makeAbsoluteUrl(href));
      }
    });
    // Remove duplicates
    return [...new Set(links)];
  }

  /**
   * Log extractor activity.
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: object): void {
    logger[level](msg, { siteId: this.siteId, ...meta });
  }
}
