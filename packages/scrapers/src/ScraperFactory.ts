import { Source, SourceType, ScraperConfig } from '@media-intelligence/shared';
import { BaseScraper } from './base/BaseScraper';
import { RSSFeedScraper } from './scrapers/RSSFeedScraper';
import { logger } from './logger';

export class ScraperFactory {
  /**
   * Create a scraper instance based on source type
   */
  static createScraper(source: Source, config?: Partial<ScraperConfig>): BaseScraper {
    logger.debug('Creating scraper', { sourceType: source.type, sourceName: source.name });

    switch (source.type) {
      case SourceType.RSS:
        return new RSSFeedScraper(source, config);

      case SourceType.TELEGRAM:
        throw new Error('Telegram scraper not yet implemented');

      case SourceType.INSTAGRAM:
        throw new Error('Instagram scraper not yet implemented');

      case SourceType.TWITTER:
        throw new Error('Twitter scraper not yet implemented');

      case SourceType.HTML_SCRAPER:
        throw new Error('HTML scraper not yet implemented');

      default:
        throw new Error(`Unknown source type: ${source.type}`);
    }
  }

  /**
   * Check if a scraper is available for the source type
   */
  static isSupported(sourceType: SourceType): boolean {
    return sourceType === SourceType.RSS;
  }

  /**
   * Get list of supported source types
   */
  static getSupportedTypes(): SourceType[] {
    return [SourceType.RSS];
  }
}
