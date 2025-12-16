// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_SCRAPER_CONFIG = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  timeout: 30000, // 30 seconds
  rateLimit: {
    requests: 10,
    period: 60000, // 1 minute
  },
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};

// ============================================================================
// Iranian News Agencies
// ============================================================================

export const IRANIAN_NEWS_SOURCES = [
  {
    name: 'IRNA',
    url: 'https://www.irna.ir/rss',
    type: 'rss',
    category: 'official',
  },
  {
    name: 'ISNA',
    url: 'https://www.isna.ir/rss',
    type: 'rss',
    category: 'semi-official',
  },
  {
    name: 'Tasnim',
    url: 'https://www.tasnimnews.com/fa/rss/feed/0/8/0/%D8%A2%D8%AE%D8%B1%DB%8C%D9%86-%D8%A7%D8%AE%D8%A8%D8%A7%D8%B1-%D8%AA%D8%B3%D9%86%DB%8C%D9%85',
    type: 'rss',
    category: 'semi-official',
  },
  {
    name: 'Fars',
    url: 'https://www.farsnews.ir/rss',
    type: 'rss',
    category: 'semi-official',
  },
  {
    name: 'Mehr',
    url: 'https://www.mehrnews.com/rss',
    type: 'rss',
    category: 'official',
  },
  {
    name: 'Khabar Online',
    url: 'https://www.khabaronline.ir/rss',
    type: 'rss',
    category: 'independent',
  },
  {
    name: 'Tabnak',
    url: 'https://www.tabnak.ir/fa/rss/allnews',
    type: 'rss',
    category: 'independent',
  },
  {
    name: 'Entekhab',
    url: 'https://www.entekhab.ir/rss',
    type: 'rss',
    category: 'independent',
  },
  {
    name: 'Ana',
    url: 'https://www.ana.ir/rss',
    type: 'rss',
    category: 'independent',
  },
  {
    name: 'Mashregh',
    url: 'https://www.mashreghnews.ir/rss',
    type: 'rss',
    category: 'conservative',
  },
];

// ============================================================================
// Analysis Configurations
// ============================================================================

export const SENTIMENT_THRESHOLDS = {
  veryPositive: 0.6,
  positive: 0.2,
  neutral: 0.2,
  negative: -0.2,
  veryNegative: -0.6,
};

export const TREND_DETECTION_CONFIG = {
  minArticles: 5, // Minimum articles to be considered a trend
  timeWindow: 3600000, // 1 hour in ms
  velocityThreshold: 3, // Articles per hour
  accelerationThreshold: 2, // Increase in velocity
};

// ============================================================================
// Google Gemini API Configuration
// ============================================================================

export const GEMINI_CONFIG = {
  model: 'gemini-1.5-flash', // مدل رایگان و سریع گوگل
  maxOutputTokens: 8192,
  temperature: 0.3,
  batchSize: 10, // Process 10 articles at a time
};

// ============================================================================
// Redis Keys
// ============================================================================

export const REDIS_KEYS = {
  ARTICLE_CACHE: 'article:cache:',
  TREND_CACHE: 'trend:cache:',
  RATE_LIMIT: 'rate:limit:',
  SCRAPER_LOCK: 'scraper:lock:',
};

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  INVALID_SOURCE: 'Invalid source configuration',
  SCRAPER_FAILED: 'Failed to scrape source',
  ANALYSIS_FAILED: 'Failed to analyze article',
  DATABASE_ERROR: 'Database operation failed',
  API_ERROR: 'API request failed',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  UNAUTHORIZED: 'Unauthorized access',
  NOT_FOUND: 'Resource not found',
};
