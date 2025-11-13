/**
 * GET /api/analytics/incidents/summary
 * Get summary statistics for service incidents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIncidentsSummary } from '@/lib/server/incidentsService';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serviceId = searchParams.get('serviceId') || undefined;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // Default to last 7 days if no dates specified
    if (!startDate && !endDate) {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 7);
      
      const summary = await getIncidentsSummary({
        serviceId,
        startDate: defaultStartDate,
        endDate: defaultEndDate,
      });

      return NextResponse.json(success(summary));
    }

    const summary = await getIncidentsSummary({
      serviceId,
      startDate,
      endDate,
    });

    return NextResponse.json(success(summary));
  } catch (error) {
    logger.error('Error fetching incidents summary', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch incidents summary',
          code: 'FETCH_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

