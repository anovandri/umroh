/**
 * Application Entry Point
 * Bootstraps the Crawlee Scraping Service:
 *  1. Loads environment variables
 *  2. Configures Crawlee global settings
 *  3. Starts the Orchestrator (queue + crawlers)
 *  4. Starts the Express HTTP server
 *  5. Registers graceful shutdown handlers
 */

import 'dotenv/config';
import { configureCrawlee } from './config/crawlee-config';
import { orchestrator } from './crawlers/orchestrator';
import { createServer, startServer } from './api/server';
import logger from './utils/logger';

async function bootstrap(): Promise<void> {
  logger.info('==================================================');
  logger.info('  Crawlee Scraping Service — Starting up');
  logger.info('==================================================');

  // Step 1: Configure Crawlee storage
  configureCrawlee();
  logger.info('Crawlee configured');

  // Step 2: Start orchestrator (init crawlers + queue)
  await orchestrator.start();
  logger.info('Orchestrator started');

  // Step 3: Start HTTP server
  const app = createServer();
  await startServer(app);

  logger.info('Service ready to accept requests');
}

// ============================================================
// Graceful Shutdown
// ============================================================

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal} — starting graceful shutdown...`);

  try {
    await orchestrator.stop();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', { error: (err as Error).message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);
});

// ============================================================
// Start
// ============================================================

bootstrap().catch((err: Error) => {
  logger.error('Fatal error during startup', { error: err.message, stack: err.stack });
  process.exit(1);
});
