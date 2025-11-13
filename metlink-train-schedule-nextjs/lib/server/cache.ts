/**
 * Hybrid cache for API responses
 * Uses database-backed cache when available, falls back to in-memory cache
 * Supports multiple cache keys for different station combinations
 */

import { logger } from './logger';
import { CACHE_DURATION } from '@/lib/constants';
import { prisma, isDatabaseAvailable } from './db';
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
      this.useDatabase = await isDatabaseAvailable();
      if (this.useDatabase) {
        logger.info('Using database-backed cache');
        // Clean up expired entries on startup
        await this.cleanExpiredEntries();
      } else {
        logger.info('Using in-memory cache (database not available)');
      }
    } catch (error) {
      logger.warn('Failed to initialize database cache, using in-memory', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.useDatabase = false;
    }
  }

  private async cleanExpiredEntries(): Promise<void> {
    if (!this.useDatabase) return;
    
    try {
      const now = new Date();
      await prisma.cacheEntry.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });
    } catch (error) {
      logger.warn('Failed to clean expired cache entries', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async isValid(key: string = 'default'): Promise<boolean> {
    if (this.useDatabase) {
      try {
        const entry = await prisma.cacheEntry.findUnique({
          where: { key },
        });
        if (!entry) {
          return false;
        }
        return entry.expiresAt > new Date();
      } catch (error) {
        logger.warn('Database cache check failed, falling back to in-memory', {
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
        const entry = await prisma.cacheEntry.findUnique({
          where: { key },
        });
        if (entry && entry.expiresAt > new Date()) {
          return entry.data as DeparturesResponse;
        }
        return null;
      } catch (error) {
        logger.warn('Database cache get failed, falling back to in-memory', {
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
        await prisma.cacheEntry.upsert({
          where: { key },
          update: {
            data: data as unknown as Record<string, unknown>,
            timestamp: new Date(),
            expiresAt,
          },
          create: {
            key,
            data: data as unknown as Record<string, unknown>,
            expiresAt,
          },
        });
        logger.debug('Cache updated (database)', {
          key,
          duration: this.duration / 1000,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (error) {
        logger.warn('Database cache set failed, falling back to in-memory', {
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
        if (key) {
          await prisma.cacheEntry.delete({
            where: { key },
          });
        } else {
          await prisma.cacheEntry.deleteMany({});
        }
        logger.debug('Cache cleared (database)', { key: key || 'all' });
        return;
      } catch (error) {
        logger.warn('Database cache clear failed, falling back to in-memory', {
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
        const entry = await prisma.cacheEntry.findUnique({
          where: { key },
        });
        if (!entry) {
          return null;
        }
        return Math.round((Date.now() - entry.timestamp.getTime()) / 1000);
      } catch (error) {
        logger.warn('Database cache age check failed, falling back to in-memory', {
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

