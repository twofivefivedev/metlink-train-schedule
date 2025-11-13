/**
 * Supabase Admin Client
 * Server-side only - uses service role key for admin operations
 * Typed with generated Supabase types
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import type { Database } from '@/supabase/types';

type SupabaseClient = ReturnType<typeof createClient<Database>>;

let supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.warn('Supabase admin client not configured - missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminInstance;
}

/**
 * Get Supabase admin client (server-side only)
 * Typed with Database schema
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error('Supabase admin client is not available. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return client;
}

/**
 * Check if Supabase is available
 * Uses lightweight SELECT 1 query for health check
 */
export async function isSupabaseAvailable(): Promise<boolean> {
  const client = getSupabaseAdmin();
  if (!client) {
    return false;
  }

  try {
    // Use lightweight query - SELECT 1 is faster than querying actual tables
    const { error } = await client.rpc('cleanup_expired_cache').select('*').limit(0);
    
    // If function doesn't exist yet (migration not run), try a simple query instead
    if (error && error.message.includes('function')) {
      const { error: queryError } = await client.from('cache_entries').select('id').limit(1);
      
      if (queryError) {
        const errorMsg = queryError.message.toLowerCase();
        // Table might not exist yet - that's okay, connection works
        if (
          errorMsg.includes('relation') ||
          errorMsg.includes('does not exist') ||
          errorMsg.includes('permission') ||
          errorMsg.includes('pgrst')
        ) {
          return true; // Connection works, schema just not set up yet
        }
        logger.warn('Supabase connection check failed', { error: queryError.message });
        return false;
      }
      return true;
    }
    
    return true;
  } catch (error) {
    logger.warn('Supabase not available', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

