/**
 * Metlink API service
 * Handles all interactions with the external Metlink API
 */

import axios, { AxiosInstance } from 'axios';
import { SERVICE_IDS, getStationPlatformVariants } from '@/lib/constants';
import type { LineCode } from '@/lib/constants';
import { getMetlinkApiBase, env } from '@/lib/config/env';
import { retry } from './retry';
import { logger } from './logger';
import { metlinkCircuitBreaker, CircuitBreakerOpenError } from './circuitBreaker';
import { sanitizeMetlinkDepartures } from './validation/schemas';
import type { RequestContext } from './requestContext';
import { withRequestContext } from './requestContext';
import type { Departure, MetlinkApiResponse } from '@/types';

const parsedPlatformTtl = process.env.PLATFORM_CACHE_TTL_MS
  ? parseInt(process.env.PLATFORM_CACHE_TTL_MS, 10)
  : NaN;
const PLATFORM_CACHE_TTL_MS = Number.isFinite(parsedPlatformTtl) ? parsedPlatformTtl : 60 * 1000;

const parsedConcurrency = process.env.STATION_FETCH_CONCURRENCY
  ? parseInt(process.env.STATION_FETCH_CONCURRENCY, 10)
  : NaN;
const STATION_FETCH_CONCURRENCY = Number.isFinite(parsedConcurrency) ? parsedConcurrency : 6;

const parsedCacheSize = process.env.STATION_CACHE_MAX_ENTRIES
  ? parseInt(process.env.STATION_CACHE_MAX_ENTRIES, 10)
  : NaN;
const STATION_CACHE_MAX_ENTRIES = Number.isFinite(parsedCacheSize)
  ? Math.max(1, parsedCacheSize)
  : 256;

const parsedPrewarmLimit = process.env.STATION_PREWARM_PER_LINE
  ? parseInt(process.env.STATION_PREWARM_PER_LINE, 10)
  : NaN;
const STATION_PREWARM_PER_LINE = Number.isFinite(parsedPrewarmLimit)
  ? Math.max(1, parsedPrewarmLimit)
  : 4;

const PREWARMABLE_LINES = Object.values(SERVICE_IDS) as LineCode[];

const DEFAULT_BUSY_STATIONS: Partial<Record<LineCode, string[]>> = {
  [SERVICE_IDS.WAIRARAPA_LINE]: ['WELL', 'PETO', 'UPPE', 'WOOD', 'MAST'],
  [SERVICE_IDS.KAPITI_LINE]: ['WELL', 'PORI', 'PLIM', 'PAEK', 'WAIK'],
  [SERVICE_IDS.HUTT_VALLEY_LINE]: ['WELL', 'WATE', 'UPPE', 'TAIT', 'MANO'],
  [SERVICE_IDS.JOHNSONVILLE_LINE]: ['3000', '3081', '3200', '3206', '3970'],
};

const STATION_CACHE_KEY_SEPARATOR = '::';

interface CachedStationDepartures {
  expiresAt: number;
  departures: Departure[];
}

type PrewarmReason = 'cron' | 'manual';

