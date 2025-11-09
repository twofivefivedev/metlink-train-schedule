/**
 * Favorites and alerts utility functions
 * Manages user preferences for favorite routes/stations and alerts
 */

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
  favorites: FavoriteRoute[];
  alerts: AlertPreferences;
}

const STORAGE_KEY = 'metlink-preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
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
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        alerts: {
          ...DEFAULT_PREFERENCES.alerts,
          ...parsed.alerts,
        },
      };
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
 * Add a favorite route
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
 * Remove a favorite route
 */
export function removeFavorite(favoriteId: string): void {
  const preferences = loadPreferences();
  preferences.favorites = preferences.favorites.filter(f => f.id !== favoriteId);
  savePreferences(preferences);
}

/**
 * Check if a route is favorited
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

