/**
 * GET /api/station/[stationId]
 * Get departures for a specific station
 */

import { NextRequest, NextResponse } from 'next/server';
import { STATIONS, SERVICE_IDS } from '@/lib/constants';
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

    // Validate station ID
    if (!Object.values(STATIONS).includes(upperStationId as typeof STATIONS[keyof typeof STATIONS])) {
      return NextResponse.json(
        validationError('Invalid station ID', {
          provided: stationId,
          validStations: Object.values(STATIONS),
        }),
        { status: 400 }
      );
    }

    logger.info(`Fetching departures for station: ${upperStationId}`);

    // Fetch departures for the station
    const departures = await getWairarapaDepartures(
      upperStationId,
      SERVICE_IDS.WAIRARAPA_LINE
    );

    return NextResponse.json(success({
      station: upperStationId,
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

