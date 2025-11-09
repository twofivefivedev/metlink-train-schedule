'use client';

import { useState } from 'react';
import { useTrainSchedule } from '@/hooks/useTrainSchedule';
import { DepartureBoard } from '@/components/DepartureBoard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const { departures, loading, refreshing, error, lastUpdated, refresh } = useTrainSchedule();
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound');

  const toggleDirection = () => {
    setDirection(prev => prev === 'inbound' ? 'outbound' : 'inbound');
  };

  const currentDepartures = direction === 'inbound' ? departures.inbound : departures.outbound;

  if (loading && departures.inbound.length === 0 && departures.outbound.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white">
      {error && (
        <div className="bg-white border-2 border-black text-black p-6 m-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg uppercase mb-2">Error</p>
              <p className="text-black/80">{error.message}</p>
            </div>
            <Button
              onClick={error.retry}
              variant="outline"
              size="sm"
              className="bg-white border-2 border-black text-black hover:bg-black hover:text-white transition-colors font-semibold uppercase"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      <DepartureBoard
        departures={currentDepartures}
        direction={direction}
        onDirectionToggle={toggleDirection}
        lastUpdated={lastUpdated}
        refreshing={refreshing}
        onRefresh={refresh}
      />
    </div>
  );
}
