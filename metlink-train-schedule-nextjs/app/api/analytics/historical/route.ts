/**
 * GET /api/analytics/historical
 * Get historical departure data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalDepartures } from '@/lib/server/historicalService';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serviceId = searchParams.get('serviceId') || undefined;
    const stopId = searchParams.get('stopId') || undefined;
    const station = searchParams.get('station') || undefined;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const limitParam = searchParams.get('limit');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const data = await getHistoricalDepartures({
      serviceId,
      stopId,
      station,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json(success({ departures: data, count: data.length }));
  } catch (error) {
    logger.error('Error fetching historical data', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch historical data',
          code: 'FETCH_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

