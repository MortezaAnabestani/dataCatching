# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Media Intelligence Platform                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  News        │      │  Telegram    │      │  Social      │
│  Agencies    │◄─────┤  Channels    │◄─────┤  Media       │
│  (RSS)       │      │  (Future)    │      │  (Future)    │
└──────┬───────┘      └──────────────┘      └──────────────┘
       │
       │ Scraping
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    Scraper Workers (BullMQ)                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │Worker 1 │  │Worker 2 │  │Worker 3 │  │Worker 4 │  ...   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Articles
                         ▼
                  ┌──────────────┐
                  │   MongoDB    │
                  │  (Articles)  │
                  └──────┬───────┘
                         │
                         │ Queue Analysis Jobs
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   Analyzer Workers (BullMQ)                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │Worker 1 │  │Worker 2 │  │Worker 3 │                      │
│  │ Claude  │  │ Claude  │  │ Claude  │                      │
│  └─────────┘  └─────────┘  └─────────┘                      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Analysis Results
                         ▼
                  ┌──────────────┐
                  │   MongoDB    │
                  │  (Analysis)  │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  Fastify API │
                  │  (REST)      │
                  └──────┬───────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐    ┌──────────┐    ┌──────────┐
    │ Web    │    │ Mobile   │    │  CLI     │
    │ UI     │    │ App      │    │ Tools    │
    │(Future)│    │ (Future) │    │          │
    └────────┘    └──────────┘    └──────────┘
```

## Data Flow

### 1. Article Scraping Flow

```
News Source (RSS)
       │
       │ HTTP GET
       ▼
┌─────────────────┐
│ RSSFeedScraper  │
│  - Parse RSS    │
│  - Extract data │
│  - Validate     │
└────────┬────────┘
         │
         │ New articles
         ▼
┌─────────────────┐
│  ArticleModel   │
│  (MongoDB)      │
│  - Save         │
│  - Deduplicate  │
└────────┬────────┘
         │
         │ Queue job
         ▼
┌─────────────────┐
│ Analyzer Queue  │
│  (Redis/BullMQ) │
└─────────────────┘
```

### 2. AI Analysis Flow

```
Analyzer Queue
       │
       │ Pick job
       ▼
┌──────────────────┐
│ Analyzer Worker  │
│  - Fetch article │
└────────┬─────────┘
         │
         │ Send to Claude API
         ▼
┌──────────────────────────┐
│   Claude API             │
│   (Anthropic)            │
│                          │
│   Prompt:                │
│   "Analyze this Persian  │
│    article for:          │
│    - Sentiment           │
│    - Topics              │
│    - Entities            │
│    - Keywords"           │
│                          │
└────────┬─────────────────┘
         │
         │ JSON Response
         ▼
┌──────────────────┐
│ Parse Response   │
│  - Extract data  │
│  - Validate      │
└────────┬─────────┘
         │
         │ Save results
         ▼
┌──────────────────┐
│ AnalysisResult   │
│  Model (MongoDB) │
└────────┬─────────┘
         │
         │ Update article status
         ▼
┌──────────────────┐
│ ArticleModel     │
│  status='processed'│
└──────────────────┘
```

### 3. API Request Flow

```
Client (HTTP Request)
       │
       │ GET /articles/:id
       ▼
┌──────────────────┐
│  Fastify Router  │
│  - Route match   │
│  - Validation    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│  Articles Controller │
│  - Parse params      │
│  - Call service      │
└────────┬─────────────┘
         │
         ▼
┌──────────────────┐
│  MongoDB Query   │
│  - Find article  │
│  - Find analysis │
│  - Populate refs │
└────────┬─────────┘
         │
         │ Data
         ▼
┌──────────────────┐
│  Format Response │
│  - JSON          │
│  - Status code   │
└────────┬─────────┘
         │
         │ Send
         ▼
Client (JSON Response)
```

## Component Architecture

### Package Dependencies

```
┌─────────────────────────────────────────────────────┐
│                    apps/api                          │
│  ┌────────────────────────────────────────────┐    │
│  │  Fastify Server + Workers                  │    │
│  │  - Routes (sources, articles, health)      │    │
│  │  - Workers (scraper, analyzer)             │    │
│  │  - Services (queue)                        │    │
│  └────────────────────────────────────────────┘    │
└────────┬────────┬────────┬────────┬────────────────┘
         │        │        │        │
         │        │        │        │
    ┌────▼───┐ ┌─▼──────┐ ┌▼────────┐ ┌▼──────────┐
    │shared  │ │database│ │scrapers │ │ai-analyzer│
    │        │ │        │ │         │ │           │
    │types   │ │models  │ │RSS      │ │Claude     │
    │utils   │ │connect │ │HTML     │ │analysis   │
    │const   │ │        │ │Telegram │ │           │
    └────────┘ └───┬────┘ └───┬─────┘ └─────┬─────┘
                   │          │             │
                   │          │             │
                   │      ┌───▼─────────────▼──┐
                   │      │                    │
                   └──────►    shared          │
                          │    (types, utils)  │
                          └────────────────────┘
