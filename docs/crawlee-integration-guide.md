# Using Crawlee for Intelligent Web Scraping with Java Spring Boot Backend

## 📋 Table of Contents
- [Why Crawlee?](#why-crawlee)
- [Architecture Overview](#architecture-overview)
- [Crawlee Service Setup](#crawlee-service-setup)
- [Java Spring Boot Integration](#java-spring-boot-integration)
- [Communication Between Services](#communication-between-services)
- [Scraping Strategies](#scraping-strategies)
- [Data Pipeline](#data-pipeline)
- [Deployment](#deployment)

---

## 🎯 Why Crawlee?

[Crawlee](https://github.com/apify/crawlee) is an excellent choice for web scraping! Here's why:

### ✅ Advantages Over Manual Jsoup:

| Feature | Manual Jsoup | Crawlee |
|---------|-------------|---------|
| JavaScript Rendering | ❌ Limited | ✅ Full support (Playwright/Puppeteer) |
| Anti-Bot Protection | ❌ Manual handling | ✅ Built-in evasion |
| Request Management | ❌ Manual | ✅ Auto queue, retry, rate limiting |
| Browser Automation | ❌ Needs Selenium | ✅ Built-in |
| Proxy Support | ❌ Manual | ✅ Built-in rotation |
| Storage | ❌ Manual | ✅ Built-in dataset/KV store |
| Scalability | ⚠️ Complex | ✅ Easy horizontal scaling |
| Maintenance | ⚠️ High | ✅ Low (well-maintained) |

### 🎯 Perfect For:
- Sites with heavy JavaScript (React, Vue, Angular SPAs)
- Sites with anti-scraping measures
- Complex navigation flows
- Dynamic content loading
- AJAX/API calls

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌─────────────────┐         ┌──────────────────┐          │
│  │  Customer Portal │         │   Back Office    │          │
│  │   (React.js)     │         │  (React Admin)   │          │
│  └────────┬─────────┘         └────────┬─────────┘          │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            │         HTTPS/REST           │
            │                              │
┌───────────▼──────────────────────────────▼──────────────────┐
│              Java Spring Boot Backend                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  API Gateway (Port 8080)                           │    │
│  │  - Authentication                                   │    │
│  │  - Rate Limiting                                    │    │
│  │  - Request Routing                                  │    │
│  └──────┬─────────────────────────────────────────────┘    │
│         │                                                    │
│  ┌──────▼─────────────────────────────────────────────┐    │
│  │  Scraping Management Service                       │    │
│  │  - Schedule scraping jobs                          │    │
│  │  - Manage scraping targets                         │    │
│  │  - Monitor scraping status                         │    │
│  │  - Trigger Crawlee service                         │    │
│  └──────┬─────────────────────────────────────────────┘    │
│         │                                                    │
│  ┌──────▼─────────────────────────────────────────────┐    │
│  │  Package Service                                    │    │
│  │  - Receive scraped data                            │    │
│  │  - Validate & clean data                           │    │
│  │  - Store in PostgreSQL                             │    │
│  │  - Generate embeddings                             │    │
│  │  - Store in Vector DB                              │    │
│  └──────┬─────────────────────────────────────────────┘    │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          │
          │ HTTP/REST API
          │
┌─────────▼────────────────────────────────────────────────────┐
│           Crawlee Scraping Service (Node.js/TypeScript)      │
│  ┌────────────────────────────────────────────────────┐     │
│  │  API Server (Express.js) - Port 3100               │     │
│  │  - POST /scrape/start                              │     │
│  │  - GET /scrape/status/:jobId                       │     │
│  │  - POST /scrape/callback                           │     │
│  └──────┬─────────────────────────────────────────────┘     │
│         │                                                     │
│  ┌──────▼─────────────────────────────────────────────┐     │
│  │  Crawlee Orchestrator                              │     │
│  │  - PlaywrightCrawler (for JS-heavy sites)         │     │
│  │  - CheerioCrawler (for simple HTML)               │     │
│  │  - Request Queue Management                        │     │
│  │  - Data Extraction Logic                           │     │
│  └──────┬─────────────────────────────────────────────┘     │
│         │                                                     │
│  ┌──────▼─────────────────────────────────────────────┐     │
│  │  Site-Specific Extractors                          │     │
│  │  - umroh-indonesia.ts                              │     │
│  │  - hajj-plus.ts                                    │     │
│  │  - generic-extractor.ts (AI-powered)              │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
          │
          │ Sends extracted data
          │
┌─────────▼────────────────────────────────────────────────────┐
│              Data Layer                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  Vector DB   │  │    Redis     │      │
│  │  (Packages)  │  │ (Embeddings) │  │   (Cache)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────────────────────────────────────────┘
```

---

## 🚀 Crawlee Service Setup

### 1. Project Structure

```
crawlee-service/
├── src/
│   ├── api/
│   │   ├── server.ts              # Express.js API server
│   │   └── routes.ts              # API routes
│   ├── crawlers/
│   │   ├── base-crawler.ts        # Base crawler class
│   │   ├── playwright-crawler.ts  # For JS-heavy sites
│   │   └── cheerio-crawler.ts     # For simple HTML sites
│   ├── extractors/
│   │   ├── base-extractor.ts      # Base extractor interface
│   │   ├── generic-extractor.ts   # AI-powered generic extractor
│   │   └── sites/
│   │       ├── umroh-indonesia.ts
│   │       ├── hajj-plus.ts
│   │       └── index.ts
│   ├── config/
│   │   ├── scraper-configs.ts     # Site configurations
│   │   └── crawlee-config.ts      # Crawlee settings
│   ├── utils/
│   │   ├── data-validator.ts      # Validate scraped data
│   │   ├── http-client.ts         # Send data to Spring Boot
│   │   └── logger.ts              # Logging
│   └── index.ts                   # Entry point
├── package.json
├── tsconfig.json
└── Dockerfile
```

### 2. Package.json

```json
{
  "name": "crawlee-scraping-service",
  "version": "1.0.0",
  "description": "Web scraping service for Hajj & Umrah aggregator",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "crawlee": "^3.7.0",
    "playwright": "^1.40.0",
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0",
    "zod": "^3.22.4",
    "bull": "^4.12.0",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node-dev": "^2.0.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "eslint": "^8.54.0"
  }
}
```

### 3. Main Server (src/api/server.ts)

```typescript
import express, { Express, Request, Response } from 'express';
import axios from 'axios';
import { PlaywrightCrawler } from 'crawlee';
import { getSiteExtractor } from '../extractors/sites';
import { logger } from '../utils/logger';
import { ScrapedPackage } from '../types';

const app: Express = express();
app.use(express.json());

const PORT = process.env.PORT || 3100;
const SPRING_BOOT_API = process.env.SPRING_BOOT_API || 'http://localhost:8080';

// Job storage interface
interface JobStatus {
    jobId: string;
    siteId: string;
    url: string;
    status: 'STARTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    packagesFound: number;
    packagesSent: number;
    errors: Array<{url: string; error: string; timestamp: Date}>;
    startedAt?: Date;
    completedAt?: Date;
}

// In-memory job storage (use Redis in production)
const jobs = new Map<string, JobStatus>();

/**
 * Start a scraping job
 * POST /api/scrape/start
 */
app.post('/api/scrape/start', async (req: Request, res: Response) => {
    try {
        const { siteId, url, config } = req.body;

        if (!siteId || !url) {
            return res.status(400).json({
                error: 'Missing required fields: siteId, url'
            });
        }

        // Create job
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const job: JobStatus = {
            jobId,
            siteId,
            url,
            status: 'STARTED',
            packagesFound: 0,
            packagesSent: 0,
            errors: []
        };
        
        jobs.set(jobId, job);
        
        logger.info(`Starting scraping job: ${jobId} for ${siteId}`);

        // Start scraping asynchronously
        startScraping(jobId, siteId, url, config);

        res.status(202).json({
            jobId,
            status: 'STARTED',
            message: 'Scraping job started successfully'
        });

    } catch (error: any) {
        logger.error('Failed to start scraping job', error);
        res.status(500).json({
            error: 'Failed to start scraping job',
            message: error.message
        });
    }
});

/**
 * Get job status
 * GET /api/scrape/status/:jobId
 */
app.get('/api/scrape/status/:jobId', (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({
            error: 'Job not found'
        });
    }

    res.json(job);
});

/**
 * Health check
 */
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        service: 'crawlee-scraping-service',
        timestamp: new Date().toISOString()
    });
});

/**
 * Start the actual scraping process
 */
async function startScraping(
    jobId: string,
    siteId: string,
    url: string,
    config?: any
) {
    const job = jobs.get(jobId)!;
    const scrapedPackages: ScrapedPackage[] = [];

    try {
        // Update job status
        job.status = 'RUNNING';
        job.startedAt = new Date();

        // Get site-specific extractor
        const extractor = getSiteExtractor(siteId);

        // Create crawler
        const crawler = new PlaywrightCrawler({
            // Crawler options
            maxRequestsPerCrawl: config?.maxPages || 50,
            maxConcurrency: config?.concurrency || 3,
            requestHandlerTimeoutSecs: 60,
            
            // Use headless browser
            launchContext: {
                launchOptions: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                    ],
                },
            },

            // Request handler
            async requestHandler({ request, page, enqueueLinks, log }) {
                const currentUrl = request.url;
                log.info(`Scraping: ${currentUrl}`);

                try {
                    // Wait for page to load
                    await page.waitForLoadState('networkidle', { timeout: 30000 });

                    // Extract data using site-specific extractor
                    const packages = await extractor.extract(page, currentUrl);

                    if (packages && packages.length > 0) {
                        scrapedPackages.push(...packages);
                        job.packagesFound += packages.length;
                        
                        logger.info(`Extracted ${packages.length} packages from ${currentUrl}`);

                        // Send to Spring Boot immediately (streaming approach)
                        await sendToSpringBoot(jobId, packages);
                        job.packagesSent += packages.length;
                    }

                    // Find and enqueue links to other package pages
                    if (extractor.shouldFollowLinks(currentUrl)) {
                        await enqueueLinks({
                            selector: extractor.getLinkSelector(),
                            globs: extractor.getUrlPatterns(),
                            transformRequestFunction(req) {
                                // Add custom headers or modify request
                                req.userData = { jobId, siteId };
                                return req;
                            },
                        });
                    }

                } catch (error: any) {
                    log.error(`Failed to extract from ${currentUrl}`, error);
                    job.errors.push({
                        url: currentUrl,
                        error: error.message,
                        timestamp: new Date(),
                    });
                }
            },

            // Failed request handler
            failedRequestHandler({ request, log }) {
                log.error(`Request failed: ${request.url}`);
                job.errors.push({
                    url: request.url,
                    error: 'Request failed',
                    timestamp: new Date(),
                });
            },
        });

        // Run the crawler
        await crawler.run([url]);

        // Update job status
        job.status = 'COMPLETED';
        job.completedAt = new Date();
        
        logger.info(`Scraping job ${jobId} completed. Found ${scrapedPackages.length} packages`);

        // Send final summary to Spring Boot
        await sendJobSummary(jobId, job);

    } catch (error: any) {
        logger.error(`Scraping job ${jobId} failed`, error);
        job.status = 'FAILED';
        job.completedAt = new Date();
        job.errors.push({
            url: url,
            error: error.message,
            timestamp: new Date(),
        });

        // Notify Spring Boot about failure
        await notifyJobFailure(jobId, error.message);
    }
}

/**
 * Send scraped packages to Spring Boot backend
 */
async function sendToSpringBoot(jobId: string, packages: ScrapedPackage[]) {
    try {
        const response = await axios.post(
            `${SPRING_BOOT_API}/api/scraping/receive`,
            {
                jobId,
                packages,
                timestamp: new Date().toISOString(),
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Service-Token': process.env.SERVICE_TOKEN || 'secret',
                },
                timeout: 30000,
            }
        );

        logger.info(`Sent ${packages.length} packages to Spring Boot. Response: ${response.status}`);

    } catch (error: any) {
        logger.error('Failed to send data to Spring Boot', error);
        throw error;
    }
}

