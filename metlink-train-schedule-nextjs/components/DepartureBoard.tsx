'use client';

import React, { useMemo } from 'react';
import { Button } from './ui/button';
import { ArrowLeftRight, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  getDepartureStatus,
  getStationName,
  getRouteText,
  isBusReplacement,
  getImportantNotices,
} from '@/lib/utils/departureUtils';
import type { Departure } from '@/types';

interface DepartureBoardProps {
  departures: Departure[];
  direction: 'inbound' | 'outbound';
  onDirectionToggle: () => void;
  lastUpdated: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export function DepartureBoard({
  departures,
  direction,
  onDirectionToggle,
  lastUpdated,
  refreshing,
  onRefresh,
}: DepartureBoardProps) {
  const displayedDepartures = departures.slice(0, 10);

  const directionLabel = direction === 'inbound' 
    ? 'TRAINS TO WELLINGTON' 
    : 'TRAINS FROM WELLINGTON';

  // Format today's date
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-wider uppercase text-black">
              {directionLabel}
            </h1>
            <Button
              onClick={onDirectionToggle}
              variant="outline"
              className="bg-white border-2 border-black text-black hover:bg-black hover:text-white transition-colors font-semibold uppercase tracking-wider px-6 py-3"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Switch Direction
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm font-mono text-black/70">
            <span>{todayFormatted}</span>
            <span>|</span>
            <span>
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--'}
            </span>
            <span>|</span>
            <Button
              onClick={onRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="bg-white border border-black text-black hover:bg-black hover:text-white transition-colors h-7 px-3"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Warnings and Alerts Section */}
      {warnings.length > 0 && (
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="bg-white border-2 border-black">
            <div className="border-b-2 border-black px-8 py-4 bg-black text-white">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-lg font-bold uppercase tracking-wider">
                  Warnings & Alerts
                </h2>
              </div>
            </div>
            <div className="divide-y-2 divide-black">
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
                  <div key={index} className="px-8 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="font-bold uppercase text-black">
                          {warning.message}
                        </span>
                        <span className="text-black/70 ml-4">
                          {station} - {formatTime24h(time)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Departure Board Table */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {displayedDepartures.length === 0 ? (
          <div className="text-center py-16 text-black/70">
            <p className="text-xl font-semibold">No trains scheduled at this time</p>
          </div>
        ) : (
          <div className="bg-white border-2 border-black">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-8 border-b-2 border-black px-8 py-5 bg-white">
              <div className="text-sm font-bold uppercase tracking-widest text-black">
                TIME
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-black">
                DESTINATION
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-black">
                STATION
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-black">
                STATUS
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y-2 divide-black">
              {displayedDepartures.map((departure, index) => (
                <DepartureBoardRow
                  key={`${(departure as unknown as { trip_id?: string }).trip_id || index}-${index}`}
                  departure={departure}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface DepartureBoardRowProps {
  departure: Departure;
}

function DepartureBoardRow({ departure }: DepartureBoardRowProps) {
  const departureTime = departure.departure?.expected || departure.departure?.aimed;
  const status = getDepartureStatus(departure);
  const route = getRouteText(departure);
  const station = getStationName(departure.station);
  const isBus = isBusReplacement(departure);

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
    <div className="grid grid-cols-4 gap-8 px-8 py-5 hover:bg-black/5 transition-colors">
      <div className="text-xl font-mono font-bold text-black tracking-wider">
        {formatTime24h(departureTime)}
      </div>
      <div className="text-lg text-black font-medium">
        {isBus && <span className="mr-2">🚌</span>}
        {route || '--'}
      </div>
      <div className="text-lg text-black font-medium">
        {station}
      </div>
      <div className="text-lg font-bold text-black uppercase tracking-wide">
        {getStatusText()}
      </div>
    </div>
  );
}

