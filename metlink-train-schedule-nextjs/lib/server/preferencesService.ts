/**
 * User preferences service
 * Manages user preferences and schedule configurations using Supabase
 */

import { isSupabaseAvailable } from './supabaseAdmin';
import { getPreferencesRepository } from './db';
import { logger } from './logger';
import type { ScheduleConfig, AlertPreferences } from '@/lib/utils/favorites';

/**
 * Get or create a user by client-generated userId
 */
async function getOrCreateUser(userId: string): Promise<{ id: string; userId: string }> {
  if (!(await isSupabaseAvailable())) {
    throw new Error('Supabase not available');
  }

  try {
    const prefsRepo = getPreferencesRepository();
    return await prefsRepo.getOrCreateUser(userId);
  } catch (error) {
    logger.error('Failed to get or create user', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}

/**
 * Load user preferences from Supabase
 */
export async function loadUserPreferencesFromDb(userId: string): Promise<{
  configs: ScheduleConfig[];
  alerts: AlertPreferences;
} | null> {
  if (!(await isSupabaseAvailable())) {
    return null;
  }

  try {
    const user = await getOrCreateUser(userId);
    const prefsRepo = getPreferencesRepository();
    
    // Load schedule configs and preferences
    const [configs, preferences] = await Promise.all([
      prefsRepo.getScheduleConfigs(user.id),
      prefsRepo.getUserPreferences(user.id),
    ]);

    const alerts: AlertPreferences = preferences || {
      enabled: false,
      notifyOnDelay: true,
      notifyOnCancellation: true,
      notifyOnApproaching: false,
      approachingMinutes: 5,
    };

    return { configs, alerts };
  } catch (error) {
    logger.error('Failed to load user preferences from Supabase', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    return null;
  }
}

/**
 * Save schedule config to Supabase
 * Accepts full ScheduleConfig but ignores id and createdAt (Supabase generates these)
 */
export async function saveScheduleConfigToDb(
  userId: string,
  config: ScheduleConfig | Omit<ScheduleConfig, 'id' | 'createdAt'>
): Promise<ScheduleConfig | null> {
  if (!(await isSupabaseAvailable())) {
    return null;
  }

  try {
    const user = await getOrCreateUser(userId);
    const prefsRepo = getPreferencesRepository();
    return await prefsRepo.createScheduleConfig(user.id, config);
  } catch (error) {
    logger.error('Failed to save schedule config to Supabase', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    return null;
  }
}

/**
 * Remove schedule config from Supabase
 */
export async function removeScheduleConfigFromDb(
  userId: string,
  configId: string
): Promise<boolean> {
  if (!(await isSupabaseAvailable())) {
    return false;
  }

  try {
    const user = await getOrCreateUser(userId);
    const prefsRepo = getPreferencesRepository();
    await prefsRepo.deleteScheduleConfig(user.id, configId);
    return true;
  } catch (error) {
    logger.error('Failed to remove schedule config from Supabase', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      configId,
    });
    return false;
  }
}

/**
 * Update alert preferences in Supabase
 */
export async function updateAlertPreferencesInDb(
  userId: string,
  alerts: Partial<AlertPreferences>
): Promise<AlertPreferences | null> {
  if (!(await isSupabaseAvailable())) {
    return null;
  }

  try {
    const user = await getOrCreateUser(userId);
    const prefsRepo = getPreferencesRepository();
    return await prefsRepo.updateUserPreferences(user.id, alerts);
  } catch (error) {
    logger.error('Failed to update alert preferences in Supabase', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    return null;
  }
}