/**
 * Send job summary to Spring Boot
 */
async function sendJobSummary(jobId: string, job: JobStatus) {
    try {
        await axios.post(
            `${SPRING_BOOT_API}/api/scraping/complete`,
            {
                jobId,
                status: job.status,
                packagesFound: job.packagesFound,
                packagesSent: job.packagesSent,
                errors: job.errors,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                duration: job.completedAt && job.startedAt 
                    ? job.completedAt.getTime() - job.startedAt.getTime()
                    : 0,
            },
            {
                headers: {
                    'X-Service-Token': process.env.SERVICE_TOKEN || 'secret',
                },
            }
        );

        logger.info(`Job summary sent for ${jobId}`);

    } catch (error) {
        logger.error('Failed to send job summary', error);
    }
}

/**
 * Notify Spring Boot about job failure
 */
async function notifyJobFailure(jobId: string, errorMessage: string) {
    try {
        await axios.post(
            `${SPRING_BOOT_API}/api/scraping/failed`,
            {
                jobId,
                errorMessage,
                timestamp: new Date().toISOString(),
            },
            {
                headers: {
                    'X-Service-Token': process.env.SERVICE_TOKEN || 'secret',
                },
            }
        );
    } catch (error) {
        logger.error('Failed to notify job failure', error);
    }
}

