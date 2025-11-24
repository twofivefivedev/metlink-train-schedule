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
  expiresAt: number;
}

class Cache {
  private cache: Map<string, CacheEntry> = new Map();
  private baseDuration: number;
  private useDatabase: boolean = false;

  constructor() {
    const envDuration = process.env.CACHE_DURATION_MS
      ? parseInt(process.env.CACHE_DURATION_MS, 10)
      : CACHE_DURATION.DEFAULT;
    
    this.baseDuration = Math.max(
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

  private getLocalEntry(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  private computeAdaptiveDuration(): number {
    const hour = new Date().getHours();
    const isPeak = (hour >= 6 && hour < 10) || (hour >= 15 && hour < 19);
    const isOvernight = hour >= 0 && hour < 5;

    if (isPeak) {
      return Math.max(CACHE_DURATION.MIN, Math.floor(this.baseDuration * 0.5));
    }

    if (isOvernight) {
      return Math.min(CACHE_DURATION.MAX, Math.floor(this.baseDuration * 1.5));
    }

    return this.baseDuration;
  }

  private upsertLocalCache(key: string, data: DeparturesResponse, expiresAtMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: expiresAtMs,
    });
  }

  async isValid(key: string = 'default'): Promise<boolean> {
    if (this.getLocalEntry(key)) {
      return true;
    }

    if (!this.useDatabase) {
      return false;
    }

      try {
        const cacheRepo = getCacheRepository();
      const record = await cacheRepo.get(key);
      if (!record) {
        return false;
      }
      const expiresAtMs = new Date(record.expiresAt).getTime();
      if (expiresAtMs <= Date.now()) {
        return false;
      }
      this.upsertLocalCache(key, record.data, expiresAtMs);
      return true;
      } catch (error) {
        logger.warn('Supabase cache check failed, falling back to in-memory', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.useDatabase = false;
      return this.getLocalEntry(key) !== null;
    }
  }

  async get(key: string = 'default'): Promise<DeparturesResponse | null> {
    const entry = this.getLocalEntry(key);
    if (entry) {
      return entry.data;
    }

    if (!this.useDatabase) {
      return null;
    }

      try {
        const cacheRepo = getCacheRepository();
      const record = await cacheRepo.get(key);
      if (!record) {
        return null;
      }
      const expiresAtMs = new Date(record.expiresAt).getTime();
      if (expiresAtMs <= Date.now()) {
        return null;
      }
      this.upsertLocalCache(key, record.data, expiresAtMs);
      return record.data;
      } catch (error) {
        logger.warn('Supabase cache get failed, falling back to in-memory', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.useDatabase = false;
      return this.getLocalEntry(key)?.data || null;
    }
  }

  async set(data: DeparturesResponse, key: string = 'default'): Promise<void> {
    const adaptiveDuration = this.computeAdaptiveDuration();
    const expiresAtMs = Date.now() + adaptiveDuration;
    const expiresAtDate = new Date(expiresAtMs);
    let persistedToSupabase = false;

    if (this.useDatabase) {
      try {
        const cacheRepo = getCacheRepository();
        await cacheRepo.set(key, data, expiresAtDate);
        persistedToSupabase = true;
      } catch (error) {
        logger.warn('Supabase cache set failed, falling back to in-memory', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.useDatabase = false;
      }
    }

    this.upsertLocalCache(key, data, expiresAtMs);
    logger.debug(`Cache updated (${persistedToSupabase ? 'Supabase' : 'in-memory'})`, {
      key,
      ttlSeconds: adaptiveDuration / 1000,
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
    const entry = this.getLocalEntry(key);
    if (entry) {
      return Math.round((Date.now() - entry.timestamp) / 1000);
    }

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

      return null;
  }

  async getInfo(key: string = 'default'): Promise<CacheInfo> {
    const valid = await this.isValid(key);
    const age = await this.getAge(key);
    
    return {
      hasData: valid || age !== null,
      isValid: valid,
      ageSeconds: age,
      durationSeconds: this.computeAdaptiveDuration() / 1000,
    };
  }
}

// Singleton instance
export const cache = new Cache();

