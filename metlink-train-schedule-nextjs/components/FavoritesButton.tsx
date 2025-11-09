'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Star, Bell, BellOff, X } from 'lucide-react';
import {
  loadPreferences,
  addFavorite,
  removeFavorite,
  updateAlertPreferences,
  type AlertPreferences,
} from '@/lib/utils/favorites';
import { STATION_NAMES, LINE_NAMES } from '@/lib/constants';
import type { LineCode } from '@/lib/constants';

interface FavoritesButtonProps {
  selectedStation: string | null;
  selectedDirection: 'inbound' | 'outbound';
  selectedLine: LineCode;
}

export function FavoritesButton({
  selectedStation,
  selectedDirection,
  selectedLine,
}: FavoritesButtonProps) {
  const [preferences, setPreferences] = useState(loadPreferences());
  const [isOpen, setIsOpen] = useState(false);

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
  };

  const handleRemoveFavorite = (favoriteId: string) => {
    removeFavorite(favoriteId);
    setPreferences(loadPreferences());
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
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        aria-label="Favorites and alerts"
        className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-[42px] px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
      >
        <Star className={`h-4 w-4 ${preferences.favorites.length > 0 ? 'fill-current' : ''}`} aria-hidden="true" />
        {preferences.favorites.length > 0 && (
          <span className="ml-1 text-xs">{preferences.favorites.length}</span>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute z-20 right-0 mt-2 w-80 bg-white dark:bg-black border-2 border-black dark:border-white">
            <div className="p-4 border-b-2 border-black dark:border-white flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-black dark:text-white">
                Favorites & Alerts
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
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
                    className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-7 px-3"
                  >
                    <Star className={`h-3 w-3 mr-1 ${isCurrentRouteFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
                    {isCurrentRouteFavorite ? 'Remove' : 'Add'}
                  </Button>
                </div>
              )}
              {/* Alert Toggle */}
              <div className="flex items-center justify-between p-3 border-2 border-black dark:border-white">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-1">
                    Alert Notifications
                  </h4>
                  <p className="text-xs text-black/70 dark:text-white/70">
                    Get notified about delays, cancellations, and approaching trains
                  </p>
                </div>
                <Button
                  onClick={handleToggleAlerts}
                  variant="outline"
                  size="sm"
                  aria-label={preferences.alerts.enabled ? 'Disable alerts' : 'Enable alerts'}
                  className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-8 px-4"
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
                <h4 className="text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-2">
                  Favorite Routes ({preferences.favorites.length})
                </h4>
                {preferences.favorites.length === 0 ? (
                  <p className="text-sm text-black/70 dark:text-white/70 p-3 border-2 border-black dark:border-white">
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
                          className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-7 px-2"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