// Start server
app.listen(PORT, () => {
    logger.info(`Crawlee service running on port ${PORT}`);
});

export { jobs };
```

### 4. Site-Specific Extractor Example (src/extractors/sites/umroh-indonesia.ts)

```typescript
import { Page } from 'playwright';
import { BaseExtractor } from '../base-extractor';
import { ScrapedPackage } from '../../types';
import { logger } from '../../utils/logger';

export class UmrohIndonesiaExtractor extends BaseExtractor {
    siteId = 'umroh-indonesia';
    baseUrl = 'https://www.umrohindonesia.com';

    /**
     * Extract packages from the page
     */
    async extract(page: Page, url: string): Promise<ScrapedPackage[]> {
        const packages: ScrapedPackage[] = [];

        try {
            // Check if this is a list page or detail page
            if (this.isListPage(url)) {
                packages.push(...await this.extractFromListPage(page));
            } else if (this.isDetailPage(url)) {
                const pkg = await this.extractFromDetailPage(page, url);
                if (pkg) packages.push(pkg);
            }

        } catch (error: any) {
            logger.error(`Extraction failed for ${url}`, error);
        }

        return packages;
    }

    /**
     * Extract from list page
     */
    private async extractFromListPage(page: Page): Promise<ScrapedPackage[]> {
        const packages: ScrapedPackage[] = [];

        // Wait for package cards to load
        await page.waitForSelector('.package-card', { timeout: 10000 });

        // Get all package cards
        const cards = await page.$$('.package-card');

        for (const card of cards) {
            try {
                const pkg: Partial<ScrapedPackage> = {
                    sourceUrl: page.url(),
                    scrapedAt: new Date().toISOString(),
                };

                // Extract basic info from card
                pkg.name = await card.$eval('h3.package-title', el => el.textContent?.trim());
                
                const priceText = await card.$eval('.price', el => el.textContent?.trim());
                pkg.price = this.extractPrice(priceText || '');
                
                const durationText = await card.$eval('.duration', el => el.textContent?.trim());
                pkg.durationDays = this.extractDuration(durationText || '');

                // Get detail page URL
                const detailUrl = await card.$eval('a', el => el.getAttribute('href'));
                if (detailUrl) {
                    pkg.detailUrl = this.resolveUrl(detailUrl);
                }

                // Extract image
                const imgSrc = await card.$eval('img', el => el.getAttribute('src')).catch(() => null);
                if (imgSrc) {
                    pkg.images = [this.resolveUrl(imgSrc)];
                }

                if (pkg.name && pkg.price) {
                    packages.push(pkg as ScrapedPackage);
                }

            } catch (error) {
                logger.warn('Failed to extract package from card', error);
            }
        }

        return packages;
    }

