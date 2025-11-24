'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  loadPreferences,
  loadPreferencesSync,
  savePreferences,
  type UserPreferences,
} from '@/lib/utils/favorites';

type PreferencesUpdater =
  | UserPreferences
  | ((previous: UserPreferences) => UserPreferences);

interface PreferencesContextValue {
  preferences: UserPreferences;
  loading: boolean;
  hydrated: boolean;
  refresh: () => Promise<void>;
  syncFromStorage: () => void;
  updatePreferences: (updater: PreferencesUpdater) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined
);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadPreferencesSync()
  );
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const syncFromStorage = useCallback(() => {
    setPreferences(loadPreferencesSync());
  }, []);

  const refresh = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = Promise.resolve(loadPreferences())
      .then((next) => {
        setPreferences(next);
        setHydrated(true);
      })
      .finally(() => {
        refreshPromiseRef.current = null;
        setLoading(false);
      });

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setLoading(false);
    });
  }, [refresh]);

  const updatePreferences = useCallback(
    async (updater: PreferencesUpdater) => {
      let nextState: UserPreferences | null = null;
      setPreferences((previous) => {
        nextState =
          typeof updater === 'function'
            ? (updater as (prev: UserPreferences) => UserPreferences)(
                previous
              )
            : updater;
        return nextState;
      });

      if (nextState) {
        await Promise.resolve(savePreferences(nextState)).catch(() => {
          // Swallow persistence errors – localStorage already best-effort
        });
        setHydrated(true);
        setLoading(false);
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      preferences,
      loading,
      hydrated,
      refresh,
      syncFromStorage,
      updatePreferences,
    }),
    [preferences, loading, hydrated, refresh, syncFromStorage, updatePreferences]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }

  return context;
}

