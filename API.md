# API Documentation

Base URL: `http://localhost:3000`

## Table of Contents
- [Health & Status](#health--status)
- [Sources Management](#sources-management)
- [Articles](#articles)
- [Queue Management](#queue-management)

---

## Health & Status

### Health Check
Check the overall health of the system.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "healthy",
    "queues": {
      "scraper": {
        "waiting": 5,
        "active": 2,
        "completed": 150,
        "failed": 3
      },
      "analyzer": {
        "waiting": 10,
        "active": 3,
        "completed": 200,
        "failed": 1
      }
    }
  }
}
```

### Queue Statistics
Get detailed statistics about job queues.

**Endpoint:** `GET /queue/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "scraper": {
      "waiting": 5,
      "active": 2,
      "completed": 150,
      "failed": 3,
      "delayed": 0,
      "paused": 0
    },
    "analyzer": {...},
    "trend": {...}
  }
}
```

---

## Sources Management

### List All Sources
Get all configured news sources.

**Endpoint:** `GET /sources`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6789012345",
      "name": "IRNA",
      "type": "rss",
      "url": "https://www.irna.ir/rss",
      "status": "active",
      "metadata": {
        "language": "fa",
        "category": "official",
        "credibilityScore": 85
      },
      "scrapeInterval": 300000,
      "lastScrapedAt": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### Get Source by ID
Get details of a specific source.

**Endpoint:** `GET /sources/:id`

**Parameters:**
- `id` (path) - Source ID

**Response:** Same as single source object above

**Error Response (404):**
```json
{
  "success": false,
  "error": {
    "message": "Source not found",
    "code": "NOT_FOUND"
  }
}
```

### Create New Source
Add a new news source to monitor.

**Endpoint:** `POST /sources`

**Request Body:**
```json
{
  "name": "ISNA",
  "type": "rss",
  "url": "https://www.isna.ir/rss",
  "status": "active",
  "metadata": {
    "language": "fa",
    "category": "semi-official",
    "credibilityScore": 80
  },
  "scrapeInterval": 300000
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6789012346",
    "name": "ISNA",
    ...
  }
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "error": {
    "message": "Failed to create source",
    "code": "VALIDATION_ERROR",
    "details": {...}
  }
}
```

### Update Source
Update an existing source.

**Endpoint:** `PUT /sources/:id`

**Parameters:**
- `id` (path) - Source ID

**Request Body:** (all fields optional)
```json
{
  "name": "ISNA News Agency",
  "status": "inactive",
  "scrapeInterval": 600000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6789012346",
    "name": "ISNA News Agency",
    ...
  }
}
```

### Delete Source
Remove a source from the system.

**Endpoint:** `DELETE /sources/:id`

**Parameters:**
- `id` (path) - Source ID

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

### Trigger Manual Scrape
Manually trigger a scraping job for a source.

**Endpoint:** `POST /sources/:id/scrape`

**Parameters:**
- `id` (path) - Source ID

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "scraper:12345",
    "sourceId": "65a1b2c3d4e5f6789012346"
  }
}
```

---

## Articles

### List Articles
Get articles with pagination and filtering.

**Endpoint:** `GET /articles`

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 20, max: 100)
- `sourceId` (string, optional) - Filter by source ID
- `status` (string, optional) - Filter by status (pending, processed, failed)

**Example:** `GET /articles?page=1&limit=10&sourceId=65a1b2c3d4e5f6789012345`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6789012347",
      "sourceId": {
        "_id": "65a1b2c3d4e5f6789012345",
        "name": "IRNA"
      },
      "title": "عنوان خبر به فارسی",
      "content": "متن کامل خبر...",
      "url": "https://www.irna.ir/news/123456",
      "publishedAt": "2024-01-01T10:30:00.000Z",
      "author": "خبرنگار",
      "categories": ["سیاسی", "اقتصادی"],
      "tags": [],
      "imageUrl": "https://www.irna.ir/images/123.jpg",
      "status": "processed",
      "createdAt": "2024-01-01T10:35:00.000Z",
      "updatedAt": "2024-01-01T10:40:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

### Get Article by ID
Get a specific article with its AI analysis.

**Endpoint:** `GET /articles/:id`

**Parameters:**
- `id` (path) - Article ID

