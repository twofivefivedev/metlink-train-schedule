'use client';

import React from 'react';
import { Button } from './ui/button';
import { Filter, X, ArrowUpDown, ChevronDown } from 'lucide-react';
import { STATION_NAMES } from '@/lib/constants';
import type { SortOption, SortDirection } from '@/lib/utils/sortUtils';

interface FiltersPanelProps {
  stations: string[];
  selectedStation: string | null;
  onStationChange: (station: string | null) => void;
  routeFilter: 'all' | 'express' | 'all-stops';
  onRouteFilterChange: (filter: 'all' | 'express' | 'all-stops') => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (direction: SortDirection) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function FiltersPanel({
  stations,
  selectedStation,
  onStationChange,
  routeFilter,
  onRouteFilterChange,
  sortOption,
  onSortChange,
  sortDirection,
  onSortDirectionChange,
  onClearFilters,
  hasActiveFilters,
}: FiltersPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="border-b-2 border-black dark:border-white bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-black dark:text-white font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
            aria-expanded={isOpen}
            aria-controls="filters-content"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filters & Sort
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-xs rounded">
                Active
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <Button
              onClick={onClearFilters}
              variant="outline"
              size="sm"
              aria-label="Clear all filters"
              className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-7 px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
            >
              <X className="h-3 w-3 mr-1" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>

        {isOpen && (
          <div id="filters-content" className="space-y-4">
            {/* Station Filter */}
            <div>
              <label htmlFor="station-filter" className="block text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-2">
                Station
              </label>
              <div className="relative">
                <select
                  id="station-filter"
                  value={selectedStation || ''}
                  onChange={(e) => onStationChange(e.target.value || null)}
                  className="w-full pl-4 pr-10 py-2 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white appearance-none"
                  aria-label="Filter by station"
                >
                  <option value="">All Stations</option>
                  {stations.map((station) => (
                    <option key={station} value={station}>
                      {STATION_NAMES[station as keyof typeof STATION_NAMES] || station}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black dark:text-white pointer-events-none" aria-hidden="true" />
              </div>
            </div>

            {/* Route Type Filter */}
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-2">
                Route Type
              </label>
              <div className="flex gap-2">
                {(['all', 'express', 'all-stops'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => onRouteFilterChange(option)}
                    className={`px-4 py-2 border-2 font-semibold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      routeFilter === option
                        ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                        : 'bg-white dark:bg-black text-black dark:text-white border-black dark:border-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    aria-pressed={routeFilter === option}
                  >
                    {option === 'all' ? 'All Routes' : option === 'express' ? 'Express Only' : 'All Stops'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-2">
                Sort By
              </label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <select
                    value={sortOption}
                    onChange={(e) => onSortChange(e.target.value as SortOption)}
                    className="pl-4 pr-10 py-2 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white appearance-none"
                    aria-label="Sort option"
                  >
                    <option value="time">Time</option>
                    <option value="delay">Delay</option>
                    <option value="status">Status</option>
                    <option value="station">Station</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black dark:text-white pointer-events-none" aria-hidden="true" />
                </div>
                <Button
                  onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
                  variant="outline"
                  size="sm"
                  aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                  className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-9 px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
                >
                  <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
                  {sortDirection === 'asc' ? 'Asc' : 'Desc'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

