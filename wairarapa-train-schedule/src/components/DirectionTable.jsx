import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { DepartureRow } from './DepartureRow';
import { getImportantNotices } from '../utils/departureUtils';
import { MAX_DEPARTURES } from '../config/constants';
import { cn } from '../lib/utils';

export function DirectionTable({ departures, title, description }) {
  const displayedDepartures = useMemo(
    () => departures.slice(0, MAX_DEPARTURES),
    [departures]
  );

  const notices = useMemo(() => {
    const allNotices = displayedDepartures
      .map(departure => getImportantNotices(departure))
      .filter(notice => notice && notice.trim().length > 0)
      .flatMap(notice => notice.split(', '));

    return [...new Set(allNotices)];
  }, [displayedDepartures]);

  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {displayedDepartures.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No trains scheduled at this time
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden">
                {displayedDepartures.map((departure, index) => (
                  <DepartureRow
                    key={`${departure.trip_id}-${index}`}
                    departure={departure}
                    isMobile={true}
                  />
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Station
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Route
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Departure Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {displayedDepartures.map((departure, index) => (
                      <DepartureRow
                        key={`${departure.trip_id}-${index}`}
                        departure={departure}
                        isMobile={false}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Service Notices */}
      {notices.length > 0 && (
        <Card className="mt-4 border-warning/50 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-warning-foreground">Service Notices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-warning-foreground">
              {notices.map((notice, index) => (
                <li key={index}>{notice}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

