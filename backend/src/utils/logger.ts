import winston from 'winston';
import path from 'path';

/**
 * Structured Logging with Winston
 * Provides consistent logging across the application
 */

const logDir = 'logs';

// Define log levels with custom colors
const logLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
  },
  colors: {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    debug: 'green',
    trace: 'gray',
  },
};

winston.addColors(logLevels.colors);

// Custom format for structured JSON logging
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Custom format for development console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  levels: logLevels.levels,
  format: jsonFormat,
  defaultMeta: { service: 'hostel-backend' },
  transports: [
    // Console output for all environments
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    }),

    // Error logs - always file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10mb
      maxFiles: 5,
    }),

    // Combined logs - file (production only)
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 10485760, // 10mb
            maxFiles: 5,
          }),
        ]
      : []),
  ],
});

// Development: add debug file logging
if (process.env.NODE_ENV === 'development') {
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, 'debug.log'),
      level: 'debug',
      maxsize: 10485760,
      maxFiles: 3,
    })
  );
}

/**
 * Logging Helper Functions - Use these throughout your code
 */
export const log = {
  /**
   * Log fatal errors - application must exit
   */
  fatal: (message: string, meta?: any) => {
    logger.log('fatal', message, meta);
  },

  /**
   * Log errors - something went wrong
   */
  error: (message: string, error?: Error | any, meta?: any) => {
    logger.error(message, {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      ...meta,
    });
  },

  /**
   * Log warnings - something unexpected but not critical
   */
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },

  /**
   * Log info - general information
   */
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },

  /**
   * Log debug - detailed information for debugging
   */
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  },

  /**
   * Log trace - very detailed information
   */
  trace: (message: string, meta?: any) => {
    logger.log('trace', message, meta);
  },

  /**
   * Log database query
   */
  query: (sql: string, params?: any, duration?: number) => {
    logger.log('trace', 'Database Query', {
      query: sql.substring(0, 200),
      params: params ? JSON.stringify(params).substring(0, 200) : undefined,
      duration: duration ? `${duration}ms` : undefined,
    });
  },

  /**
   * Log API request
   */
  request: (method: string, path: string, statusCode: number, duration: number, requestId?: string) => {
    logger.info('API Request', {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      requestId,
    });
  },

  /**
   * Log API error
   */
  apiError: (method: string, path: string, statusCode: number, error: string, requestId?: string) => {
    logger.error('API Error', {
      method,
      path,
      statusCode,
      error,
      requestId,
    });
  },

  /**
   * Log authentication event
   */
  auth: (event: string, userId?: string, email?: string, meta?: any) => {
    logger.info(`Auth: ${event}`, {
      userId,
      email,
      ...meta,
    });
  },

  /**
   * Log database operation
   */
  db: (operation: string, table: string, status: 'success' | 'failed', duration?: number, error?: string) => {
    const level = status === 'success' ? 'debug' : 'error';
    logger.log(level, 'Database Operation', {
      operation,
      table,
      status,
      duration: duration ? `${duration}ms` : undefined,
      error,
    });
  },
};

export default logger;
