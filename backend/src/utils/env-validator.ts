import { log } from './logger.js';

/**
 * Environment Variable Validation
 * Checks for required and recommended environment variables
 * Logs warnings for misconfiguration but allows startup to continue
 */

interface EnvCheckResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

const REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];

const RECOMMENDED_VARS = ['NODE_ENV', 'LOG_LEVEL', 'PORT', 'ALLOWED_ORIGINS'];

const PRODUCTION_REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'NODE_ENV'];

/**
 * Validate environment variables and log warnings
 */
export function validateEnvironment(): EnvCheckResult {
  const result: EnvCheckResult = {
    valid: true,
    warnings: [],
    errors: [],
  };

  const isProd = process.env.NODE_ENV === 'production';

  // Check required variables
  const requiredToCheck = isProd ? PRODUCTION_REQUIRED : REQUIRED_VARS;

  for (const varName of requiredToCheck) {
    if (!process.env[varName]) {
      result.errors.push(`Missing required environment variable: ${varName}`);
      result.valid = false;
    }
  }

  // Check JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    result.warnings.push(
      `JWT_SECRET is too short (${process.env.JWT_SECRET.length} chars). ` +
        'Recommended minimum: 32 characters for security.'
    );
  }

  // Check Supabase URL format
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('supabase.co')) {
    result.warnings.push('SUPABASE_URL does not look like a valid Supabase URL (should include "supabase.co")');
  }

  // Check recommended variables
  for (const varName of RECOMMENDED_VARS) {
    if (!process.env[varName]) {
      result.warnings.push(`Recommended environment variable not set: ${varName}`);
    }
  }

  // Production-specific checks
  if (isProd) {
    if (process.env.LOG_LEVEL === 'debug') {
      result.warnings.push('LOG_LEVEL is set to "debug" in production. Consider changing to "info" or "warn".');
    }

    if (process.env.ALLOWED_ORIGINS?.includes('localhost')) {
      result.warnings.push('ALLOWED_ORIGINS includes localhost in production. This should be removed.');
    }
  }

  return result;
}

/**
 * Log environment validation results
 */
export function logEnvironmentValidation(): void {
  const result = validateEnvironment();

  if (result.errors.length > 0) {
    log.error('Environment validation failed with errors:', {
      errors: result.errors,
      environment: process.env.NODE_ENV || 'development',
    });

    log.warn('Server may not function correctly without these variables.');
    log.warn('Check .env file and ensure all required variables are set.');
  }

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      log.warn(warning);
    }
  }

  if (result.errors.length === 0) {
    log.info('Environment variables validated successfully', {
      environment: process.env.NODE_ENV || 'development',
      supabaseUrl: process.env.SUPABASE_URL?.substring(0, 30) + '...',
      port: process.env.PORT || 3001,
    });
  }
}

/**
 * Get environment summary for logging
 */
export function getEnvironmentSummary(): Record<string, string | number | boolean> {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3001,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    HAS_SUPABASE_URL: !!process.env.SUPABASE_URL,
    HAS_JWT_SECRET: !!process.env.JWT_SECRET,
    HAS_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',').length || 0,
  };
}
