import React from 'react';
import { Badge } from './ui/Badge';
import {
  formatTime,
  getDepartureStatus,
  getStationName,
  getRouteText,
  isBusReplacement,
  getImportantNotices,
} from '../utils/departureUtils';
import { cn } from '../lib/utils';

export function DepartureRow({ departure, isMobile = false }) {
  const departureTime = departure.departure?.expected || departure.departure?.aimed;
  const status = getDepartureStatus(departure);
  const route = getRouteText(departure);
  const isBus = isBusReplacement(departure);
  const notices = getImportantNotices(departure);

  if (isMobile) {
    return (
      <div className="border-b border-border p-4 last:border-b-0">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="font-semibold text-foreground text-base mb-1">
              {getStationName(departure.station)}
            </div>
            <div className="text-sm text-muted-foreground flex items-center">
              {isBus && <span className="mr-2">🚌</span>}
              {route}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-foreground">
              {formatTime(departureTime)}
            </div>
            {departure.departure?.expected && (
              <div className="text-xs text-primary font-medium">Live</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.color}>{status.text}</Badge>
          {status.isRealTime && (
            <span className="w-2 h-2 bg-success rounded-full" aria-label="Real-time data" />
          )}
          {isBus && <span aria-label="Bus replacement">🚌</span>}
          {notices && notices.includes('Major delay') && (
            <span aria-label="Major delay">⚠️</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
        {getStationName(departure.station)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-center">
        {isBus && <span className="mr-2">🚌</span>}
        {route}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
        {formatTime(departureTime)}
        {departure.departure?.expected && (
          <span className="text-xs text-primary ml-2 font-medium">(Live)</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
        <div className="flex items-center gap-2">
          <Badge variant={status.color}>{status.text}</Badge>
          {status.isRealTime && (
            <span className="w-2 h-2 bg-success rounded-full" aria-label="Real-time data" />
          )}
          {isBus && <span aria-label="Bus replacement">🚌</span>}
          {notices && notices.includes('Major delay') && (
            <span aria-label="Major delay">⚠️</span>
          )}
        </div>
      </td>
    </tr>
  );
}

