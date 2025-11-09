/**
 * GET /api/wairarapa-departures
 * Get all Wairarapa line departures (inbound and outbound)
 */

import { NextRequest, NextResponse } from 'next/server';
import { SERVICE_IDS, getDefaultStationsForLine, type LineCode, getServiceIdFromLineCode } from '@/lib/constants';
import { getMultipleStationDepartures, getRequestMetrics } from '@/lib/server/metlinkService';
import { processDepartures } from '@/lib/server/departureService';
import { cache } from '@/lib/server/cache';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  let cacheKey = '';
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
    logger.debug('Environment check passed', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
    });

    // Get station list and line from query params or use defaults
    const searchParams = request.nextUrl.searchParams;
    const stationsParam = searchParams.get('stations');
    const lineParam = searchParams.get('line') || 'WRL';
    
    // Validate line code and get service ID
    const serviceId = getServiceIdFromLineCode(lineParam);
    
    // If no stations specified, use all stations for the line
    const stationCodes = stationsParam
      ? stationsParam.split(',').map(s => s.trim().toUpperCase())
      : getDefaultStationsForLine(serviceId);

    // Check cache first (cache key includes station list and line)
    cacheKey = `${[...stationCodes].sort().join(',')}-${serviceId}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.info('Returning cached data', {
        cacheAge: cache.getAge(cacheKey),
        stations: cacheKey,
        line: serviceId,
      });
      return NextResponse.json(
        success(
          {
            inbound: cachedData.inbound,
            outbound: cachedData.outbound,
            total: cachedData.total,
          },
          {
            cached: true,
            cacheAge: `${cache.getAge(cacheKey)}s`,
          }
        )
      );
    }

    const metricsBefore = getRequestMetrics();

    logger.info('Cache expired or empty, fetching fresh data', {
      stations: cacheKey,
      line: serviceId,
      estimatedApiCalls: stationCodes.length, // Each station may trigger 1-3 API calls
    });

    // Fetch data from specified stations for the specified line
    logger.info('Fetching departures from Metlink API', {
      stations: stationCodes,
      line: serviceId,
      stationCount: stationCodes.length,
    });
    
    const stationResults = await getMultipleStationDepartures(
      stationCodes,
      serviceId
    );

    logger.info('Received station results', {
      resultCount: stationResults.length,
      resultsWithData: stationResults.filter(r => r.length > 0).length,
    });

    // Process and organize departures
    const { inbound, outbound, total } = processDepartures(stationResults);

    const metricsAfter = getRequestMetrics();
    const apiCallsMade = metricsAfter.totalRequests - metricsBefore.totalRequests;

    logger.info('Fetched fresh departures', {
      inbound: inbound.length,
      outbound: outbound.length,
      total,
      apiCallsMade,
      totalRequestsThisHour: metricsAfter.requestsThisHour,
    });

    // Cache the result
    cache.set({ inbound, outbound, total }, cacheKey);

    // Return response
    return NextResponse.json(success({
      inbound,
      outbound,
      total,
    }));
  } catch (err) {
    const error = err as Error;
    logger.error('Error fetching departures', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      stations: cacheKey,
    });
    
    // Report to Sentry in production
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(error, {
          tags: {
            endpoint: '/api/wairarapa-departures',
          },
          extra: {
            stations: cacheKey,
          },
        });
      } catch (sentryError) {
        // Silently fail if Sentry is not available
        logger.warn('Failed to report error to Sentry', {
          error: sentryError instanceof Error ? sentryError.message : String(sentryError),
        });
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'Failed to fetch departures',
          code: 'FETCH_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