    /**
     * Check if URL is a list page
     */
    private isListPage(url: string): boolean {
        return url.includes('/paket-umroh') || url.includes('/packages');
    }

    /**
     * Check if URL is a detail page
     */
    private isDetailPage(url: string): boolean {
        return url.includes('/paket/') || url.includes('/package/');
    }

    /**
     * Get CSS selector for finding links to follow
     */
    getLinkSelector(): string {
        return 'a.package-card, a.package-link, .pagination a';
    }

    /**
     * Get URL patterns to follow
     */
    getUrlPatterns(): string[] {
        return [
            `${this.baseUrl}/paket-umroh*`,
            `${this.baseUrl}/paket/*`,
            `${this.baseUrl}/packages*`,
        ];
    }

    /**
     * Should follow links from this URL
     */
    shouldFollowLinks(url: string): boolean {
        return this.isListPage(url);
    }

    // Helper methods
    private extractPrice(text: string): number | null {
        const match = text.match(/[\d.,]+/);
        if (match) {
            const cleaned = match[0].replace(/[.,]/g, '');
            return parseInt(cleaned);
        }
        return null;
    }

    private extractDuration(text: string): number | null {
        const match = text.match(/(\d+)\s*(?:hari|days?)/i);
        return match ? parseInt(match[1]) : null;
    }

