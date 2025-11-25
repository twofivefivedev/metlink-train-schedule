/**
 * Wait Time Card Component
 * Displays the next train wait time
 */

import { Clock } from 'lucide-react';

interface WaitTimeCardProps {
  minutes: number;
  station: string;
}

export function WaitTimeCard({ minutes, station }: WaitTimeCardProps) {
  return (
    <div className="bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white px-4 sm:px-8 py-4 sm:py-6">
      <div className="flex items-center gap-4">
        <Clock className="h-6 w-6" aria-hidden="true" />
        <div>
          <h2 id="wait-time-heading" className="text-sm font-semibold uppercase tracking-wider mb-1">
            Next Train In - {station.replace(' Station', '')}
          </h2>
          <p className="text-3xl font-bold" aria-live="polite">
            {minutes === 0 
              ? 'Now' 
              : minutes === 1 
                ? '1 minute' 
                : `${minutes} minutes`}
          </p>
        </div>
      </div>
    </div>
  );
}