```

## Technology Stack Layers

```
┌─────────────────────────────────────────────────────┐
│              Application Layer                       │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  Fastify API │  │   Workers    │                │
│  │  - Routes    │  │  - Scraper   │                │
│  │  - Handlers  │  │  - Analyzer  │                │
│  └──────────────┘  └──────────────┘                │
└────────────┬────────────────┬───────────────────────┘
             │                │
┌────────────▼────────────────▼───────────────────────┐
│              Business Logic Layer                    │
│  ┌───────────┐  ┌──────────┐  ┌─────────────┐     │
│  │ Scrapers  │  │ AI       │  │ Queue       │     │
│  │ - RSS     │  │ - Claude │  │ - BullMQ    │     │
│  │ - Telegram│  │ - OpenAI │  │ - Jobs      │     │
│  └───────────┘  └──────────┘  └─────────────┘     │
└────────────┬────────────────┬───────────────────────┘
             │                │
┌────────────▼────────────────▼───────────────────────┐
│               Data Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ MongoDB  │  │  Redis   │  │Elasticsearch│        │
│  │ - Models │  │ - Cache  │  │ - Search │          │
│  │ - Queries│  │ - Queue  │  │ - Index  │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└──────────────────────────────────────────────────────┘
```

## Database Schema

```
┌─────────────────────────────────────────────────────┐
│                     MongoDB                          │
│                                                      │
│  ┌────────────┐                                     │
│  │  sources   │                                     │
│  │  - name    │                                     │
│  │  - type    │───┐                                 │
│  │  - url     │   │                                 │
│  │  - status  │   │ References                      │
│  └────────────┘   │                                 │
│                   │                                 │
│  ┌────────────┐   │                                 │
│  │  articles  │◄──┘                                 │
│  │  - title   │───┐                                 │
│  │  - content │   │                                 │
│  │  - url     │   │ References                      │
│  │  - status  │   │                                 │
│  └────────────┘   │                                 │
│                   │                                 │
│  ┌────────────────┐│                                 │
│  │ analysis_results│◄                                │
│  │  - sentiment   │                                 │
│  │  - topics      │                                 │
│  │  - entities    │                                 │
│  │  - keywords    │                                 │
│  │  - summary     │                                 │
│  └────────────────┘                                 │
│                                                      │
│  ┌────────────┐    ┌────────────┐                  │
│  │  topics    │    │   trends   │                  │
│  │  - name    │◄───│  - velocity│                  │
│  │  - keywords│    │  - weight  │                  │
│  └────────────┘    └────────────┘                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Job Queue Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Redis / BullMQ                    │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │            Scraper Queue                       │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                │ │
│  │  │ Job1 │→ │ Job2 │→ │ Job3 │→ ...          │ │
│  │  └──────┘  └──────┘  └──────┘                │ │
│  │  Priority: High → Low                         │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │           Analyzer Queue                       │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                │ │
│  │  │ Job1 │→ │ Job2 │→ │ Job3 │→ ...          │ │
│  │  └──────┘  └──────┘  └──────┘                │ │
│  │  Concurrency: 3 workers                       │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │            Trend Queue (Future)                │ │
│  │  ┌──────┐                                      │ │
│  │  │ Job1 │  Scheduled every 5 minutes          │ │
│  │  └──────┘                                      │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │         Dead Letter Queue                      │ │
│  │  Failed jobs after max retries                │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## Worker Concurrency Model

