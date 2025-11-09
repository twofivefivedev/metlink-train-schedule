import React from 'react';
import { useTrainSchedule } from '../hooks/useTrainSchedule';
import { DirectionTable } from './DirectionTable';
import { LoadingSkeleton } from './LoadingSkeleton';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';

const TrainSchedule = () => {
  const { departures, loading, refreshing, error, lastUpdated, refresh } = useTrainSchedule();

  if (loading && departures.inbound.length === 0 && departures.outbound.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      <div className="text-center mb-6 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2 md:mb-3">
          Wairarapa Train Schedule
        </h1>
        <p className="text-base md:text-lg text-muted-foreground mb-2">
          Real-time departures for Wellington, Petone, and Featherston
        </p>
        {lastUpdated && (
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
            {refreshing && <span className="ml-2 text-primary">(Refreshing...)</span>}
          </p>
        )}
      </div>

      <div className="text-center mb-6">
        <Button
          onClick={refresh}
          disabled={loading || refreshing}
          variant="default"
        >
          {loading || refreshing ? 'Refreshing...' : 'Refresh Schedule'}
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="text-destructive">
              <p className="font-semibold mb-2">{error.message}</p>
              <Button
                onClick={error.retry}
                variant="outline"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trains to Wellington */}
      <DirectionTable
        departures={departures.inbound}
        title="🚂 Trains to Wellington"
        description="From Masterton, Featherston and Petone to Wellington"
      />

      {/* Trains from Wellington */}
      <DirectionTable
        departures={departures.outbound}
        title="🚂 Trains from Wellington"
        description="From Wellington to Masterton via Petone and Featherston"
      />
    </div>
  );
};

export default TrainSchedule;
