import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry for production error tracking
 * - Captures unhandled exceptions
 * - Tracks performance metrics
 * - Enables error replay/session recording
 * 
 * Environment variables required:
 * - SENTRY_DSN: Team error tracking endpoint
 * - SENTRY_ENVIRONMENT: production | staging
 */

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production';

  if (!dsn) {
    console.warn('⚠️  SENTRY_DSN not set. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [nodeProfilingIntegration()],
    // Set sample rate to 1.0 to capture 100% of transactions for performance monitoring
    // Reduce to 0.1 (10%) for high-traffic applications
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1, // Profile 10% of transactions
    maxBreadcrumbs: 50, // Keep last 50 events for context
    attachStacktrace: true, // Include stack traces with errors
  });

  console.log('✅ Sentry initialized for error tracking');
}

/**
 * Express error handler for Sentry
 * Attach to Express app after all other middleware/routes
 * 
 * Usage:
 * app.use(Sentry.Handlers.errorHandler());
 */
export const sentryErrorHandler = () => Sentry.Handlers.errorHandler();

/**
 * Request handler for Sentry performance tracking
 * Attach to Express app AFTER defining routes but BEFORE error handlers
 * 
 * Usage:
 * app.use(Sentry.Handlers.requestHandler());
 */
export const sentryRequestHandler = () => Sentry.Handlers.requestHandler();

/**
 * Manually capture exception with context
 * Use for custom error handling beyond automatic capture
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Manually capture message for logging
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 * Call when user logs in
 */
export function setUserContext(userId: string, email?: string, role?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username: role,
  });
}

/**
 * Clear user context
 * Call when user logs out
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 * Breadcrumbs appear in error details
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    tags: { category },
    extra: data,
  });
}
