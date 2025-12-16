import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ArticleModel, AnalysisResultModel } from '@media-intelligence/database';
import { GeminiAnalyzer } from '@media-intelligence/ai-analyzer';
import { JobData, JobType, ArticleStatus } from '@media-intelligence/shared';

const connection = new IORedis({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Initialize Gemini Analyzer
const analyzer = new GeminiAnalyzer({
  apiKey: env.GEMINI_API_KEY,
});

export const analyzerWorker = new Worker(
  'analyzer',
  async (job: Job<JobData>) => {
    const { type, payload } = job.data;

    if (type !== JobType.ANALYZE_ARTICLE) {
      throw new Error(`Invalid job type: ${type}`);
    }

    const { articleId } = payload;

    logger.info('Processing analyzer job', { jobId: job.id, articleId });

    try {
      // Fetch article from database
      const article = await ArticleModel.findById(articleId);
      if (!article) {
        throw new Error(`Article not found: ${articleId}`);
      }

      // Check if already analyzed
      const existingAnalysis = await AnalysisResultModel.findOne({ articleId });
      if (existingAnalysis) {
        logger.warn('Article already analyzed, skipping', { articleId });
        return { skipped: true, reason: 'Already analyzed' };
      }

      // Analyze the article
      const analysis = await analyzer.analyzeArticle(article.toObject());

      // Save analysis result
      await AnalysisResultModel.create(analysis);

      // Update article status
      article.status = ArticleStatus.PROCESSED;
      await article.save();

      logger.info('Analyzer job completed', {
        jobId: job.id,
        articleId,
        processingTime: analysis.processingTime,
      });

      return {
        success: true,
        articleId,
        sentiment: analysis.sentiment.sentiment,
        topics: analysis.topics,
        processingTime: analysis.processingTime,
      };
    } catch (error) {
      logger.error('Analyzer job failed', {
        jobId: job.id,
        articleId,
        error: (error as Error).message,
      });

      // Update article status to failed
      try {
        await ArticleModel.findByIdAndUpdate(articleId, { status: ArticleStatus.FAILED });
      } catch (updateError) {
        logger.error('Failed to update article status', {
          articleId,
          error: (updateError as Error).message,
        });
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: parseInt(env.ANALYZER_CONCURRENCY),
  }
);

analyzerWorker.on('completed', (job) => {
  logger.info('Analyzer job completed', { jobId: job.id });
});

analyzerWorker.on('failed', (job, error) => {
  logger.error('Analyzer job failed', {
    jobId: job?.id,
    error: error.message,
  });
});

analyzerWorker.on('error', (error) => {
  logger.error('Analyzer worker error', { error: error.message });
});

logger.info('Analyzer worker started', {
  concurrency: env.ANALYZER_CONCURRENCY,
});
