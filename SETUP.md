# Setup Guide

This guide will walk you through setting up the Media Intelligence Platform from scratch.

## Prerequisites Check

Before starting, ensure you have:

```bash
# Check Node.js version (should be >= 18)
node --version

# Check pnpm (install if needed)
pnpm --version
# If not installed: npm install -g pnpm

# Check Docker
docker --version
docker-compose --version
```

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

This will install dependencies for all packages in the monorepo.

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and configure:

```env
# Required: Add your Claude API key
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Optional: Adjust other settings
MONGODB_URI=mongodb://localhost:27017/media-intelligence
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
LOG_LEVEL=info
SCRAPER_CONCURRENCY=5
ANALYZER_CONCURRENCY=3
```

**Getting an Anthropic API Key:**
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy and paste into `.env`

### 3. Start Infrastructure Services

```bash
# Start MongoDB, Redis, and Elasticsearch
docker-compose up -d

# Verify all services are running
docker-compose ps

# Expected output:
# NAME                                  STATUS
# media-intelligence-mongodb            Up
# media-intelligence-redis              Up
# media-intelligence-elasticsearch      Up
# media-intelligence-mongo-express      Up
# media-intelligence-redis-insight      Up
```

**Troubleshooting:**
- If ports are already in use, edit `docker-compose.yml` to change port mappings
- Check logs: `docker-compose logs -f <service-name>`
- Restart a service: `docker-compose restart <service-name>`

### 4. Build All Packages

```bash
# Build in correct dependency order
pnpm build
```

This builds:
1. `@media-intelligence/shared` (types and utilities)
2. `@media-intelligence/database` (MongoDB models)
3. `@media-intelligence/scrapers` (scraping engines)
4. `@media-intelligence/ai-analyzer` (Claude integration)
5. `@media-intelligence/api` (API server)

**Note:** Turborepo handles build ordering automatically.

### 5. Verify Installation

```bash
# Check that all packages built successfully
ls -la packages/*/dist
ls -la apps/*/dist
```

You should see `dist` folders in each package.

### 6. Start the API Server

#### Development Mode (with hot reload):

```bash
pnpm --filter @media-intelligence/api dev
```

#### Production Mode:

```bash
pnpm --filter @media-intelligence/api start
```

You should see:

```
[INFO] Scraper worker started
[INFO] Analyzer worker started
[INFO] Connecting to database...
[INFO] Database connected successfully
[INFO] Server started on http://0.0.0.0:3000
```

### 7. Test the Installation

Open a new terminal and test the API:

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {
#   "success": true,
#   "status": "healthy",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "services": {
#     "database": "healthy",
#     "queues": {...}
#   }
# }
```

### 8. Add Your First News Source

```bash
curl -X POST http://localhost:3000/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "IRNA News Agency",
    "type": "rss",
    "url": "https://www.irna.ir/rss",
    "metadata": {
      "language": "fa",
      "category": "official",
      "credibilityScore": 85
    },
    "scrapeInterval": 300000
  }'
```

This will:
1. Create the source in the database
2. Automatically queue a scraping job
3. Start fetching articles
4. Queue articles for AI analysis

### 9. Monitor Progress

#### Check Queue Statistics:

```bash
curl http://localhost:3000/queue/stats
```

#### View Recent Articles:

```bash
curl http://localhost:3000/articles/recent?hours=24&limit=10
```

#### View Specific Article with Analysis:

```bash
curl http://localhost:3000/articles/{article-id}
```

### 10. Access Web UIs

- **Mongo Express**: http://localhost:8081
  - Username: `admin`
  - Password: `admin123`
  - Browse collections: `sources`, `articles`, `analysis_results`

- **RedisInsight**: http://localhost:8082
  - View job queues and cache

- **API**: http://localhost:3000

## Adding Multiple Sources

You can add all predefined Iranian news sources at once:

```bash
# Create a script file: scripts/add-sources.ts
```

```typescript
import { SourceModel, db } from '@media-intelligence/database';
import { IRANIAN_NEWS_SOURCES, SourceType } from '@media-intelligence/shared';

