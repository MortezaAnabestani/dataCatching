import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { JobType, JobData } from '@media-intelligence/shared';

// Redis connection configuration
const connection = new IORedis({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Queue instances
export const scraperQueue = new Queue('scraper', { connection });
export const analyzerQueue = new Queue('analyzer', { connection });
export const trendQueue = new Queue('trend', { connection });

// Queue service class
export class QueueService {
  /**
   * Add a scraping job
   */
  static async addScraperJob(sourceId: string, priority: number = 1): Promise<Job> {
    logger.info('Adding scraper job', { sourceId, priority });

    const job = await scraperQueue.add(
      JobType.SCRAPE_SOURCE,
      {
        type: JobType.SCRAPE_SOURCE,
        payload: { sourceId },
        priority,
      } as JobData,
      {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    return job;
  }

  /**
   * Add an analysis job
   */
  static async addAnalyzerJob(articleId: string, priority: number = 1): Promise<Job> {
    logger.info('Adding analyzer job', { articleId, priority });

    const job = await analyzerQueue.add(
      JobType.ANALYZE_ARTICLE,
      {
        type: JobType.ANALYZE_ARTICLE,
        payload: { articleId },
        priority,
      } as JobData,
      {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      }
    );

    return job;
  }

  /**
   * Add batch analysis jobs
   */
  static async addBatchAnalyzerJobs(articleIds: string[]): Promise<Job[]> {
    logger.info('Adding batch analyzer jobs', { count: articleIds.length });

    const jobs = await analyzerQueue.addBulk(
      articleIds.map((articleId, index) => ({
        name: JobType.ANALYZE_ARTICLE,
        data: {
          type: JobType.ANALYZE_ARTICLE,
          payload: { articleId },
          priority: 1,
        } as JobData,
        opts: {
          priority: 1,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      }))
    );

    return jobs;
  }

  /**
   * Add a trend detection job
   */
  static async addTrendDetectionJob(priority: number = 1): Promise<Job> {
    logger.info('Adding trend detection job', { priority });

    const job = await trendQueue.add(
      JobType.DETECT_TRENDS,
      {
        type: JobType.DETECT_TRENDS,
        payload: {},
        priority,
      } as JobData,
      {
        priority,
        repeat: {
          every: 300000, // Every 5 minutes
        },
      }
    );

    return job;
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats() {
    const [scraperCounts, analyzerCounts, trendCounts] = await Promise.all([
      scraperQueue.getJobCounts(),
      analyzerQueue.getJobCounts(),
      trendQueue.getJobCounts(),
    ]);

    return {
      scraper: scraperCounts,
      analyzer: analyzerCounts,
      trend: trendCounts,
    };
  }

  /**
   * Pause all queues
   */
  static async pauseAll(): Promise<void> {
    await Promise.all([scraperQueue.pause(), analyzerQueue.pause(), trendQueue.pause()]);
    logger.info('All queues paused');
  }

  /**
   * Resume all queues
   */
  static async resumeAll(): Promise<void> {
    await Promise.all([scraperQueue.resume(), analyzerQueue.resume(), trendQueue.resume()]);
    logger.info('All queues resumed');
  }

  /**
   * Clean completed jobs
   */
  static async cleanCompleted(ageInMs: number = 86400000): Promise<void> {
    // Default: 24 hours
    await Promise.all([
      scraperQueue.clean(ageInMs, 100, 'completed'),
      analyzerQueue.clean(ageInMs, 100, 'completed'),
      trendQueue.clean(ageInMs, 100, 'completed'),
    ]);
    logger.info('Completed jobs cleaned', { ageInMs });
  }

  /**
   * Clean failed jobs
   */
  static async cleanFailed(ageInMs: number = 604800000): Promise<void> {
    // Default: 7 days
    await Promise.all([
      scraperQueue.clean(ageInMs, 100, 'failed'),
      analyzerQueue.clean(ageInMs, 100, 'failed'),
      trendQueue.clean(ageInMs, 100, 'failed'),
    ]);
    logger.info('Failed jobs cleaned', { ageInMs });
  }
}
