/**
 * Favorites and alerts utility functions
 * Manages user preferences for favorite schedule configurations and alerts
 */

import type { LineCode } from '@/lib/constants';
import type { SortOption, SortDirection } from './sortUtils';

export interface ScheduleConfig {
  id: string;
  name: string;
  line: LineCode;
  selectedStations: string[];
  direction: 'inbound' | 'outbound';
  filters: {
    selectedStation: string | null;
    routeFilter: 'all' | 'express' | 'all-stops';
    sortOption: SortOption;
    sortDirection: SortDirection;
  };
  createdAt: string;
}

// Legacy interface for backward compatibility during migration
export interface FavoriteRoute {
  id: string;
  station: string;
  direction: 'inbound' | 'outbound';
  line: string;
  createdAt: string;
}

export interface AlertPreferences {
  enabled: boolean;
  notifyOnDelay: boolean;
  notifyOnCancellation: boolean;
  notifyOnApproaching: boolean; // Notify when train is X minutes away
  approachingMinutes: number; // Default: 5 minutes
}

export interface UserPreferences {
  configs: ScheduleConfig[];
  favorites: FavoriteRoute[]; // Legacy - kept for migration compatibility
  alerts: AlertPreferences;
}

const STORAGE_KEY = 'metlink-preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  configs: [],
  favorites: [],
  alerts: {
    enabled: false,
    notifyOnDelay: true,
    notifyOnCancellation: true,
    notifyOnApproaching: false,
    approachingMinutes: 5,
  },
};

/**
 * Load preferences from localStorage
 */
export function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const preferences: UserPreferences = {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        configs: parsed.configs || [],
        favorites: parsed.favorites || [],
        alerts: {
          ...DEFAULT_PREFERENCES.alerts,
          ...parsed.alerts,
        },
      };
      
      // Migrate old favorites to new configs format if needed
      if (parsed.favorites && parsed.favorites.length > 0 && (!parsed.configs || parsed.configs.length === 0)) {
        preferences.configs = parsed.favorites.map((fav: FavoriteRoute) => ({
          id: fav.id,
          name: `${fav.station} - ${fav.direction === 'inbound' ? 'To Wellington' : 'From Wellington'}`,
          line: fav.line as LineCode,
          selectedStations: [fav.station],
          direction: fav.direction,
          filters: {
            selectedStation: fav.station,
            routeFilter: 'all' as const,
            sortOption: 'time' as SortOption,
            sortDirection: 'asc' as SortDirection,
          },
          createdAt: fav.createdAt,
        }));
        // Clear old favorites after migration
        preferences.favorites = [];
        savePreferences(preferences);
      }
      
      return preferences;
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }

  return DEFAULT_PREFERENCES;
}

/**
 * Save preferences to localStorage
 */
export function savePreferences(preferences: UserPreferences): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

/**
 * Add a schedule configuration
 */
export function addScheduleConfig(config: Omit<ScheduleConfig, 'id' | 'createdAt'>): void {
  const preferences = loadPreferences();
  const newConfig: ScheduleConfig = {
    ...config,
    id: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  preferences.configs.push(newConfig);
  savePreferences(preferences);
}

/**
 * Remove a schedule configuration
 */
export function removeScheduleConfig(configId: string): void {
  const preferences = loadPreferences();
  preferences.configs = preferences.configs.filter(c => c.id !== configId);
  savePreferences(preferences);
}

/**
 * Update a schedule configuration
 */
export function updateScheduleConfig(configId: string, updates: Partial<ScheduleConfig>): void {
  const preferences = loadPreferences();
  const index = preferences.configs.findIndex(c => c.id === configId);
  if (index !== -1) {
    preferences.configs[index] = {
      ...preferences.configs[index],
      ...updates,
    };
    savePreferences(preferences);
  }
}

/**
 * Get a schedule configuration by ID
 */
export function getScheduleConfig(configId: string): ScheduleConfig | null {
  const preferences = loadPreferences();
  return preferences.configs.find(c => c.id === configId) || null;
}

// Legacy functions for backward compatibility (deprecated)
/**
 * Add a favorite route (legacy - use addScheduleConfig instead)
 * @deprecated Use addScheduleConfig instead
 */
export function addFavorite(favorite: Omit<FavoriteRoute, 'id' | 'createdAt'>): void {
  const preferences = loadPreferences();
  const newFavorite: FavoriteRoute = {
    ...favorite,
    id: `${favorite.station}-${favorite.direction}-${favorite.line}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  // Check if already exists
  const exists = preferences.favorites.some(
    f => f.station === favorite.station &&
         f.direction === favorite.direction &&
         f.line === favorite.line
  );

  if (!exists) {
    preferences.favorites.push(newFavorite);
    savePreferences(preferences);
  }
}

/**
 * Remove a favorite route (legacy)
 * @deprecated Use removeScheduleConfig instead
 */
export function removeFavorite(favoriteId: string): void {
  const preferences = loadPreferences();
  preferences.favorites = preferences.favorites.filter(f => f.id !== favoriteId);
  savePreferences(preferences);
}

/**
 * Check if a route is favorited (legacy)
 * @deprecated Check configs instead
 */
export function isFavorite(
  station: string,
  direction: 'inbound' | 'outbound',
  line: string
): boolean {
  const preferences = loadPreferences();
  return preferences.favorites.some(
    f => f.station === station &&
         f.direction === direction &&
         f.line === line
  );
}

/**
 * Update alert preferences
 */
export function updateAlertPreferences(alerts: Partial<AlertPreferences>): void {
  const preferences = loadPreferences();
  preferences.alerts = {
    ...preferences.alerts,
    ...alerts,
  };
  savePreferences(preferences);
}

