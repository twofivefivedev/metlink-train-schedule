/**
 * Historical Trends Component
 * Displays analytics and trends for train departures
 */

'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OnTimePerformance {
  total: number;
  onTime: number;
  delayed: number;
  cancelled: number;
  averageDelay: number;
  onTimePercentage: number;
}

interface PerformanceStats {
  total: number;
  averageResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  statusCodes: Record<number, number>;
}

export function HistoricalTrends() {
  const [onTimePerformance, setOnTimePerformance] = useState<OnTimePerformance | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        
        // Fetch on-time performance for Wairarapa Line
        const onTimeResponse = await fetch('/api/analytics/on-time-performance?serviceId=WRL');
        if (onTimeResponse.ok) {
          const onTimeData = await onTimeResponse.json();
          if (onTimeData.success) {
            setOnTimePerformance(onTimeData.data);
          }
        }

        // Fetch performance stats
        const perfResponse = await fetch('/api/analytics/performance');
        if (perfResponse.ok) {
          const perfData = await perfResponse.json();
          if (perfData.success) {
            setPerformanceStats(perfData.data);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white p-6">
        <h2 className="font-bold text-lg uppercase mb-2">Loading Analytics</h2>
        <p className="text-black/80 dark:text-white/80">Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white p-6">
        <h2 className="font-bold text-lg uppercase mb-2">Error</h2>
        <p className="text-black/80 dark:text-white/80">{error}</p>
      </div>
    );
  }

  const chartData = onTimePerformance
    ? [
        { name: 'On Time', value: onTimePerformance.onTime },
        { name: 'Delayed', value: onTimePerformance.delayed },
        { name: 'Cancelled', value: onTimePerformance.cancelled },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* On-Time Performance Section */}
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
        <div className="p-6 border-b-2 border-black dark:border-white">
          <h2 className="font-bold text-lg uppercase mb-1">On-Time Performance</h2>
          <p className="text-black/80 dark:text-white/80 text-sm">Wairarapa Line statistics</p>
        </div>
        <div className="p-6">
          {onTimePerformance ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-3xl font-bold text-black dark:text-white">{onTimePerformance.onTimePercentage.toFixed(1)}%</div>
                  <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">On-Time Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-black dark:text-white">{onTimePerformance.total}</div>
                  <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">Total Departures</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-black dark:text-white">{onTimePerformance.delayed}</div>
                  <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">Delayed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-black dark:text-white">{onTimePerformance.averageDelay.toFixed(1)} min</div>
                  <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">Avg Delay</div>
                </div>
              </div>
              {chartData.length > 0 && (
                <div className="mt-6 [&_.recharts-cartesian-axis-tick_text]:fill-black [&_.recharts-cartesian-axis-tick_text]:dark:fill-white [&_.recharts-cartesian-grid_line]:stroke-black [&_.recharts-cartesian-grid_line]:dark:stroke-white [&_.recharts-line]:stroke-black [&_.recharts-line]:dark:stroke-white">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name"
                        tick={{ fill: 'currentColor' }}
                      />
                      <YAxis 
                        tick={{ fill: 'currentColor' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--background)', 
                          border: '2px solid var(--foreground)',
                          color: 'var(--foreground)'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="text-black/80 dark:text-white/80">No data available</div>
          )}
        </div>
      </div>

      {/* API Performance Section */}
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
        <div className="p-6 border-b-2 border-black dark:border-white">
          <h2 className="font-bold text-lg uppercase mb-1">API Performance</h2>
          <p className="text-black/80 dark:text-white/80 text-sm">System performance metrics</p>
        </div>
        <div className="p-6">
          {performanceStats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold text-black dark:text-white">{performanceStats.averageResponseTime.toFixed(0)}ms</div>
                <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">Avg Response Time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-black dark:text-white">{performanceStats.p95.toFixed(0)}ms</div>
                <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">P95 Response Time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-black dark:text-white">{performanceStats.errorRate.toFixed(1)}%</div>
                <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">Error Rate</div>
              </div>
            </div>
          ) : (
            <div className="text-black/80 dark:text-white/80">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}

