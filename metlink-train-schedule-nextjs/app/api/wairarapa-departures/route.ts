/**
 * GET /api/wairarapa-departures
 * Legacy endpoint - redirects to /api/v1/departures
 * @deprecated Use /api/v1/departures instead
 */

import { NextRequest, NextResponse } from 'next/server';

// Import v1 handler directly
import { GET as v1GET } from '../v1/departures/route';

export async function GET(request: NextRequest) {
  // Call v1 handler directly
  const response = await v1GET(request);
  
  // Add deprecation warning header
  response.headers.set('X-API-Deprecated', 'true');
  response.headers.set('X-API-Version', 'v1');
  response.headers.set('X-API-Migration-Path', '/api/v1/departures');
  
  return response;
}
