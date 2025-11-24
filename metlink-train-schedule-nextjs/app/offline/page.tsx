'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const cached = localStorage.getItem('departures:last-updated');
      setLastUpdated(cached);
    } catch {
      setLastUpdated(null);
    }
  }, []);

  const formattedTimestamp = lastUpdated
    ? new Date(lastUpdated).toLocaleString('en-NZ', {
        hour12: false,
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4">
      <div className="max-w-md border-2 border-black dark:border-white p-6 text-black dark:text-white space-y-4">
        <h1 className="text-2xl font-bold uppercase tracking-wider">You are offline</h1>
        <p className="text-sm text-black/80 dark:text-white/80">
          We&apos;ll keep showing the last departures we saved so you can continue planning. Once
          you reconnect, refresh the schedule to download the latest times.
        </p>
        <div className="rounded border border-dashed border-black/40 dark:border-white/40 px-3 py-2 text-xs">
          <p className="font-semibold uppercase tracking-wide text-black dark:text-white">
            Last cached update
          </p>
          <p className="text-black/70 dark:text-white/70">
            {formattedTimestamp ? formattedTimestamp : 'Not available yet'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/">Back to schedule</Link>
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

