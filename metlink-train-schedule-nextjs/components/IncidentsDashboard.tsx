/**
 * Incidents Dashboard Component
 * Displays service incidents (cancellations, delays, bus replacements) analytics
 */

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LineSelector } from './LineSelector';
import { LINE_NAMES } from '@/lib/constants';
import type { LineCode } from '@/lib/constants';

interface IncidentSummary {
  total: number;
  cancelled: number;
  delayed: number;
  busReplacement: number;
  byType: {
    cancelled: number;
    delayed: number;
    bus_replacement: number;
  };
}

interface Incident {
  id: string;
  serviceId: string;
  stopId: string;
  station: string | null;
  destination: string;
  aimedTime: string;
  expectedTime: string | null;
  incidentType: 'cancelled' | 'delayed' | 'bus_replacement';
  delayMinutes: number | null;
  details: Record<string, unknown> | null;
  createdAt: string;
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

const COLORS = {
  cancelled: '#ef4444',
  delayed: '#f59e0b',
  bus_replacement: '#3b82f6',
};

const IncidentsPieChart = dynamic(
  () =>
    import('./IncidentsCharts').then((mod) => mod.IncidentsPieChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

const IncidentsBarChart = dynamic(
  () =>
    import('./IncidentsCharts').then((mod) => mod.IncidentsBarChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

function ChartSkeleton() {
  return (
    <div className="h-[300px] w-full border-2 border-dashed border-black/30 dark:border-white/30 bg-black/5 dark:bg-white/10" />
  );
}

// Load preferences from localStorage
function loadPreferences(): { line: LineCode; timeRange: '24h' | '7d' | '30d' } {
  if (typeof window === 'undefined') {
    return { line: 'WRL', timeRange: '7d' };
  }
  
  try {
    const stored = localStorage.getItem('analytics-preferences');
    if (stored) {
      const prefs = JSON.parse(stored);
      return {
        line: prefs.line || 'WRL',
        timeRange: prefs.timeRange || '7d',
      };
    }
  } catch (error) {
    // Ignore parse errors
  }
  
  return { line: 'WRL', timeRange: '7d' };
}

// Save preferences to localStorage
function savePreferences(line: LineCode, timeRange: '24h' | '7d' | '30d'): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem('analytics-preferences', JSON.stringify({ line, timeRange }));
  } catch (error) {
    // Ignore storage errors
  }
}

export function IncidentsDashboard() {
  // Load preferences in useState initializer (runs once on mount)
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>(() => {
    const prefs = loadPreferences();
    return prefs.timeRange;
  });
  const [selectedLine, setSelectedLine] = useState<LineCode>(() => {
    const prefs = loadPreferences();
    return prefs.line;
  });

  // Memoized handlers
  const handleTimeRangeChange = useCallback((range: '24h' | '7d' | '30d') => {
    setTimeRange(range);
    savePreferences(selectedLine, range);
  }, [selectedLine]);

  const handleLineChange = useCallback((line: LineCode) => {
    setSelectedLine(line);
    savePreferences(line, timeRange);
  }, [timeRange]);

  // Memoized computed values (must be before conditional returns)
  const pieData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'Cancelled', value: summary.cancelled, color: COLORS.cancelled },
      { name: 'Delayed', value: summary.delayed, color: COLORS.delayed },
      { name: 'Bus Replacement', value: summary.busReplacement, color: COLORS.bus_replacement },
    ].filter((item) => item.value > 0);
  }, [summary]);

  const chartData = useMemo(() => {
    const incidentsByDate = recentIncidents.reduce((acc, incident) => {
      const date = new Date(incident.createdAt).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, cancelled: 0, delayed: 0, bus_replacement: 0 };
      }
      acc[date][incident.incidentType]++;
      return acc;
    }, {} as Record<string, { date: string; cancelled: number; delayed: number; bus_replacement: number }>);

    return Object.values(incidentsByDate).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [recentIncidents]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        switch (timeRange) {
          case '24h':
            startDate.setHours(startDate.getHours() - 24);
            break;
          case '7d':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(startDate.getDate() - 30);
            break;
        }

        // Fetch incidents summary
        const summaryParams = new URLSearchParams({
          serviceId: selectedLine,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });
        const summaryResponse = await fetch(`/api/analytics/incidents/summary?${summaryParams.toString()}`);
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          if (summaryData.success) {
            setSummary(summaryData.data);
          }
        }

        // Fetch recent incidents
        const recentParams = new URLSearchParams({
          serviceId: selectedLine,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: '50',
        });
        const recentResponse = await fetch(`/api/analytics/incidents/recent?${recentParams.toString()}`);
        if (recentResponse.ok) {
          const recentData = await recentResponse.json();
          if (recentData.success) {
            setRecentIncidents(recentData.data.incidents || []);
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

    fetchData();
  }, [timeRange, selectedLine]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white p-6">
        <h2 className="font-bold text-lg uppercase mb-2">Loading Analytics</h2>
        <p className="text-black/80 dark:text-white/80">Loading incidents data...</p>
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

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
        <div className="p-6 border-b-2 border-black dark:border-white">
          <h2 className="font-bold text-lg uppercase mb-1">Filters</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <LineSelector selectedLine={selectedLine} onLineChange={handleLineChange} />
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase mb-2 text-black dark:text-white">
                Time Range
              </label>
              <div className="flex gap-2">
                {(['24h', '7d', '30d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => handleTimeRangeChange(range)}
                    className={`px-4 py-2 border-2 border-black dark:border-white font-semibold uppercase transition-colors ${
                      timeRange === range
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-white dark:bg-black text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black'
                    }`}
                  >
                    {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
        <div className="p-6 border-b-2 border-black dark:border-white">
          <h2 className="font-bold text-lg uppercase mb-1">Incidents Summary</h2>
          <p className="text-black/80 dark:text-white/80 text-sm">
            {LINE_NAMES[selectedLine]} - Last {timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days'}
          </p>
        </div>
        <div className="p-6">
          {summary ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-3xl font-bold text-black dark:text-white">{summary.total}</div>
                  <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">Total Incidents</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{summary.cancelled}</div>
                  <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">Cancelled</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{summary.delayed}</div>
                  <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">Delayed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{summary.busReplacement}</div>
                  <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">Bus Replacement</div>
                </div>
              </div>

              {pieData.length > 0 && (
                <div className="mt-6 [&_.recharts-cartesian-axis-tick_text]:fill-black [&_.recharts-cartesian-axis-tick_text]:dark:fill-white">
                  <IncidentsPieChart data={pieData} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-black/80 dark:text-white/80">No data available</div>
          )}
        </div>
      </div>

      {/* Incidents Over Time Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
          <div className="p-6 border-b-2 border-black dark:border-white">
            <h2 className="font-bold text-lg uppercase mb-1">Incidents Over Time</h2>
          </div>
          <div className="p-6 [&_.recharts-cartesian-axis-tick_text]:fill-black [&_.recharts-cartesian-axis-tick_text]:dark:fill-white [&_.recharts-cartesian-grid_line]:stroke-black [&_.recharts-cartesian-grid_line]:dark:stroke-white">
            <IncidentsBarChart data={chartData} />
          </div>
        </div>
      )}

      {/* Recent Incidents Table */}
      {recentIncidents.length > 0 && (
        <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
          <div className="p-6 border-b-2 border-black dark:border-white">
            <h2 className="font-bold text-lg uppercase mb-1">Recent Incidents</h2>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black dark:border-white">
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Date</th>
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Type</th>
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Station</th>
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Destination</th>
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Aimed</th>
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Delay</th>
                </tr>
              </thead>
              <tbody>
                {recentIncidents.slice(0, 50).map((incident) => {
                  const aimed = new Date(incident.aimedTime);
                  const typeColor =
                    incident.incidentType === 'cancelled'
                      ? 'text-red-600 dark:text-red-400'
                      : incident.incidentType === 'delayed'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-blue-600 dark:text-blue-400';

                  return (
                    <tr key={incident.id} className="border-b border-black/20 dark:border-white/20">
                      <td className="p-2 text-black/80 dark:text-white/80 font-mono text-sm">
                        {aimed.toLocaleDateString()}
                      </td>
                      <td className={`p-2 font-mono text-sm font-semibold ${typeColor}`}>
                        {incident.incidentType === 'cancelled'
                          ? 'CANCELLED'
                          : incident.incidentType === 'delayed'
                          ? 'DELAYED'
                          : 'BUS REPLACEMENT'}
                      </td>
                      <td className="p-2 text-black/80 dark:text-white/80 font-mono text-sm">
                        {incident.station || 'N/A'}
                      </td>
                      <td className="p-2 text-black/80 dark:text-white/80 font-mono text-sm">
                        {incident.destination}
                      </td>
                      <td className="p-2 text-black/80 dark:text-white/80 font-mono text-sm">
                        {aimed.toLocaleTimeString()}
                      </td>
                      <td className="p-2 text-black/80 dark:text-white/80 font-mono text-sm">
                        {incident.delayMinutes !== null ? `+${incident.delayMinutes}m` : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {!summary && recentIncidents.length === 0 && (
        <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white p-6">
          <p className="text-black/80 dark:text-white/80">No incidents data available for the selected time range.</p>
        </div>
      )}
    </div>
  );
}

