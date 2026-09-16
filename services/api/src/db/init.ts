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

  if (!supabaseUrl || !supabaseKey) {
    log.fatal('Supabase configuration missing', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
    });
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
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

  // Test connection by querying colleges table
  try {
    const { count, error } = await supabaseClient
      .from('colleges')
      .select('id', { count: 'exact', head: true });

    if (error) {
      log.fatal('Failed to connect to Supabase', error);
      throw error;
    }

    log.info('Connected to Supabase successfully', {
      url: supabaseUrl.substring(0, 30) + '...',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.fatal('Supabase connection test failed', error);
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

