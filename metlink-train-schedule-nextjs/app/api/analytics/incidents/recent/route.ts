/**
 * GET /api/analytics/incidents/recent
 * Get recent service incidents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceIncidents } from '@/lib/server/incidentsService';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serviceId = searchParams.get('serviceId') || undefined;
    const stopId = searchParams.get('stopId') || undefined;
    const station = searchParams.get('station') || undefined;
    const incidentType = searchParams.get('incidentType') as 'cancelled' | 'delayed' | 'bus_replacement' | undefined;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const limitParam = searchParams.get('limit');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    // Default to last 7 days if no dates specified
    if (!startDate && !endDate) {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 7);

      const incidents = await getServiceIncidents({
        serviceId,
        stopId,
        station,
        incidentType,
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        limit,
      });

      return NextResponse.json(success({ incidents, count: incidents.length }));
    }

    const incidents = await getServiceIncidents({
      serviceId,
      stopId,
      station,
      incidentType,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json(success({ incidents, count: incidents.length }));
  } catch (error) {
    logger.error('Error fetching recent incidents', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch recent incidents',
          code: 'FETCH_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

