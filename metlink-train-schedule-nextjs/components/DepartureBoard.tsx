'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from './ui/button';
import { ArrowLeftRight, AlertTriangle, RefreshCw, Clock, BookmarkPlus } from 'lucide-react';
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
import { LINE_STATIONS } from '@/lib/constants';
import { addScheduleConfig } from '@/lib/utils/favorites';
import { usePreferences } from '@/components/preferences-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import type { Departure } from '@/types';
import type { LineCode } from '@/lib/constants';
import type { SortOption, SortDirection } from '@/lib/utils/sortUtils';
import type { StaleState } from '@/hooks/useTrainSchedule';

const NOTICE_SAMPLE_SIZE = 50;
const MAX_WARNING_ITEMS = 12;
const ESTIMATED_ROW_HEIGHT = 96;

interface DepartureBoardProps {
  departures: Departure[];
  direction: 'inbound' | 'outbound';
  onDirectionToggle: () => void;
  lastUpdated: Date | null;
  refreshing: boolean;
  loading?: boolean;
  onRefresh: () => void;
  selectedLine?: LineCode;
  selectedStations?: string[];
  filters?: {
    selectedStation: string | null;
    routeFilter: 'all' | 'express' | 'all-stops';
    sortOption: SortOption;
    sortDirection: SortDirection;
  };
  onConfigSaved?: () => void;
  staleState?: StaleState;
}

