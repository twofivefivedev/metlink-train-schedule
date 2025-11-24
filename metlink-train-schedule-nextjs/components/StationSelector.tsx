'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Check, ChevronDown } from 'lucide-react';
import { LINE_STATIONS, STATION_NAMES, getDefaultStationsForLine } from '@/lib/constants';
import type { LineCode } from '@/lib/constants';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

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
  const [draftSelection, setDraftSelection] = useState<string[]>(selectedStations);
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

  useEffect(() => {
    if (!isOpen) {
      setDraftSelection(selectedStations);
    }
  }, [isOpen, selectedStations]);

  const handleToggleStation = (station: string) => {
    setDraftSelection((previous) => {
      if (previous.includes(station)) {
        if (previous.length === 1) {
          return previous;
        }
        return previous.filter((s) => s !== station);
      }
      return [...previous, station];
    });
  };

  const handleSelectAll = () => {
    setDraftSelection([...availableStations]);
  };

  const handleReset = () => {
    setDraftSelection(getDefaultStationsForLine(selectedLine));
  };

  const handleApply = () => {
    if (draftSelection.length === 0) {
      onStationsChange([...availableStations]);
    } else {
      onStationsChange([...draftSelection]);
    }
    setIsOpen(false);
  };

  const isAllSelected = availableStations.every(s => selectedStations.includes(s));
  const selectedCount = selectedStations.length;
  const totalCount = availableStations.length;
  const summaryLabel = isAllSelected
    ? 'All Stations'
    : `${selectedCount} of ${totalCount} stations`;

  return (
    <div className="relative">
      <label className="block text-sm font-semibold uppercase tracking-wider text-black dark:text-white mb-2">
        Stations ({summaryLabel})
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
            {summaryLabel}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-black dark:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        <CommandDialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setDraftSelection(selectedStations);
            }
          }}
          title="Select stations"
          description="Search to find a station quickly"
        >
          <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                  Choose stations
                </p>
                <p className="text-xs text-black/70 dark:text-white/70">
                  {draftSelection.length} selected • {availableStations.length} total
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                  className="h-8"
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  className="h-8"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
          <CommandInput placeholder="Search stations..." />
          <CommandList>
            <CommandEmpty>No stations found</CommandEmpty>
            <CommandGroup heading="Stations">
              {availableStations.map((station) => {
                const isSelected = draftSelection.includes(station);
                return (
                  <CommandItem
                    key={station}
                    onSelect={() => handleToggleStation(station)}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-5 h-5 flex items-center justify-center border-2 border-black dark:border-white text-black dark:text-white">
                      <Check className={`h-3 w-3 ${isSelected ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-black dark:text-white">
                      {STATION_NAMES[station] || station}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 px-4 py-3">
            <p className="text-xs text-black/70 dark:text-white/70">
              Keep at least one station selected.
            </p>
            <Button
              onClick={handleApply}
              disabled={draftSelection.length === 0}
              className="h-9"
            >
              Apply Selection
            </Button>
          </div>
        </CommandDialog>
      </div>
    </div>
  );
}

