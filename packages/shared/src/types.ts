import { z } from 'zod';

// ============================================================================
// Source Types
// ============================================================================

export enum SourceType {
  RSS = 'rss',
  TELEGRAM = 'telegram',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  HTML_SCRAPER = 'html_scraper',
}

export enum SourceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

export const SourceSchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  type: z.nativeEnum(SourceType),
  url: z.string().url(),
  status: z.nativeEnum(SourceStatus).default(SourceStatus.ACTIVE),
  config: z.record(z.any()).optional(),
  metadata: z
    .object({
      language: z.string().default('fa'),
      category: z.string().optional(),
      credibilityScore: z.number().min(0).max(100).optional(),
    })
    .optional(),
  scrapeInterval: z.number().default(300000), // 5 minutes in ms
  lastScrapedAt: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Source = z.infer<typeof SourceSchema>;

// ============================================================================
// Article Types
// ============================================================================

export enum ArticleStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

export const ArticleSchema = z.object({
  _id: z.string().optional(),
  sourceId: z.string(),
  title: z.string(),
  content: z.string(),
  url: z.string().url(),
  publishedAt: z.date(),
  author: z.string().optional(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional(),
  status: z.nativeEnum(ArticleStatus).default(ArticleStatus.PENDING),
  raw: z.record(z.any()).optional(), // Original scraped data
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Article = z.infer<typeof ArticleSchema>;

// ============================================================================
// Analysis Types
// ============================================================================

export enum SentimentType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  MIXED = 'mixed',
}

export const SentimentAnalysisSchema = z.object({
  sentiment: z.nativeEnum(SentimentType),
  score: z.number().min(-1).max(1), // -1 (very negative) to 1 (very positive)
  confidence: z.number().min(0).max(1),
});

export type SentimentAnalysis = z.infer<typeof SentimentAnalysisSchema>;

export const EntitySchema = z.object({
  text: z.string(),
  type: z.enum(['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE', 'EVENT', 'OTHER']),
  relevance: z.number().min(0).max(1),
});

export type Entity = z.infer<typeof EntitySchema>;

export const AnalysisResultSchema = z.object({
  _id: z.string().optional(),
  articleId: z.string(),
  sentiment: SentimentAnalysisSchema,
  topics: z.array(z.string()),
  entities: z.array(EntitySchema),
  keywords: z.array(z.string()),
  summary: z.string().optional(),
  language: z.string().default('fa'),
  processingTime: z.number().optional(), // in milliseconds
  createdAt: z.date().default(() => new Date()),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ============================================================================
// Topic & Trend Types
// ============================================================================

export const TopicSchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  keywords: z.array(z.string()),
  description: z.string().optional(),
  category: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Topic = z.infer<typeof TopicSchema>;

export const TrendSchema = z.object({
  _id: z.string().optional(),
  topicId: z.string(),
  topic: z.string(),
  articleCount: z.number(),
  velocity: z.number(), // Articles per hour
  acceleration: z.number(), // Change in velocity
  sources: z.array(z.string()), // Source IDs
  sentiment: SentimentAnalysisSchema.optional(),
  peakTime: z.date().optional(),
  startTime: z.date(),
  endTime: z.date().optional(),
  isActive: z.boolean().default(true),
  weight: z.number().default(0), // Calculated importance score
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Trend = z.infer<typeof TrendSchema>;

// ============================================================================
// Scraper Types
// ============================================================================

export interface ScraperConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  rateLimit: {
    requests: number;
    period: number; // in milliseconds
  };
  userAgent?: string;
}

export interface ScraperResult {
  success: boolean;
  articles: Article[];
  errors?: string[];
  metadata?: {
    scrapedAt: Date;
    duration: number;
    sourceId: string;
  };
}

// ============================================================================
// API Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  query?: string;
  sourceId?: string;
  startDate?: Date;
  endDate?: Date;
  sentiment?: SentimentType;
  topics?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Job Queue Types
// ============================================================================

export enum JobType {
  SCRAPE_SOURCE = 'scrape_source',
  ANALYZE_ARTICLE = 'analyze_article',
  DETECT_TRENDS = 'detect_trends',
  UPDATE_TREND_WEIGHTS = 'update_trend_weights',
}

export interface JobData {
  type: JobType;
  payload: any;
  priority?: number;
}
