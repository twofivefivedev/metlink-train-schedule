/**
 * GET/POST /api/preferences
 * User preferences API - uses database with localStorage fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import { success, error as errorResponse } from '@/lib/server/response';
import { logger } from '@/lib/server/logger';
import {
  loadUserPreferencesFromDb,
  saveScheduleConfigToDb,
  removeScheduleConfigFromDb,
  updateAlertPreferencesInDb,
} from '@/lib/server/preferencesService';

/**
 * GET /api/preferences
 * Get user preferences from database
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id') || request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        errorResponse('User ID is required', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const preferences = await loadUserPreferencesFromDb(userId);
    
    if (preferences) {
      return NextResponse.json(success(preferences));
    }

    // Fallback: return empty preferences if database unavailable
    return NextResponse.json(
      success({
        configs: [],
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
      errorResponse('Failed to fetch preferences', 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/preferences
 * Save user preferences to database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || request.headers.get('X-User-Id');
    
    if (!userId) {
      return NextResponse.json(
        errorResponse('User ID is required', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // Handle different types of preference updates
    if (body.config) {
      // Save schedule config
      const saved = await saveScheduleConfigToDb(userId, body.config);
      if (saved) {
        return NextResponse.json(success({ config: saved }));
      }
    } else if (body.configId && body.action === 'delete') {
      // Remove schedule config
      const removed = await removeScheduleConfigFromDb(userId, body.configId);
      if (removed) {
        return NextResponse.json(success({ removed: true }));
      }
    } else if (body.alerts) {
      // Update alert preferences
      const updated = await updateAlertPreferencesInDb(userId, body.alerts);
      if (updated) {
        return NextResponse.json(success({ alerts: updated }));
      }
    }

    // If database operations failed, still return success (client will use localStorage)
    return NextResponse.json(
      success({
        message: 'Preferences saved (fallback to localStorage)',
      })
    );
  } catch (error) {
    logger.error('Error saving preferences', error as Error);
    return NextResponse.json(
      errorResponse('Failed to save preferences', 'SAVE_ERROR'),
      { status: 500 }
    );
  }
}

