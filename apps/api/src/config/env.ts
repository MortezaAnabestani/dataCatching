import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Database
  MONGODB_URI: z.string().default('mongodb://localhost:27017/media-intelligence'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // Google Gemini API
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // Elasticsearch (optional for now)
  ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Job Queue
  SCRAPER_CONCURRENCY: z.string().default('5'),
  ANALYZER_CONCURRENCY: z.string().default('3'),
});

export type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
};

export const env = parseEnv();
