# Quick Start Guide

Get the Media Intelligence Platform running in 5 minutes!

## Prerequisites
- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Docker Desktop running

## Steps

### 1. Install Dependencies (Already Done ✅)
```bash
pnpm install
```

### 2. Set Up Environment
```bash
# Copy the example environment file
cp .env.example .env
```

**IMPORTANT:** Edit `.env` and add your Gemini API key (رایگان):
```env
GEMINI_API_KEY=your_actual_api_key_here
```

Get your **FREE** API key from: https://aistudio.google.com/app/apikey

برای راهنمای کامل، [GEMINI_SETUP.md](GEMINI_SETUP.md) را ببینید.

### 3. Start Docker Services
```bash
# Start MongoDB, Redis, and Elasticsearch
docker-compose up -d

# Verify they're running
docker-compose ps
```

You should see all services in "Up" status.

### 4. Build All Packages
```bash
pnpm build
```

This will build all packages in the correct order.

### 5. Start the API Server
```bash
pnpm --filter @media-intelligence/api dev
```

You should see:
```
[INFO] Scraper worker started
[INFO] Analyzer worker started
[INFO] Database connected successfully
[INFO] Server started on http://0.0.0.0:3000
```

### 6. Test the Installation

Open a **new terminal** and run:

```bash
# Test health endpoint
curl http://localhost:3000/health
```

You should get a JSON response showing the system is healthy.

### 7. Add Your First News Source

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
    }
  }'
```

The system will automatically:
1. Create the source
2. Start scraping articles
3. Analyze them with **Google Gemini AI** (رایگان!)
4. Store everything in MongoDB

### 8. View Results

Wait ~30 seconds, then:

```bash
# Get recent articles
curl http://localhost:3000/articles/recent?limit=5

# Get a specific article with AI analysis
curl http://localhost:3000/articles/{article-id}
```

### 9. Access Web UIs

- **Mongo Express**: http://localhost:8081 (admin/admin123)
  - Browse `sources`, `articles`, `analysis_results` collections

- **RedisInsight**: http://localhost:8082
  - View job queues

## What's Happening?

1. **Scraper Worker** fetches articles from RSS feeds every 5 minutes
2. **Analyzer Worker** uses Google Gemini AI (رایگان) to:
   - Analyze sentiment (positive/negative/neutral)
   - Extract topics and keywords
   - Identify entities (people, organizations, locations)
   - Generate summaries
3. Everything is stored in **MongoDB**
4. Job queues managed by **Redis + BullMQ**

## Next Steps

### Add More Sources

Add all 10 predefined Iranian news sources:

```bash
# Install tsx globally (if not already)
pnpm add -g tsx

# Run the script
tsx scripts/add-default-sources.ts
```

### Explore the API

See [API.md](API.md) for full API documentation:
- List all sources
- Search articles
- Get sentiment analysis
- View trending topics (coming soon)

### Customize Analysis

Edit `packages/ai-analyzer/src/GeminiAnalyzer.ts` to:
- Change analysis prompts
- Adjust Gemini model settings
- Add custom analysis types

یا تنظیمات را در `packages/shared/src/constants.ts` تغییر دهید.

### Monitor Activity

```bash
# View queue statistics
curl http://localhost:3000/queue/stats

# View API logs
# (in the terminal running the API)
```

## Common Issues

### "Port already in use"
```bash
# Change PORT in .env
PORT=3001
```

### "Database connection failed"
```bash
# Make sure Docker is running
docker-compose ps

# Restart MongoDB
docker-compose restart mongodb
```

### "Gemini API error"
- Check your API key in `.env`
- Get FREE API key from: https://aistudio.google.com/app/apikey
- See [GEMINI_SETUP.md](GEMINI_SETUP.md) for help

### "No articles appearing"
- Wait ~1 minute after adding a source
- Check queue stats: `curl http://localhost:3000/queue/stats`
- Check API logs for errors

## Stop Everything

```bash
# Stop API server
# Press Ctrl+C in the API terminal

# Stop Docker services
docker-compose down

# Keep data:
docker-compose down

# Remove all data:
docker-compose down -v
```

## Full Documentation

- **[README.md](README.md)** - Complete overview
- **[SETUP.md](SETUP.md)** - Detailed setup guide
- **[API.md](API.md)** - API documentation
- **Architecture**: See README.md for package structure

---

**Need Help?**
- Check the detailed [SETUP.md](SETUP.md)
- Review error messages in the terminal
- Ensure all prerequisites are met
- Verify .env configuration

**Ready to build more?**
- Phase 2: Implement trend detection
- Phase 3: Add Telegram monitoring
- Phase 4: Build the web dashboard
