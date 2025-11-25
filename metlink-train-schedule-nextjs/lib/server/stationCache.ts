/**
 * Station departures cache
 * LRU cache implementation with metrics injection for station departure data
 */

import type { Departure } from '@/types';

export type PrewarmReason = 'cron' | 'manual';

export interface CachedStationDepartures {
  expiresAt: number;
  departures: Departure[];
}

export interface StationCacheMetricsSnapshot {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  staleEvictions: number;
  prewarmRuns: number;
  lastPrewarmAt?: number;
  lastPrewarmReason?: PrewarmReason;
  recentWarmTargets: string[];
  hottestKeys: Array<{ key: string; count: number }>;
}

const STATION_CACHE_KEY_SEPARATOR = '::';

/**
 * LRU cache for station departures
 */
export class StationDeparturesLRU {
  private readonly store = new Map<string, CachedStationDepartures>();
  private readonly usage = new Map<string, number>();
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    staleEvictions: 0,
    prewarmRuns: 0,
    lastPrewarmAt: 0,
    lastPrewarmReason: undefined as PrewarmReason | undefined,
    recentWarmTargets: [] as string[],
  };

  constructor(private readonly maxEntries: number) {}

  get(key: string): CachedStationDepartures | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.metrics.misses++;
      this.metrics.staleEvictions++;
      return null;
    }

    this.touch(key, entry);
    this.metrics.hits++;
    this.bumpUsage(key);
    return entry;
  }

  set(key: string, value: CachedStationDepartures): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.metrics.evictions++;
      }
    }

    this.store.set(key, value);
    this.bumpUsage(key);
  }

  recordWarmup(keys: string[], reason: PrewarmReason): void {
    this.metrics.prewarmRuns++;
    this.metrics.lastPrewarmAt = Date.now();
    this.metrics.lastPrewarmReason = reason;
    this.metrics.recentWarmTargets = keys;
  }

  getHottestKeys(limit: number, serviceId?: string): string[] {
    if (limit <= 0) {
      return [];
    }

    const entries = Array.from(this.usage.entries());
    const filtered = serviceId
      ? entries.filter(([key]) => key.startsWith(`${serviceId}${STATION_CACHE_KEY_SEPARATOR}`))
      : entries;

    return filtered
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => key);
  }

  getMetrics(): StationCacheMetricsSnapshot {
    return {
      size: this.store.size,
      maxSize: this.maxEntries,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      evictions: this.metrics.evictions,
      staleEvictions: this.metrics.staleEvictions,
      prewarmRuns: this.metrics.prewarmRuns,
      lastPrewarmAt: this.metrics.lastPrewarmAt || undefined,
      lastPrewarmReason: this.metrics.lastPrewarmReason,
      recentWarmTargets: [...this.metrics.recentWarmTargets],
      hottestKeys: this.getHottestKeys(5).map((key) => ({
        key,
        count: this.usage.get(key) || 0,
      })),
    };
  }

  private touch(key: string, value: CachedStationDepartures): void {
    this.store.delete(key);
    this.store.set(key, value);
  }

  private bumpUsage(key: string): void {
    const current = this.usage.get(key) || 0;
    this.usage.set(key, current + 1);
  }
}

/**
 * Create a cache key for a station and service
 */
export function createStationCacheKey(serviceId: string, stationId: string): string {
  return `${serviceId}${STATION_CACHE_KEY_SEPARATOR}${stationId}`;
}

/**
 * Parse a cache key into serviceId and stationId
 */
export function parseStationCacheKey(key: string): { serviceId: string; stationId: string } | null {
  const [serviceId, stationId] = key.split(STATION_CACHE_KEY_SEPARATOR);
  if (!serviceId || !stationId) {
    return null;
  }
  return { serviceId, stationId };
}

/**
 * Deduplicate and limit station IDs
 */
export function dedupeStations(stations: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const station of stations) {
    if (!station || seen.has(station)) {
      continue;
    }
    seen.add(station);
    result.push(station);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

/**
 * Concurrency limiter for station fetch operations
 */
export class ConcurrencyLimiter {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.limit <= 0) {
      return fn();
    }

    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
}

