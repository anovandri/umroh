# Crawlee Scraping Service

A Node.js web scraping microservice built with [Crawlee](https://crawlee.dev/) that collects Umroh and Hajj package data from travel websites. Part of the **Umroh** Nx monorepo.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Install dependencies](#1-install-dependencies)
  - [2. Configure environment](#2-configure-environment)
  - [3. Start Redis](#3-start-redis)
- [Running from the Nx Monorepo](#running-from-the-nx-monorepo)
  - [Development (watch mode)](#development-watch-mode)
  - [Production build](#production-build)
  - [Run production build](#run-production-build)
  - [Run tests](#run-tests)
  - [Lint](#lint)
  - [Docker](#docker)
- [Running directly (without Nx)](#running-directly-without-nx)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Health & Status](#health--status)
  - [Jobs](#jobs)
  - [Queue](#queue)
- [Supported Target Sites](#supported-target-sites)
- [Integration with Spring Boot](#integration-with-spring-boot)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Architecture Overview

```
Spring Boot Backend  ──POST /api/jobs──▶  Crawlee Scraping Service
                                                    │
                                             Bull Queue (Redis)
                                                    │
                                    ┌───────────────┴────────────────┐
                                    │                                │
                             PlaywrightCrawler              CheerioCrawler
                             (JS-heavy sites)               (static HTML)
                                    │                                │
                                    └───────────────┬────────────────┘
                                                    │
                                         DreamtourExtractor
                                         (+ GenericExtractor fallback)
                                                    │
                              POST /api/scraping/receive  (batches of 20)
                              POST /api/scraping/complete
                              POST /api/scraping/failed
                                                    ▼
                                         Spring Boot Backend
```

---

## Prerequisites

| Tool       | Version | Notes                                                 |
| ---------- | ------- | ----------------------------------------------------- |
| Node.js    | ≥ 20    | LTS recommended                                       |
| npm        | ≥ 10    | Comes with Node 20                                    |
| Redis      | ≥ 6     | Used by Bull job queue                                |
| Nx CLI     | 22.x    | Use `./nx` (local wrapper) — no global install needed |
| Playwright | auto    | Browsers installed separately (see below)             |

---

## Getting Started

### 1. Install dependencies

Install from the **monorepo root** — this installs workspace, Nx, and all dev tools (including `ts-node-dev`):

```bash
# From repo root
cd /path/to/umroh
npm install

# Install app-level deps
cd apps/crawlee-scraping-service
npm install
```

> **Note:** `ts-node-dev` and `tsconfig-paths` must be present in the **root** `node_modules` so Nx can find them when running targets. They are already listed in the root `devDependencies` — a fresh `npm install` at the root is sufficient.

Install Playwright browsers (first time only):

```bash
cd apps/crawlee-scraping-service
npx playwright install chromium
```

### 2. Configure environment

```bash
cd apps/crawlee-scraping-service
cp .env.example .env
```

Edit `.env` with your values — at minimum set:

```dotenv
SPRING_BOOT_URL=http://localhost:8080
SERVICE_TOKEN=your-shared-secret-token
REDIS_URL=redis://localhost:6379
```

### 3. Start Redis

```bash
# Using Docker (easiest)
docker run -d --name umroh-redis -p 6379:6379 redis:alpine

# Or via Homebrew on macOS
brew services start redis
```

---

## Running from the Nx Monorepo

All commands are run from the **monorepo root** (`/path/to/umroh`).  
Use `./nx` (the local Nx wrapper) — no global install required.

### Development (watch mode)

Starts the service with `ts-node-dev` — auto-restarts on file changes.

```bash
./nx serve crawlee-scraping-service
```

### Production build

Compiles TypeScript to `dist/apps/crawlee-scraping-service/`.

```bash
./nx build crawlee-scraping-service
```

### Run production build

Runs the compiled output. Requires a successful `build` first.

```bash
./nx serve-prod crawlee-scraping-service
```

### Run tests

```bash
./nx test crawlee-scraping-service
```

### Lint

```bash
./nx lint crawlee-scraping-service
```

### Docker

Build the Docker image:

```bash
./nx docker-build crawlee-scraping-service
```

Run the Docker image:

```bash
./nx docker-run crawlee-scraping-service
```

Or manually with full control:

```bash
# Build (from repo root — Dockerfile uses root as build context)
docker build -f apps/crawlee-scraping-service/Dockerfile -t umroh/crawlee-scraping-service:latest .

# Run
docker run \
  --env-file apps/crawlee-scraping-service/.env \
  -p 3100:3100 \
  --name umroh-scraper \
  umroh/crawlee-scraping-service:latest
```

---

## Running directly (without Nx)

```bash
cd apps/crawlee-scraping-service

# Development
npx ts-node-dev --respawn --transpile-only src/index.ts

# Production
npx tsc -p tsconfig.app.json
node ../../dist/apps/crawlee-scraping-service/index.js
```

---

## API Reference

**Base URL:** `http://localhost:3100`  
**All routes are prefixed with** `/api`

### Authentication

All endpoints except `GET /api/health` require the `X-Service-Token` header:

```
X-Service-Token: your-shared-secret-token
```

> Set `SKIP_AUTH=true` in `.env` when `NODE_ENV=development` to bypass auth during local testing.

---

### Health & Status

#### `GET /api/health`

Health check for Docker/K8s probes. **No authentication required.**

```bash
curl http://localhost:3100/api/health
```

**Response `200`:**

```json
{
  "status": "ok",
  "service": "crawlee-scraping-service",
  "timestamp": "2026-02-21T10:00:00.000Z",
  "version": "1.0.0"
}
```

---

#### `GET /api/status`

Service status including queue statistics.

```bash
curl http://localhost:3100/api/status \
  -H "X-Service-Token: dev-service-token"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "service": "crawlee-scraping-service",
    "queue": {
      "waiting": 3,
      "active": 1,
      "completed": 42,
      "failed": 2,
      "delayed": 0
    },
    "jobs": {
      "total": 10,
      "active": 1
    }
  },
  "timestamp": "2026-02-21T10:00:00.000Z"
}
```

---

### Jobs

#### `POST /api/jobs`

Submit a new scraping job. Returns immediately with `202 Accepted` — processing happens asynchronously.

```bash
curl -X POST http://localhost:3100/api/jobs \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: dev-service-token" \
  -d '{
    "targetUrl": "https://dreamtour.co/paket"
  }'
```

**Request body:**

| Field         | Type                                        | Required | Description                                        |
| ------------- | ------------------------------------------- | -------- | -------------------------------------------------- |
| `targetUrl`   | `string`                                    | ✅       | The URL to start crawling from                     |
| `siteId`      | `string`                                    | ❌       | Override auto-detection (e.g. `"dreamtour-umroh"`) |
| `crawlerType` | `"PLAYWRIGHT" \| "CHEERIO" \| "AUTO"`       | ❌       | Override crawler selection                         |
| `priority`    | `"LOW" \| "NORMAL" \| "HIGH" \| "CRITICAL"` | ❌       | Queue priority (default: `NORMAL`)                 |
| `maxDepth`    | `number`                                    | ❌       | Max crawl depth (default: from site config)        |
| `maxRequests` | `number`                                    | ❌       | Max requests per job                               |
| `callbackUrl` | `string`                                    | ❌       | Override Spring Boot callback URL                  |
| `metadata`    | `object`                                    | ❌       | Pass-through metadata returned in callbacks        |
| `jobId`       | `string`                                    | ❌       | Custom job ID (auto-generated if omitted)          |

**Example — Scrape Umroh packages (auto-detect site):**

```json
{
  "targetUrl": "https://dreamtour.co/paket",
  "priority": "HIGH"
}
```

**Example — Scrape Hajj packages with explicit site config:**

```json
{
  "targetUrl": "https://dreamtour.co/hajj",
  "siteId": "dreamtour-hajj",
  "priority": "NORMAL",
  "metadata": { "requestedBy": "spring-boot", "batchId": "batch-001" }
}
```

**Example — Scrape a specific package detail page:**

```json
{
  "targetUrl": "https://dreamtour.co/paketumroh/975_Ultimate_09Hri_GA_Med",
  "crawlerType": "PLAYWRIGHT",
  "maxDepth": 1
}
```

**Response `202 Accepted`:**

```json
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "status": "QUEUED",
    "message": "Job queued successfully",
    "estimatedStartTime": "2026-02-21T10:00:05.000Z"
  },
  "timestamp": "2026-02-21T10:00:00.000Z"
}
```

---

#### `GET /api/jobs`

List all jobs, optionally filtered by status.

```bash
# All jobs
curl http://localhost:3100/api/jobs \
  -H "X-Service-Token: dev-service-token"

# Filter by status
curl "http://localhost:3100/api/jobs?status=RUNNING" \
  -H "X-Service-Token: dev-service-token"
```

**Query parameters:**

| Param    | Type     | Description                                                                   |
| -------- | -------- | ----------------------------------------------------------------------------- |
| `status` | `string` | Filter by: `PENDING`, `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED` |

**Response `200`:**

```json
{
  "success": true,
  "data": [...],
  "total": 5,
  "timestamp": "2026-02-21T10:00:00.000Z"
}
```

---

#### `GET /api/jobs/:jobId`

Get the full state of a specific job including progress and found packages.

```bash
curl http://localhost:3100/api/jobs/job_abc123 \
  -H "X-Service-Token: dev-service-token"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "status": "RUNNING",
    "request": {
      "targetUrl": "https://dreamtour.co/paket",
      "priority": "NORMAL"
    },
    "createdAt": "2026-02-21T10:00:00.000Z",
    "startedAt": "2026-02-21T10:00:03.000Z",
    "totalRequests": 45,
    "completedRequests": 30,
    "failedRequests": 0,
    "packagesFound": 28,
    "retryCount": 0,
    "maxRetries": 3
  },
  "timestamp": "2026-02-21T10:00:10.000Z"
}
```

**Response `404`** if job ID not found.

---

#### `DELETE /api/jobs/:jobId`

Cancel a queued or running job.

```bash
curl -X DELETE http://localhost:3100/api/jobs/job_abc123 \
  -H "X-Service-Token: dev-service-token"
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Job job_abc123 cancelled",
  "timestamp": "2026-02-21T10:00:00.000Z"
}
```

---

#### `POST /api/jobs/:jobId/retry`

Retry a failed job.

```bash
curl -X POST http://localhost:3100/api/jobs/job_abc123/retry \
  -H "X-Service-Token: dev-service-token"
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Job job_abc123 re-queued",
  "timestamp": "2026-02-21T10:00:00.000Z"
}
```

---

### Queue

#### `GET /api/queue/stats`

Get current Bull queue depth and counters.

```bash
curl http://localhost:3100/api/queue/stats \
  -H "X-Service-Token: dev-service-token"
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "waiting": 2,
    "active": 1,
    "completed": 100,
    "failed": 3,
    "delayed": 0
  },
  "timestamp": "2026-02-21T10:00:00.000Z"
}
```

---

#### `POST /api/queue/pause`

Pause the queue (stops dequeuing new jobs, in-flight jobs finish).

```bash
curl -X POST http://localhost:3100/api/queue/pause \
  -H "X-Service-Token: dev-service-token"
```

---

#### `POST /api/queue/resume`

Resume a paused queue.

```bash
curl -X POST http://localhost:3100/api/queue/resume \
  -H "X-Service-Token: dev-service-token"
```

---

#### `POST /api/queue/clean`

Remove old completed/failed jobs from Redis.

```bash
curl -X POST http://localhost:3100/api/queue/clean \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: dev-service-token" \
  -d '{ "gracePeriodMs": 3600000 }'
```

| Field           | Type     | Description                                                           |
| --------------- | -------- | --------------------------------------------------------------------- |
| `gracePeriodMs` | `number` | Jobs older than this (ms) are removed. `0` = remove all. Default: `0` |

---

## Supported Target Sites

| `siteId`          | Site         | URL                  | Crawler    | Notes                      |
| ----------------- | ------------ | -------------------- | ---------- | -------------------------- |
| `dreamtour-umroh` | Dream Tour   | `dreamtour.co/paket` | Playwright | JS-rendered, auto-detected |
| `dreamtour-hajj`  | Dream Tour   | `dreamtour.co/hajj`  | Playwright | JS-rendered, auto-detected |
| `kemenag-haji`    | Kemenag Haji | `haji.kemenag.go.id` | Cheerio    | Government site, 3s delay  |

**Auto-detection:** If `siteId` is omitted from the job request, the service auto-detects the site from the `targetUrl` pattern. Unrecognized URLs fall back to `GenericExtractor`.

---

## Integration with Spring Boot

The service calls back to the Spring Boot backend at the URL configured in `SPRING_BOOT_URL`. All callbacks include the `X-Service-Token` header.

### Callbacks Spring Boot must implement:

#### `POST /api/scraping/receive`

Called in batches of 20 packages as they are scraped (streaming delivery).

```json
{
  "jobId": "job_abc123",
  "packages": [
    {
      "id": "dreamtour-975",
      "packageName": "Ultimate 09Hri GA Med",
      "category": "UMROH_KHUSUS",
      "price": {
        "amount": 92500000,
        "currency": "IDR",
        "priceType": "STARTING_FROM"
      },
      "duration": 9,
      "hotels": [
        {
          "city": "MADINAH",
          "hotelName": "Shahd Al Madinah",
          "nights": 3,
          "starRating": 4
        },
        {
          "city": "MAKKAH",
          "hotelName": "Fairmont",
          "nights": 4,
          "starRating": 5
        }
      ],
      "airlines": [
        {
          "name": "Garuda Indonesia",
          "code": "GA",
          "flightClass": "BUSINESS",
          "direct": false
        }
      ],
      "departureDates": [],
      "operator": { "name": "Dream Tour", "phone": "08119333000" },
      "sourceUrl": "https://dreamtour.co/paketumroh/975_Ultimate_09Hri_GA_Med",
      "siteId": "dreamtour-umroh",
      "scrapedAt": "2026-02-21T10:00:00.000Z"
    }
  ],
  "isFinal": false
}
```

#### `POST /api/scraping/complete`

Called once when a job finishes successfully.

```json
{
  "jobId": "job_abc123",
  "totalPackages": 87,
  "duration": 45231,
  "siteId": "dreamtour-umroh"
}
```

#### `POST /api/scraping/failed`

Called when a job fails after all retries.

```json
{
  "jobId": "job_abc123",
  "error": "Navigation timeout after 45000ms",
  "retryCount": 3,
  "siteId": "dreamtour-umroh"
}
```

---

## Environment Variables

| Variable                  | Default                  | Description                                         |
| ------------------------- | ------------------------ | --------------------------------------------------- |
| `NODE_ENV`                | `development`            | `development` or `production`                       |
| `PORT`                    | `3100`                   | HTTP server port                                    |
| `LOG_LEVEL`               | `info`                   | Winston log level: `debug`, `info`, `warn`, `error` |
| `SERVICE_TOKEN`           | `dev-service-token`      | Shared auth token with Spring Boot                  |
| `SKIP_AUTH`               | `false`                  | Set `true` to skip token check in development       |
| `SPRING_BOOT_URL`         | `http://localhost:8080`  | Spring Boot callback base URL                       |
| `CALLBACK_TIMEOUT_MS`     | `10000`                  | HTTP timeout for Spring Boot callbacks (ms)         |
| `CALLBACK_MAX_RETRIES`    | `3`                      | Retry attempts for failed callbacks                 |
| `REDIS_URL`               | `redis://localhost:6379` | Redis connection URL                                |
| `SCRAPE_QUEUE_NAME`       | `scrape-jobs`            | Bull queue name                                     |
| `QUEUE_CONCURRENCY`       | `3`                      | Parallel jobs processed at once                     |
| `MAX_JOB_ATTEMPTS`        | `3`                      | Max retry attempts per job                          |
| `JOB_BACKOFF_DELAY_MS`    | `5000`                   | Initial backoff delay for retries (ms)              |
| `CRAWLEE_STORAGE_DIR`     | `./crawlee-storage`      | Crawlee request queue storage path                  |
| `MAX_REQUESTS_PER_CRAWL`  | `500`                    | Max HTTP requests per crawl job                     |
| `MAX_CONCURRENCY`         | `5`                      | Max parallel browser pages / requests               |
| `NAVIGATION_TIMEOUT_SECS` | `60`                     | Playwright navigation timeout                       |
| `REQUEST_TIMEOUT_SECS`    | `30`                     | HTTP request timeout                                |
| `HEADLESS`                | `true`                   | Run Playwright in headless mode                     |

---

## Project Structure

```
apps/crawlee-scraping-service/
├── src/
│   ├── index.ts                    # App entry point (bootstrap)
│   ├── api/
│   │   ├── server.ts               # Express app + auth middleware
│   │   ├── routes.ts               # All route definitions
│   │   └── job-manager.ts          # API bridge to Orchestrator
│   ├── config/
│   │   ├── crawlee-config.ts       # Global Crawlee settings
│   │   └── scraper-configs.ts      # Per-site configs & URL mapping
│   ├── crawlers/
│   │   ├── orchestrator.ts         # Job lifecycle coordinator
│   │   ├── queue-manager.ts        # Bull queue management
│   │   ├── playwright-crawler.ts   # Playwright crawler wrapper
│   │   └── cheerio-crawler.ts      # Cheerio crawler wrapper
│   ├── extractors/
│   │   ├── base-extractor.ts       # Abstract base class
│   │   ├── generic-extractor.ts    # Heuristic fallback extractor
│   │   └── sites/
│   │       ├── index.ts            # Extractor registry & factory
│   │       └── dreamtour.ts        # DreamTour site extractor
│   ├── types/
│   │   └── index.ts                # All TypeScript types
│   └── utils/
│       ├── logger.ts               # Winston logger
│       ├── http-client.ts          # Axios Spring Boot client
│       └── data-validator.ts       # Zod schemas + normalizers
├── .env.example                    # Environment variable template
├── .eslintrc.json
├── Dockerfile                      # Multi-stage Docker build
├── jest.config.ts
├── package.json
├── project.json                    # Nx targets (build/serve/test/lint/docker)
├── tsconfig.json
└── tsconfig.app.json
```
