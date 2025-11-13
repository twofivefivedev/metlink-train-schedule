/**
 * Incidents Dashboard Component
 * Displays service incidents (cancellations, delays, bus replacements) analytics
 */

'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

export function IncidentsDashboard() {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [selectedLine, setSelectedLine] = useState<LineCode>('WRL');

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

  const pieData = summary
    ? [
        { name: 'Cancelled', value: summary.cancelled, color: COLORS.cancelled },
        { name: 'Delayed', value: summary.delayed, color: COLORS.delayed },
        { name: 'Bus Replacement', value: summary.busReplacement, color: COLORS.bus_replacement },
      ].filter((item) => item.value > 0)
    : [];

  // Group incidents by date for chart
  const incidentsByDate = recentIncidents.reduce((acc, incident) => {
    const date = new Date(incident.createdAt).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, cancelled: 0, delayed: 0, bus_replacement: 0 };
    }
    acc[date][incident.incidentType]++;
    return acc;
  }, {} as Record<string, { date: string; cancelled: number; delayed: number; bus_replacement: number }>);

  const chartData = Object.values(incidentsByDate).sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

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
              <LineSelector selectedLine={selectedLine} onLineChange={setSelectedLine} />
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase mb-2 text-black dark:text-white">
                Time Range
              </label>
              <div className="flex gap-2">
                {(['24h', '7d', '30d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
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
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--background)',
                          border: '2px solid var(--foreground)',
                          color: 'var(--foreground)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: 'currentColor' }} />
                <YAxis tick={{ fill: 'currentColor' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '2px solid var(--foreground)',
                    color: 'var(--foreground)',
                  }}
                />
                <Legend />
                <Bar dataKey="cancelled" name="Cancelled" fill={COLORS.cancelled} />
                <Bar dataKey="delayed" name="Delayed" fill={COLORS.delayed} />
                <Bar dataKey="bus_replacement" name="Bus Replacement" fill={COLORS.bus_replacement} />
              </BarChart>
            </ResponsiveContainer>
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

