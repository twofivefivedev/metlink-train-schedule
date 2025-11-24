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
import { withValidation } from '@/lib/server/middleware/withValidation';
import { withRateLimit } from '@/lib/server/middleware/withRateLimit';
import { stationQuerySchema } from '@/lib/server/validation/schemas';
import { createRequestContext, withRequestContext } from '@/lib/server/requestContext';
import type { z } from 'zod';

async function stationHandler(
  request: NextRequest,
  context: { params: { stationId: string } | Promise<{ stationId: string }> },
  validated: z.infer<typeof stationQuerySchema>
) {
  const requestContext = createRequestContext(request);
  try {
    const params = await Promise.resolve(context.params);
    const { stationId } = params;
    const upperStationId = stationId.toUpperCase();

    // Get line from query params or use default (WRL for backward compatibility)
    const lineParam = validated.line || 'WRL';
    
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

    logger.info(
      `Fetching departures for station: ${upperStationId}, line: ${serviceId}`,
      withRequestContext({ stationId: upperStationId, line: serviceId }, requestContext)
    );

    // Fetch departures for the station with the specified line/service ID
    const departures = await getWairarapaDepartures(
      upperStationId,
      serviceId,
      requestContext
    );

    return NextResponse.json(success({
      station: upperStationId,
      line: serviceId,
      departures,
      total: departures.length,
    }));
  } catch (err) {
    logger.error('Error fetching station departures', withRequestContext({
      error: err instanceof Error ? err.message : String(err),
      stationId: context.params ? (await Promise.resolve(context.params)).stationId : undefined,
    }, requestContext));
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

export const GET = withRateLimit(
  { limit: 60, windowMs: 60_000 },
  withValidation(stationQuerySchema, stationHandler)
);

