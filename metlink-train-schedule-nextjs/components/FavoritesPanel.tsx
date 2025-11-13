'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Star, X, Play } from 'lucide-react';
import {
  loadPreferences,
  removeScheduleConfig,
  type ScheduleConfig,
} from '@/lib/utils/favorites';
import { LINE_NAMES } from '@/lib/constants';

interface FavoritesPanelProps {
  onConfigSelect?: (config: ScheduleConfig) => void;
  onFavoriteChange?: () => void;
}

export function FavoritesPanel({
  onConfigSelect,
  onFavoriteChange,
}: FavoritesPanelProps) {
  const [preferences, setPreferences] = useState(loadPreferences());
  const [isOpen, setIsOpen] = useState(false); // Hidden by default

  useEffect(() => {
    setPreferences(loadPreferences());
  }, []);

  const handleRemoveConfig = (configId: string) => {
    removeScheduleConfig(configId);
    setPreferences(loadPreferences());
    onFavoriteChange?.();
  };

  const handleSelectConfig = (config: ScheduleConfig) => {
    onConfigSelect?.(config);
    setIsOpen(false);
  };

  return (
    <div className="border-b border-black dark:border-white bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-black dark:text-white text-sm font-semibold uppercase tracking-wider hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
          aria-expanded={isOpen}
          aria-controls="favorites-content"
        >
          <Star className={`h-4 w-4 ${preferences.configs.length > 0 ? 'fill-current' : ''}`} aria-hidden="true" />
          Favorites
          {preferences.configs.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-xs rounded">
              {preferences.configs.length}
            </span>
          )}
        </button>

        {isOpen && (
          <div id="favorites-content" className="mt-4 pb-4">
            {/* Saved Configurations List */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-2">
                Saved Configurations ({preferences.configs.length})
              </h3>
              {preferences.configs.length === 0 ? (
                <p className="text-sm text-black/70 dark:text-white/70 p-4 border-2 border-black dark:border-white">
                  No saved configurations yet. Configure your schedule and click "Save" in the header to create one.
                </p>
              ) : (
                <ul className="space-y-2" role="list">
                  {preferences.configs.map((config) => (
                    <li
                      key={config.id}
                      className="flex items-center justify-between p-3 border-2 border-black dark:border-white group"
                      role="listitem"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-black dark:text-white mb-1">
                          {config.name}
                        </div>
                        <div className="text-xs text-black/70 dark:text-white/70">
                          {LINE_NAMES[config.line] || config.line} • {config.direction === 'inbound' ? 'To Wellington' : 'From Wellington'} • {config.selectedStations.length} station{config.selectedStations.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Button
                          onClick={() => handleSelectConfig(config)}
                          variant="outline"
                          size="sm"
                          aria-label={`Load configuration: ${config.name}`}
                          className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-7 px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
                        >
                          <Play className="h-3 w-3 mr-1" aria-hidden="true" />
                          Load
                        </Button>
                        <Button
                          onClick={() => handleRemoveConfig(config.id)}
                          variant="outline"
                          size="sm"
                          aria-label={`Remove configuration: ${config.name}`}
                          className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-7 px-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </div>
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

