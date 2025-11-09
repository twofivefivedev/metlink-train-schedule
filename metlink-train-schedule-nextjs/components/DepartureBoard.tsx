'use client';

import React, { useMemo, useState, useEffect } from 'react';
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
  getStatusCategory,
  getStatusColorClass,
  parseDelay,
  type StatusCategory,
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
  
  // Track selected notice for service notice panel
  const [selectedNotice, setSelectedNotice] = useState<{
    category: StatusCategory;
    message: string;
    departure: Departure;
  } | null>(null);

  // Calculate wait time for the next available (non-cancelled) departure
  const nextDepartureWaitTime = useMemo(() => {
    if (displayedDepartures.length === 0) return null;
    
    // Find the first non-cancelled departure
    const nextAvailableDeparture = displayedDepartures.find(dep => {
      const status = (dep as unknown as { status?: string }).status;
      return status !== 'canceled' && status !== 'cancelled';
    });
    
    if (!nextAvailableDeparture) return null;
    
    const waitTime = calculateWaitTime(nextAvailableDeparture, currentTime);
    return {
      minutes: waitTime.minutes !== null ? waitTime.minutes : null,
      station: getStationName(nextAvailableDeparture.station),
    };
  }, [displayedDepartures, currentTime]);

  // Find departures with notices (cancelled, delayed, bus)
  const departuresWithNotices = useMemo(() => {
    return displayedDepartures.filter(dep => {
      const category = getStatusCategory(dep);
      return category !== 'normal';
    });
  }, [displayedDepartures]);

  // Don't auto-select notice - user must click to see details
  // Only clear selection if the selected departure is no longer in the list
  useEffect(() => {
    if (selectedNotice) {
      const currentId = (selectedNotice.departure as unknown as { trip_id?: string }).trip_id || 
                       `${selectedNotice.departure.service_id}-${selectedNotice.departure.station}-${selectedNotice.departure.departure?.aimed}`;
      
      const stillExists = displayedDepartures.some(dep => {
        const depId = (dep as unknown as { trip_id?: string }).trip_id || 
                     `${dep.service_id}-${dep.station}-${dep.departure?.aimed}`;
        return depId === currentId;
      });
      
      if (!stillExists) {
        setSelectedNotice(null);
      }
    }
  }, [displayedDepartures, selectedNotice]);

  // Collect warnings and alerts - filter out cancelled/delayed/bus (they show in panel)
  const warnings = useMemo(() => {
    const allWarnings: Array<{ type: string; message: string; departure: Departure }> = [];
    
    displayedDepartures.forEach((departure) => {
      const category = getStatusCategory(departure);
      // Only include "other" notices in the top banner
      if (category === 'normal') {
        const notices = getImportantNotices(departure);
        if (notices) {
          const noticeList = notices.split(', ');
          noticeList.forEach((notice) => {
            // Only include notices that aren't cancelled/delayed/bus
            if (!notice.toLowerCase().includes('cancelled') &&
                !notice.toLowerCase().includes('delay') &&
                !notice.toLowerCase().includes('bus')) {
              allWarnings.push({
                type: 'other',
                message: notice,
                departure,
              });
            }
          });
        }
      }
    });

    return allWarnings;
  }, [displayedDepartures]);

  // Get explanation text for a notice
  const getNoticeExplanation = (departure: Departure, category: StatusCategory, message: string): string => {
    if (category === 'cancelled') {
      // Check for cancellation reason in live API data (if available)
      const cancellationReason = (departure as unknown as { cancellation_reason?: string }).cancellation_reason;
      if (cancellationReason) {
        return `This service has been cancelled: ${cancellationReason}. Please check for alternative services.`;
      }
      return 'This service has been cancelled. Please check for alternative services.';
    }
    if (category === 'delayed') {
      // Use the existing parseDelay function to handle ISO 8601 format from live API
      const delay = parseDelay((departure as unknown as { delay?: string }).delay);
      if (delay) {
        return `This service is running ${delay} late. Please allow extra time for your journey.`;
      }
      // Fallback if delay is not available but status indicates delay
      const status = (departure as unknown as { status?: string }).status;
      if (status === 'delayed') {
        return 'This service is delayed. Please allow extra time for your journey.';
      }
      // Check if expected time is later than aimed time (indicates delay)
      const aimed = departure.departure?.aimed;
      const expected = departure.departure?.expected;
      if (aimed && expected) {
        const aimedTime = new Date(aimed).getTime();
        const expectedTime = new Date(expected).getTime();
        const delayMs = expectedTime - aimedTime;
        if (delayMs > 0) {
          const delayMinutes = Math.floor(delayMs / (1000 * 60));
          if (delayMinutes >= 5) {
            return `This service is running approximately ${delayMinutes} minutes late. Please allow extra time for your journey.`;
          }
        }
      }
      return 'This service is delayed. Please allow extra time for your journey.';
    }
    if (category === 'bus') {
      // Check for bus replacement details in live API data
      const destination = departure.destination?.name || '';
      const origin = (departure as unknown as { origin?: { name?: string } }).origin?.name || '';
      const operator = (departure as unknown as { operator?: string }).operator || '';
      
      // If destination or origin contains bus/replacement info, include it
      if (destination.toLowerCase().includes('bus') || destination.toLowerCase().includes('replacement')) {
        return `This service is being replaced by a bus. ${destination}. Please allow extra time for your journey.`;
      }
      if (origin.toLowerCase().includes('bus') || origin.toLowerCase().includes('replacement')) {
        return `This service is being replaced by a bus. ${origin}. Please allow extra time for your journey.`;
      }
      if (operator && (operator.toLowerCase().includes('bus') || operator.toLowerCase() === 'bus')) {
        return 'This service is being replaced by a bus due to operational requirements. Please allow extra time for your journey.';
      }
      return 'This service is being replaced by a bus due to operational requirements. Please allow extra time for your journey.';
    }
    return 'Service notice: ' + message;
  };

  // Handle row/status click to show notice details
  const handleNoticeSelect = (departure: Departure) => {
    const category = getStatusCategory(departure);
    if (category !== 'normal') {
      const notices = getImportantNotices(departure);
      if (notices) {
        const noticeList = notices.split(', ');
        const relevantNotice = noticeList.find(n => 
          category === 'cancelled' && n.toLowerCase().includes('cancelled') ||
          category === 'delayed' && n.toLowerCase().includes('delay') ||
          category === 'bus' && n.toLowerCase().includes('bus')
        ) || noticeList[0];
        
        setSelectedNotice({
          category,
          message: relevantNotice,
          departure,
        });
      } else {
        // Fallback: if no notices but category is not normal, create a default notice
        // This handles edge cases where live API might not include notices but status indicates issue
        let defaultMessage = '';
        if (category === 'cancelled') {
          defaultMessage = 'Cancelled';
        } else if (category === 'bus') {
          defaultMessage = 'Bus replacement';
        } else if (category === 'delayed') {
          defaultMessage = 'Delayed';
        }
        
        if (defaultMessage) {
          setSelectedNotice({
            category,
            message: defaultMessage,
            departure,
          });
        }
      }
    }
  };

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

      {/* Next Train Wait Time and Service Notice Panel */}
      {nextDepartureWaitTime !== null && nextDepartureWaitTime.minutes !== null && (
        <section
          aria-labelledby="wait-time-heading"
          className="max-w-7xl mx-auto px-8 py-4"
        >
          <div className={selectedNotice ? "grid grid-cols-1 md:grid-cols-2 gap-4" : ""}>
            {/* Wait Time Card */}
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

            {/* Service Notice Panel - only shown when user selects a notice */}
            {selectedNotice && (
              <div className="bg-white dark:bg-black border-2 border-black dark:border-white px-8 py-6">
                <h2 id="service-notice-heading" className="text-sm font-semibold uppercase tracking-wider mb-3">
                  Service Notice
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-5 w-5 ${getStatusColorClass(selectedNotice.category)}`} aria-hidden="true" />
                    <p className={`text-lg font-bold ${getStatusColorClass(selectedNotice.category)}`}>
                      {selectedNotice.message.toUpperCase()}
                    </p>
                  </div>
                  <p className="text-xs text-black/70 dark:text-white/70">
                    {getNoticeExplanation(selectedNotice.departure, selectedNotice.category, selectedNotice.message)}
                  </p>
                  <p className="text-xs text-black/70 dark:text-white/70">
                    {getStationName(selectedNotice.departure.station).replace(' Station', '')} - {
                      selectedNotice.departure.departure?.expected || selectedNotice.departure.departure?.aimed ? (
                        <time dateTime={selectedNotice.departure.departure?.expected || selectedNotice.departure.departure?.aimed || ''}>
                          {new Date(selectedNotice.departure.departure?.expected || selectedNotice.departure.departure?.aimed || '').toLocaleTimeString('en-NZ', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </time>
                      ) : '--:--'
                    }
                  </p>
                </div>
              </div>
            )}
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

            {/* Table Rows */}
            <div className="divide-y-2 divide-black dark:divide-white" role="rowgroup">
              {displayedDepartures.map((departure, index) => {
                const departureId = (departure as unknown as { trip_id?: string }).trip_id || 
                                  `${departure.service_id}-${departure.station}-${departure.departure?.aimed}`;
                const selectedId = selectedNotice ? 
                  ((selectedNotice.departure as unknown as { trip_id?: string }).trip_id || 
                   `${selectedNotice.departure.service_id}-${selectedNotice.departure.station}-${selectedNotice.departure.departure?.aimed}`) : null;
                
                return (
                  <DepartureBoardRow
                    key={`${(departure as unknown as { trip_id?: string }).trip_id || index}-${index}`}
                    departure={departure}
                    index={index}
                    onSelect={handleNoticeSelect}
                    isSelected={departureId === selectedId}
                  />
                );
              })}
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
  onSelect: (departure: Departure) => void;
  isSelected: boolean;
}

function DepartureBoardRow({ departure, index, onSelect, isSelected }: DepartureBoardRowProps) {
  const departureTime = departure.departure?.expected || departure.departure?.aimed;
  const status = getDepartureStatus(departure);
  const route = getRouteText(departure);
  const station = getStationName(departure.station);
  const isBus = isBusReplacement(departure);
  const currentTime = useCurrentTime();
  const waitTime = calculateWaitTime(departure, currentTime);
  const category = getStatusCategory(departure);
  const statusColorClass = getStatusColorClass(category);

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
    if (category === 'bus') return 'BUS REPLACEMENT';
    if (status.text === 'Canceled') return 'CANCELLED';
    if (status.text.includes('Delayed')) {
      // Extract delay amount from status text (e.g., "Delayed 5m" -> "DELAYED (5 mins)")
      const delayMatch = status.text.match(/Delayed\s+(.+)/);
      if (delayMatch) {
        const delayAmount = delayMatch[1];
        // Convert "5m" to "5 mins" for better readability
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

  // For delayed trains, show expected time instead of scheduled time
  const displayTime = category === 'delayed' && departure.departure?.expected
    ? departure.departure.expected
    : departureTime;

  return (
    <div
      className={`grid grid-cols-3 gap-8 px-8 py-5 transition-colors ${
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
          <time dateTime={displayTime}>{formatTime24h(displayTime)}</time>
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
}