    private resolveUrl(url: string): string {
        if (url.startsWith('http')) return url;
        if (url.startsWith('//')) return 'https:' + url;
        if (url.startsWith('/')) return this.baseUrl + url;
        return this.baseUrl + '/' + url;
    }
}
```

---

## ☕ Java Spring Boot Integration

### 1. Scraping Management Controller

```java
// ScrapingController.java
package com.umroh.controller;

import com.umroh.dto.*;
import com.umroh.service.ScrapingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/scraping")
@RequiredArgsConstructor
public class ScrapingController {

    private final ScrapingService scrapingService;

    /**
     * Start a new scraping job
     * Called by admin from back office
     */
    @PostMapping("/start")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ScrapingJobResponse> startScraping(
        @RequestBody StartScrapingRequest request
    ) {
        log.info("Starting scraping job for site: {}", request.getSiteId());
        
        ScrapingJobResponse response = scrapingService.startScrapingJob(request);
        
        return ResponseEntity.accepted().body(response);
    }

    /**
     * Receive scraped packages from Crawlee service
     * Called by Crawlee service
     */
    @PostMapping("/receive")
    public ResponseEntity<Void> receiveScrapedPackages(
        @RequestHeader("X-Service-Token") String serviceToken,
        @RequestBody ScrapedPackagesRequest request
    ) {
        // Validate service token
        if (!scrapingService.validateServiceToken(serviceToken)) {
            return ResponseEntity.status(401).build();
        }

        log.info("Received {} packages from job {}", 
            request.getPackages().size(), 
            request.getJobId()
        );

        // Process packages asynchronously
        scrapingService.processScrapedPackages(
            request.getJobId(),
            request.getPackages()
        );

        return ResponseEntity.ok().build();
    }

    /**
     * Job completion callback from Crawlee
     */
    @PostMapping("/complete")
    public ResponseEntity<Void> jobCompleted(
        @RequestHeader("X-Service-Token") String serviceToken,
        @RequestBody Map<String, Object> summary
    ) {
        if (!scrapingService.validateServiceToken(serviceToken)) {
            return ResponseEntity.status(401).build();
        }

        log.info("Scraping job completed: {}", summary.get("jobId"));
        
        scrapingService.handleJobCompletion(summary);

        return ResponseEntity.ok().build();
    }

    /**
     * Job failure callback from Crawlee
     */
    @PostMapping("/failed")
    public ResponseEntity<Void> jobFailed(
        @RequestHeader("X-Service-Token") String serviceToken,
        @RequestBody Map<String, Object> failure
    ) {
        if (!scrapingService.validateServiceToken(serviceToken)) {
            return ResponseEntity.status(401).build();
        }

        log.error("Scraping job failed: {}", failure.get("jobId"));
        
        scrapingService.handleJobFailure(failure);

        return ResponseEntity.ok().build();
    }

