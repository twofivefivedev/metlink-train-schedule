/**
 * GET /api/station/[stationId]
 * Get departures for a specific station
 * Supports optional line query parameter for filtering by train line
 */

import { NextRequest, NextResponse } from 'next/server';
import { STATION_NAMES, type LineCode, getServiceIdFromLineCode } from '@/lib/constants';
import { getWairarapaDepartures } from '@/lib/server/metlinkService';
import { success, validationError } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params;
    const upperStationId = stationId.toUpperCase();

    // Get line from query params or use default (WRL for backward compatibility)
    const searchParams = request.nextUrl.searchParams;
    const lineParam = searchParams.get('line') || 'WRL';
    
    // Validate line code and get service ID
    const serviceId = getServiceIdFromLineCode(lineParam);

    // Validate station ID - check if it exists in station names (more flexible)
    if (!STATION_NAMES[upperStationId]) {
      return NextResponse.json(
        validationError('Invalid station ID', {
          provided: stationId,
          validStations: Object.keys(STATION_NAMES),
        }),
        { status: 400 }
      );
    }

    logger.info(`Fetching departures for station: ${upperStationId}, line: ${serviceId}`);

    // Fetch departures for the station with the specified line/service ID
    const departures = await getWairarapaDepartures(
      upperStationId,
      serviceId
    );

    return NextResponse.json(success({
      station: upperStationId,
      line: serviceId,
      departures,
      total: departures.length,
    }));
  } catch (err) {
    logger.error('Error fetching station departures', err as Error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch station departures',
          code: 'FETCH_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

