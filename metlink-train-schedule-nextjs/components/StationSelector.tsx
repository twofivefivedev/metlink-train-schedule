'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Check, ChevronDown, X } from 'lucide-react';
import { LINE_STATIONS, STATION_NAMES, getDefaultStationsForLine } from '@/lib/constants';
import type { LineCode } from '@/lib/constants';

interface StationSelectorProps {
  selectedLine: LineCode;
  selectedStations: string[];
  onStationsChange: (stations: string[]) => void;
}

export function StationSelector({
  selectedLine,
  selectedStations,
  onStationsChange,
}: StationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const availableStations = useMemo(() => {
    return LINE_STATIONS[selectedLine] || [];
  }, [selectedLine]);

  // Update available stations when line changes
  useEffect(() => {
    // Always reset to all stations when line changes
    const defaultStations = getDefaultStationsForLine(selectedLine);
    // Only update if the current selection is different
    const currentSet = new Set(selectedStations);
    const defaultSet = new Set(defaultStations);
    const isDifferent = defaultStations.length !== selectedStations.length ||
      !defaultStations.every(s => currentSet.has(s)) ||
      !selectedStations.every(s => defaultSet.has(s));
    
    if (isDifferent) {
      onStationsChange(defaultStations);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLine]); // Only depend on selectedLine to avoid loops

  const handleToggleStation = (station: string) => {
    if (selectedStations.includes(station)) {
      // Don't allow deselecting all stations
      if (selectedStations.length > 1) {
        onStationsChange(selectedStations.filter(s => s !== station));
      }
    } else {
      onStationsChange([...selectedStations, station]);
    }
  };

  const handleSelectAll = () => {
    onStationsChange([...availableStations]);
  };

  const handleClear = () => {
    // Set to all stations (can't have empty selection)
    onStationsChange([...availableStations]);
  };

  const isAllSelected = availableStations.every(s => selectedStations.includes(s));
  const selectedCount = selectedStations.length;
  const totalCount = availableStations.length;

  return (
    <div className="relative">
      <label className="block text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-2">
        Stations ({selectedCount === totalCount ? 'All' : `${selectedCount} selected`})
      </label>
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="w-full pl-4 pr-8 h-[42px] bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white text-left flex items-center justify-between"
          aria-expanded={isOpen}
          aria-label="Select stations"
        >
          <span className="truncate">
            {isAllSelected
              ? 'All Stations'
              : `${selectedCount} of ${totalCount} stations`}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-black dark:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-hidden="true"
            />
            <div 
              className="absolute z-20 w-full mt-1 bg-white dark:bg-black border-2 border-black dark:border-white max-h-64 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2 border-b-2 border-black dark:border-white flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAll();
                    }}
                    className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white hover:underline px-2 py-1"
                  >
                    Select All
                  </button>
                  {!isAllSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear();
                      }}
                      className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white hover:underline px-2 py-1"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="p-2 space-y-1">
                {availableStations.length === 0 ? (
                  <div className="p-4 text-sm text-black/70 dark:text-white/70 text-center">
                    No stations available for this line
                  </div>
                ) : (
                  availableStations.map((station) => {
                    const isSelected = selectedStations.includes(station);
                    return (
                      <label
                        key={station}
                        className="flex items-center gap-2 p-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleStation(station);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isSelected && selectedStations.length === 1}
                          className="w-4 h-4 border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white"
                        />
                        <span className="text-sm text-black dark:text-white flex-1">
                          {STATION_NAMES[station] || station}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-black dark:text-white" aria-hidden="true" />
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

