import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { SourceModel, ArticleModel } from '@media-intelligence/database';
import { ScraperFactory } from '@media-intelligence/scrapers';
import { JobData, JobType, SourceStatus } from '@media-intelligence/shared';
import { QueueService } from '../services/queue';

const connection = new IORedis({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

export const scraperWorker = new Worker(
  'scraper',
  async (job: Job<JobData>) => {
    const { type, payload } = job.data;

    if (type !== JobType.SCRAPE_SOURCE) {
      throw new Error(`Invalid job type: ${type}`);
    }

    const { sourceId } = payload;

    logger.info('Processing scraper job', { jobId: job.id, sourceId });

    try {
      // Fetch source from database
      const source = await SourceModel.findById(sourceId);
      if (!source) {
        throw new Error(`Source not found: ${sourceId}`);
      }

      if (source.status !== SourceStatus.ACTIVE) {
        logger.warn('Source is not active, skipping', { sourceId, status: source.status });
        return { skipped: true, reason: 'Source not active' };
      }

      // Create scraper instance
      const sourceObj = source.toObject();
      // Convert _id to string for the scraper
      const sourceData = {
        ...sourceObj,
        _id: source._id.toString(),
      };
      const scraper = ScraperFactory.createScraper(sourceData);

      // Scrape the source
      const result = await scraper.scrape();

      if (!result.success) {
        throw new Error(`Scraping failed: ${result.errors?.join(', ')}`);
      }

      logger.info('Scraping completed', {
        sourceId,
        articlesFound: result.articles.length,
      });

      // Save articles to database
      const savedArticles = [];
      for (const article of result.articles) {
        try {
          // Check if article already exists
          const existing = await ArticleModel.findOne({ url: article.url });
          if (existing) {
            logger.debug('Article already exists, skipping', { url: article.url });
            continue;
          }

          // Save new article
          const saved = await ArticleModel.create(article);
          savedArticles.push(saved);

          // Queue for analysis
          await QueueService.addAnalyzerJob(saved._id.toString());
        } catch (error) {
          logger.error('Failed to save article', {
            url: article.url,
            error: (error as Error).message,
          });
        }
      }

      // Update source's last scraped time
      source.lastScrapedAt = new Date();
      await source.save();

      logger.info('Scraper job completed', {
        jobId: job.id,
        sourceId,
        newArticles: savedArticles.length,
        totalFound: result.articles.length,
      });

      return {
        success: true,
        articlesFound: result.articles.length,
        newArticles: savedArticles.length,
        sourceId,
      };
    } catch (error) {
      logger.error('Scraper job failed', {
        jobId: job.id,
        sourceId,
        error: (error as Error).message,
      });

      // Update source status to error
      try {
        await SourceModel.findByIdAndUpdate(sourceId, { status: SourceStatus.ERROR });
      } catch (updateError) {
        logger.error('Failed to update source status', {
          sourceId,
          error: (updateError as Error).message,
        });
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: parseInt(env.SCRAPER_CONCURRENCY),
  }
);

scraperWorker.on('completed', (job) => {
  logger.info('Scraper job completed', { jobId: job.id });
});

scraperWorker.on('failed', (job, error) => {
  logger.error('Scraper job failed', {
    jobId: job?.id,
    error: error.message,
  });
});

scraperWorker.on('error', (error) => {
  logger.error('Scraper worker error', { error: error.message });
});

logger.info('Scraper worker started', {
  concurrency: env.SCRAPER_CONCURRENCY,
});
