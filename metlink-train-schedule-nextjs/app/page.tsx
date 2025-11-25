'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTrainSchedule } from '@/hooks/useTrainSchedule';
import { useAlerts, requestNotificationPermission } from '@/hooks/useAlerts';
import { DepartureBoard } from '@/components/DepartureBoard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { FiltersButton } from '@/components/FiltersButton';
import { LineSelector } from '@/components/LineSelector';
import { StationSelector } from '@/components/StationSelector';
import { FavoritesPanel } from '@/components/FavoritesPanel';
import { AlertsButton } from '@/components/AlertsButton';
import type { ScheduleConfig } from '@/lib/utils/favorites';
import { Button } from '@/components/ui/button';
import { sortDepartures } from '@/lib/utils/sortUtils';
import { getRouteText, isBusReplacement } from '@/lib/utils/departureUtils';
import { DEFAULT_LINE, SERVICE_IDS } from '@/lib/constants';
import type { SortOption, SortDirection } from '@/lib/utils/sortUtils';
import type { Departure } from '@/types';
import type { LineCode } from '@/lib/constants';
import { usePreferences } from '@/components/preferences-provider';

export default function Home() {
  const [selectedLine, setSelectedLine] = useState<LineCode>(DEFAULT_LINE);
  const [selectedStations, setSelectedStations] = useState<Record<LineCode, string[]>>(() => {
    // Initialize with empty arrays - empty means show all stations
    const allLines = Object.values(SERVICE_IDS) as LineCode[];
    const initial: Record<string, string[]> = {};
    allLines.forEach(line => {
      initial[line] = [];
    });
    return initial as Record<LineCode, string[]>;
  });
  
  const { departures, loading, refreshing, error, lastUpdated, refresh, staleState } = useTrainSchedule({ 
    line: selectedLine,
    stations: selectedStations[selectedLine],
  });
  const alerts = useAlerts(departures);
  const { preferences } = usePreferences();
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [routeFilter, setRouteFilter] = useState<'all' | 'express' | 'all-stops'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Request notification permission when alerts are enabled
  useEffect(() => {
    if (!preferences.alerts.enabled) {
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'default') {
      requestNotificationPermission().catch(console.error);
    }
  }, [preferences.alerts.enabled]);

  // Reset direction to inbound (to Wellington) when line changes
  useEffect(() => {
    setDirection('inbound');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLine]); // Only depend on selectedLine to avoid loops

  const handleLineChange = (line: LineCode) => {
    setSelectedLine(line);
    // Reset station filter when changing lines
    setSelectedStation(null);
    // Reset direction to inbound (to Wellington)
    setDirection('inbound');
  };

  const handleStationsChange = (stations: string[]) => {
    setSelectedStations(prev => ({
      ...prev,
      [selectedLine]: stations,
    }));
    // Reset station filter when changing station selection
    setSelectedStation(null);
  };

  const toggleDirection = () => {
    setDirection(prev => prev === 'inbound' ? 'outbound' : 'inbound');
  };

  // Get unique stations from departures
  const availableStations = useMemo(() => {
    const allDepartures = [...departures.inbound, ...departures.outbound];
    const stations = new Set(allDepartures.map(d => d.station).filter(Boolean));
    return Array.from(stations) as string[];
  }, [departures]);

  // Filter and sort departures
  const currentDepartures = useMemo(() => {
    let filtered = direction === 'inbound' ? departures.inbound : departures.outbound;

    // Filter by station
    if (selectedStation) {
      filtered = filtered.filter(d => d.station === selectedStation);
    }

    // Filter by route type
    if (routeFilter !== 'all') {
      filtered = filtered.filter(d => {
        const route = getRouteText(d);
        if (routeFilter === 'express') {
          return route.toLowerCase().includes('express');
        } else if (routeFilter === 'all-stops') {
          return route.toLowerCase().includes('all stops') || route.toLowerCase().includes('all stops');
        }
        return true;
      });
    }

    // Sort
    filtered = sortDepartures(filtered, sortOption, sortDirection);

    return filtered;
  }, [departures, direction, selectedStation, routeFilter, sortOption, sortDirection]);

  const hasActiveFilters = selectedStation !== null || routeFilter !== 'all' || sortOption !== 'time' || sortDirection !== 'asc';

  const clearFilters = () => {
    setSelectedStation(null);
    setRouteFilter('all');
    setSortOption('time');
    setSortDirection('asc');
  };

  const handleConfigSelect = (config: ScheduleConfig) => {
    setSelectedLine(config.line);
    setSelectedStations(prev => ({
      ...prev,
      [config.line]: config.selectedStations,
    }));
    setDirection(config.direction);
    setSelectedStation(config.filters.selectedStation);
    setRouteFilter(config.filters.routeFilter);
    setSortOption(config.filters.sortOption);
    setSortDirection(config.filters.sortDirection);
  };

  if (loading && departures.inbound.length === 0 && departures.outbound.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:border-2 focus:border-black focus:font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
      >
        Skip to main content
      </a>
      <div className="min-h-screen bg-white dark:bg-black">
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white p-6 m-4 max-w-7xl mx-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg uppercase mb-2">Error</p>
                <p className="text-black/80 dark:text-white/80">{error.message}</p>
              </div>
              <Button
                onClick={error.retry}
                variant="outline"
                size="sm"
                aria-label="Retry loading train schedule"
                className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        <main id="main-content" role="main">
          {/* Favorites Panel */}
          <FavoritesPanel
            onConfigSelect={handleConfigSelect}
          />
          
          {/* Controls Section */}
          <div className="border-b-2 border-black dark:border-white bg-white dark:bg-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
              <div className="flex flex-col gap-4">
                <LineSelector
                  selectedLine={selectedLine}
                  onLineChange={handleLineChange}
                />
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <StationSelector
                      selectedLine={selectedLine}
                      selectedStations={selectedStations[selectedLine] || []}
                      onStationsChange={handleStationsChange}
                    />
                  </div>
                  <div className="flex items-end gap-2 flex-shrink-0">
                    <FiltersButton
                      stations={availableStations}
                      selectedStation={selectedStation}
                      onStationChange={setSelectedStation}
                      routeFilter={routeFilter}
                      onRouteFilterChange={setRouteFilter}
                      sortOption={sortOption}
                      onSortChange={setSortOption}
                      sortDirection={sortDirection}
                      onSortDirectionChange={setSortDirection}
                      onClearFilters={clearFilters}
                      hasActiveFilters={hasActiveFilters}
                    />
                    <AlertsButton />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DepartureBoard
            departures={currentDepartures}
            direction={direction}
            onDirectionToggle={toggleDirection}
            lastUpdated={lastUpdated}
            refreshing={refreshing}
            loading={loading}
            onRefresh={refresh}
            selectedLine={selectedLine}
            selectedStations={selectedStations[selectedLine] || []}
            staleState={staleState}
            filters={{
              selectedStation,
              routeFilter,
              sortOption,
              sortDirection,
            }}
          />
        </main>
      </div>
    </>
  );
}
