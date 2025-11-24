/**
 * GET /api/analytics/incidents/summary
 * Get summary statistics for service incidents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIncidentsSummary } from '@/lib/server/incidentsService';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';

// Cache duration: 2 minutes for summary data
const SUMMARY_CACHE_DURATION_MS = 2 * 60 * 1000;

interface CachedSummary {
  total: number;
  cancelled: number;
  delayed: number;
  busReplacement: number;
  byType: {
    cancelled: number;
    delayed: number;
    bus_replacement: number;
  };
}

interface CacheEntry {
  data: CachedSummary;
  timestamp: number;
}

// Simple in-memory cache for summary data
const summaryCache = new Map<string, CacheEntry>();

function getCachedSummary(key: string): CachedSummary | null {
  const entry = summaryCache.get(key);
  if (!entry) {
    return null;
  }
  
  const age = Date.now() - entry.timestamp;
  if (age > SUMMARY_CACHE_DURATION_MS) {
    summaryCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedSummary(key: string, data: CachedSummary): void {
  summaryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
  
  // Clean up old entries periodically (keep cache size reasonable)
  if (summaryCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of summaryCache.entries()) {
      if (now - v.timestamp > SUMMARY_CACHE_DURATION_MS) {
        summaryCache.delete(k);
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serviceId = searchParams.get('serviceId') || undefined;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // Default to last 7 days if no dates specified
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);
    
    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    // Create cache key
    const cacheKey = `incidents-summary:${serviceId || 'all'}:${finalStartDate.toISOString()}:${finalEndDate.toISOString()}`;
    
    // Check cache
    const cached = getCachedSummary(cacheKey);
    if (cached) {
      const entry = summaryCache.get(cacheKey);
      const cacheAge = entry ? Math.round((Date.now() - entry.timestamp) / 1000) : 0;
      logger.debug('Incidents summary cache hit', {
        serviceId: serviceId || 'all',
        cacheAge,
      });
      return NextResponse.json(
        success(cached, {
          cached: true,
          cacheAge: `${cacheAge}s`,
        })
      );
    }

    // Fetch from database
    logger.debug('Fetching incidents summary from database', {
      serviceId: serviceId || 'all',
      startDate: finalStartDate.toISOString(),
      endDate: finalEndDate.toISOString(),
    });
    
    const summary = await getIncidentsSummary({
      serviceId,
      startDate: finalStartDate,
      endDate: finalEndDate,
    });

    // Cache the result
    setCachedSummary(cacheKey, summary);
    
    logger.info('Incidents summary fetched and cached', {
      serviceId: serviceId || 'all',
      total: summary.total,
      byType: summary.byType,
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