async function addSources() {
  await db.connect({ uri: 'mongodb://localhost:27017/media-intelligence' });

  for (const source of IRANIAN_NEWS_SOURCES) {
    try {
      await SourceModel.create({
        name: source.name,
        type: SourceType.RSS,
        url: source.url,
        metadata: {
          language: 'fa',
          category: source.category,
        },
        scrapeInterval: 300000, // 5 minutes
      });
      console.log(`✓ Added ${source.name}`);
    } catch (error) {
      console.error(`✗ Failed to add ${source.name}:`, error.message);
    }
  }

  await db.disconnect();
}

addSources();
```

Run it:

```bash
tsx scripts/add-sources.ts
```

## Monitoring and Maintenance

### View Logs

```bash
# API server logs (if running in background)
docker-compose logs -f api

# Database logs
docker-compose logs -f mongodb

# Redis logs
docker-compose logs -f redis
```

### Clean Old Jobs

The system automatically cleans completed jobs after 24 hours and failed jobs after 7 days.

Manual cleanup:

```bash
# Via API
curl -X POST http://localhost:3000/queue/clean
```

### Backup Database

```bash
# Backup MongoDB
docker exec media-intelligence-mongodb mongodump \
  --out /data/backup \
  --db media-intelligence

# Copy backup to host
docker cp media-intelligence-mongodb:/data/backup ./backup
```

### Restore Database

```bash
# Copy backup to container
docker cp ./backup media-intelligence-mongodb:/data/backup

# Restore
docker exec media-intelligence-mongodb mongorestore \
  --db media-intelligence \
  /data/backup/media-intelligence
```

## Development Workflow

### Making Changes

```bash
# 1. Make changes to any package
# 2. Rebuild that package
pnpm --filter @media-intelligence/scrapers build

# 3. Restart API server (it will pick up changes)
# Press Ctrl+C and restart, or use dev mode for hot reload
```

### Adding New Dependencies

```bash
# Add to specific package
pnpm --filter @media-intelligence/scrapers add axios

# Add to root (dev dependencies)
pnpm add -D -w typescript
```

### Running Individual Packages

```bash
# Build and watch specific package
pnpm --filter @media-intelligence/scrapers dev

# Build all dependencies of a package
pnpm --filter @media-intelligence/api build
```

## Troubleshooting

### Port Already in Use

```bash
# Find what's using port 3000
# Windows:
netstat -ano | findstr :3000

# Linux/Mac:
lsof -i :3000

# Kill the process or change PORT in .env
```

### Database Connection Failed

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Queue Not Processing Jobs

```bash
# Check Redis is running
docker-compose ps redis

# Check queue stats
curl http://localhost:3000/queue/stats

# Restart API server to restart workers
```

### Claude API Errors

Common issues:
- Invalid API key → Check `ANTHROPIC_API_KEY` in `.env`
- Rate limit → Reduce `ANALYZER_CONCURRENCY`
- Quota exceeded → Check your Anthropic account usage

### Build Errors

```bash
# Clean all build artifacts
pnpm clean

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild
pnpm build
```

## Next Steps

1. ✅ System is running
2. ✅ Sources are added
3. ✅ Articles are being scraped
4. ✅ AI analysis is working

Now you can:
- Build the web dashboard (Phase 2)
- Implement trend detection (Phase 2)
- Add Telegram monitoring (Phase 3)
- Customize the analysis prompts in `packages/ai-analyzer`
- Add more news sources
- Implement custom scrapers for HTML-based sources

## Production Deployment

For production deployment, see `DEPLOYMENT.md` (coming soon).

Key considerations:
- Use process manager (PM2, systemd)
- Set up proper logging (pino-papertrail, etc.)
- Configure monitoring (Prometheus, Grafana)
- Use managed MongoDB (MongoDB Atlas)
- Use managed Redis (Redis Cloud)
- Set up reverse proxy (Nginx)
- Enable SSL/TLS
- Set up CI/CD
- Configure auto-scaling

---

**Need Help?**
- Check the main README.md
- Review code comments in packages
- Open an issue