    /**
     * Get scraping job status
     */
    @GetMapping("/status/{jobId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ScrapingJobStatus> getJobStatus(
        @PathVariable String jobId
    ) {
        ScrapingJobStatus status = scrapingService.getJobStatus(jobId);
        
        if (status == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(status);
    }
}
```

### 2. Scraping Service

```java
// ScrapingService.java
package com.umroh.service;

import com.umroh.dto.*;
import com.umroh.entity.Package;
import com.umroh.entity.ScrapingJob;
import com.umroh.repository.PackageRepository;
import com.umroh.repository.ScrapingJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScrapingService {

    private final RestTemplate restTemplate;
    private final ScrapingJobRepository jobRepository;
    private final PackageRepository packageRepository;
    private final PackageService packageService;
    private final EmbeddingService embeddingService;
    
    @Value("${crawlee.service.url}")
    private String crawleeServiceUrl;
    
    @Value("${crawlee.service.token}")
    private String serviceToken;

    /**
     * Start a scraping job by calling Crawlee service
     */
    public ScrapingJobResponse startScrapingJob(StartScrapingRequest request) {
        // Create job record
        ScrapingJob job = new ScrapingJob();
        job.setJobId(UUID.randomUUID().toString());
        job.setSiteId(request.getSiteId());
        job.setTargetUrl(request.getUrl());
        job.setStatus("INITIATED");
        job.setCreatedAt(LocalDateTime.now());
        
        jobRepository.save(job);

        // Call Crawlee service
        try {
            CrawleeStartRequest crawleeRequest = CrawleeStartRequest.builder()
                .siteId(request.getSiteId())
                .url(request.getUrl())
                .config(request.getConfig())
                .build();

            String endpoint = crawleeServiceUrl + "/api/scrape/start";
            
            CrawleeStartResponse response = restTemplate.postForObject(
                endpoint,
                crawleeRequest,
                CrawleeStartResponse.class
            );

            // Update job with Crawlee job ID
            job.setCrawleeJobId(response.getJobId());
            job.setStatus("STARTED");
            jobRepository.save(job);

            return ScrapingJobResponse.builder()
                .jobId(job.getJobId())
                .crawleeJobId(response.getJobId())
                .status("STARTED")
                .message("Scraping job started successfully")
                .build();

        } catch (Exception e) {
            log.error("Failed to start scraping job", e);
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            jobRepository.save(job);

            throw new RuntimeException("Failed to start scraping job: " + e.getMessage());
        }
    }

    /**
     * Process scraped packages received from Crawlee
     */
    @Async
    @Transactional
    public CompletableFuture<Void> processScrapedPackages(
        String jobId,
        List<ScrapedPackageDto> scrapedPackages
    ) {
        log.info("Processing {} scraped packages for job {}", scrapedPackages.size(), jobId);

        ScrapingJob job = jobRepository.findByJobId(jobId)
            .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));

        int successCount = 0;
        int failureCount = 0;

        for (ScrapedPackageDto scrapedDto : scrapedPackages) {
            try {
                // Validate data
                if (!isValidPackageData(scrapedDto)) {
                    log.warn("Invalid package data: {}", scrapedDto.getName());
                    failureCount++;
                    continue;
                }

                // Check for duplicates
                if (packageRepository.existsBySourceUrl(scrapedDto.getSourceUrl())) {
                    log.debug("Package already exists: {}", scrapedDto.getSourceUrl());
                    // Update existing package instead
                    updateExistingPackage(scrapedDto);
                } else {
                    // Create new package
                    createNewPackage(scrapedDto, job);
                }

                successCount++;

            } catch (Exception e) {
                log.error("Failed to process package: {}", scrapedDto.getName(), e);
                failureCount++;
            }
        }

        // Update job statistics
        job.setPackagesFound(job.getPackagesFound() + scrapedPackages.size());
        job.setPackagesSaved(job.getPackagesSaved() + successCount);
        jobRepository.save(job);

        log.info("Processed packages: {} success, {} failures", successCount, failureCount);

        return CompletableFuture.completedFuture(null);
    }

    /**
     * Create new package from scraped data
     */
    private void createNewPackage(ScrapedPackageDto scrapedDto, ScrapingJob job) {
        Package pkg = new Package();
        
        // Map fields
        pkg.setName(scrapedDto.getName());
        pkg.setDescription(scrapedDto.getDescription());
        pkg.setPrice(scrapedDto.getPrice());
        pkg.setCurrency(scrapedDto.getCurrency());
        pkg.setDurationDays(scrapedDto.getDurationDays());
        pkg.setSourceUrl(scrapedDto.getSourceUrl());
        pkg.setScrapedAt(LocalDateTime.now());

        // Save package
        pkg = packageRepository.save(pkg);

        // Generate and store embedding
        String textForEmbedding = pkg.getName() + " " + 
            (pkg.getDescription() != null ? pkg.getDescription() : "");
        
        float[] embedding = embeddingService.generateEmbedding(textForEmbedding);
        embeddingService.storeEmbedding(pkg.getId(), embedding);

        log.info("Created new package: {}", pkg.getName());
    }

    /**
     * Validate scraped package data
     */
    private boolean isValidPackageData(ScrapedPackageDto dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            return false;
        }
        if (dto.getPrice() == null || dto.getPrice() <= 0) {
            return false;
        }
        if (dto.getSourceUrl() == null) {
            return false;
        }
        return true;
    }

    /**
     * Validate service token
     */
    public boolean validateServiceToken(String token) {
        return serviceToken.equals(token);
    }
}
```

---

## 🔄 Communication Flow

```
┌─────────────────┐
│   Back Office   │
│   Admin Panel   │
└────────┬────────┘
         │
         │ 1. POST /api/scraping/start
         │    { siteId: "umroh-indonesia", url: "..." }
         ▼
