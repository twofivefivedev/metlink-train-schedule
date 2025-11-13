/**
 * GET /api/v1/departures
 * Version 1 API for train departures
 * This is the versioned endpoint - legacy routes will redirect here
 */

import { NextRequest, NextResponse } from 'next/server';
import { SERVICE_IDS, getDefaultStationsForLine, type LineCode, getServiceIdFromLineCode } from '@/lib/constants';
import { getMultipleStationDepartures, getRequestMetrics } from '@/lib/server/metlinkService';
import { processDepartures } from '@/lib/server/departureService';
import { cache } from '@/lib/server/cache';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';
import { storeHistoricalDepartures } from '@/lib/server/historicalService';
import { createPerformanceContext, recordPerformanceMetric, recordApiRequestMetric } from '@/lib/server/performance';

export async function GET(request: NextRequest) {
  const perfContext = createPerformanceContext(request, '/api/v1/departures');
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
      serviceId
    );

    // Process and organize departures
    const { inbound, outbound, total } = processDepartures(stationResults);

    const metricsAfter = getRequestMetrics();
    const apiCallsMade = metricsAfter.totalRequests - metricsBefore.totalRequests;

    // Cache the result
    await cache.set({ inbound, outbound, total }, cacheKey);

    // Store historical data for analytics (non-blocking)
    const allDepartures = [...inbound, ...outbound];
    storeHistoricalDepartures(allDepartures, stationCodes.join(','))
      .catch((error) => {
        logger.warn('Failed to store historical data', {
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
    const response = NextResponse.json(success({
      inbound,
      outbound,
      total,
      version: 'v1',
    }));
    
    recordPerformanceMetric(perfContext, 200, undefined, undefined)
      .catch(() => {});
    
    return response;
  } catch (err) {
    const error = err as Error;
    logger.error('Error fetching departures', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      stations: cacheKey,
    });
    
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

