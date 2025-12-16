# Media Intelligence Platform

A comprehensive, enterprise-grade platform for monitoring Iranian news agencies and social media, detecting viral trends, and analyzing topic coverage across Persian-language media sources.

## 🎯 Features

### Phase 1 - MVP (Current)
- ✅ **RSS Feed Scraping**: Monitor 30+ Iranian news agencies
- ✅ **AI-Powered Analysis**: Sentiment analysis, topic extraction, and entity recognition using **Google Gemini API** (رایگان!)
- ✅ **Job Queue System**: Scalable background processing with BullMQ
- ✅ **RESTful API**: Comprehensive API for data access and management
- ✅ **MongoDB Storage**: Flexible document storage for articles and analysis
- ✅ **Redis Caching**: Fast caching and queue management

### Future Phases
- 🔄 **Telegram Monitoring**: Track 100+ Persian Telegram channels
- 🔄 **Instagram/Twitter**: Social media monitoring (with fallback strategies)
- 🔄 **Trend Detection**: Real-time viral content identification
- 🔄 **Interactive Dashboard**: Next.js-based visualization dashboard
- 🔄 **Elasticsearch Integration**: Advanced full-text search capabilities

## 🏗️ Architecture

This project uses a **Turborepo monorepo** structure:

```
media-intelligence-platform/
├── apps/
│   ├── api/              # Fastify API server with workers
│   └── web/              # Next.js dashboard (coming soon)
├── packages/
│   ├── shared/           # Shared types, utilities, and constants
│   ├── database/         # Mongoose models and database connection
│   ├── scrapers/         # Scraping engines (RSS, Telegram, etc.)
│   └── ai-analyzer/      # Google Gemini AI integration for analysis
├── docker-compose.yml    # Local development services
└── turbo.json           # Turborepo configuration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Docker** and **Docker Compose** (for local services)
- **Google Gemini API Key** (رایگان - دریافت از: https://aistudio.google.com/app/apikey)

### 1. Clone and Install

```bash
# Install dependencies
pnpm install
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your Gemini API key
# GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Services

```bash
# Start MongoDB, Redis, and Elasticsearch
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 4. Build Packages

```bash
# Build all packages
pnpm build
```

### 5. Run API Server

```bash
# Development mode with hot reload
pnpm --filter @media-intelligence/api dev

# Or production mode
pnpm --filter @media-intelligence/api build
pnpm --filter @media-intelligence/api start
```

The API will be available at `http://localhost:3000`

## 📚 API Endpoints

### Health & Status

- `GET /health` - System health check
- `GET /queue/stats` - Job queue statistics

### Sources Management

- `GET /sources` - List all news sources
- `GET /sources/:id` - Get source details
- `POST /sources` - Create new source
- `PUT /sources/:id` - Update source
- `DELETE /sources/:id` - Delete source
- `POST /sources/:id/scrape` - Trigger manual scrape

### Articles

- `GET /articles` - List articles (with pagination)
- `GET /articles/:id` - Get article with analysis
- `GET /articles/recent?hours=24` - Get recent articles
- `GET /articles/search?q=keyword` - Search articles

## 🔧 Configuration

### Environment Variables

See [.env.example](.env.example) for all available options.

Key configurations:

- `ANTHROPIC_API_KEY`: Your Claude API key (**required**)
- `MONGODB_URI`: MongoDB connection string
- `REDIS_HOST` / `REDIS_PORT`: Redis configuration
- `SCRAPER_CONCURRENCY`: Number of parallel scrapers (default: 5)
- `ANALYZER_CONCURRENCY`: Number of parallel AI analyzers (default: 3)

### Adding News Sources

You can add news sources via API:

```bash
curl -X POST http://localhost:3000/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "IRNA",
    "type": "rss",
    "url": "https://www.irna.ir/rss",
    "metadata": {
      "language": "fa",
      "category": "official"
    },
    "scrapeInterval": 300000
  }'
```

