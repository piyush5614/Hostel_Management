import compression from 'compression';
import { Request, Response, NextFunction } from 'express';

/**
 * Compression middleware for response size optimization
 * Reduces response payload by 60-80% for typical JSON/HTML responses
 * 
 * Configuration:
 * - threshold: Only compress responses > 1KB
 * - level: Compression level 1-9 (6 = good balance of speed/ratio)
 * - filter: Custom filter for compression eligibility
 */

interface CompressionOptions {
  threshold?: number;
  level?: number;
  filter?: (req: Request, res: Response) => boolean;
}

export function getCompressionMiddleware(options: CompressionOptions = {}) {
  const defaultOptions: CompressionOptions = {
    threshold: 1024, // Only compress responses > 1KB
    level: 6, // Compression level (balance between speed and ratio)
    filter: (req: Request, res: Response) => {
      // Don't compress if request has 'x-no-compression' header
      if (req.headers['x-no-compression']) {
        return false;
      }

      // Use compression filter from the library
      return compression.filter(req, res);
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return compression({
    threshold: mergedOptions.threshold,
    level: mergedOptions.level,
    filter: mergedOptions.filter,
  });
}

/**
 * Applied middleware export for direct use in Express app
 * Usage in main server file:
 * 
 * import { compressionMiddleware } from './middleware/compression.js';
 * app.use(compressionMiddleware);
 * app.use(helmet()); // MUST come after compression
 */
export const compressionMiddleware = getCompressionMiddleware();
