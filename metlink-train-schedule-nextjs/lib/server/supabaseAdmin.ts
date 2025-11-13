/**
 * Supabase Admin Client
 * Server-side only - uses service role key for admin operations
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin(): ReturnType<typeof createClient> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.warn('Supabase admin client not configured - missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
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
 */
export function getSupabaseAdminClient(): ReturnType<typeof createClient> {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error('Supabase admin client is not available. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return client;
}

/**
 * Check if Supabase is available
 */
export async function isSupabaseAvailable(): Promise<boolean> {
  const client = getSupabaseAdmin();
  if (!client) {
    return false;
  }

  try {
    // Try querying a table that should exist (users table)
    // If table doesn't exist yet, that's okay - connection works
    const { error } = await client.from('users').select('count').limit(1);
    
    // If error is about table not existing or permission denied, that's okay - connection works
    // Only fail on actual connection errors
    if (error) {
      const errorMsg = error.message.toLowerCase();
      if (
        errorMsg.includes('relation') ||
        errorMsg.includes('does not exist') ||
        errorMsg.includes('permission') ||
        errorMsg.includes('pgrst')
      ) {
        // Table might not exist yet or permissions not set - connection is working
        return true;
      }
      // Actual connection error
      logger.warn('Supabase connection check failed', { error: error.message });
      return false;
    }
    return true;
  } catch (error) {
    logger.warn('Supabase not available', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

