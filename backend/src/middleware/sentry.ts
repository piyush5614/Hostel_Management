/**
 * Sentry Error Tracking Integration
 * File: backend/src/middleware/sentry.ts
 * 
 * Usage:
 * 1. npm install @sentry/node @sentry/tracing
 * 2. Set SENTRY_DSN in .env.staging
 * 3. Import { initSentry, sentryErrorHandler, sentryRequestHandler } from './middleware/sentry'
 * 4. Call initSentry() before app.use()
 * 5. Add middleware in correct order (see index.ts)
 */

import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Express } from 'express';

/**
 * Initialize Sentry error tracking
 * Must be called BEFORE creating Express app
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('⚠️  SENTRY_DSN not set - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ 
        app: true, 
        request: true,
        middleware: true
      }),
    ],
    // Sample 10% of transactions for tracing
    tracesSampleRate: 0.1,
    // Ignore specific errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Ignore connection errors (non-production)
      if (process.env.NODE_ENV !== 'production') {
        if (error instanceof Error && error.message?.includes('ECONNREFUSED')) {
          return null;
        }
      }
      
      // Ignore test database errors
      if (error instanceof Error && error.message?.includes('test')) {
        return null;
      }
      
      return event;
    },
    // Ignore specific status codes
    ignoreErrors: [
      'NetworkError',
      'fetch error',
      // Browser extensions
      'top.GLOBALS',
      // Random plugins
      'Can\'t find variable: ZiteReader',
      'jigsaw is not defined',
      'ComboSearch is not defined',
    ],
  });

  console.log('✅ Sentry initialized');
}

/**
 * Request handler middleware
 * Add early in middleware stack
 */
export function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

/**
 * Tracing middleware
 * Add after request handler
 */
export function sentryTracingHandler() {
  return Sentry.Handlers.tracingHandler();
}

/**
 * Error handler middleware
 * Add LAST in middleware stack (after all route handlers)
 */
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

/**
 * Manually capture an error
 */
export function captureError(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.captureException(error, { contexts: { custom: context } });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for tracking
 */
export function addBreadcrumb(message: string, data?: Record<string, any>): void {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, username?: string): void {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  Sentry.setUser(null as any);
}

export default {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureError,
  captureMessage,
  addBreadcrumb,
  setUserContext,
  clearUserContext,
};
