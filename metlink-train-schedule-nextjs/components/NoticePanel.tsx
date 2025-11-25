/**
 * Notice Panel Component
 * Displays detailed service notice information for selected departures
 */

import { AlertTriangle } from 'lucide-react';
import { getStationName } from '@/lib/utils/departureUtils';
import { getStatusColorClass, isBusReplacement, type StatusCategory } from '@/lib/utils/departureUtils';
import type { Departure } from '@/types';

interface NoticePanelProps {
  departure: Departure;
  message: string;
  category: StatusCategory;
  onClose?: () => void;
}

export function NoticePanel({ departure, message, category }: NoticePanelProps) {
  const sanitizeStationLabel = (value?: string | null) => {
    if (!value) {
      return null;
    }
    return value.replace(/ - Stop [A-Z]$/i, '').replace(/\s+Station$/i, '').trim();
  };

  const getNoticeSegment = (): string | null => {
    if (departure.disruption?.lineSegment) {
      return departure.disruption.lineSegment;
    }
    const originCode = departure.station || departure.origin?.stop_id;
    const originName = originCode
      ? sanitizeStationLabel(getStationName(originCode))
      : sanitizeStationLabel(departure.origin?.name);
    const destinationName = sanitizeStationLabel(departure.destination?.name);

    if (originName && destinationName) {
      if (originName === destinationName) {
        return originName;
      }
      return `${originName} → ${destinationName}`;
    }

    return originName ?? destinationName ?? null;
  };

  const formatNoticeEta = (value: string | null) => {
    if (!value) {
      return 'TBD';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'TBD';
    }
    return date.toLocaleTimeString('en-NZ', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const resolutionEta =
    departure.disruption?.resolutionEta ||
    departure.departure?.expected ||
    departure.departure?.aimed ||
    null;

  const cause = departure.disruption?.cause || message || departure.status || null;
  const segment = getNoticeSegment();
  const impactedStations = departure.disruption?.impactedStations || [];
  const replacementMode =
    departure.disruption?.replacement?.mode ||
    (isBusReplacement(departure) ? 'Bus replacement' : null);
  const replacementOperator =
    departure.disruption?.replacement?.operator || departure.operator || null;

  return (
    <div className="bg-white dark:bg-black border-2 border-black dark:border-white px-4 sm:px-8 py-4 sm:py-6">
      <h2 id="service-notice-heading" className="text-sm font-semibold uppercase tracking-wider mb-3">
        Service Notice
      </h2>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-5 w-5 ${getStatusColorClass(category)}`} aria-hidden="true" />
          <p className={`text-lg font-bold ${getStatusColorClass(category)}`}>
            {message.toUpperCase()}
          </p>
        </div>
        <ul className="space-y-3 text-sm text-black dark:text-white">
          <li>
            <p className="text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">
              Cause
            </p>
            <p className="mt-1">
              {cause || 'Investigating issue'}
            </p>
          </li>
          <li>
            <p className="text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">
              Resolution ETA
            </p>
            <p className="mt-1">
              {formatNoticeEta(resolutionEta)}
            </p>
          </li>
          <li>
            <p className="text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">
              Affected Segment
            </p>
            <p className="mt-1">
              {segment || getStationName(departure.station).replace(' Station', '')}
            </p>
            {impactedStations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {impactedStations.slice(0, 6).map((stationCode) => {
                  const label =
                    sanitizeStationLabel(getStationName(stationCode)) || stationCode;
                  return (
                    <span
                      key={stationCode}
                      className="rounded-full border border-black/20 dark:border-white/30 px-2 py-0.5 text-xs uppercase tracking-wide"
                    >
                      {label}
                    </span>
                  );
                })}
                {impactedStations.length > 6 && (
                  <span className="text-xs text-black/60 dark:text-white/60">
                    +{impactedStations.length - 6} more
                  </span>
                )}
              </div>
            )}
          </li>
          <li>
            <p className="text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">
              Replacement Mode
            </p>
            <p className="mt-1">
              {replacementMode || 'Standard service'}
            </p>
            {replacementOperator && (
              <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                Operator: {replacementOperator}
              </p>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}

