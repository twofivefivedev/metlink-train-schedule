/**
 * Cache Repository
 * Typed repository for cache_entries table operations
 */

import { getSupabaseAdminClient } from '../supabaseAdmin';
import { logger } from '../logger';
import type { Database, Json } from '@/supabase/types';
import type { DeparturesResponse } from '@/types';

type CacheEntry = Database['public']['Tables']['cache_entries']['Row'];
type CacheEntryInsert = Database['public']['Tables']['cache_entries']['Insert'];
type CacheEntryUpdate = Database['public']['Tables']['cache_entries']['Update'];

export interface CacheRepository {
  get(key: string): Promise<DeparturesResponse | null>;
  set(key: string, data: DeparturesResponse, expiresAt: Date): Promise<void>;
  delete(key: string): Promise<void>;
  deleteAll(): Promise<void>;
  cleanupExpired(): Promise<number>;
  getAge(key: string): Promise<number | null>;
}

class CacheRepositoryImpl implements CacheRepository {
  async get(key: string): Promise<DeparturesResponse | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('cache_entries')
        .select('data, expiresAt')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      // Type assertion for Supabase query result
      const entry = data as { data: Json; expiresAt: string } | null;
      if (!entry) {
        return null;
      }

      // Check if expired
      if (new Date(entry.expiresAt) <= new Date()) {
        return null;
      }

      return entry.data as unknown as DeparturesResponse;
    } catch (error) {
      logger.warn('Cache repository get failed', {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      throw error;
    }
  }

  async set(key: string, data: DeparturesResponse, expiresAt: Date): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const entry: CacheEntryInsert = {
        key,
        data: data as unknown as Json,
        timestamp: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      const { error } = await (supabase
        .from('cache_entries') as any)
        .upsert(entry, {
          onConflict: 'key',
        });

      if (error) {
        throw error;
      }

      logger.debug('Cache entry set', { key, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      logger.warn('Cache repository set failed', {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase
        .from('cache_entries')
        .delete()
        .eq('key', key);

      if (error) {
        throw error;
      }

      logger.debug('Cache entry deleted', { key });
    } catch (error) {
      logger.warn('Cache repository delete failed', {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      throw error;
    }
  }

  async deleteAll(): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase
        .from('cache_entries')
        .delete()
        .neq('key', ''); // Delete all

      if (error) {
        throw error;
      }

      logger.debug('All cache entries deleted');
    } catch (error) {
      logger.warn('Cache repository deleteAll failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async cleanupExpired(): Promise<number> {
    try {
      const supabase = getSupabaseAdminClient();
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('cache_entries')
        .delete()
        .lt('expiresAt', now);

      if (error) {
        throw error;
      }

      // Note: Supabase doesn't return count directly, but we can use the function
      const { data, error: funcError } = await supabase.rpc('cleanup_expired_cache');
      
      if (!funcError && typeof data === 'number') {
        logger.debug('Expired cache entries cleaned up', { count: data });
        return data;
      }

      logger.debug('Expired cache entries cleaned up');
      return 0;
    } catch (error) {
      logger.warn('Cache repository cleanupExpired failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  async getAge(key: string): Promise<number | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('cache_entries')
        .select('timestamp')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      // Type assertion for Supabase query result
      const entry = data as { timestamp: string } | null;
      if (!entry) {
        return null;
      }

      const ageMs = Date.now() - new Date(entry.timestamp).getTime();
      return Math.round(ageMs / 1000); // Return age in seconds
    } catch (error) {
      logger.warn('Cache repository getAge failed', {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      return null;
    }
  }
}

// Singleton instance
let cacheRepositoryInstance: CacheRepository | null = null;

export function getCacheRepository(): CacheRepository {
  if (!cacheRepositoryInstance) {
    cacheRepositoryInstance = new CacheRepositoryImpl();
  }
  return cacheRepositoryInstance;
}

