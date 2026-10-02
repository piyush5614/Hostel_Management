import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { log } from '../utils/logger.js';

let supabaseClient: SupabaseClient | null = null;
const SUPABASE_REQUEST_TIMEOUT_MS = 10000;

async function fetchWithTimeout(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Initialize Supabase Client
 * Connects to Supabase PostgreSQL database with service role key
 */
export async function initDb(): Promise<SupabaseClient> {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey || !supabaseUrl.includes('supabase.co')) {
    log.fatal('Supabase configuration is invalid or missing. The server cannot start without a real project URL and key.', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      url: supabaseUrl ? supabaseUrl.substring(0, 30) : null,
      check: 'Verify SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and the project is active in Supabase.',
    });
    throw new Error('Supabase configuration is invalid or missing. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before starting the app.');
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: fetchWithTimeout,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { error } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      log.fatal('Supabase connection failed. Check DNS, project status, and API configuration. This is not a silent fallback.', {
        error: error.message ?? String(error),
        url: supabaseUrl.substring(0, 30) + '...',
        hint: 'If the project is paused, deleted, or the hostname is stale, update SUPABASE_URL and the project credentials before retrying.',
      });
      throw new Error('Supabase connection failed. Check DNS resolution, project status, and the configured Supabase URL/key pair.');
    }

    log.info('Connected to Supabase successfully', {
      url: supabaseUrl.substring(0, 30) + '...',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.fatal('Supabase connection test failed. Startup is blocked until the real database is reachable.', {
      detail: error instanceof Error ? error.message : String(error),
      url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : null,
    });
    throw error;
  }

  return supabaseClient;
}

/**
 * Get Supabase client instance
 */
export async function getDb(): Promise<SupabaseClient> {
  if (!supabaseClient) {
    return initDb();
  }
  return supabaseClient;
}

/**
 * Close Supabase connection (no-op, but kept for compatibility)
 */
export async function closeDb(): Promise<void> {
  log.info('Supabase connection closed');
  supabaseClient = null;
}

/**
 * Query helper for Supabase
 */
export async function queryDb(table: string, options: any = {}) {
  const db = await getDb();
  let query = db.from(table).select(options.select || '*');

  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      query = (query as any).eq(key, value);
    });
  }

  if (options.limit) {
    query = (query as any).limit(options.limit);
  }

  if (options.order) {
    query = (query as any).order(options.order.column, { ascending: options.order.ascending ?? true });
  }

  const { data, error } = await query;

  if (error) {
    log.error(`Query failed on ${table}`, error);
    throw error;
  }

  return data;
}

export default { initDb, getDb, closeDb };

