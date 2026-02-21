import express, { Application, Request, Response, NextFunction } from 'express';
import { router } from './routes';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

// ============================================================
// Express Server
// Provides the HTTP interface for job submission and management.
// Listens on port 3100 (configurable via PORT env var).
// ============================================================

const PORT = parseInt(process.env.PORT || '3100', 10);
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'dev-service-token';

export function createServer(): Application {
  const app = express();

  // ── Middleware ───────────────────────────────────────────

  // JSON body parser (up to 5MB for large batch callbacks)
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
    });
    next();
  });

  // Service token authentication for non-health endpoints
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Allow health check without auth
    if (req.path === '/api/health') return next();

    // Skip auth in development mode
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      return next();
    }

    const token = req.headers['x-service-token'];
    if (!token || token !== SERVICE_TOKEN) {
      logger.warn('Unauthorized request', { path: req.path, ip: req.ip });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized — X-Service-Token header required',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return next();
  });

  // ── Routes ───────────────────────────────────────────────
  app.use('/api', router);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error in request', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  });

  return app;
}

export async function startServer(app: Application): Promise<void> {
  return new Promise((resolve) => {
    app.listen(PORT, () => {
      logger.info(`Crawlee Scraping Service listening`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        authEnabled: process.env.SKIP_AUTH !== 'true',
      });
      resolve();
    });
  });
}
