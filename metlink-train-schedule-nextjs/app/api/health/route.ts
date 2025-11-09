/**
 * GET /api/health
 * Health check endpoint
 */

import { NextResponse } from 'next/server';
import { cache } from '@/lib/server/cache';
import { success } from '@/lib/server/response';

export async function GET() {
  const cacheInfo = cache.getInfo();

  return NextResponse.json(
    success({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      cache: cacheInfo,
    })
  );
}

