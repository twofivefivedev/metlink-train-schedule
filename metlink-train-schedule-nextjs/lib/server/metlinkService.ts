/**
 * Metlink API service
 * Handles all interactions with the external Metlink API
 */

import axios, { AxiosInstance } from 'axios';
import { SERVICE_IDS, getStationPlatformVariants } from '@/lib/constants';
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

interface CachedStationDepartures {
  expiresAt: number;
  departures: Departure[];
}

const stationDeparturesCache = new Map<string, CachedStationDepartures>();

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
    const cacheKey = `${serviceId}-${stopId}`;
    const cached = stationDeparturesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
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