┌─────────────────────────────────────┐
│   Spring Boot API Gateway           │
│   - Authenticate admin              │
│   - Create job record in DB         │
│   - Generate jobId                  │
└────────┬────────────────────────────┘
         │
         │ 2. POST /api/scrape/start
         │    Forward request to Crawlee
         ▼
┌─────────────────────────────────────┐
│   Crawlee Service                   │
│   - Create crawler job              │
│   - Start crawling                  │
│   - Return job ID immediately       │
└────────┬────────────────────────────┘
         │
         │ 3. Crawling in progress...
         │    Extract packages
         │
         │ 4. POST /api/scraping/receive
         │    { jobId, packages: [...] }
         │    (streaming approach - sends batches)
         ▼
┌─────────────────────────────────────┐
│   Spring Boot Backend               │
│   - Validate data                   │
│   - Save to PostgreSQL              │
│   - Generate embeddings             │
│   - Store in Vector DB              │
└─────────────────────────────────────┘
         │
         │ 5. POST /api/scraping/complete
         │    { jobId, summary: {...} }
         ▼
┌─────────────────────────────────────┐
│   Spring Boot Backend               │
│   - Update job status               │
│   - Send notification to admin      │
└─────────────────────────────────────┘
```

---

## 🐳 Deployment

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Spring Boot Backend
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=production
      - DATABASE_URL=jdbc:postgresql://postgres:5432/umroh
      - REDIS_HOST=redis
      - CRAWLEE_SERVICE_URL=http://crawlee-service:3100
      - CRAWLEE_SERVICE_TOKEN=${SERVICE_TOKEN}
    depends_on:
      - postgres
      - redis
      - milvus

  # Crawlee Scraping Service
  crawlee-service:
    build: ./crawlee-service
    ports:
      - "3100:3100"
    environment:
      - NODE_ENV=production
      - PORT=3100
      - SPRING_BOOT_API=http://backend:8080
      - SERVICE_TOKEN=${SERVICE_TOKEN}
    depends_on:
      - backend
    # Install Playwright browsers
    command: sh -c "npx playwright install chromium && npm start"

  # PostgreSQL
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=umroh
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  # Redis
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  # Milvus Vector DB
  milvus:
    image: milvusdb/milvus:latest
    ports:
      - "19530:19530"
    volumes:
      - milvus_data:/var/lib/milvus

volumes:
  postgres_data:
  redis_data:
  milvus_data:
```

---

## 🎯 Summary

### ✅ Advantages of Using Crawlee:

1. **Handles JavaScript**: Perfect for modern SPA websites
2. **Anti-Bot Protection**: Built-in evasion techniques
3. **Request Management**: Auto queue, retry, rate limiting
4. **Scalability**: Easy to scale horizontally
5. **Maintenance**: Well-maintained by Apify team
6. **TypeScript**: Type-safe, modern development

### ✅ Java Spring Boot Role:

1. **Orchestration**: Trigger and manage scraping jobs
2. **Authentication**: Secure access to scraping endpoints
3. **Data Processing**: Validate, clean, store scraped data
4. **Business Logic**: Classification, recommendations, ML
5. **API Layer**: Serve data to frontend applications
6. **Monitoring**: Track scraping success/failures

### 🔄 Best Practices:

1. **Streaming Data**: Send packages in batches, not all at once
2. **Idempotency**: Handle duplicate packages gracefully
3. **Error Handling**: Retry failed extractions
4. **Rate Limiting**: Respect target websites
5. **Monitoring**: Log everything for debugging
6. **Caching**: Cache scraper configs in Redis

This architecture gives you the best of both worlds: powerful web scraping with Crawlee and robust backend management with Spring Boot!
