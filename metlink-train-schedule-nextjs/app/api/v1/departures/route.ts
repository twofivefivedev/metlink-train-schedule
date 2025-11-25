/**
 * GET /api/v1/departures
 * Version 1 API for train departures
 * This is the versioned endpoint - legacy routes will redirect here
 */

import { NextRequest, NextResponse } from 'next/server';
import { SERVICE_IDS, getDefaultStationsForLine, type LineCode, getServiceIdFromLineCode } from '@/lib/constants';
import { getMultipleStationDepartures, getRequestMetrics, prewarmStationDepartures } from '@/lib/server/metlinkService';
import { processDepartures } from '@/lib/server/departureService';
import { cache } from '@/lib/server/cache';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';
import { recordServiceIncidents } from '@/lib/server/incidentsService';
import { createPerformanceContext, recordPerformanceMetric, recordApiRequestMetric } from '@/lib/server/performance';
import { withValidation } from '@/lib/server/middleware/withValidation';
import { withRateLimit } from '@/lib/server/middleware/withRateLimit';
import { departuresQuerySchema, parseStationsParam } from '@/lib/server/validation/schemas';
import { createRequestContext, withRequestContext } from '@/lib/server/requestContext';
import type { z } from 'zod';

async function baseHandler(
  request: NextRequest,
  context: Record<string, unknown>,
  validated: z.infer<typeof departuresQuerySchema>
) {
  const requestContext = createRequestContext(request);
  const perfContext = createPerformanceContext(request, '/api/v1/departures');
  let cacheKey = '';
  const { line, stations, prewarm } = validated;
  const isCronRequest = request.headers.has('x-vercel-cron');
  const manualPrewarmRequested = Boolean(prewarm);
  const shouldPrewarm = isCronRequest || manualPrewarmRequested;
  const prewarmPromise = shouldPrewarm
    ? prewarmStationDepartures({ reason: isCronRequest ? 'cron' : 'manual' })
    : null;
  let prewarmSummary: Awaited<ReturnType<typeof prewarmStationDepartures>> | null = null;
  let prewarmHandled = false;
  const resolvePrewarm = async () => {
    if (!prewarmPromise || prewarmHandled) {
      return prewarmSummary;
    }
    prewarmHandled = true;
    if (isCronRequest) {
      try {
        prewarmSummary = await prewarmPromise;
      } catch (error) {
        logger.warn('Station cache prewarm failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        prewarmSummary = null;
      }
    } else {
      prewarmPromise.catch((error) => {
        logger.warn('Station cache prewarm (async) failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
      prewarmSummary = null;
    }
    return prewarmSummary;
  };

  try {
    // Verify environment variable is available
    const apiKey = process.env.METLINK_API_KEY;
    if (!apiKey) {
      logger.error('METLINK_API_KEY is not set in environment variables');
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Server configuration error: API key not found',
            code: 'CONFIG_ERROR',
          },
        },
        { status: 500 }
      );
    }

    // Get station list and line from query params or use defaults
    const stationsParam = stations || null;
    const lineParam = line || 'WRL';
    
    // Validate line code and get service ID
    const serviceId = getServiceIdFromLineCode(lineParam);

    // If no stations specified, use all stations for the line
    const parsedStations = parseStationsParam(stationsParam || undefined);
    const stationCodes = parsedStations?.length
      ? parsedStations
      : getDefaultStationsForLine(serviceId);

    // Check cache first (cache key includes station list and line)
    cacheKey = `${[...stationCodes].sort().join(',')}-${serviceId}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      const cacheAge = await cache.getAge(cacheKey);
      
      // Record API request metric (cache hit)
      recordApiRequestMetric(
        '/api/v1/departures',
        'GET',
        200,
        Date.now() - perfContext.startTime,
        true
      ).catch(() => {});

      const resolvedPrewarm = await resolvePrewarm();
      const response = NextResponse.json(
        success(
          {
            inbound: cachedData.inbound,
            outbound: cachedData.outbound,
            total: cachedData.total,
          },
          {
            cached: true,
            cacheAge: `${cacheAge}s`,
            version: 'v1',
            ...(resolvedPrewarm
              ? {
                  prewarm: {
                    warmedStations: resolvedPrewarm.warmedStations.length,
                    reason: resolvedPrewarm.reason,
                    durationMs: resolvedPrewarm.durationMs,
                  },
                }
              : {}),
          }
        )
      );
      
      recordPerformanceMetric(perfContext, 200, undefined, undefined)
        .catch(() => {});
      
      return response;
    }

    const metricsBefore = getRequestMetrics();

    // Fetch data from specified stations for the specified line
    const stationResults = await getMultipleStationDepartures(
      stationCodes,
      serviceId,
      requestContext
    );

    // Process and organize departures
    const { inbound, outbound, total } = processDepartures(stationResults);

    const metricsAfter = getRequestMetrics();
    const apiCallsMade = metricsAfter.totalRequests - metricsBefore.totalRequests;

    // Cache the result
    await cache.set({ inbound, outbound, total }, cacheKey);

    // Record service incidents for analytics (non-blocking)
    const allDepartures = [...inbound, ...outbound];
    recordServiceIncidents(allDepartures, stationCodes.join(','))
      .catch((error) => {
        logger.warn('Failed to record service incidents', {
          error: error instanceof Error ? error.message : String(error),
        });
      });

    // Record API request metric (cache miss)
    recordApiRequestMetric(
      '/api/v1/departures',
      'GET',
      200,
      Date.now() - perfContext.startTime,
      false
    ).catch(() => {});

    // Return response
    const resolvedPrewarm = await resolvePrewarm();
    const response = NextResponse.json(
      success(
        {
          inbound,
          outbound,
          total,
          version: 'v1',
        },
        resolvedPrewarm
          ? {
              prewarm: {
                warmedStations: resolvedPrewarm.warmedStations.length,
                reason: resolvedPrewarm.reason,
                durationMs: resolvedPrewarm.durationMs,
              },
            }
          : undefined
      )
    );
    
    recordPerformanceMetric(perfContext, 200, undefined, undefined)
      .catch(() => {});
    
    return response;
  } catch (err) {
    const error = err as Error;
    logger.error('Error fetching departures', withRequestContext({
      error: error.message,
      stack: error.stack,
      name: error.name,
      stations: cacheKey,
    }, requestContext));
    
    // Record error metrics
    recordApiRequestMetric(
      '/api/v1/departures',
      'GET',
      500,
      Date.now() - perfContext.startTime,
      false,
      error.message
    ).catch(() => {});
    
    recordPerformanceMetric(perfContext, 500, undefined, undefined, error.message)
      .catch(() => {});
    
    await resolvePrewarm();

    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'Failed to fetch departures',
          code: 'FETCH_ERROR',
        },
        version: 'v1',
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  { limit: 60, windowMs: 60_000 },
  withValidation(departuresQuerySchema, baseHandler)
);