**Response:**
```json
{
  "success": true,
  "data": {
    "article": {
      "_id": "65a1b2c3d4e5f6789012347",
      "title": "عنوان خبر",
      ...
    },
    "analysis": {
      "_id": "65a1b2c3d4e5f6789012348",
      "articleId": "65a1b2c3d4e5f6789012347",
      "sentiment": {
        "sentiment": "neutral",
        "score": 0.05,
        "confidence": 0.85
      },
      "topics": ["اقتصاد", "نفت", "تجارت"],
      "entities": [
        {
          "text": "تهران",
          "type": "LOCATION",
          "relevance": 0.9
        },
        {
          "text": "وزارت نفت",
          "type": "ORGANIZATION",
          "relevance": 0.85
        }
      ],
      "keywords": ["نفت", "صادرات", "قیمت", "بازار"],
      "summary": "خلاصه خبر در 2-3 جمله...",
      "language": "fa",
      "processingTime": 2500,
      "createdAt": "2024-01-01T10:40:00.000Z"
    }
  }
}
```

### Search Articles
Full-text search across articles.

**Endpoint:** `GET /articles/search`

**Query Parameters:**
- `q` (string, required) - Search query
- `page` (number, optional) - Page number
- `limit` (number, optional) - Items per page
- `startDate` (ISO date, optional) - Filter by start date
- `endDate` (ISO date, optional) - Filter by end date

**Example:** `GET /articles/search?q=اقتصاد&startDate=2024-01-01&limit=20`

**Response:** Same as List Articles

**Error (400):**
```json
{
  "success": false,
  "error": {
    "message": "Search query is required",
    "code": "INVALID_QUERY"
  }
}
```

### Get Recent Articles
Get recently published articles.

**Endpoint:** `GET /articles/recent`

**Query Parameters:**
- `hours` (number, optional) - Time window in hours (default: 24)
- `limit` (number, optional) - Maximum articles to return (default: 50)

**Example:** `GET /articles/recent?hours=12&limit=30`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6789012347",
      ...
    }
  ]
}
```

---

## Queue Management

### Pause All Queues
Temporarily stop processing jobs (useful for maintenance).

**Endpoint:** `POST /queue/pause` (to be implemented)

### Resume All Queues

**Endpoint:** `POST /queue/resume` (to be implemented)

### Clean Old Jobs

**Endpoint:** `POST /queue/clean` (to be implemented)

---

## Error Responses

All endpoints may return these standard error responses:

### 400 Bad Request
Invalid request parameters or body.

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {...}
  }
}
```

### 404 Not Found
Resource not found.

```json
{
  "success": false,
  "error": {
    "message": "Resource not found",
    "code": "NOT_FOUND"
  }
}
```

### 500 Internal Server Error
Server error.

```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "INTERNAL_ERROR"
  }
}
```

### 503 Service Unavailable
Service temporarily unavailable (e.g., database down).

```json
{
  "success": false,
  "status": "unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "error": "Database connection failed"
}
```

---

## Data Types

### Source Types
- `rss` - RSS feed scraper
- `telegram` - Telegram channel (coming soon)
- `instagram` - Instagram scraper (coming soon)
- `twitter` - Twitter/X scraper (coming soon)
- `html_scraper` - Custom HTML scraper (coming soon)

### Source Status
- `active` - Currently being scraped
- `inactive` - Paused, not being scraped
- `error` - Scraping failed

### Article Status
- `pending` - Waiting for AI analysis
- `processed` - Analysis complete
- `failed` - Analysis failed

### Sentiment Types
- `positive` - Positive sentiment
- `negative` - Negative sentiment
- `neutral` - Neutral sentiment
- `mixed` - Mixed positive and negative

### Entity Types
- `PERSON` - Person name
- `ORGANIZATION` - Company, agency, institution
- `LOCATION` - City, country, place
- `DATE` - Date or time reference
- `EVENT` - Named event
- `OTHER` - Other entities

---

## Rate Limiting

Currently no rate limiting is enforced on API endpoints. This will be added in future versions.

For the Claude AI integration, rate limiting is handled automatically by the worker concurrency settings.

---

## Authentication

Currently the API is not authenticated. Authentication will be added in future versions.

For production use, consider:
- API keys
- JWT tokens
- OAuth2
- IP whitelisting

---

## Examples

### Complete Workflow Example

```bash
# 1. Add a news source
curl -X POST http://localhost:3000/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fars News",
    "type": "rss",
    "url": "https://www.farsnews.ir/rss",
    "metadata": {"language": "fa", "category": "semi-official"}
  }'

# Response: { "success": true, "data": { "_id": "SOURCE_ID", ... }}

# 2. Wait a few seconds for scraping

# 3. List recent articles
curl http://localhost:3000/articles/recent?hours=1

# 4. Get specific article with analysis
curl http://localhost:3000/articles/ARTICLE_ID

# 5. Search for articles about economy
curl "http://localhost:3000/articles/search?q=اقتصاد"

# 6. Check queue status
curl http://localhost:3000/queue/stats
```

---

For more details, see the main [README.md](README.md) and [SETUP.md](SETUP.md).
