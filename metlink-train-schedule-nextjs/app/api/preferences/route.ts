/**
 * GET/POST /api/preferences
 * API stub for user preferences (currently uses localStorage, but provides API interface for future backend integration)
 */

import { NextRequest, NextResponse } from 'next/server';
import { success } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';

/**
 * GET /api/preferences
 * Get user preferences (stub - returns empty for now, client uses localStorage)
 */
export async function GET(request: NextRequest) {
  try {
    // In the future, this would fetch from a database
    // For now, return empty preferences as the client uses localStorage
    logger.info('Preferences API called (stub)');
    
    return NextResponse.json(
      success({
        favorites: [],
        alerts: {
          enabled: false,
          notifyOnDelay: true,
          notifyOnCancellation: true,
          notifyOnApproaching: false,
          approachingMinutes: 5,
        },
      })
    );
  } catch (error) {
    logger.error('Error fetching preferences', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch preferences',
          code: 'FETCH_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/preferences
 * Save user preferences (stub - for future backend integration)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.info('Preferences save API called (stub)', { hasBody: !!body });
    
    // In the future, this would save to a database
    // For now, just acknowledge the request
    
    return NextResponse.json(
      success({
        message: 'Preferences saved (stub)',
      })
    );
  } catch (error) {
    logger.error('Error saving preferences', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to save preferences',
          code: 'SAVE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

