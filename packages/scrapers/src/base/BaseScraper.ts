import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import PQueue from 'p-queue';
import {
  ScraperConfig,
  ScraperResult,
  Article,
  Source,
  DEFAULT_SCRAPER_CONFIG,
  retry,
  delay,
} from '@media-intelligence/shared';
import { logger } from '../logger';

export abstract class BaseScraper {
  protected axios: AxiosInstance;
  protected queue: PQueue;
  protected config: ScraperConfig;
  protected source: Source;

  constructor(source: Source, config?: Partial<ScraperConfig>) {
    this.source = source;
    this.config = {
      ...DEFAULT_SCRAPER_CONFIG,
      ...config,
    };

    // Initialize axios with default config
    this.axios = axios.create({
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent || DEFAULT_SCRAPER_CONFIG.userAgent,
        'Accept-Language': 'fa,en;q=0.9',
      },
    });

    // Initialize rate-limited queue
    this.queue = new PQueue({
      interval: this.config.rateLimit.period,
      intervalCap: this.config.rateLimit.requests,
      timeout: this.config.timeout,
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Request failed', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Main scrape method - must be implemented by child classes
   */
  abstract scrape(): Promise<ScraperResult>;

  /**
   * Fetch URL with rate limiting and retry logic
   */
  protected async fetchWithRetry(url: string, config?: AxiosRequestConfig): Promise<string> {
    return this.queue.add(async () => {
      return retry(
        async () => {
          logger.debug(`Fetching: ${url}`);
          const response = await this.axios.get(url, config);
          return response.data;
        },
        this.config.maxRetries,
        this.config.retryDelay
      );
    }) as Promise<string>;
  }

  /**
   * Validate scraped article
   */
  protected validateArticle(article: Partial<Article>): boolean {
    if (!article.title || article.title.trim().length === 0) {
      logger.warn('Article missing title', { url: article.url });
      return false;
    }

    if (!article.content || article.content.trim().length < 100) {
      logger.warn('Article content too short', {
        url: article.url,
        length: article.content?.length || 0,
      });
      return false;
    }

    if (!article.url || !article.url.startsWith('http')) {
      logger.warn('Invalid article URL', { url: article.url });
      return false;
    }

    if (!article.publishedAt || isNaN(article.publishedAt.getTime())) {
      logger.warn('Invalid article date', { url: article.url });
      return false;
    }

    return true;
  }

  /**
   * Normalize article URL
   */
  protected normalizeUrl(url: string, baseUrl: string): string {
    try {
      // If URL is absolute, return as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      // If URL is protocol-relative
      if (url.startsWith('//')) {
        return `https:${url}`;
      }

      // If URL is relative
      const base = new URL(baseUrl);
      if (url.startsWith('/')) {
        return `${base.origin}${url}`;
      }

      return `${base.origin}/${url}`;
    } catch (error) {
      logger.error('Failed to normalize URL', { url, baseUrl, error });
      return url;
    }
  }

  /**
   * Parse date from various formats
   */
  protected parseDate(dateString: string): Date {
    // Try ISO format first
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try Persian/Jalali date patterns if needed
    // This is a placeholder - you might want to add a Jalali calendar library
    // For now, fallback to current date
    logger.warn('Could not parse date, using current time', { dateString });
    return new Date();
  }

  /**
   * Extract text from HTML
   */
  protected extractText(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get scraper name
   */
  public getName(): string {
    return this.constructor.name;
  }

  /**
   * Get source information
   */
  public getSource(): Source {
    return this.source;
  }
}
