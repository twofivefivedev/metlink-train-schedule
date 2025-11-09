/**
 * In-memory cache for API responses
 */

import { logger } from './logger';
import { CACHE_DURATION } from '@/lib/constants';
import type { DeparturesResponse, CacheInfo } from '@/types';

class Cache {
  private data: DeparturesResponse | null = null;
  private timestamp: number | null = null;
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

  isValid(): boolean {
    if (!this.data || !this.timestamp) {
      return false;
    }
    const age = Date.now() - this.timestamp;
    return age < this.duration;
  }

  get(): DeparturesResponse | null {
    if (!this.isValid()) {
      return null;
    }
    return this.data;
  }

  set(data: DeparturesResponse): void {
    this.data = data;
    this.timestamp = Date.now();
    logger.debug('Cache updated', {
      duration: this.duration / 1000,
      timestamp: new Date(this.timestamp).toISOString(),
    });
  }

  clear(): void {
    this.data = null;
    this.timestamp = null;
    logger.debug('Cache cleared');
  }

  getAge(): number | null {
    if (!this.timestamp) {
      return null;
    }
    return Math.round((Date.now() - this.timestamp) / 1000);
  }

  getInfo(): CacheInfo {
    return {
      hasData: !!this.data,
      isValid: this.isValid(),
      ageSeconds: this.getAge(),
      durationSeconds: this.duration / 1000,
    };
  }
}

// Singleton instance
export const cache = new Cache();

