import { NextRequest, NextResponse } from 'next/server';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';
import { getPerformanceStats } from '@/lib/server/performance';
import { getPerformanceRepository } from '@/lib/server/db/performanceRepository';

const performanceRepository = getPerformanceRepository();

export async function GET(request: NextRequest) {
  try {
    const windowSecondsParam = request.nextUrl.searchParams.get('windowSeconds');
    const requestedWindow = Number(windowSecondsParam);
    const windowSeconds = Number.isFinite(requestedWindow) && requestedWindow > 0 ? requestedWindow : 3600;
    const startDate = new Date(Date.now() - windowSeconds * 1000);

    const [performance, apiRequests] = await Promise.all([
      getPerformanceStats(undefined, startDate, undefined),
      performanceRepository.getApiRequestStats({ startDate }),
    ]);

    return NextResponse.json(
      success({
        timestamp: new Date().toISOString(),
        windowSeconds,
        performance,
        apiRequests,
      })
    );
  } catch (error) {
    logger.error('Failed to fetch metrics snapshot', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch metrics snapshot',
          code: 'FETCH_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

