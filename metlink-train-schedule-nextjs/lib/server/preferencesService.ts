/**
 * User preferences service
 * Manages user preferences and schedule configurations using Supabase
 */

import { getSupabaseAdminClient, isSupabaseAvailable } from './supabaseAdmin';
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
    const supabase = getSupabaseAdminClient();
    
    // Try to find existing user
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, userId')
      .eq('userId', userId)
      .single();

    if (existingUser && !findError) {
      return { id: existingUser.id, userId: existingUser.userId };
    }

    // Create if doesn't exist
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({ userId })
      .select('id, userId')
      .single();

    if (createError || !newUser) {
      throw createError || new Error('Failed to create user');
    }

    logger.debug('Created new user', { userId });
    return { id: newUser.id, userId: newUser.userId };
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
    const supabase = getSupabaseAdminClient();
    
    // Load schedule configs
    const { data: dbConfigs, error: configsError } = await supabase
      .from('schedule_configs')
      .select('*')
      .eq('userInternalId', user.id)
      .order('createdAt', { ascending: false });

    if (configsError) {
      logger.error('Failed to load schedule configs', { error: configsError.message });
    }

    // Load alert preferences
    const { data: dbPreferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('userInternalId', user.id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('Failed to load user preferences', { error: prefsError.message });
    }

    // Convert database models to application types
    const configs: ScheduleConfig[] = (dbConfigs || []).map((config) => ({
      id: config.id,
      name: config.name,
      line: config.line as any,
      selectedStations: config.selectedStations as string[],
      direction: config.direction as 'inbound' | 'outbound',
      filters: {
        selectedStation: config.selectedStation || null,
        routeFilter: config.routeFilter as 'all' | 'express' | 'all-stops',
        sortOption: config.sortOption as any,
        sortDirection: config.sortDirection as 'asc' | 'desc',
      },
      createdAt: new Date(config.createdAt).toISOString(),
    }));

    const alerts: AlertPreferences = dbPreferences
      ? {
          enabled: dbPreferences.alertsEnabled,
          notifyOnDelay: dbPreferences.notifyOnDelay,
          notifyOnCancellation: dbPreferences.notifyOnCancellation,
          notifyOnApproaching: dbPreferences.notifyOnApproaching,
          approachingMinutes: dbPreferences.approachingMinutes,
        }
      : {
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
    const supabase = getSupabaseAdminClient();

    const { data: dbConfig, error } = await supabase
      .from('schedule_configs')
      .insert({
        userInternalId: user.id,
        name: config.name,
        line: config.line,
        selectedStations: config.selectedStations,
        direction: config.direction,
        selectedStation: config.filters.selectedStation || null,
        routeFilter: config.filters.routeFilter,
        sortOption: config.filters.sortOption,
        sortDirection: config.filters.sortDirection,
      })
      .select()
      .single();

    if (error || !dbConfig) {
      throw error || new Error('Failed to create schedule config');
    }

    return {
      id: dbConfig.id,
      name: dbConfig.name,
      line: dbConfig.line as any,
      selectedStations: dbConfig.selectedStations as string[],
      direction: dbConfig.direction as 'inbound' | 'outbound',
      filters: {
        selectedStation: dbConfig.selectedStation || null,
        routeFilter: dbConfig.routeFilter as 'all' | 'express' | 'all-stops',
        sortOption: dbConfig.sortOption as any,
        sortDirection: dbConfig.sortDirection as 'asc' | 'desc',
      },
      createdAt: new Date(dbConfig.createdAt).toISOString(),
    };
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
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from('schedule_configs')
      .delete()
      .eq('id', configId)
      .eq('userInternalId', user.id); // Ensure user owns this config

    if (error) {
      throw error;
    }

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
    const supabase = getSupabaseAdminClient();

    // Get existing preferences or create new
    const { data: existingPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('userInternalId', user.id)
      .single();

    let dbPreferences;

    if (!existingPrefs) {
      // Create new preferences
      const { data: newPrefs, error: createError } = await supabase
        .from('user_preferences')
        .insert({
          userInternalId: user.id,
          alertsEnabled: alerts.enabled ?? false,
          notifyOnDelay: alerts.notifyOnDelay ?? true,
          notifyOnCancellation: alerts.notifyOnCancellation ?? true,
          notifyOnApproaching: alerts.notifyOnApproaching ?? false,
          approachingMinutes: alerts.approachingMinutes ?? 5,
        })
        .select()
        .single();

      if (createError || !newPrefs) {
        throw createError || new Error('Failed to create user preferences');
      }
      dbPreferences = newPrefs;
    } else {
      // Update existing preferences
      const { data: updatedPrefs, error: updateError } = await supabase
        .from('user_preferences')
        .update({
          alertsEnabled: alerts.enabled ?? existingPrefs.alertsEnabled,
          notifyOnDelay: alerts.notifyOnDelay ?? existingPrefs.notifyOnDelay,
          notifyOnCancellation: alerts.notifyOnCancellation ?? existingPrefs.notifyOnCancellation,
          notifyOnApproaching: alerts.notifyOnApproaching ?? existingPrefs.notifyOnApproaching,
          approachingMinutes: alerts.approachingMinutes ?? existingPrefs.approachingMinutes,
        })
        .eq('userInternalId', user.id)
        .select()
        .single();

      if (updateError || !updatedPrefs) {
        throw updateError || new Error('Failed to update user preferences');
      }
      dbPreferences = updatedPrefs;
    }

    return {
      enabled: dbPreferences.alertsEnabled,
      notifyOnDelay: dbPreferences.notifyOnDelay,
      notifyOnCancellation: dbPreferences.notifyOnCancellation,
      notifyOnApproaching: dbPreferences.notifyOnApproaching,
      approachingMinutes: dbPreferences.approachingMinutes,
    };
  } catch (error) {
    logger.error('Failed to update alert preferences in Supabase', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    return null;
  }
}
