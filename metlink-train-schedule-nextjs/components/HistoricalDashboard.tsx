/**
 * Historical Dashboard Component
 * Displays historical departure data with filtering and visualization
 */

'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { type LineCode } from '@/lib/constants';

interface HistoricalDeparture {
  id: string;
  serviceId: string;
  stopId: string;
  station: string | null;
  destination: string;
  aimedTime: string;
  expectedTime: string | null;
  status: string | null;
  createdAt: string;
}

export function HistoricalDashboard() {
  const [data, setData] = useState<HistoricalDeparture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<LineCode>('WRL');
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [days, setDays] = useState(7);
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    async function fetchHistoricalData() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (selectedService) {
          params.append('serviceId', selectedService);
        }
        if (selectedStation) {
          params.append('station', selectedStation);
        }
        if (days) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          params.append('startDate', startDate.toISOString());
        }
        params.append('limit', limit.toString());

        const response = await fetch(`/api/analytics/historical?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
          setData(result.data.departures || []);
        } else {
          throw new Error(result.error?.message || 'Failed to fetch historical data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load historical data');
      } finally {
        setLoading(false);
      }
    }

    fetchHistoricalData();
  }, [selectedService, selectedStation, days, limit]);

  // Process data for charts
  const processChartData = () => {
    const dateMap = new Map<string, { date: string; count: number; delayed: number; onTime: number }>();

    data.forEach((dep) => {
      const date = new Date(dep.aimedTime).toLocaleDateString();
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, count: 0, delayed: 0, onTime: 0 });
      }
      const entry = dateMap.get(date)!;
      entry.count++;
      
      if (dep.expectedTime && dep.aimedTime) {
        const expected = new Date(dep.expectedTime).getTime();
        const aimed = new Date(dep.aimedTime).getTime();
        const delayMinutes = (expected - aimed) / (1000 * 60);
        if (delayMinutes > 2) {
          entry.delayed++;
        } else {
          entry.onTime++;
        }
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const chartData = processChartData();

  // Get unique stations from data
  const uniqueStations = Array.from(new Set(data.map(d => d.station).filter(Boolean))) as string[];

  // Calculate statistics
  const totalDepartures = data.length;
  const delayedCount = data.filter(d => {
    if (!d.expectedTime || !d.aimedTime) return false;
    const expected = new Date(d.expectedTime).getTime();
    const aimed = new Date(d.aimedTime).getTime();
    return (expected - aimed) / (1000 * 60) > 2;
  }).length;
  const onTimeCount = totalDepartures - delayedCount;
  const onTimePercentage = totalDepartures > 0 ? (onTimeCount / totalDepartures) * 100 : 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white p-6">
        <h2 className="font-bold text-lg uppercase mb-2">Loading Historical Data</h2>
        <p className="text-black/80 dark:text-white/80">Loading historical departure data...</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold uppercase mb-2 text-black dark:text-white">
                Service Line
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value as LineCode)}
                className="w-full bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white p-2 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
              >
                <option value="WRL">Wairarapa Line</option>
                <option value="KPL">Kapiti Line</option>
                <option value="HVL">Hutt Valley Line</option>
                <option value="JVL">Johnsonville Line</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase mb-2 text-black dark:text-white">
                Station
              </label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="w-full bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white p-2 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
              >
                <option value="">All Stations</option>
                {uniqueStations.map((station) => (
                  <option key={station} value={station}>
                    {station}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase mb-2 text-black dark:text-white">
                Days
              </label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 7)}
                min={1}
                max={365}
                className="w-full bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white p-2 font-mono focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold uppercase mb-2 text-black dark:text-white">
                Limit
              </label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                min={10}
                max={10000}
                className="w-full bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white p-2 font-mono focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
        <div className="p-6 border-b-2 border-black dark:border-white">
          <h2 className="font-bold text-lg uppercase mb-1">Statistics</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-3xl font-bold text-black dark:text-white">{totalDepartures}</div>
              <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">Total Departures</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-black dark:text-white">{onTimeCount}</div>
              <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">On-Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-black dark:text-white">{delayedCount}</div>
              <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">Delayed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-black dark:text-white">{onTimePercentage.toFixed(1)}%</div>
              <div className="text-sm text-black/80 dark:text-white/80 uppercase mt-1">On-Time Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {chartData.length > 0 && (
        <>
          <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
            <div className="p-6 border-b-2 border-black dark:border-white">
              <h2 className="font-bold text-lg uppercase mb-1">Departures Over Time</h2>
            </div>
            <div className="p-6 [&_.recharts-cartesian-axis-tick_text]:fill-black [&_.recharts-cartesian-axis-tick_text]:dark:fill-white [&_.recharts-cartesian-grid_line]:stroke-black [&_.recharts-cartesian-grid_line]:dark:stroke-white [&_.recharts-line]:stroke-black [&_.recharts-line]:dark:stroke-white">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
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
                    dataKey="count" 
                    strokeWidth={2}
                    name="Total Departures"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
            <div className="p-6 border-b-2 border-black dark:border-white">
              <h2 className="font-bold text-lg uppercase mb-1">On-Time vs Delayed</h2>
            </div>
            <div className="p-6 [&_.recharts-cartesian-axis-tick_text]:fill-black [&_.recharts-cartesian-axis-tick_text]:dark:fill-white [&_.recharts-cartesian-grid_line]:stroke-black [&_.recharts-cartesian-grid_line]:dark:stroke-white [&_.recharts-bar]:fill-black [&_.recharts-bar]:dark:fill-white">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
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
                  <Bar dataKey="onTime" name="On-Time" fill="currentColor" />
                  <Bar dataKey="delayed" name="Delayed" fill="currentColor" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Data Table Section */}
      {data.length > 0 && (
        <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white">
          <div className="p-6 border-b-2 border-black dark:border-white">
            <h2 className="font-bold text-lg uppercase mb-1">Recent Departures</h2>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black dark:border-white">
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Date</th>
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Station</th>
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Destination</th>
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Aimed</th>
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Expected</th>
                  <th className="text-left p-2 font-bold uppercase text-black dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 50).map((dep) => {
                  const aimed = new Date(dep.aimedTime);
                  const expected = dep.expectedTime ? new Date(dep.expectedTime) : null;
                  const delayMinutes = expected && aimed 
                    ? Math.round((expected.getTime() - aimed.getTime()) / (1000 * 60))
                    : null;
                  
                  return (
                    <tr key={dep.id} className="border-b border-black/20 dark:border-white/20">
                      <td className="p-2 text-black/80 dark:text-white/80 font-mono text-sm">
                        {aimed.toLocaleDateString()}
                      </td>
                      <td className="p-2 text-black/80 dark:text-white/80 font-mono text-sm">
                        {dep.station || 'N/A'}
                      </td>
                      <td className="p-2 text-black/80 dark:text-white/80 font-mono text-sm">
                        {dep.destination}
                      </td>
                      <td className="p-2 text-black/80 dark:text-white/80 font-mono text-sm">
                        {aimed.toLocaleTimeString()}
                      </td>
                      <td className="p-2 text-black/80 dark:text-white/80 font-mono text-sm">
                        {expected ? expected.toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="p-2 text-black/80 dark:text-white/80 font-mono text-sm">
                        {delayMinutes !== null 
                          ? delayMinutes > 0 
                            ? `+${delayMinutes}m`
                            : delayMinutes < 0
                            ? `${delayMinutes}m`
                            : 'On time'
                          : dep.status || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.length === 0 && !loading && (
        <div className="bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white p-6">
          <p className="text-black/80 dark:text-white/80">No historical data available for the selected filters.</p>
        </div>
      )}
    </div>
  );
}

