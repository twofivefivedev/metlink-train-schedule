/**
 * GET /api/analytics/performance
 * Get performance statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceStats } from '@/lib/server/performance';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint') || undefined;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    const stats = await getPerformanceStats(endpoint, startDate, endDate);

    return NextResponse.json(success(stats));
  } catch (error) {
    logger.error('Error fetching performance stats', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch performance statistics',
          code: 'FETCH_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

