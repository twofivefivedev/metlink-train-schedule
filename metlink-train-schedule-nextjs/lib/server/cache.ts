/**
 * Hybrid cache for API responses
 * Uses database-backed cache when available, falls back to in-memory cache
 * Supports multiple cache keys for different station combinations
 */

import { logger } from './logger';
import { CACHE_DURATION } from '@/lib/constants';
import { isSupabaseAvailable } from './supabaseAdmin';
import { getCacheRepository } from './db';
import type { DeparturesResponse, CacheInfo } from '@/types';

interface CacheEntry {
  data: DeparturesResponse;
  timestamp: number;
}

class Cache {
  private cache: Map<string, CacheEntry> = new Map();
  private duration: number;
  private useDatabase: boolean = false;

  constructor() {
    const envDuration = process.env.CACHE_DURATION_MS
      ? parseInt(process.env.CACHE_DURATION_MS, 10)
      : CACHE_DURATION.DEFAULT;
    
    this.duration = Math.max(
      CACHE_DURATION.MIN,
      Math.min(CACHE_DURATION.MAX, envDuration)
    );
    
    // Check database availability asynchronously
    this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    try {
      this.useDatabase = await isSupabaseAvailable();
      if (this.useDatabase) {
        logger.info('Using Supabase-backed cache');
        // Clean up expired entries on startup
        await this.cleanExpiredEntries();
      } else {
        logger.info('Using in-memory cache (Supabase not available)');
      }
    } catch (error) {
      logger.warn('Failed to initialize Supabase cache, using in-memory', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.useDatabase = false;
    }
  }

  private async cleanExpiredEntries(): Promise<void> {
    if (!this.useDatabase) return;
    
    try {
      const cacheRepo = getCacheRepository();
      await cacheRepo.cleanupExpired();
    } catch (error) {
      logger.warn('Failed to clean expired cache entries', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async isValid(key: string = 'default'): Promise<boolean> {
    if (this.useDatabase) {
      try {
        const cacheRepo = getCacheRepository();
        const data = await cacheRepo.get(key);
        return data !== null;
      } catch (error) {
        logger.warn('Supabase cache check failed, falling back to in-memory', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.useDatabase = false;
      }
    }
    
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    const age = Date.now() - entry.timestamp;
    return age < this.duration;
  }

  async get(key: string = 'default'): Promise<DeparturesResponse | null> {
    const valid = await this.isValid(key);
    if (!valid) {
      return null;
    }

    if (this.useDatabase) {
      try {
        const cacheRepo = getCacheRepository();
        return await cacheRepo.get(key);
      } catch (error) {
        logger.warn('Supabase cache get failed, falling back to in-memory', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.useDatabase = false;
      }
    }

    return this.cache.get(key)?.data || null;
  }

  async set(data: DeparturesResponse, key: string = 'default'): Promise<void> {
    const expiresAt = new Date(Date.now() + this.duration);

    if (this.useDatabase) {
      try {
        const cacheRepo = getCacheRepository();
        await cacheRepo.set(key, data, expiresAt);
        
        logger.debug('Cache updated (Supabase)', {
          key,
          duration: this.duration / 1000,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (error) {
        logger.warn('Supabase cache set failed, falling back to in-memory', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.useDatabase = false;
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    logger.debug('Cache updated (in-memory)', {
      key,
      duration: this.duration / 1000,
      timestamp: new Date().toISOString(),
    });
  }

  async clear(key?: string): Promise<void> {
    if (this.useDatabase) {
      try {
        const cacheRepo = getCacheRepository();
        if (key) {
          await cacheRepo.delete(key);
        } else {
          await cacheRepo.deleteAll();
        }
        logger.debug('Cache cleared (Supabase)', { key: key || 'all' });
        return;
      } catch (error) {
        logger.warn('Supabase cache clear failed, falling back to in-memory', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.useDatabase = false;
      }
    }

    if (key) {
      this.cache.delete(key);
      logger.debug('Cache cleared (in-memory)', { key });
    } else {
      this.cache.clear();
      logger.debug('Cache cleared (in-memory, all keys)');
    }
  }

  async getAge(key: string = 'default'): Promise<number | null> {
    if (this.useDatabase) {
      try {
        const cacheRepo = getCacheRepository();
        return await cacheRepo.getAge(key);
      } catch (error) {
        logger.warn('Supabase cache age check failed, falling back to in-memory', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.useDatabase = false;
      }
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    return Math.round((Date.now() - entry.timestamp) / 1000);
  }

  async getInfo(key: string = 'default'): Promise<CacheInfo> {
    const valid = await this.isValid(key);
    const age = await this.getAge(key);
    
    return {
      hasData: valid || age !== null,
      isValid: valid,
      ageSeconds: age,
      durationSeconds: this.duration / 1000,
    };
  }
}

// Singleton instance
export const cache = new Cache();

