import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { log } from '../utils/logger.js';

/**
 * Security Middleware Configuration
 * Implements production-grade security headers and rate limiting
 */

// Rate limiter for API endpoints (max 100 requests per 15 minutes per IP)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
});

// Stricter rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // max 10 requests per hour
  message: {
    error: 'Too many authentication attempts, please try again after 1 hour.',
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for login endpoint (5 attempts per 15 minutes)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many login attempts, please try again after 15 minutes.',
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Security Headers Middleware
 * Configure Helmet with sensible defaults for production
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
});

/**
 * CORS Configuration for Production
 * Restricts to whitelisted origins only
 */
export function getCorsOptions() {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl requests, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
  };
}

/**
 * Request Logging Middleware
 * Logs all incoming requests for audit trail
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add request ID to response headers for tracing
  res.setHeader('X-Request-ID', requestId);

  // Log response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const id = typeof requestId === 'string' ? requestId : Array.isArray(requestId) ? requestId[0] : String(requestId);
    log.request(req.method, req.path, res.statusCode, duration, id);
  });

  next();
};

/**
 * Security Middleware Stack
 * Combines all security-related middleware
 */
export function applySecurityMiddleware(app: any) {
  // Configure proxy handling before rate limiters inspect the client IP.
  app.set('trust proxy', 1);

  // Add security headers
  app.use(securityHeaders);

  // Add request ID and logging
  app.use(requestLogger);

  // Add CORS with strict whitelist
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');

    if (!origin || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });

  // Rate limiting is enabled in production. Local development should not block
  // requests while the app is running behind Vite's proxy.
  if (process.env.NODE_ENV === 'production') {
    app.use('/api/', apiLimiter);
  }
}

/**
 * Error Handler Middleware
 * Catches and formats errors consistently with structured logging
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = res.getHeader('X-Request-ID') as string;

  // Log error with context
  log.apiError(
    req.method,
    req.path,
    err.statusCode || 500,
    err.message,
    requestId
  );

  // Log full stack trace in development
  if (process.env.NODE_ENV === 'development') {
    log.debug('Error Stack Trace', { stack: err.stack, requestId });
  }

  // Don't leak error details to client
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: message,
    requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
