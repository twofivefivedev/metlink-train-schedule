'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Star, X, Bell, BellOff } from 'lucide-react';
import {
  loadPreferences,
  savePreferences,
  addFavorite,
  removeFavorite,
  updateAlertPreferences,
  type FavoriteRoute,
  type AlertPreferences,
} from '@/lib/utils/favorites';
import { STATION_NAMES, LINE_NAMES } from '@/lib/constants';
import type { LineCode } from '@/lib/constants';

interface FavoritesPanelProps {
  selectedStation: string | null;
  selectedDirection: 'inbound' | 'outbound';
  selectedLine: LineCode;
  onFavoriteChange?: () => void;
}

export function FavoritesPanel({
  selectedStation,
  selectedDirection,
  selectedLine,
  onFavoriteChange,
}: FavoritesPanelProps) {
  const [preferences, setPreferences] = useState(loadPreferences());
  const [isOpen, setIsOpen] = useState(false); // Hidden by default

  useEffect(() => {
    setPreferences(loadPreferences());
  }, []);

  const handleAddFavorite = () => {
    if (!selectedStation) return;

    addFavorite({
      station: selectedStation,
      direction: selectedDirection,
      line: selectedLine,
    });
    setPreferences(loadPreferences());
    onFavoriteChange?.();
  };

  const handleRemoveFavorite = (favoriteId: string) => {
    removeFavorite(favoriteId);
    setPreferences(loadPreferences());
    onFavoriteChange?.();
  };

  const handleToggleAlerts = () => {
    const newAlerts: AlertPreferences = {
      ...preferences.alerts,
      enabled: !preferences.alerts.enabled,
    };
    updateAlertPreferences(newAlerts);
    setPreferences(loadPreferences());
  };

  const isCurrentRouteFavorite = selectedStation
    ? preferences.favorites.some(
        f => f.station === selectedStation &&
             f.direction === selectedDirection &&
             f.line === selectedLine
      )
    : false;

  return (
    <div className="border-b border-black dark:border-white bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-8 py-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-black dark:text-white text-sm font-semibold uppercase tracking-wider hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
          aria-expanded={isOpen}
          aria-controls="favorites-content"
        >
          <Star className={`h-4 w-4 ${preferences.favorites.length > 0 ? 'fill-current' : ''}`} aria-hidden="true" />
          Favorites & Alerts
          {preferences.favorites.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-xs rounded">
              {preferences.favorites.length}
            </span>
          )}
        </button>

        {isOpen && (
          <div id="favorites-content" className="mt-4 pb-4 space-y-4">
            {/* Quick Add/Remove */}
            {selectedStation && (
              <div className="flex items-center justify-between p-3 border-2 border-black dark:border-white">
                <span className="text-sm text-black dark:text-white">
                  {STATION_NAMES[selectedStation] || selectedStation} - {selectedDirection === 'inbound' ? 'To Wellington' : 'From Wellington'}
                </span>
                <Button
                  onClick={isCurrentRouteFavorite ? () => {
                    const favorite = preferences.favorites.find(
                      f => f.station === selectedStation &&
                           f.direction === selectedDirection &&
                           f.line === selectedLine
                    );
                    if (favorite) {
                      handleRemoveFavorite(favorite.id);
                    }
                  } : handleAddFavorite}
                  variant="outline"
                  size="sm"
                  aria-label={isCurrentRouteFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-7 px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
                >
                  <Star className={`h-3 w-3 mr-1 ${isCurrentRouteFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
                  {isCurrentRouteFavorite ? 'Remove' : 'Add'}
                </Button>
              </div>
            )}
            {/* Alert Toggle */}
            <div className="flex items-center justify-between p-4 border-2 border-black dark:border-white">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-1">
                  Alert Notifications
                </h3>
                <p className="text-xs text-black/70 dark:text-white/70">
                  Get notified about delays, cancellations, and approaching trains
                </p>
              </div>
              <Button
                onClick={handleToggleAlerts}
                variant="outline"
                size="sm"
                aria-label={preferences.alerts.enabled ? 'Disable alerts' : 'Enable alerts'}
                className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-8 px-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
              >
                {preferences.alerts.enabled ? (
                  <>
                    <Bell className="h-4 w-4 mr-2" aria-hidden="true" />
                    Enabled
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 mr-2" aria-hidden="true" />
                    Disabled
                  </>
                )}
              </Button>
            </div>

            {/* Favorites List */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-2">
                Favorite Routes ({preferences.favorites.length})
              </h3>
              {preferences.favorites.length === 0 ? (
                <p className="text-sm text-black/70 dark:text-white/70 p-4 border-2 border-black dark:border-white">
                  No favorite routes yet. Select a station and direction, then click "Add" to create a favorite.
                </p>
              ) : (
                <ul className="space-y-2" role="list">
                  {preferences.favorites.map((favorite) => (
                    <li
                      key={favorite.id}
                      className="flex items-center justify-between p-3 border-2 border-black dark:border-white"
                      role="listitem"
                    >
                      <div>
                        <span className="font-semibold text-black dark:text-white">
                          {STATION_NAMES[favorite.station as keyof typeof STATION_NAMES] || favorite.station}
                        </span>
                        <span className="text-sm text-black/70 dark:text-white/70 ml-2">
                          {favorite.direction === 'inbound' ? '→ Wellington' : '← From Wellington'} • {LINE_NAMES[favorite.line] || favorite.line}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleRemoveFavorite(favorite.id)}
                        variant="outline"
                        size="sm"
                        aria-label="Remove favorite"
                        className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-7 px-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

