import Parser from 'rss-parser';
import {
  ScraperResult,
  Article,
  Source,
  ScraperConfig,
  ArticleStatus,
  normalizeText,
  sanitizeHtml,
} from '@media-intelligence/shared';
import { BaseScraper } from '../base/BaseScraper';
import { logger } from '../logger';

interface RSSItem {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  pubDate?: string;
  creator?: string;
  categories?: string[];
  enclosure?: {
    url?: string;
    type?: string;
  };
  [key: string]: any;
}

export class RSSFeedScraper extends BaseScraper {
  private parser: Parser<any, RSSItem>;

  constructor(source: Source, config?: Partial<ScraperConfig>) {
    super(source, config);

    this.parser = new Parser({
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
          ['dc:creator', 'creator'],
          ['media:content', 'mediaContent'],
          ['description', 'description'],
        ],
      },
    });
  }

  async scrape(): Promise<ScraperResult> {
    const startTime = Date.now();
    const articles: Article[] = [];
    const errors: string[] = [];

    try {
      logger.info(`Starting RSS scrape for ${this.source.name}`, {
        url: this.source.url,
      });

      // Fetch and parse RSS feed
      const feed = await this.fetchAndParseFeed();

      if (!feed || !feed.items || feed.items.length === 0) {
        logger.warn(`No items found in RSS feed for ${this.source.name}`);
        return {
          success: true,
          articles: [],
          metadata: {
            scrapedAt: new Date(),
            duration: Date.now() - startTime,
            sourceId: this.source._id!,
          },
        };
      }

      logger.info(`Found ${feed.items.length} items in RSS feed`, {
        source: this.source.name,
      });

      // Process each RSS item
      for (const item of feed.items) {
        try {
          const article = this.parseRSSItem(item);
          if (article && this.validateArticle(article)) {
            articles.push(article as Article);
          }
        } catch (error) {
          const errorMsg = `Failed to parse RSS item: ${(error as Error).message}`;
          logger.error(errorMsg, { item, error });
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`RSS scrape completed for ${this.source.name}`, {
        articlesFound: articles.length,
        errors: errors.length,
        duration,
      });

      return {
        success: true,
        articles,
        errors: errors.length > 0 ? errors : undefined,
        metadata: {
          scrapedAt: new Date(),
          duration,
          sourceId: this.source._id!,
        },
      };
    } catch (error) {
      const errorMsg = `RSS scraper failed for ${this.source.name}: ${(error as Error).message}`;
      logger.error(errorMsg, { error });

      return {
        success: false,
        articles,
        errors: [errorMsg, ...errors],
        metadata: {
          scrapedAt: new Date(),
          duration: Date.now() - startTime,
          sourceId: this.source._id!,
        },
      };
    }
  }

  private async fetchAndParseFeed(): Promise<Parser.Output<RSSItem>> {
    try {
      const feedData = await this.fetchWithRetry(this.source.url);
      return await this.parser.parseString(feedData);
    } catch (error) {
      logger.error('Failed to fetch or parse RSS feed', {
        source: this.source.name,
        url: this.source.url,
        error,
      });
      throw error;
    }
  }

  private parseRSSItem(item: RSSItem): Partial<Article> | null {
    try {
      // Extract title
      const title = normalizeText(item.title || '');
      if (!title) {
        logger.warn('RSS item missing title', { link: item.link });
        return null;
      }

      // Extract URL
      const url = item.link || '';
      if (!url) {
        logger.warn('RSS item missing link', { title });
        return null;
      }

      // Extract content (try multiple fields)
      let content = '';
      if (item.contentEncoded) {
        content = item.contentEncoded;
      } else if (item.content) {
        content = item.content;
      } else if (item.description) {
        content = item.description;
      } else if (item.contentSnippet) {
        content = item.contentSnippet;
      }

      // Clean and normalize content
      content = sanitizeHtml(content);
      content = normalizeText(content);

      if (!content || content.length < 50) {
        logger.warn('RSS item has insufficient content', { title, url });
        // Still include it, might be valid
      }

      // Extract publish date
      let publishedAt: Date;
      if (item.pubDate) {
        publishedAt = new Date(item.pubDate);
        if (isNaN(publishedAt.getTime())) {
          publishedAt = new Date();
        }
      } else {
        publishedAt = new Date();
      }

      // Extract author
      const author = item.creator || item.author || undefined;

      // Extract categories
      const categories = Array.isArray(item.categories) ? item.categories : [];

      // Extract image URL
      let imageUrl: string | undefined;
      if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image/')) {
        imageUrl = item.enclosure.url;
      } else if (item.mediaContent && typeof item.mediaContent === 'object') {
        imageUrl = (item.mediaContent as any).$ ? (item.mediaContent as any).$.url : undefined;
      }

      return {
        sourceId: this.source._id!,
        title,
        content,
        url,
        publishedAt,
        author,
        categories,
        tags: [],
        imageUrl,
        status: ArticleStatus.PENDING,
        raw: item,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error parsing RSS item', { item, error });
      return null;
    }
  }
}
