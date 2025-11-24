/**
 * Preferences Repository
 * Typed repository for user preferences and schedule configs
 */

import { getSupabaseAdminClient } from '../supabaseAdmin';
import { logger } from '../logger';
import type { Database, Json } from '@/supabase/types';
import type { ScheduleConfig, AlertPreferences } from '@/lib/utils/favorites';

type User = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert'];
type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update'];
type ScheduleConfigRow = Database['public']['Tables']['schedule_configs']['Row'];
type ScheduleConfigInsert = Database['public']['Tables']['schedule_configs']['Insert'];

export interface PreferencesRepository {
  getOrCreateUser(userId: string): Promise<{ id: string; userId: string }>;
  getUserPreferences(userInternalId: string): Promise<AlertPreferences | null>;
  updateUserPreferences(userInternalId: string, preferences: Partial<AlertPreferences>): Promise<AlertPreferences>;
  getScheduleConfigs(userInternalId: string): Promise<ScheduleConfig[]>;
  createScheduleConfig(userInternalId: string, config: Omit<ScheduleConfig, 'id' | 'createdAt'>): Promise<ScheduleConfig>;
  deleteScheduleConfig(userInternalId: string, configId: string): Promise<void>;
}

class PreferencesRepositoryImpl implements PreferencesRepository {
  async getOrCreateUser(userId: string): Promise<{ id: string; userId: string }> {
    try {
      const supabase = getSupabaseAdminClient();
      
      // Try to find existing user
      const { data: existingUser, error: findError } = await (supabase
        .from('users') as any)
        .select('id, userId')
        .eq('userId', userId)
        .single();

      if (existingUser && !findError) {
        const user = existingUser as { id: string; userId: string };
        return { id: user.id, userId: user.userId };
      }

      // Create if doesn't exist
      const insertData: UserInsert = { userId };
      const { data: newUser, error: createError } = await (supabase
        .from('users') as any)
        .insert(insertData)
        .select('id, userId')
        .single();

      if (createError || !newUser) {
        throw createError || new Error('Failed to create user');
      }

      logger.debug('Created new user', { userId });
      const user = newUser as { id: string; userId: string };
      return { id: user.id, userId: user.userId };
    } catch (error) {
      logger.error('Failed to get or create user', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  async getUserPreferences(userInternalId: string): Promise<AlertPreferences | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase
        .from('user_preferences') as any)
        .select('*')
        .eq('userInternalId', userInternalId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - return default preferences
          return null;
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      const prefs = data as {
        alertsEnabled: boolean;
        notifyOnDelay: boolean;
        notifyOnCancellation: boolean;
        notifyOnApproaching: boolean;
        approachingMinutes: number;
      };

      return {
        enabled: prefs.alertsEnabled,
        notifyOnDelay: prefs.notifyOnDelay,
        notifyOnCancellation: prefs.notifyOnCancellation,
        notifyOnApproaching: prefs.notifyOnApproaching,
        approachingMinutes: prefs.approachingMinutes,
      };
    } catch (error) {
      logger.error('Failed to get user preferences', {
        error: error instanceof Error ? error.message : String(error),
        userInternalId,
      });
      throw error;
    }
  }

  async updateUserPreferences(
    userInternalId: string,
    preferences: Partial<AlertPreferences>
  ): Promise<AlertPreferences> {
    try {
      const supabase = getSupabaseAdminClient();
      
      // Get existing preferences
      const existing = await this.getUserPreferences(userInternalId);

      if (!existing) {
        // Create new preferences
        const insertData: UserPreferencesInsert = {
          userInternalId,
          alertsEnabled: preferences.enabled ?? false,
          notifyOnDelay: preferences.notifyOnDelay ?? true,
          notifyOnCancellation: preferences.notifyOnCancellation ?? true,
          notifyOnApproaching: preferences.notifyOnApproaching ?? false,
          approachingMinutes: preferences.approachingMinutes ?? 5,
        };

        const { data, error } = await (supabase
          .from('user_preferences') as any)
          .insert(insertData)
          .select()
          .single();

        if (error || !data) {
          throw error || new Error('Failed to create user preferences');
        }

        const prefs = data as {
          alertsEnabled: boolean;
          notifyOnDelay: boolean;
          notifyOnCancellation: boolean;
          notifyOnApproaching: boolean;
          approachingMinutes: number;
        };

        return {
          enabled: prefs.alertsEnabled,
          notifyOnDelay: prefs.notifyOnDelay,
          notifyOnCancellation: prefs.notifyOnCancellation,
          notifyOnApproaching: prefs.notifyOnApproaching,
          approachingMinutes: prefs.approachingMinutes,
        };
      }

      // Update existing preferences
      const updateData: UserPreferencesUpdate = {
        alertsEnabled: preferences.enabled ?? existing.enabled,
        notifyOnDelay: preferences.notifyOnDelay ?? existing.notifyOnDelay,
        notifyOnCancellation: preferences.notifyOnCancellation ?? existing.notifyOnCancellation,
        notifyOnApproaching: preferences.notifyOnApproaching ?? existing.notifyOnApproaching,
        approachingMinutes: preferences.approachingMinutes ?? existing.approachingMinutes,
      };

      const { data, error } = await (supabase
        .from('user_preferences') as any)
        .update(updateData)
        .eq('userInternalId', userInternalId)
        .select()
        .single();

      if (error || !data) {
        throw error || new Error('Failed to update user preferences');
      }

      const prefs = data as {
        alertsEnabled: boolean;
        notifyOnDelay: boolean;
        notifyOnCancellation: boolean;
        notifyOnApproaching: boolean;
        approachingMinutes: number;
      };

      return {
        enabled: prefs.alertsEnabled,
        notifyOnDelay: prefs.notifyOnDelay,
        notifyOnCancellation: prefs.notifyOnCancellation,
        notifyOnApproaching: prefs.notifyOnApproaching,
        approachingMinutes: prefs.approachingMinutes,
      };
    } catch (error) {
      logger.error('Failed to update user preferences', {
        error: error instanceof Error ? error.message : String(error),
        userInternalId,
      });
      throw error;
    }
  }

  async getScheduleConfigs(userInternalId: string): Promise<ScheduleConfig[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase
        .from('schedule_configs') as any)
        .select('*')
        .eq('userInternalId', userInternalId)
        .order('createdAt', { ascending: false });

      if (error) {
        throw error;
      }

      const configs = (data || []) as any[];
      return configs.map((config) => this.mapScheduleConfigFromDb(config));
    } catch (error) {
      logger.error('Failed to get schedule configs', {
        error: error instanceof Error ? error.message : String(error),
        userInternalId,
      });
      throw error;
    }
  }

  async createScheduleConfig(
    userInternalId: string,
    config: Omit<ScheduleConfig, 'id' | 'createdAt'>
  ): Promise<ScheduleConfig> {
    try {
      const supabase = getSupabaseAdminClient();
      const insertData: ScheduleConfigInsert = {
        userInternalId,
        name: config.name,
        line: config.line,
        selectedStations: config.selectedStations as unknown as Json,
        direction: config.direction,
        selectedStation: config.filters.selectedStation || null,
        routeFilter: config.filters.routeFilter,
        sortOption: config.filters.sortOption,
        sortDirection: config.filters.sortDirection,
      };

      const { data, error } = await (supabase
        .from('schedule_configs') as any)
        .insert(insertData)
        .select()
        .single();

      if (error || !data) {
        throw error || new Error('Failed to create schedule config');
      }

      return this.mapScheduleConfigFromDb(data);
    } catch (error) {
      logger.error('Failed to create schedule config', {
        error: error instanceof Error ? error.message : String(error),
        userInternalId,
      });
      throw error;
    }
  }

  async deleteScheduleConfig(userInternalId: string, configId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase
        .from('schedule_configs')
        .delete()
        .eq('id', configId)
        .eq('userInternalId', userInternalId); // Ensure user owns this config

      if (error) {
        throw error;
      }

      logger.debug('Schedule config deleted', { configId, userInternalId });
    } catch (error) {
      logger.error('Failed to delete schedule config', {
        error: error instanceof Error ? error.message : String(error),
        userInternalId,
        configId,
      });
      throw error;
    }
  }

  private mapScheduleConfigFromDb(config: ScheduleConfigRow): ScheduleConfig {
    return {
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
    };
  }
}

// Singleton instance
let preferencesRepositoryInstance: PreferencesRepository | null = null;

export function getPreferencesRepository(): PreferencesRepository {
  if (!preferencesRepositoryInstance) {
    preferencesRepositoryInstance = new PreferencesRepositoryImpl();
  }
  return preferencesRepositoryInstance;
}

