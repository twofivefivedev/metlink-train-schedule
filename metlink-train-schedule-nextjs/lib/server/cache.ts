/**
 * In-memory cache for API responses
 * Supports multiple cache keys for different station combinations
 */

import { logger } from './logger';
import { CACHE_DURATION } from '@/lib/constants';
import type { DeparturesResponse, CacheInfo } from '@/types';

interface CacheEntry {
  data: DeparturesResponse;
  timestamp: number;
}

class Cache {
  private cache: Map<string, CacheEntry> = new Map();
  private duration: number;

  constructor() {
    const envDuration = process.env.CACHE_DURATION_MS
      ? parseInt(process.env.CACHE_DURATION_MS, 10)
      : CACHE_DURATION.DEFAULT;
    
    this.duration = Math.max(
      CACHE_DURATION.MIN,
      Math.min(CACHE_DURATION.MAX, envDuration)
    );
  }

  isValid(key: string = 'default'): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    const age = Date.now() - entry.timestamp;
    return age < this.duration;
  }

  get(key: string = 'default'): DeparturesResponse | null {
    if (!this.isValid(key)) {
      return null;
    }
    return this.cache.get(key)?.data || null;
  }

  set(data: DeparturesResponse, key: string = 'default'): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    logger.debug('Cache updated', {
      key,
      duration: this.duration / 1000,
      timestamp: new Date().toISOString(),
    });
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      logger.debug('Cache cleared', { key });
    } else {
      this.cache.clear();
      logger.debug('Cache cleared (all keys)');
    }
  }

  getAge(key: string = 'default'): number | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    return Math.round((Date.now() - entry.timestamp) / 1000);
  }

  getInfo(key: string = 'default'): CacheInfo {
    const entry = this.cache.get(key);
    return {
      hasData: !!entry,
      isValid: this.isValid(key),
      ageSeconds: this.getAge(key),
      durationSeconds: this.duration / 1000,
    };
  }
}

// Singleton instance
export const cache = new Cache();

