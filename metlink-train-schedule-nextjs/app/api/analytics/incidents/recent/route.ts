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
    const cursorParam = searchParams.get('cursor'); // Cursor for pagination (ISO timestamp)

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50; // Max 200, default 50
    const cursor = cursorParam ? new Date(cursorParam) : undefined;

    // Default to last 7 days if no dates specified
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);

    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    // If cursor is provided, use it as the endDate for pagination
    const queryEndDate = cursor || finalEndDate;

    logger.debug('Fetching recent incidents', {
      serviceId: serviceId || 'all',
      limit,
      cursor: cursor?.toISOString(),
    });

    const incidents = await getServiceIncidents({
      serviceId,
      stopId,
      station,
      incidentType,
      startDate: finalStartDate,
      endDate: queryEndDate,
      limit: limit + 1, // Fetch one extra to determine if there are more
    });

    // Check if there are more results
    const hasMore = incidents.length > limit;
    const results = hasMore ? incidents.slice(0, limit) : incidents;
    
    // Generate next cursor (createdAt of last item)
    const nextCursor = hasMore && results.length > 0 
      ? results[results.length - 1].createdAt.toISOString()
      : null;

    logger.debug('Recent incidents fetched', {
      serviceId: serviceId || 'all',
      count: results.length,
      hasMore,
    });

    return NextResponse.json(
      success({
        incidents: results,
        count: results.length,
        pagination: {
          hasMore,
          nextCursor,
          limit,
        },
      })
    );
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

