import React from 'react';
import { Badge } from './ui/badge';
import {
  formatTime,
  getDepartureStatus,
  getStationName,
  getRouteText,
  isBusReplacement,
  getImportantNotices,
  getStatusCategory,
  getStatusColorClass,
} from '@/lib/utils/departureUtils';
import { cn } from '@/lib/utils';
import type { Departure } from '@/types';

interface DepartureRowProps {
  departure: Departure;
  isMobile?: boolean;
}

export function DepartureRow({ departure, isMobile = false }: DepartureRowProps) {
  const category = getStatusCategory(departure);
  // For delayed trains, show expected time instead of scheduled time
  const departureTime = category === 'delayed' && departure.departure?.expected
    ? departure.departure.expected
    : (departure.departure?.expected || departure.departure?.aimed);
  const status = getDepartureStatus(departure);
  const route = getRouteText(departure);
  const isBus = isBusReplacement(departure);
  const notices = getImportantNotices(departure);
  const statusColorClass = getStatusColorClass(category);

  if (isMobile) {
    return (
      <div className="border-b border-border p-4 last:border-b-0">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="font-semibold text-foreground text-base mb-1">
              {getStationName(departure.station).replace(' Station', '')}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${
              category === 'delayed' 
                ? statusColorClass 
                : 'text-foreground'
            }`}>
              {formatTime(departureTime)}
            </div>
            {departure.departure?.expected && (
              <div className="text-xs text-primary font-medium">Live</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', statusColorClass)}>
            {category === 'bus' 
              ? 'Bus Replacement'
              : category === 'delayed' && status.text.includes('Delayed') 
              ? (() => {
                  const delayMatch = status.text.match(/Delayed\s+(.+)/);
                  if (delayMatch) {
                    const delayAmount = delayMatch[1].replace(/(\d+)m/, '$1 mins');
                    return `Delayed (${delayAmount})`;
                  }
                  return status.text;
                })()
              : status.text}
          </span>
          {status.isRealTime && (
            <span className="w-2 h-2 bg-success rounded-full" aria-label="Real-time data" />
          )}
          {notices && notices.includes('Major delay') && (
            <span aria-label="Major delay">⚠️</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
        category === 'delayed' 
          ? statusColorClass 
          : 'text-foreground'
      }`}>
        <div>
        {formatTime(departureTime)}
        {departure.departure?.expected && (
          <span className="text-xs text-primary ml-2 font-medium">(Live)</span>
        )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
        {getStationName(departure.station).replace(' Station', '')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', statusColorClass)}>
            {category === 'bus' 
              ? 'Bus Replacement'
              : category === 'delayed' && status.text.includes('Delayed') 
              ? (() => {
                  const delayMatch = status.text.match(/Delayed\s+(.+)/);
                  if (delayMatch) {
                    const delayAmount = delayMatch[1].replace(/(\d+)m/, '$1 mins');
                    return `Delayed (${delayAmount})`;
                  }
                  return status.text;
                })()
              : status.text}
          </span>
          {status.isRealTime && (
            <span className="w-2 h-2 bg-success rounded-full" aria-label="Real-time data" />
          )}
          {notices && notices.includes('Major delay') && (
            <span aria-label="Major delay">⚠️</span>
          )}
        </div>
      </td>
    </tr>
  );
}

