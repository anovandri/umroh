import winston, { createLogger, format, transports } from 'winston';

const { combine, timestamp, errors, json, colorize, printf } = format;

// ============================================================
// Log Levels
// ============================================================

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'crawlee-scraping-service';

// ============================================================
// Custom Format for Development (human-readable)
// ============================================================

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, jobId, siteId, url, stack, ...meta }) => {
    let log = `${ts} [${level}]`;
    if (jobId) log += ` [job:${jobId}]`;
    if (siteId) log += ` [site:${siteId}]`;
    if (url) log += ` [${url}]`;
    log += ` ${message}`;
    if (stack) log += `\n${stack}`;
    const metaStr = Object.keys(meta).length ? `\n  ${JSON.stringify(meta)}` : '';
    return log + metaStr;
  }),
);

// ============================================================
// Production Format (structured JSON)
// ============================================================

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

// ============================================================
// Logger Instance
// ============================================================

export const logger = createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: SERVICE_NAME },
  format: NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
  ],
  exceptionHandlers: [
    new transports.Console(),
  ],
  rejectionHandlers: [
    new transports.Console(),
  ],
});

// Add file transport in production
if (NODE_ENV === 'production') {
  logger.add(new transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  }));
  logger.add(new transports.File({
    filename: 'logs/combined.log',
    maxsize: 20 * 1024 * 1024, // 20MB
    maxFiles: 10,
  }));
}

// ============================================================
// Child Logger Factory
// Creates contextual loggers with bound metadata
// ============================================================

export interface LogContext {
  jobId?: string;
  siteId?: string;
  url?: string;
  [key: string]: unknown;
}

export function createJobLogger(context: LogContext): winston.Logger {
  return logger.child(context);
}

// ============================================================
// Crawlee-compatible Log Adapter
// Crawlee uses its own log interface; this bridges to winston
// ============================================================

export const crawleeLogAdapter = {
  debug: (msg: string, data?: object) => logger.debug(msg, data),
  info: (msg: string, data?: object) => logger.info(msg, data),
  warning: (msg: string, data?: object) => logger.warn(msg, data),
  error: (msg: string, data?: object) => logger.error(msg, data),
  exception: (msg: string, err?: Error) => logger.error(msg, { error: err?.message, stack: err?.stack }),
};

export default logger;
