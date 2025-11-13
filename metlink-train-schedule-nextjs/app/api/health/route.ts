/**
 * GET /api/health
 * Health check endpoint
 */

import { NextResponse } from 'next/server';
import { cache } from '@/lib/server/cache';
import { isSupabaseAvailable } from '@/lib/server/supabaseAdmin';
import { success } from '@/lib/server/response';

export async function GET() {
  const cacheInfo = await cache.getInfo('default');
  const supabaseAvailable = await isSupabaseAvailable();

  return NextResponse.json(
    success({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      cache: cacheInfo,
      supabase: {
        available: supabaseAvailable,
        usingDatabaseCache: supabaseAvailable,
      },
    })
  );
}

