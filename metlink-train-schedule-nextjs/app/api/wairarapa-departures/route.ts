/**
 * GET /api/wairarapa-departures
 * Get all Wairarapa line departures (inbound and outbound)
 */

import { NextResponse } from 'next/server';
import { STATIONS, SERVICE_IDS } from '@/lib/constants';
import { getMultipleStationDepartures } from '@/lib/server/metlinkService';
import { processDepartures } from '@/lib/server/departureService';
import { cache } from '@/lib/server/cache';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';

export async function GET() {
  try {
    // Check cache first
    const cachedData = cache.get();
    if (cachedData) {
      logger.info('Returning cached data', {
        cacheAge: cache.getAge(),
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
            cacheAge: `${cache.getAge()}s`,
          }
        )
      );
    }

    logger.info('Cache expired or empty, fetching fresh data');

    // Fetch data from all stations
    const stationCodes = Object.values(STATIONS);
    const stationResults = await getMultipleStationDepartures(
      stationCodes,
      SERVICE_IDS.WAIRARAPA_LINE
    );

    // Process and organize departures
    const { inbound, outbound, total } = processDepartures(stationResults);

    logger.info('Fetched fresh departures', {
      inbound: inbound.length,
      outbound: outbound.length,
      total,
    });

    // Cache the result
    cache.set({ inbound, outbound, total });

    // Return response
    return NextResponse.json(success({
      inbound,
      outbound,
      total,
    }));
  } catch (err) {
    logger.error('Error fetching departures', err as Error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch departures',
          code: 'FETCH_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