export function DepartureBoard({
  departures,
  direction,
  onDirectionToggle,
  lastUpdated,
  refreshing,
  loading = false,
  onRefresh,
  selectedLine = 'WRL',
  selectedStations = [],
  filters = {
    selectedStation: null,
    routeFilter: 'all',
    sortOption: 'time',
    sortDirection: 'asc',
  },
  onConfigSaved,
  staleState = { isStale: false, since: null },
}: DepartureBoardProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [configName, setConfigName] = useState('');
  const currentTime = useCurrentTime();
  const { syncFromStorage } = usePreferences();
  const [startOfTodayMs, endOfTodayMs] = useMemo(() => {
    const start = new Date(currentTime);
    start.setHours(0, 0, 0, 0);
    const end = new Date(currentTime);
    end.setHours(23, 59, 59, 999);
    return [start.getTime(), end.getTime()];
  }, [currentTime]);
  const todaysDepartures = useMemo(() => {
    if (!departures.length) {
      return [];
    }
    return departures.filter((departure) => {
      const departureTime = departure.departure?.expected || departure.departure?.aimed;
      if (!departureTime) {
        return false;
      }
      const departureTimestamp = new Date(departureTime).getTime();
      return departureTimestamp >= startOfTodayMs && departureTimestamp <= endOfTodayMs;
    });
  }, [departures, startOfTodayMs, endOfTodayMs]);
  const noticeSample = useMemo(
    () => todaysDepartures.slice(0, NOTICE_SAMPLE_SIZE),
    [todaysDepartures]
  );
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: todaysDepartures.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => {
      const departure = todaysDepartures[index];
      if (!departure) {
        return `departure-${index}`;
      }
      return (
        (departure as unknown as { trip_id?: string }).trip_id ||
        `${departure.service_id}-${departure.station}-${departure.departure?.aimed || index}`
      );
    },
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  
  // Group delayed trains by trip_id to identify which stations belong to the same train
  // Only show expected time on the first station of each delayed train
  const delayedTrainFirstStations = useMemo(() => {
    const delayedTrains = new Map<string, Departure>();
    
    todaysDepartures.forEach(dep => {
      const category = getStatusCategory(dep);
      if (category === 'delayed') {
        const tripId = (dep as unknown as { trip_id?: string }).trip_id;
        if (tripId) {
          const existing = delayedTrains.get(tripId);
          if (!existing) {
            delayedTrains.set(tripId, dep);
          } else {
            // Keep the one with the earliest time (using aimed time for comparison)
            const existingTime = new Date(existing.departure?.aimed || 0).getTime();
            const currentTime = new Date(dep.departure?.aimed || 0).getTime();
            if (currentTime < existingTime) {
              delayedTrains.set(tripId, dep);
            }
          }
        }
      }
    });
    
    // Create a Set of departure IDs that are the first station of a delayed train
    // Use a combination that uniquely identifies the departure
    const firstStationIds = new Set<string>();
    delayedTrains.forEach(dep => {
      // Create unique ID using trip_id + station + aimed time
      const id = `${(dep as unknown as { trip_id?: string }).trip_id || 'no-trip'}-${dep.station}-${dep.departure?.aimed}`;
      firstStationIds.add(id);
    });
    
    return firstStationIds;
  }, [todaysDepartures]);
  
  // Track selected notice for service notice panel
  const [selectedNotice, setSelectedNotice] = useState<{
    category: StatusCategory;
    message: string;
    departure: Departure;
  } | null>(null);

  // Calculate wait time for the next available (non-cancelled, future) departure
  const nextDepartureWaitTime = useMemo(() => {
    if (todaysDepartures.length === 0) return null;
    
    // Find the first non-cancelled departure that hasn't departed yet
    const nextAvailableDeparture = todaysDepartures.find(dep => {
      const status = (dep as unknown as { status?: string }).status;
      if (status === 'canceled' || status === 'cancelled') {
        return false;
      }
      
      // Check if departure is in the future
      const departureTime = dep.departure?.expected || dep.departure?.aimed;
      if (!departureTime) {
        return false;
      }
      
      const departureDate = new Date(departureTime);
      const diffMs = departureDate.getTime() - currentTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      // Only include departures that are in the future (or now)
      return diffMinutes >= 0;
    });
    
    if (!nextAvailableDeparture) return null;
    
    const waitTime = calculateWaitTime(nextAvailableDeparture, currentTime);
    return {
      minutes: waitTime.minutes !== null ? waitTime.minutes : null,
      station: getStationName(nextAvailableDeparture.station),
    };
  }, [todaysDepartures, currentTime]);

  // Find departures with notices (cancelled, delayed, bus)
  const departuresWithNotices = useMemo(() => {
    return noticeSample.filter(dep => {
      const category = getStatusCategory(dep);
      return category !== 'normal';
    }).slice(0, MAX_WARNING_ITEMS);
  }, [noticeSample]);

  // Don't auto-select notice - user must click to see details
  // Only clear selection if the selected departure is no longer in the list
  useEffect(() => {
    if (selectedNotice) {
      const currentId = (selectedNotice.departure as unknown as { trip_id?: string }).trip_id || 
                       `${selectedNotice.departure.service_id}-${selectedNotice.departure.station}-${selectedNotice.departure.departure?.aimed}`;
      
      const stillExists = todaysDepartures.some(dep => {
        const depId = (dep as unknown as { trip_id?: string }).trip_id || 
                     `${dep.service_id}-${dep.station}-${dep.departure?.aimed}`;
        return depId === currentId;
      });
      
      if (!stillExists) {
        setSelectedNotice(null);
      }
    }
  }, [todaysDepartures, selectedNotice]);

  // Collect warnings and alerts - filter out cancelled/delayed/bus (they show in panel)
  const warnings = useMemo(() => {
    const allWarnings: Array<{ type: string; message: string; departure: Departure }> = [];
    
    noticeSample.forEach((departure) => {
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

    return allWarnings.slice(0, MAX_WARNING_ITEMS);
  }, [noticeSample]);

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

  // Get origin station for the line
  // The origin is the station furthest from Wellington
  const lineStations = LINE_STATIONS[selectedLine] || [];
  let originStationId: string | null = null;
  
  if (lineStations.length > 0) {
    // Special handling for Johnsonville line - find station with "Johnsonville" in name
    if (selectedLine === 'JVL') {
      originStationId = lineStations.find(stationId => {
        const stationName = getStationName(stationId);
        return stationName.toLowerCase().includes('johnsonville');
      }) || null;
    }
    // Check if array starts with WELL (Wellington) - if so, origin is last station
    // Otherwise, origin is first station (for WRL: Masterton)
    else if (lineStations[0] === 'WELL') {
      originStationId = lineStations[lineStations.length - 1];
    } else {
      originStationId = lineStations[0];
    }
  }
  
  const originStationName = originStationId 
    ? getStationName(originStationId).replace(' Station', '').replace(' - Stop A', '').replace(' - Stop B', '')
    : 'Unknown';
  
  const directionLabel = direction === 'inbound' 
    ? `Trains from ${originStationName} to Wellington`
    : `Trains from Wellington to ${originStationName}`;

  // Format today's date
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleSaveConfig = async () => {
    if (!configName.trim()) return;
    
    try {
      await Promise.resolve(
        addScheduleConfig({
          name: configName.trim(),
          line: selectedLine,
          selectedStations: selectedStations,
          direction: direction,
          filters: filters,
        })
      );
      syncFromStorage();
      onConfigSaved?.();
    } catch (error) {
      console.error('Failed to save schedule configuration', error);
    } finally {
      setConfigName('');
      setSaveDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Header */}
      <header className="border-b-2 border-black dark:border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-wider text-black dark:text-white break-words">
              {directionLabel}
            </h1>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setSaveDialogOpen(true)}
                variant="outline"
                aria-label="Save current schedule configuration"
                className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors font-semibold uppercase tracking-wider px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base flex-1 sm:flex-initial focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
              >
                <BookmarkPlus className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Save</span>
              </Button>
              <Button
                onClick={onDirectionToggle}
                variant="outline"
                aria-label={`Switch to ${direction === 'inbound' ? 'outbound' : 'inbound'} trains`}
                className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors font-semibold uppercase tracking-wider px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base flex-1 sm:flex-initial focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white group"
              >
                <ArrowLeftRight className="h-4 w-4 sm:mr-2 transition-transform duration-300 ease-in-out group-hover:rotate-180" aria-hidden="true" />
                <span className="hidden sm:inline">Switch Direction</span>
                <span className="sm:hidden">Switch</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm font-mono text-black/70 dark:text-white/70" role="status" aria-live="polite">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <time dateTime={today.toISOString()}>{todayFormatted}</time>
              <span aria-hidden="true" className="hidden sm:inline">|</span>
              <span>
                Last updated: {lastUpdated ? (
                  <time dateTime={lastUpdated.toISOString()}>{lastUpdated.toLocaleTimeString()}</time>
                ) : (
                  '--:--'
                )}
                {refreshing && <span className="sr-only">Refreshing schedule data</span>}
              </span>
            </div>
            <span aria-hidden="true" className="hidden sm:inline">|</span>
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

      {staleState?.isStale && (
        <section
          aria-live="polite"
          className="max-w-7xl mx-auto px-4 sm:px-8 py-4"
        >
          <div className="border-2 border-yellow-500 bg-yellow-50 text-yellow-900 dark:border-yellow-400 dark:bg-yellow-900/20 dark:text-yellow-100 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">Using cached departures</p>
              <p className="text-sm">
                {staleState.message || 'Showing the last departures we saved while we reconnect.'}
              </p>
              {staleState.since && (
                <p className="text-xs mt-1 text-yellow-900/80 dark:text-yellow-100/80">
                  Last updated&nbsp;
                  <time dateTime={staleState.since.toISOString()}>
                    {staleState.since.toLocaleTimeString('en-NZ', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </time>
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Next Train Wait Time and Service Notice Panel */}
      {nextDepartureWaitTime !== null && nextDepartureWaitTime.minutes !== null && (
        <section
          aria-labelledby="wait-time-heading"
          className="max-w-7xl mx-auto px-4 sm:px-8 pb-2 pt-4"
        >
          <div className={selectedNotice ? "grid grid-cols-1 md:grid-cols-2 gap-4" : ""}>
            {/* Wait Time Card */}
            <div className="bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white px-4 sm:px-8 py-4 sm:py-6">
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
              <div className="bg-white dark:bg-black border-2 border-black dark:border-white px-4 sm:px-8 py-4 sm:py-6">
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
          className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6"
        >
          <div className="bg-white dark:bg-black border-2 border-black dark:border-white">
            <div className="border-b-2 border-black dark:border-white px-4 sm:px-8 py-3 sm:py-4 bg-black dark:bg-white text-white dark:text-black">
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
                  <li 
                    key={index} 
                    className="px-4 sm:px-8 py-3 sm:py-4" 
                    role="listitem"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="font-bold uppercase text-black dark:text-white text-sm sm:text-base">
                          {warning.message}
                        </span>
                        <span className="text-black/70 dark:text-white/70 ml-2 sm:ml-4 text-xs sm:text-sm block sm:inline">
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
      <section aria-labelledby="departures-heading" className="max-w-7xl mx-auto px-4 sm:px-8 pt-2 pb-8">
        {loading ? (
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
            {/* Loading State */}
            <div className="text-center py-16 text-black/70 dark:text-white/70" role="status" aria-live="polite">
              <p className="text-xl font-semibold">Loading schedule...</p>
            </div>
          </div>
        ) : todaysDepartures.length === 0 ? (
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

            {/* Virtualized Table Rows */}
            <div
              ref={tableContainerRef}
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
                  const departure = todaysDepartures[virtualRow.index];
                  if (!departure) {
                    return null;
                  }

                  const departureId =
                    (departure as unknown as { trip_id?: string }).trip_id ||
                    `${departure.service_id}-${departure.station}-${departure.departure?.aimed}`;
                  const selectedId = selectedNotice
                    ? (selectedNotice.departure as unknown as { trip_id?: string }).trip_id ||
                      `${selectedNotice.departure.service_id}-${selectedNotice.departure.station}-${selectedNotice.departure.departure?.aimed}`
                    : null;
                  const tripId = (departure as unknown as { trip_id?: string }).trip_id || 'no-trip';
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
                        onSelect={handleNoticeSelect}
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
        )}
      </section>

      {/* Save Config Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-black dark:text-white font-bold uppercase tracking-wider">
              Save Schedule Configuration
            </DialogTitle>
            <DialogDescription className="text-black/70 dark:text-white/70">
              Give this schedule configuration a name (e.g., "School Commute", "Home to Wellington")
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="text"
              placeholder="e.g., School Commute"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && configName.trim()) {
                  handleSaveConfig();
                }
              }}
              className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setSaveDialogOpen(false);
                setConfigName('');
              }}
              variant="outline"
              className="bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={!configName.trim()}
              className="bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 border-2 border-black dark:border-white font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DepartureBoardRowProps {
  departure: Departure;
  index: number;
  onSelect: (departure: Departure) => void;
  isSelected: boolean;
  showExpectedTime?: boolean; // Only show expected time if this is the first station of a delayed train
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
  const departureTime = departure.departure?.expected || departure.departure?.aimed;
  const status = getDepartureStatus(departure);
  const route = getRouteText(departure);
  const station = getStationName(departure.station);
  const isBus = isBusReplacement(departure);
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

  // For delayed trains:
  // - First station: show scheduled (crossed out) + expected (new ETA)
  // - Other stations: show only scheduled (crossed out), no expected time
  // Otherwise, show expected time if available, or scheduled time
  const aimedTime = departure.departure?.aimed;
  const expectedTime = departure.departure?.expected;
  const isDelayed = category === 'delayed' && aimedTime && expectedTime;
  const shouldShowExpectedTime = isDelayed ? showExpectedTime : true; // Always show expected for non-delayed
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

