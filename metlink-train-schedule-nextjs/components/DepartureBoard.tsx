'use client';

import React, { useMemo } from 'react';
import { Button } from './ui/button';
import { ArrowLeftRight, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import {
  getDepartureStatus,
  getStationName,
  getRouteText,
  isBusReplacement,
  getImportantNotices,
  calculateWaitTime,
} from '@/lib/utils/departureUtils';
import { useCurrentTime } from '@/hooks/useWaitTime';
import { LINE_NAMES } from '@/lib/constants';
import type { Departure } from '@/types';
import type { LineCode } from '@/lib/constants';

interface DepartureBoardProps {
  departures: Departure[];
  direction: 'inbound' | 'outbound';
  onDirectionToggle: () => void;
  lastUpdated: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
  selectedLine?: LineCode;
}

export function DepartureBoard({
  departures,
  direction,
  onDirectionToggle,
  lastUpdated,
  refreshing,
  onRefresh,
  selectedLine = 'WRL',
}: DepartureBoardProps) {
  const displayedDepartures = departures.slice(0, 10);
  const currentTime = useCurrentTime();

  // Calculate wait time for the next departure
  const nextDepartureWaitTime = useMemo(() => {
    if (displayedDepartures.length === 0) return null;
    const nextDeparture = displayedDepartures[0];
    const waitTime = calculateWaitTime(nextDeparture, currentTime);
    return {
      minutes: waitTime.minutes !== null ? waitTime.minutes : null,
      station: getStationName(nextDeparture.station),
    };
  }, [displayedDepartures, currentTime]);


  // Collect all warnings and alerts from departures
  const warnings = useMemo(() => {
    const allWarnings: Array<{ type: string; message: string; departure: Departure }> = [];
    
    displayedDepartures.forEach((departure) => {
      const notices = getImportantNotices(departure);
      if (notices) {
        const noticeList = notices.split(', ');
        noticeList.forEach((notice) => {
          allWarnings.push({
            type: notice.toLowerCase().includes('cancelled') ? 'cancelled' :
                  notice.toLowerCase().includes('major delay') ? 'delay' :
                  notice.toLowerCase().includes('bus') ? 'bus' : 'other',
            message: notice,
            departure,
          });
        });
      }
    });

    return allWarnings;
  }, [displayedDepartures]);

  const lineName = LINE_NAMES[selectedLine] || selectedLine;
  const directionLabel = direction === 'inbound' 
    ? `TRAINS TO WELLINGTON - ${lineName.toUpperCase()}`
    : `TRAINS FROM WELLINGTON - ${lineName.toUpperCase()}`;

  // Format today's date
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Header */}
      <header className="border-b-2 border-black dark:border-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-wider uppercase text-black dark:text-white">
              {directionLabel}
            </h1>
            <Button
              onClick={onDirectionToggle}
              variant="outline"
              aria-label={`Switch to ${direction === 'inbound' ? 'outbound' : 'inbound'} trains`}
              className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors font-semibold uppercase tracking-wider px-6 py-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" aria-hidden="true" />
              Switch Direction
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm font-mono text-black/70 dark:text-white/70" role="status" aria-live="polite">
            <time dateTime={today.toISOString()}>{todayFormatted}</time>
            <span aria-hidden="true">|</span>
            <span>
              Last updated: {lastUpdated ? (
                <time dateTime={lastUpdated.toISOString()}>{lastUpdated.toLocaleTimeString()}</time>
              ) : (
                '--:--'
              )}
              {refreshing && <span className="sr-only">Refreshing schedule data</span>}
            </span>
            <span aria-hidden="true">|</span>
            <div className="flex items-center gap-2">
              <Button
                onClick={onRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                aria-label={refreshing ? 'Refreshing schedule' : 'Refresh schedule'}
                className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors h-7 px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Next Train Wait Time */}
      {nextDepartureWaitTime !== null && nextDepartureWaitTime.minutes !== null && (
        <section
          aria-labelledby="wait-time-heading"
          className="max-w-7xl mx-auto px-8 py-4"
        >
          <div className="bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white px-8 py-6">
            <div className="flex items-center gap-4">
              <Clock className="h-6 w-6" aria-hidden="true" />
              <div>
                <h2 id="wait-time-heading" className="text-sm font-semibold uppercase tracking-wider mb-1">
                  Next Train In - {nextDepartureWaitTime.station.replace(' Station', '')}
                </h2>
                <p className="text-3xl font-bold" aria-live="polite">
                  {nextDepartureWaitTime.minutes === 0 
                    ? 'Now' 
                    : nextDepartureWaitTime.minutes === 1 
                      ? '1 minute' 
                      : `${nextDepartureWaitTime.minutes} minutes`}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Warnings and Alerts Section */}
      {warnings.length > 0 && (
        <section
          aria-labelledby="warnings-heading"
          aria-live="polite"
          className="max-w-7xl mx-auto px-8 py-6"
        >
          <div className="bg-white dark:bg-black border-2 border-black dark:border-white">
            <div className="border-b-2 border-black dark:border-white px-8 py-4 bg-black dark:bg-white text-white dark:text-black">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                <h2 id="warnings-heading" className="text-lg font-bold uppercase tracking-wider">
                  Warnings & Alerts
                </h2>
              </div>
            </div>
            <ul className="divide-y-2 divide-black dark:divide-white" role="list">
              {warnings.map((warning, index) => {
                const station = getStationName(warning.departure.station);
                const time = warning.departure.departure?.expected || warning.departure.departure?.aimed;
                const formatTime24h = (timeString: string | undefined | null): string => {
                  if (!timeString) return '--:--';
                  const date = new Date(timeString);
                  return date.toLocaleTimeString('en-NZ', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });
                };
                
                return (
                  <li key={index} className="px-8 py-4" role="listitem">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="font-bold uppercase text-black dark:text-white">
                          {warning.message}
                        </span>
                        <span className="text-black/70 dark:text-white/70 ml-4">
                          {station} - {time ? (
                            <time dateTime={time}>{formatTime24h(time)}</time>
                          ) : (
                            '--:--'
                          )}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Departure Board Table */}
      <section aria-labelledby="departures-heading" className="max-w-7xl mx-auto px-8 py-8">
        {displayedDepartures.length === 0 ? (
          <div className="text-center py-16 text-black/70 dark:text-white/70" role="status" aria-live="polite">
            <p className="text-xl font-semibold">No trains scheduled at this time</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-black border-2 border-black dark:border-white">
            <h2 id="departures-heading" className="sr-only">
              Train Departures Table
            </h2>
            {/* Table Header */}
            <div
              className="grid grid-cols-4 gap-8 border-b-2 border-black dark:border-white px-8 py-5 bg-white dark:bg-black"
              role="rowgroup"
            >
              <div className="text-sm font-bold uppercase tracking-widest text-black dark:text-white" role="columnheader">
                TIME
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-black dark:text-white" role="columnheader">
                DESTINATION
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-black dark:text-white" role="columnheader">
                STATION
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-black dark:text-white" role="columnheader">
                STATUS
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y-2 divide-black dark:divide-white" role="rowgroup">
              {displayedDepartures.map((departure, index) => (
                <DepartureBoardRow
                  key={`${(departure as unknown as { trip_id?: string }).trip_id || index}-${index}`}
                  departure={departure}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface DepartureBoardRowProps {
  departure: Departure;
  index: number;
}

function DepartureBoardRow({ departure, index }: DepartureBoardRowProps) {
  const departureTime = departure.departure?.expected || departure.departure?.aimed;
  const status = getDepartureStatus(departure);
  const route = getRouteText(departure);
  const station = getStationName(departure.station);
  const isBus = isBusReplacement(departure);
  const currentTime = useCurrentTime();
  const waitTime = calculateWaitTime(departure, currentTime);

  // Format time as HH:MM
  const formatTime24h = (timeString: string | undefined | null): string => {
    if (!timeString) return '--:--';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-NZ', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Get status text in uppercase
  const getStatusText = (): string => {
    if (status.text === 'Canceled') return 'CANCELLED';
    if (status.text.includes('Delayed')) return 'DELAYED';
    if (status.text === 'On Time') return 'ON TIME';
    return 'SCHEDULED';
  };

  return (
    <div
      className="grid grid-cols-4 gap-8 px-8 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus-within:bg-black/10 dark:focus-within:bg-white/10 focus-within:outline-none focus-within:ring-2 focus-within:ring-black dark:focus-within:ring-white focus-within:ring-offset-2"
      role="row"
      tabIndex={0}
      aria-label={`Departure ${index + 1}: ${station} to ${route || 'unknown destination'} at ${formatTime24h(departureTime)}, status ${getStatusText()}`}
    >
      <div className="text-xl font-mono font-bold text-black dark:text-white tracking-wider" role="gridcell">
        {departureTime ? (
          <time dateTime={departureTime}>{formatTime24h(departureTime)}</time>
        ) : (
          '--:--'
        )}
      </div>
      <div className="text-lg text-black dark:text-white font-medium" role="gridcell">
        {isBus && <span className="mr-2" aria-label="Bus replacement service">🚌</span>}
        {route || '--'}
      </div>
      <div className="text-lg text-black dark:text-white font-medium" role="gridcell">
        {station.replace(' Station', '')}
      </div>
      <div className="text-lg font-bold text-black dark:text-white uppercase tracking-wide" role="gridcell">
        <span aria-label={`Status: ${getStatusText()}`}>{getStatusText()}</span>
      </div>
    </div>
  );
}

