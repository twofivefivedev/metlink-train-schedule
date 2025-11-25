/**
 * Station departures prewarm
 * Orchestrates prefetching of station departures for cron/manual prewarming
 */

import { SERVICE_IDS } from '@/lib/constants';
import type { LineCode } from '@/lib/constants';
import { logger } from './logger';
import type { Departure } from '@/types';
import type { RequestContext } from './requestContext';
import {
  StationDeparturesLRU,
  createStationCacheKey,
  parseStationCacheKey,
  dedupeStations,
  ConcurrencyLimiter,
  type PrewarmReason,
} from './stationCache';

const parsedConcurrency = process.env.STATION_FETCH_CONCURRENCY
  ? parseInt(process.env.STATION_FETCH_CONCURRENCY, 10)
  : NaN;
const STATION_FETCH_CONCURRENCY = Number.isFinite(parsedConcurrency) ? parsedConcurrency : 6;

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

export interface PrewarmOptions {
  reason?: PrewarmReason;
  limitPerLine?: number;
  lines?: LineCode[];
}

export interface PrewarmResult {
  warmedStations: Array<{ serviceId: LineCode; station: string }>;
  reason: PrewarmReason;
  durationMs: number;
}

/**
 * Function type for fetching departures for a station
 */
export type FetchDeparturesFn = (stopId: string, serviceId: string) => Promise<Departure[]>;

/**
 * Prewarm station departures cache
 * Fetches departures for busy stations to warm the cache
 */
export async function prewarmStationDepartures(
  cache: StationDeparturesLRU,
  fetchDepartures: FetchDeparturesFn,
  options?: PrewarmOptions,
  context?: RequestContext
): Promise<PrewarmResult> {
  const requestLogger = context ? logger.child(context) : logger;
  const reason: PrewarmReason = options?.reason ?? 'manual';
  const limitPerLine = Math.max(1, options?.limitPerLine ?? STATION_PREWARM_PER_LINE);
  const lines =
    options?.lines && options.lines.length > 0 ? options.lines : PREWARMABLE_LINES;
  const warmedStations: Array<{ serviceId: LineCode; station: string }> = [];
  const warmedKeys: string[] = [];
  const startedAt = Date.now();

  const stationFetchLimiter = new ConcurrencyLimiter(STATION_FETCH_CONCURRENCY);

  for (const serviceId of lines) {
    const usageStations = cache
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
        await stationFetchLimiter.run(() => fetchDepartures(stationId, serviceId));
        const cacheKey = createStationCacheKey(serviceId, stationId);
        warmedKeys.push(cacheKey);
        warmedStations.push({ serviceId, station: stationId });
      } catch (error) {
        requestLogger.warn('Failed to prewarm station departures', {
          serviceId,
          stationId,
          reason,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  cache.recordWarmup(warmedKeys, reason);

  const durationMs = Date.now() - startedAt;

  requestLogger.debug('Station departures prewarm complete', {
    warmedStations: warmedKeys.length,
    reason,
    durationMs,
  });

  return { warmedStations, reason, durationMs };
}

