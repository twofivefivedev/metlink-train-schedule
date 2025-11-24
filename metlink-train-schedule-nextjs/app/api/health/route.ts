/**
 * GET /api/health
 * Health check endpoint
 */

import { NextResponse } from 'next/server';
import { cache } from '@/lib/server/cache';
import { isSupabaseAvailable } from '@/lib/server/supabaseAdmin';
import { success } from '@/lib/server/response';
import { getRequestMetrics } from '@/lib/server/metlinkService';
import { getCircuitBreakerSnapshot } from '@/lib/server/circuitBreaker';

export async function GET() {
  const cacheInfo = await cache.getInfo('default');
  const supabaseAvailable = await isSupabaseAvailable();
  const circuitBreaker = getCircuitBreakerSnapshot();
  const metlinkMetrics = getRequestMetrics();

  return NextResponse.json(
    success({
      status: circuitBreaker.state === 'open' ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      cache: cacheInfo,
      supabase: {
        available: supabaseAvailable,
        usingDatabaseCache: supabaseAvailable,
      },
      metlink: {
        circuitBreaker,
        requests: metlinkMetrics,
      },
    })
  );
}

