/**
 * Departures Table Component
 * Virtualized table displaying train departures
 */

import React from 'react';
import type { Departure } from '@/types';
import type { StatusCategory } from '@/lib/utils/departureUtils';
import {
  getDepartureStatus,
  getStationName,
  getRouteText,
  isBusReplacement,
  calculateWaitTime,
  getStatusCategory,
  getStatusColorClass,
} from '@/lib/utils/departureUtils';

interface DeparturesTableProps {
  departures: Departure[];
  virtualRows: Array<{ index: number; start: number; size: number; key: string }>;
  rowVirtualizer: {
    getTotalSize: () => number;
    measureElement: (element: HTMLElement | null) => void;
  };
  containerRef: React.RefObject<HTMLDivElement>;
  selectedNotice: {
    departure: Departure;
    category: StatusCategory;
  } | null;
  delayedTrainFirstStations: Set<string>;
  currentTime: Date;
  onNoticeSelect: (departure: Departure) => void;
  loading?: boolean;
}

interface DepartureBoardRowProps {
  departure: Departure;
  index: number;
  onSelect: (departure: Departure) => void;
  isSelected: boolean;
  showExpectedTime?: boolean;
  currentTime: Date;
}

const DepartureBoardRow = React.memo(function DepartureBoardRow({
  departure,
  index,
  onSelect,
  isSelected,
  showExpectedTime = true,
  currentTime,
}: DepartureBoardRowProps) {
  const status = getDepartureStatus(departure);
  const route = getRouteText(departure);
  const station = getStationName(departure.station);
  const category = getStatusCategory(departure);
  const statusColorClass = getStatusColorClass(category);

  const formatTime24h = (timeString: string | undefined | null): string => {
    if (!timeString) return '--:--';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-NZ', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getStatusText = (): string => {
    if (category === 'bus') return 'BUS REPLACEMENT';
    if (status.text === 'Canceled') return 'CANCELLED';
    if (status.text.includes('Delayed')) {
      const delayMatch = status.text.match(/Delayed\s+(.+)/);
      if (delayMatch) {
        const delayAmount = delayMatch[1];
        const formattedDelay = delayAmount.replace(/(\d+)m/, '$1 mins');
        return `DELAYED (${formattedDelay})`;
      }
      return 'DELAYED';
    }
    if (status.text === 'On Time') return 'ON TIME';
    return 'SCHEDULED';
  };

  const handleClick = () => {
    if (category !== 'normal') {
      onSelect(departure);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && category !== 'normal') {
      e.preventDefault();
      onSelect(departure);
    }
  };

  const aimedTime = departure.departure?.aimed;
  const expectedTime = departure.departure?.expected;
  const isDelayed = category === 'delayed' && aimedTime && expectedTime;
  const shouldShowExpectedTime = isDelayed ? showExpectedTime : true;
  const displayTime = (shouldShowExpectedTime && expectedTime) || aimedTime;

  return (
    <div
      className={`grid grid-cols-3 gap-4 sm:gap-8 px-4 sm:px-8 py-3 sm:py-5 transition-colors border-b-2 border-black dark:border-white ${
        category !== 'normal' 
          ? 'cursor-pointer hover:bg-black/10 dark:hover:bg-white/10' 
          : 'hover:bg-black/5 dark:hover:bg-white/5'
      } ${
        isSelected 
          ? 'bg-black/10 dark:bg-white/10 ring-2 ring-black dark:ring-white ring-offset-2' 
          : ''
      } focus-within:bg-black/10 dark:focus-within:bg-white/10 focus-within:outline-none focus-within:ring-2 focus-within:ring-black dark:focus-within:ring-white focus-within:ring-offset-2`}
      role="row"
      tabIndex={category !== 'normal' ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Departure ${index + 1}: ${station} to ${route || 'unknown destination'} at ${formatTime24h(displayTime)}, status ${getStatusText()}${category !== 'normal' ? '. Click to view service notice details.' : ''}`}
    >
      <div className={`text-xl font-mono font-bold tracking-wider ${
        category === 'delayed' 
          ? statusColorClass 
          : 'text-black dark:text-white'
      }`} role="gridcell">
        {displayTime ? (
          isDelayed ? (
            <span className="flex items-center gap-2">
              <time dateTime={aimedTime} className="line-through opacity-60">
                {formatTime24h(aimedTime)}
              </time>
              {shouldShowExpectedTime && expectedTime && (
                <time dateTime={expectedTime} className={statusColorClass}>
                  {formatTime24h(expectedTime)}
                </time>
              )}
            </span>
          ) : (
            <time dateTime={displayTime}>{formatTime24h(displayTime)}</time>
          )
        ) : (
          '--:--'
        )}
      </div>
      <div className="text-lg text-black dark:text-white font-medium" role="gridcell">
        {station.replace(' Station', '')}
      </div>
      <div 
        className={`text-lg font-bold uppercase tracking-wide ${statusColorClass} ${category !== 'normal' ? 'cursor-pointer' : ''}`} 
        role="gridcell"
        onClick={category !== 'normal' ? handleClick : undefined}
        onKeyDown={category !== 'normal' ? handleKeyDown : undefined}
        tabIndex={category !== 'normal' ? 0 : undefined}
        aria-label={`Status: ${getStatusText()}${category !== 'normal' ? '. Click to view service notice details.' : ''}`}
      >
        <span>{getStatusText()}</span>
      </div>
    </div>
  );
}, (previous, next) => {
  const previousStatus = (previous.departure as { status?: string }).status || '';
  const nextStatus = (next.departure as { status?: string }).status || '';
  const sameDeparture =
    previous.departure.service_id === next.departure.service_id &&
    previous.departure.station === next.departure.station &&
    previous.departure.departure?.aimed === next.departure.departure?.aimed &&
    previous.departure.departure?.expected === next.departure.departure?.expected &&
    previousStatus === nextStatus;

  return (
    sameDeparture &&
    previous.isSelected === next.isSelected &&
    previous.showExpectedTime === next.showExpectedTime &&
    previous.currentTime.getTime() === next.currentTime.getTime()
  );
});

export function DeparturesTable({
  departures,
  virtualRows,
  rowVirtualizer,
  containerRef,
  selectedNotice,
  delayedTrainFirstStations,
  currentTime,
  onNoticeSelect,
  loading = false,
}: DeparturesTableProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white">
        <h2 id="departures-heading" className="sr-only">
          Train Departures Table
        </h2>
        <div
          className="grid grid-cols-3 gap-8 border-b-2 border-black dark:border-white px-8 py-5 bg-white dark:bg-black"
          role="rowgroup"
        >
          <div className="text-sm font-bold uppercase tracking-widest text-black dark:text-white" role="columnheader">
            TIME
          </div>
          <div className="text-sm font-bold uppercase tracking-widest text-black dark:text-white" role="columnheader">
            STATION
          </div>
          <div className="text-sm font-bold uppercase tracking-widest text-black dark:text-white" role="columnheader">
            STATUS
          </div>
        </div>
        <div className="text-center py-16 text-black/70 dark:text-white/70" role="status" aria-live="polite">
          <p className="text-xl font-semibold">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (departures.length === 0) {
    return (
      <div className="text-center py-16 text-black/70 dark:text-white/70" role="status" aria-live="polite">
        <p className="text-xl font-semibold">No trains scheduled at this time</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black border-2 border-black dark:border-white">
      <h2 id="departures-heading" className="sr-only">
        Train Departures Table
      </h2>
      <div
        className="grid grid-cols-3 gap-8 border-b-2 border-black dark:border-white px-8 py-5 bg-white dark:bg-black"
        role="rowgroup"
      >
        <div className="text-sm font-bold uppercase tracking-widest text-black dark:text-white" role="columnheader">
          TIME
        </div>
        <div className="text-sm font-bold uppercase tracking-widest text-black dark:text-white" role="columnheader">
          STATION
        </div>
        <div className="text-sm font-bold uppercase tracking-widest text-black dark:text-white" role="columnheader">
          STATUS
        </div>
      </div>

      <div
        ref={containerRef}
        className="max-h-[70vh] overflow-auto border-t-2 border-black dark:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white"
        role="rowgroup"
        aria-label="Train departures list"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualRow) => {
            const departure = departures[virtualRow.index];
            if (!departure) {
              return null;
            }

            const departureId =
              departure.trip_id ||
              `${departure.service_id}-${departure.station}-${departure.departure?.aimed}`;
            const selectedId = selectedNotice
              ? selectedNotice.departure.trip_id ||
                `${selectedNotice.departure.service_id}-${selectedNotice.departure.station}-${selectedNotice.departure.departure?.aimed}`
              : null;
            const tripId = departure.trip_id || 'no-trip';
            const stationId = `${tripId}-${departure.station}-${departure.departure?.aimed}`;
            const isFirstDelayedStation = delayedTrainFirstStations.has(stationId);

            return (
              <div
                key={`${departureId}-${virtualRow.index}`}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <DepartureBoardRow
                  departure={departure}
                  index={virtualRow.index}
                  onSelect={onNoticeSelect}
                  isSelected={departureId === selectedId}
                  showExpectedTime={isFirstDelayedStation}
                  currentTime={currentTime}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