interface StationCacheMetricsSnapshot {
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

class StationDeparturesLRU {
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

const stationDeparturesCache = new StationDeparturesLRU(STATION_CACHE_MAX_ENTRIES);

function createStationCacheKey(serviceId: string, stationId: string): string {
  return `${serviceId}${STATION_CACHE_KEY_SEPARATOR}${stationId}`;
}

function parseStationCacheKey(key: string): { serviceId: string; stationId: string } | null {
  const [serviceId, stationId] = key.split(STATION_CACHE_KEY_SEPARATOR);
  if (!serviceId || !stationId) {
    return null;
  }
  return { serviceId, stationId };
}

function dedupeStations(stations: string[], limit: number): string[] {
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

class ConcurrencyLimiter {
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

const stationFetchLimiter = new ConcurrencyLimiter(
  Number.isFinite(STATION_FETCH_CONCURRENCY) ? STATION_FETCH_CONCURRENCY : 6
);

/**
 * Request metrics tracker
 * Tracks API call volume to monitor usage and prevent rate limiting
 */
class RequestMetrics {
  private requestCount: number = 0;
  private requestCountByHour: Map<number, number> = new Map();

  /**
   * Increment request counter
   */
  increment(): void {
    this.requestCount++;
    const currentHour = Math.floor(Date.now() / (60 * 60 * 1000));
    const currentCount = this.requestCountByHour.get(currentHour) || 0;
    this.requestCountByHour.set(currentHour, currentCount + 1);
    
    // Log metrics periodically (every 10 requests)
    if (this.requestCount % 10 === 0) {
      this.logMetrics();
    }
  }

  /**
   * Get current request count
   */
  getCount(): number {
    return this.requestCount;
  }

  /**
   * Get requests in the current hour
   */
  getCurrentHourCount(): number {
    const currentHour = Math.floor(Date.now() / (60 * 60 * 1000));
    return this.requestCountByHour.get(currentHour) || 0;
  }

  /**
   * Log metrics summary
   */
  private logMetrics(): void {
    const currentHourCount = this.getCurrentHourCount();
    logger.info('API Request Metrics', {
      totalRequests: this.requestCount,
      requestsThisHour: currentHourCount,
      estimatedHourlyRate: currentHourCount * 60, // Extrapolate from current count
    });
  }

  /**
   * Get metrics summary
   */
  getMetrics(): {
    totalRequests: number;
    requestsThisHour: number;
    estimatedHourlyRate: number;
  } {
    const currentHourCount = this.getCurrentHourCount();
    return {
      totalRequests: this.requestCount,
      requestsThisHour: currentHourCount,
      estimatedHourlyRate: currentHourCount * 60, // Rough estimate
    };
  }
}

// Singleton instance
const requestMetrics = new RequestMetrics();

/**
 * Get or create axios instance with default configuration
 * Lazy initialization ensures environment variables are read at runtime
 */
let metlinkClientInstance: AxiosInstance | null = null;

function getMetlinkClient(): AxiosInstance {
  if (!metlinkClientInstance) {
    // Access env at runtime (lazy via Proxy)
    // Sanitize API key - remove any whitespace, newlines, or invalid characters
    const apiKey = String(env.METLINK_API_KEY).trim().replace(/[\r\n\t]/g, '');
    
    if (!apiKey) {
      throw new Error('METLINK_API_KEY is empty or invalid');
    }
    
    metlinkClientInstance = axios.create({
  baseURL: getMetlinkApiBase(),
  headers: {
        'x-api-key': apiKey,
    'Content-Type': 'application/json',
  },
  timeout: env.API_TIMEOUT_MS,
});
  }
  return metlinkClientInstance;
}

/**
 * Get stop predictions for a specific station
 */
export async function getStopPredictions(stopId: string, context?: RequestContext): Promise<MetlinkApiResponse> {
  try {
    if (!metlinkCircuitBreaker.canRequest()) {
      throw new CircuitBreakerOpenError();
    }

    // Track API request
    requestMetrics.increment();
    
    const response = await retry(
      () => getMetlinkClient().get<MetlinkApiResponse>(`/stop-predictions?stop_id=${stopId}`),
      {
        shouldRetry: (error: unknown) => {
          // Retry on network errors or 5xx, but not on 4xx (client errors)
          if (error && typeof error === 'object' && 'response' in error) {
            const response = (error as { response?: { status?: number } }).response;
            if (response?.status && response.status < 500) {
              return false;
            }
          }
          return true;
        },
      }
    );

    metlinkCircuitBreaker.recordSuccess();

    logger.debug(`Fetched stop predictions for ${stopId}`, withRequestContext({
      requestCount: requestMetrics.getCount(),
      requestsThisHour: requestMetrics.getCurrentHourCount(),
      departuresCount: response.data.departures?.length || 0,
      sampleDeparture: response.data.departures?.[0] ? {
        service_id: response.data.departures[0].service_id,
        trip_id: (response.data.departures[0] as unknown as { trip_id?: string }).trip_id,
        destination: response.data.departures[0].destination?.name,
        aimed: response.data.departures[0].departure?.aimed,
        expected: response.data.departures[0].departure?.expected,
        status: (response.data.departures[0] as unknown as { status?: string }).status,
      } : null,
    }, context));

    return {
      departures: sanitizeMetlinkDepartures(response.data),
    };
  } catch (error) {
    metlinkCircuitBreaker.recordFailure();
    const errorObj = error as Error;
    logger.error(`Failed to fetch stop predictions for ${stopId}`, withRequestContext({
      error: errorObj.message,
      name: errorObj.name,
      stack: errorObj.stack,
      stopId,
    }, context));
    throw error;
  }
}

/**
 * Get request metrics for monitoring
 */
export function getRequestMetrics() {
  return requestMetrics.getMetrics();
}

/**
 * Get departures for a specific station and service line
 * Handles normalized station IDs by trying platform variants if needed
 */
export async function getWairarapaDepartures(
  stopId: string,
  serviceId: string = SERVICE_IDS.WAIRARAPA_LINE,
  context?: RequestContext
): Promise<Departure[]> {
  try {
    const cacheKey = createStationCacheKey(serviceId, stopId);
    const cached = stationDeparturesCache.get(cacheKey);
    if (cached) {
      logger.debug('Station cache hit', withRequestContext({ stopId, serviceId }, context));
      return cached.departures.map((departure) => ({ ...departure }));
    }

    // Get platform variants for the station ID
    const platformVariants = getStationPlatformVariants(stopId);
    let allDepartures: Departure[] = [];

    // Try each platform variant and collect all departures
    for (const platformId of platformVariants) {
      try {
        const data = await getStopPredictions(platformId, context);
    const departures = data.departures || [];
        allDepartures = allDepartures.concat(departures);
        if (allDepartures.length > 0) {
          break; // short-circuit once we have data
        }
      } catch (error) {
        // If a platform variant fails, continue with others
        logger.debug(
          `Failed to fetch predictions for platform ${platformId}, trying next variant`,
          withRequestContext({ stopId, serviceId, platformId }, context)
        );
      }
    }

    // Filter by service ID and remove duplicates (by service_id, destination, and departure time)
    const filtered = allDepartures.filter(
      departure => departure.service_id === serviceId
    );

    // Remove duplicates based on service_id, destination, and departure time
    const uniqueDepartures = filtered.filter((departure, index, self) =>
      index === self.findIndex(d => 
        d.service_id === departure.service_id &&
        d.destination.stop_id === departure.destination.stop_id &&
        d.departure?.aimed === departure.departure?.aimed
      )
    );

    logger.debug(`Fetched ${uniqueDepartures.length} departures for ${stopId} (service: ${serviceId})`, withRequestContext({
      total: allDepartures.length,
      filtered: filtered.length,
      unique: uniqueDepartures.length,
      platformsTried: platformVariants.length,
      sampleDepartures: uniqueDepartures.slice(0, 3).map(dep => ({
        trip_id: (dep as unknown as { trip_id?: string }).trip_id,
        destination: dep.destination?.name,
        aimed: dep.departure?.aimed,
        expected: dep.departure?.expected,
        status: (dep as unknown as { status?: string }).status,
      })),
    }, context));

    stationDeparturesCache.set(cacheKey, {
      departures: uniqueDepartures,
      expiresAt: Date.now() + PLATFORM_CACHE_TTL_MS,
    });

    return uniqueDepartures.map((departure) => ({ ...departure }));
  } catch (error) {
    logger.error(`Failed to fetch departures for ${stopId}`, withRequestContext({
      error: error instanceof Error ? error.message : String(error),
      stopId,
      serviceId,
    }, context));
    throw error;
  }
}

/**
 * Get departures for multiple stations in parallel
 */
export async function getMultipleStationDepartures(
  stopIds: string[],
  serviceId: string = SERVICE_IDS.WAIRARAPA_LINE,
  context?: RequestContext
): Promise<Departure[][]> {
  const promises = stopIds.map((stopId) =>
    stationFetchLimiter.run(async () => {
    try {
        const departures = await getWairarapaDepartures(stopId, serviceId, context);
      return departures.map(departure => ({
        ...departure,
        station: stopId,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
        const errorDetails =
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : { error: String(error) };

        logger.warn(
          `Failed to fetch departures for station ${stopId}`,
          withRequestContext(
            {
              ...errorDetails,
              station: stopId,
              serviceId,
            },
            context
          )
        );
      return []; // Return empty array on error for this station
    }
    })
  );

  return Promise.all(promises);
}

export function getStationCacheMetrics(): StationCacheMetricsSnapshot {
  return stationDeparturesCache.getMetrics();
}

interface PrewarmOptions {
  reason?: PrewarmReason;
  limitPerLine?: number;
  lines?: LineCode[];
}

interface PrewarmResult {
  warmedStations: Array<{ serviceId: LineCode; station: string }>;
  reason: PrewarmReason;
  durationMs: number;
}

export async function prewarmStationDepartures(
  options?: PrewarmOptions
): Promise<PrewarmResult> {
  const reason: PrewarmReason = options?.reason ?? 'manual';
  const limitPerLine = Math.max(1, options?.limitPerLine ?? STATION_PREWARM_PER_LINE);
  const lines =
    options?.lines && options.lines.length > 0 ? options.lines : PREWARMABLE_LINES;
  const warmedStations: Array<{ serviceId: LineCode; station: string }> = [];
  const warmedKeys: string[] = [];
  const startedAt = Date.now();

  for (const serviceId of lines) {
    const usageStations = stationDeparturesCache
      .getHottestKeys(limitPerLine * 2, serviceId)
      .map((key) => parseStationCacheKey(key)?.stationId)
      .filter((stationId): stationId is string => Boolean(stationId));
    const fallbackStations = DEFAULT_BUSY_STATIONS[serviceId] ?? [];
    const targetStations = dedupeStations([...usageStations, ...fallbackStations], limitPerLine);

    if (!targetStations.length) {
      continue;
    }

    for (const stationId of targetStations) {
      try {
        await stationFetchLimiter.run(() => getWairarapaDepartures(stationId, serviceId));
        const cacheKey = createStationCacheKey(serviceId, stationId);
        warmedKeys.push(cacheKey);
        warmedStations.push({ serviceId, station: stationId });
      } catch (error) {
        logger.warn('Failed to prewarm station departures', {
          serviceId,
          stationId,
          reason,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  stationDeparturesCache.recordWarmup(warmedKeys, reason);

  const durationMs = Date.now() - startedAt;

  logger.debug('Station departures prewarm complete', {
    warmedStations: warmedKeys.length,
    reason,
    durationMs,
  });

  return { warmedStations, reason, durationMs };
}