Or use the predefined Iranian news sources from `packages/shared/src/constants.ts`:

```typescript
import { IRANIAN_NEWS_SOURCES } from '@media-intelligence/shared';
```

## 🏃 Development

### Project Structure

Each package is independently buildable and testable:

```bash
# Build specific package
pnpm --filter @media-intelligence/scrapers build

# Watch mode for development
pnpm --filter @media-intelligence/scrapers dev

# Clean build artifacts
pnpm clean
```

### Adding a New Scraper

1. Create a new scraper class in `packages/scrapers/src/scrapers/`
2. Extend `BaseScraper` class
3. Implement the `scrape()` method
4. Register in `ScraperFactory`

Example:

```typescript
import { BaseScraper } from '../base/BaseScraper';

export class TelegramScraper extends BaseScraper {
  async scrape(): Promise<ScraperResult> {
    // Implementation
  }
}
```

### Running Workers

Workers are automatically started with the API server. They process:

- **Scraper Worker**: Fetches content from news sources
- **Analyzer Worker**: Analyzes articles using Claude AI
- **Trend Worker** (coming soon): Detects trending topics

## 📊 Database Schema

### Collections

- **sources**: News agencies and social media sources
- **articles**: Scraped articles and posts
- **analysis_results**: AI analysis (sentiment, topics, entities)
- **topics**: Extracted topics and keywords
- **trends**: Detected trending topics

See `packages/database/src/models/` for detailed schemas.

## 🧪 Testing

```bash
# Run all tests (when implemented)
pnpm test

# Lint all packages
pnpm lint

# Format code
pnpm format
```

## 🐳 Docker Services

The `docker-compose.yml` provides:

- **MongoDB** (port 27017): Document database
- **Redis** (port 6379): Cache and job queue
- **Elasticsearch** (port 9200): Full-text search
- **Mongo Express** (port 8081): MongoDB GUI (username: admin, password: admin123)
- **RedisInsight** (port 8082): Redis GUI

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Remove all data
docker-compose down -v
```

## 🔍 Monitoring

### Queue Dashboard

Monitor job queues at:
- API endpoint: `GET http://localhost:3000/queue/stats`
- RedisInsight: `http://localhost:8082`

### Database

View database content at:
- Mongo Express: `http://localhost:8081`

## 📈 Performance

The platform is designed to handle:

- **10K-50K articles/day** with automatic deduplication
- **Concurrent scraping** of multiple sources
- **Batch AI analysis** with rate limiting
- **Retry logic** with exponential backoff
- **Circuit breaker** pattern for external APIs

## 🛣️ Roadmap

### Phase 2: Trend Detection
- Implement velocity and acceleration calculations
- Add cross-source verification
- Build trending topics algorithm
- Create alert system

### Phase 3: Social Media
- Telegram official API integration
- Instagram scraping (via Apify or similar)
- Twitter/X monitoring

### Phase 4: Dashboard
- Next.js web application
- Real-time trend visualization
- Interactive charts (Recharts/Chart.js)
- Advanced filtering and search

### Phase 5: Advanced Analytics
- Machine learning for trend prediction
- Network analysis for information spread
- Credibility scoring
- Fact-checking integration

## 🔐 Security

- Rate limiting on all endpoints
- Input validation with Zod
- SQL injection protection (using MongoDB)
- XSS prevention
- Environment variable validation
- Secure secrets management

## 🤝 Contributing

This is currently a private project. Contribution guidelines will be added later.

## 📝 License

ISC

## 💡 Support

For issues or questions, create an issue in the repository.

---

**Built with:**
- Node.js + TypeScript
- Fastify (API)
- MongoDB + Mongoose
- Redis + BullMQ
- Claude AI (Anthropic)
- Turborepo

**Persian Language Support:**
All content processing supports UTF-8 and Persian (Farsi) text natively.
