/**
 * Metlink API service
 * Orchestrates interactions with the external Metlink API
 * Coordinates HTTP client, caching, and prewarming
 */

import { SERVICE_IDS, getStationPlatformVariants } from '@/lib/constants';
import { logger, createLogger } from './logger';
import { getStopPredictions } from './metlinkClient';
import { requestMetrics } from './requestMetrics';
import {
  StationDeparturesLRU,
  createStationCacheKey,
  ConcurrencyLimiter,
  type StationCacheMetricsSnapshot,
} from './stationCache';
import { prewarmStationDepartures as prewarmCache, type PrewarmOptions, type PrewarmResult } from './prewarm';
import type { RequestContext } from './requestContext';
import { withRequestContext } from './requestContext';
import type { Departure } from '@/types';
import { getTripId, getStatus } from './validation/metlink';

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

// Initialize cache and concurrency limiter
const stationDeparturesCache = new StationDeparturesLRU(STATION_CACHE_MAX_ENTRIES);
const stationFetchLimiter = new ConcurrencyLimiter(STATION_FETCH_CONCURRENCY);

/**
 * Get departures for a specific station and service line
 * Handles normalized station IDs by trying platform variants if needed
 */
export async function getWairarapaDepartures(
  stopId: string,
  serviceId: string = SERVICE_IDS.WAIRARAPA_LINE,
  context?: RequestContext
): Promise<Departure[]> {
  const requestLogger = context ? createLogger(context) : logger;
  
  try {
    const cacheKey = createStationCacheKey(serviceId, stopId);
    const cached = stationDeparturesCache.get(cacheKey);
    if (cached) {
      requestLogger.debug('Station cache hit', { stopId, serviceId });
      return cached.departures.map((departure) => ({ ...departure }));
    }

    // Get platform variants for the station ID
    const platformVariants = getStationPlatformVariants(stopId);
    let allDepartures: Departure[] = [];

    // Try each platform variant and collect all departures
    for (const platformId of platformVariants) {
      try {
        const data = await getStopPredictions(platformId);
        const departures = data.departures || [];
        allDepartures = allDepartures.concat(departures);
        if (allDepartures.length > 0) {
          break; // short-circuit once we have data
        }
      } catch (error) {
        // If a platform variant fails, continue with others
        requestLogger.debug('Failed to fetch predictions for platform, trying next variant', {
          stopId,
          serviceId,
          platformId,
        });
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

    requestLogger.debug(`Fetched ${uniqueDepartures.length} departures for ${stopId} (service: ${serviceId})`, {
      total: allDepartures.length,
      filtered: filtered.length,
      unique: uniqueDepartures.length,
      platformsTried: platformVariants.length,
      sampleDepartures: uniqueDepartures.slice(0, 3).map(dep => ({
        trip_id: getTripId(dep),
        destination: dep.destination?.name,
        aimed: dep.departure?.aimed,
        expected: dep.departure?.expected,
        status: getStatus(dep),
      })),
    });

    stationDeparturesCache.set(cacheKey, {
      departures: uniqueDepartures,
      expiresAt: Date.now() + PLATFORM_CACHE_TTL_MS,
    });

    return uniqueDepartures.map((departure) => ({ ...departure }));
  } catch (error) {
    requestLogger.error(`Failed to fetch departures for ${stopId}`, error instanceof Error ? error : new Error(String(error)), {
      stopId,
      serviceId,
    });
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
  const requestLogger = context ? createLogger(context) : logger;
  
  const promises = stopIds.map((stopId) =>
    stationFetchLimiter.run(async () => {
      try {
        const departures = await getWairarapaDepartures(stopId, serviceId, context);
        return departures.map(departure => ({
          ...departure,
          station: stopId,
        }));
      } catch (error) {
        requestLogger.warn(`Failed to fetch departures for station ${stopId}`, {
          station: stopId,
          serviceId,
          error: error instanceof Error ? error.message : String(error),
        });
        return []; // Return empty array on error for this station
      }
    })
  );

  return Promise.all(promises);
}

/**
 * Get station cache metrics
 */
export function getStationCacheMetrics(): StationCacheMetricsSnapshot {
  return stationDeparturesCache.getMetrics();
}

/**
 * Get request metrics for monitoring
 */
export function getRequestMetrics() {
  return requestMetrics.getMetrics();
}

/**
 * Prewarm station departures cache
 * Delegates to prewarm module
 */
export async function prewarmStationDepartures(
  options?: PrewarmOptions,
  context?: RequestContext
): Promise<PrewarmResult> {
  return prewarmCache(stationDeparturesCache, getWairarapaDepartures, options, context);
}
