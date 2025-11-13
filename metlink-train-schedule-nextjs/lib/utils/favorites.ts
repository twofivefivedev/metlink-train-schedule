/**
 * Favorites and alerts utility functions
 * Manages user preferences for favorite schedule configurations and alerts
 * Uses database when available, falls back to localStorage
 */

import type { LineCode } from '@/lib/constants';
import type { SortOption, SortDirection } from './sortUtils';

const USER_ID_KEY = 'metlink-user-id';
const USE_DB_KEY = 'metlink-use-db';
const LAST_SYNC_KEY = 'metlink-last-sync';
const SYNC_DEBOUNCE_MS = 1000; // Debounce saves by 1 second

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
 * Get or create client-side user ID
 */
function getOrCreateUserId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  } catch (error) {
    console.error('Failed to get/create user ID:', error);
    return '';
  }
}

/**
 * Check if database should be used (based on previous success/failure)
 */
function shouldUseDatabase(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const useDb = localStorage.getItem(USE_DB_KEY);
    return useDb !== 'false'; // Default to true, only disable if explicitly set to false
  } catch {
    return true;
  }
}

/**
 * Mark database as unavailable (for fallback)
 */
function markDatabaseUnavailable(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(USE_DB_KEY, 'false');
  } catch {
    // Ignore
  }
}

/**
 * Mark database as available
 */
function markDatabaseAvailable(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(USE_DB_KEY, 'true');
  } catch {
    // Ignore
  }
}

/**
 * Load preferences from database or localStorage
 */
export async function loadPreferences(): Promise<UserPreferences>;
export function loadPreferences(): UserPreferences;
export function loadPreferences(): UserPreferences | Promise<UserPreferences> {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  // Try database first if enabled
  if (shouldUseDatabase()) {
    const userId = getOrCreateUserId();
    if (userId) {
      // Return promise for async loading
      return loadPreferencesFromDb(userId).catch(() => {
        // Fall back to localStorage on error
        return loadPreferencesFromStorage();
      });
    }
  }

  // Fall back to localStorage
  return loadPreferencesFromStorage();
}

/**
 * Load preferences from database
 */
async function loadPreferencesFromDb(userId: string): Promise<UserPreferences> {
  try {
    const response = await fetch(`/api/preferences?userId=${encodeURIComponent(userId)}`, {
      headers: {
        'X-User-Id': userId,
      },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        markDatabaseAvailable();
        
        const preferences: UserPreferences = {
          configs: result.data.configs || [],
          favorites: [], // Legacy - no longer used
          alerts: result.data.alerts || DEFAULT_PREFERENCES.alerts,
        };

        // Store sync timestamp if available
        if (result.meta?.syncedAt && typeof window !== 'undefined') {
          try {
            localStorage.setItem(LAST_SYNC_KEY, result.meta.syncedAt);
          } catch {
            // Ignore localStorage errors
          }
        }

        // Also save to localStorage for offline access (Supabase is source of truth)
        savePreferencesToStorage(preferences);
        
        return preferences;
      }
    }
  } catch (error) {
    console.error('Failed to load preferences from database:', error);
    markDatabaseUnavailable();
  }

  // Fall back to localStorage
  return loadPreferencesFromStorage();
}

/**
 * Load preferences from localStorage
 */
function loadPreferencesFromStorage(): UserPreferences {
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
        savePreferencesToStorage(preferences);
      }
      
      return preferences;
    }
  } catch (error) {
    console.error('Failed to load preferences from storage:', error);
  }

  return DEFAULT_PREFERENCES;
}

/**
 * Save preferences to database and/or localStorage
 */
export async function savePreferences(preferences: UserPreferences): Promise<void>;
export function savePreferences(preferences: UserPreferences): void;
export function savePreferences(preferences: UserPreferences): void | Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  // Always save to localStorage for offline access
  savePreferencesToStorage(preferences);

  // Try to save to database if enabled
  if (shouldUseDatabase()) {
    const userId = getOrCreateUserId();
    if (userId) {
      // Save asynchronously, don't wait
      savePreferencesToDb(userId, preferences).catch(() => {
        // Ignore errors, localStorage is already saved
      });
    }
  }
}

/**
 * Save preferences to localStorage
 */
function savePreferencesToStorage(preferences: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save preferences to storage:', error);
  }
}

// Debounce timer for database saves
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: { userId: string; preferences: UserPreferences } | null = null;

/**
 * Save preferences to database with debouncing
 */
