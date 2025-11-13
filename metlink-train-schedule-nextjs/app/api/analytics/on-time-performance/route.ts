/**
 * GET /api/analytics/on-time-performance
 * Get on-time performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateOnTimePerformance } from '@/lib/server/historicalService';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serviceId = searchParams.get('serviceId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!serviceId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'serviceId is required',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 }
      );
    }

    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days ago
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    const performance = await calculateOnTimePerformance(
      serviceId,
      startDate,
      endDate
    );

    return NextResponse.json(success(performance));
  } catch (error) {
    logger.error('Error fetching on-time performance', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch on-time performance',
          code: 'FETCH_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