```
┌─────────────────────────────────────────────────────┐
│               Scraper Workers (5)                    │
│                                                      │
│  Worker 1  ──► Source A (IRNA)                      │
│  Worker 2  ──► Source B (ISNA)                      │
│  Worker 3  ──► Source C (Fars)                      │
│  Worker 4  ──► Source D (Mehr)                      │
│  Worker 5  ──► Source E (Tasnim)                    │
│                                                      │
│  Each worker:                                        │
│  1. Fetch RSS feed                                  │
│  2. Parse articles                                  │
│  3. Save to MongoDB (deduplicate)                   │
│  4. Queue for analysis                              │
│  5. Update last scraped time                        │
│                                                      │
│  Rate limiting: 10 requests/minute per source       │
│  Retry: 3 attempts with exponential backoff         │
└──────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Analyzer Workers (3)                    │
│                                                      │
│  Worker 1  ──► Article 1 ──► Claude API             │
│  Worker 2  ──► Article 2 ──► Claude API             │
│  Worker 3  ──► Article 3 ──► Claude API             │
│                                                      │
│  Each worker:                                        │
│  1. Fetch article from MongoDB                      │
│  2. Send to Claude API                              │
│  3. Parse AI response                               │
│  4. Save analysis to MongoDB                        │
│  5. Update article status                           │
│                                                      │
│  Batch size: 10 articles                            │
│  Retry: 3 attempts with exponential backoff         │
└──────────────────────────────────────────────────────┘
```

## Deployment Architecture (Future)

```
┌─────────────────────────────────────────────────────┐
│                     Internet                         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  Cloudflare    │
            │  - CDN         │
            │  - DDoS        │
            └────────┬───────┘
                     │
                     ▼
            ┌────────────────┐
            │  Nginx         │
            │  - SSL/TLS     │
            │  - Load Balance│
            └────────┬───────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │ API    │  │ API    │  │ API    │
   │ Server │  │ Server │  │ Server │
   │   #1   │  │   #2   │  │   #3   │
   └───┬────┘  └───┬────┘  └───┬────┘
       │           │            │
       └───────────┼────────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ MongoDB  │ │  Redis   │ │ Elastic  │
│ Atlas    │ │  Cloud   │ │ Cloud    │
│ (Cluster)│ │ (Cluster)│ │ (Cluster)│
└──────────┘ └──────────┘ └──────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────┐
│                  Security Stack                      │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Application Security                          │ │
│  │  - Input validation (Zod)                      │ │
│  │  - Output sanitization                         │ │
│  │  - Rate limiting                               │ │
│  │  - CORS configuration                          │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Authentication & Authorization (Future)       │ │
│  │  - JWT tokens                                  │ │
│  │  - API keys                                    │ │
│  │  - Role-based access control                  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Network Security                              │ │
│  │  - HTTPS/TLS                                   │ │
│  │  - Firewall rules                              │ │
│  │  - VPC isolation                               │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Data Security                                 │ │
│  │  - Encryption at rest                          │ │
│  │  - Encryption in transit                       │ │
│  │  - Secrets management                          │ │
│  │  - Audit logging                               │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## Monitoring & Observability (Future)

```
┌─────────────────────────────────────────────────────┐
│                  Application                         │
│  - Structured logging (Pino)                        │
│  - Request tracing                                  │
│  - Error tracking                                   │
└────────────┬────────────────────────────────────────┘
             │
             ▼
    ┌────────────────┐
    │  Log Aggregator│
    │  - ELK Stack   │
    │  - Papertrail  │
    └────────┬───────┘
             │
             ▼
    ┌────────────────┐
    │  Metrics       │
    │  - Prometheus  │
    │  - Grafana     │
    └────────┬───────┘
             │
             ▼
    ┌────────────────┐
    │  Alerting      │
    │  - PagerDuty   │
    │  - Slack       │
    └────────────────┘
```

---

## Key Architectural Decisions

### 1. **Microservices vs Monolith**
- **Decision**: Modular monolith with clear package boundaries
- **Rationale**: Simpler deployment, easier development for MVP, can split later

### 2. **Database Choice**
- **Decision**: MongoDB (NoSQL)
- **Rationale**: Flexible schema, good for unstructured data, horizontal scaling

### 3. **Job Queue**
- **Decision**: BullMQ (Redis-based)
- **Rationale**: Persistent jobs, priority queues, great monitoring, retries

### 4. **Language**
- **Decision**: TypeScript
- **Rationale**: Type safety, better DX, prevents bugs, great tooling

### 5. **API Framework**
- **Decision**: Fastify
- **Rationale**: Performance, TypeScript support, plugin ecosystem

### 6. **Monorepo Tool**
- **Decision**: Turborepo
- **Rationale**: Simple, fast builds, good caching, great DX

---

This architecture is designed to be:
- ✅ **Scalable** - Can handle growing data volumes
- ✅ **Maintainable** - Clear separation of concerns
- ✅ **Testable** - Independent packages
- ✅ **Observable** - Logging and monitoring ready
- ✅ **Resilient** - Retry logic, error handling
- ✅ **Extensible** - Easy to add new features