async function savePreferencesToDb(userId: string, preferences: UserPreferences): Promise<void> {
  // Store pending save
  pendingSave = { userId, preferences };

  // Clear existing timer
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  // Set new debounced save
  saveDebounceTimer = setTimeout(async () => {
    if (!pendingSave) return;

    const { userId: saveUserId, preferences: savePreferences } = pendingSave;
    pendingSave = null;

    try {
      // Save alert preferences
      if (savePreferences.alerts) {
        const response = await fetch('/api/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': saveUserId,
          },
          body: JSON.stringify({
            userId: saveUserId,
            alerts: savePreferences.alerts,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.meta?.syncedAt) {
            // Store sync timestamp
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(LAST_SYNC_KEY, result.meta.syncedAt);
              } catch {
                // Ignore localStorage errors
              }
            }
          }
        }
      }

      markDatabaseAvailable();
    } catch (error) {
      console.error('Failed to save preferences to database:', error);
      markDatabaseUnavailable();
    }
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Add a schedule configuration
 */
export async function addScheduleConfig(config: Omit<ScheduleConfig, 'id' | 'createdAt'>): Promise<void>;
export function addScheduleConfig(config: Omit<ScheduleConfig, 'id' | 'createdAt'>): void;
export function addScheduleConfig(config: Omit<ScheduleConfig, 'id' | 'createdAt'>): void | Promise<void> {
  const preferences = loadPreferences();
  
  // Handle async case
  if (preferences instanceof Promise) {
    return preferences.then(async (prefs) => {
      const newConfig: ScheduleConfig = {
        ...config,
        id: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      };
      prefs.configs.push(newConfig);
      
      // Always save to localStorage first (with client-generated ID)
      await savePreferences(prefs);
      
      // Try to save to database and sync ID back
      if (shouldUseDatabase()) {
        const userId = getOrCreateUserId();
        if (userId) {
          try {
            const response = await fetch('/api/preferences', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-User-Id': userId,
              },
              body: JSON.stringify({
                userId,
                config: newConfig,
              }),
            });
            
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data?.config) {
                // Update config with database-generated ID
                const dbConfig = result.data.config;
                const index = prefs.configs.findIndex(c => c.id === newConfig.id);
                if (index !== -1) {
                  prefs.configs[index] = dbConfig;
                  await savePreferences(prefs);
                }
                markDatabaseAvailable();
              }
            }
          } catch {
            markDatabaseUnavailable();
          }
        }
      }
    });
  }

  // Sync case
  const newConfig: ScheduleConfig = {
    ...config,
    id: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  preferences.configs.push(newConfig);
  
  // Always save to localStorage first (with client-generated ID)
  savePreferences(preferences);
  
  // Try to save to database and sync ID back
  if (shouldUseDatabase()) {
    const userId = getOrCreateUserId();
    if (userId) {
      fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          userId,
          config: newConfig,
        }),
      })
        .then(async (response) => {
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.config) {
              // Update config with database-generated ID
              const dbConfig = result.data.config;
              const index = preferences.configs.findIndex(c => c.id === newConfig.id);
              if (index !== -1) {
                preferences.configs[index] = dbConfig;
  savePreferences(preferences);
              }
              markDatabaseAvailable();
            }
          }
        })
        .catch(() => markDatabaseUnavailable());
    }
  }
}

/**
 * Remove a schedule configuration
 */
export async function removeScheduleConfig(configId: string): Promise<void>;
export function removeScheduleConfig(configId: string): void;
export function removeScheduleConfig(configId: string): void | Promise<void> {
  const preferences = loadPreferences();
  
  // Handle async case
  if (preferences instanceof Promise) {
    return preferences.then((prefs) => {
      prefs.configs = prefs.configs.filter(c => c.id !== configId);
      return savePreferences(prefs);
    });
  }

  // Sync case
  preferences.configs = preferences.configs.filter(c => c.id !== configId);
  
  // Try to remove from database first
  if (shouldUseDatabase()) {
    const userId = getOrCreateUserId();
    if (userId) {
      fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          userId,
          configId,
          action: 'delete',
        }),
      }).then(() => markDatabaseAvailable()).catch(() => markDatabaseUnavailable());
    }
  }
  
  // Always save to localStorage
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
export async function updateAlertPreferences(alerts: Partial<AlertPreferences>): Promise<void>;
export function updateAlertPreferences(alerts: Partial<AlertPreferences>): void;
export function updateAlertPreferences(alerts: Partial<AlertPreferences>): void | Promise<void> {
  const preferences = loadPreferences();
  
  // Handle async case
  if (preferences instanceof Promise) {
    return preferences.then((prefs) => {
      prefs.alerts = {
        ...prefs.alerts,
        ...alerts,
      };
      return savePreferences(prefs);
    });
  }

  // Sync case
  preferences.alerts = {
    ...preferences.alerts,
    ...alerts,
  };
  
  // Try to save to database first
  if (shouldUseDatabase()) {
    const userId = getOrCreateUserId();
    if (userId) {
      fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          userId,
          alerts: preferences.alerts,
        }),
      }).then(() => markDatabaseAvailable()).catch(() => markDatabaseUnavailable());
    }
  }
  
  // Always save to localStorage
  savePreferences(preferences);
}

