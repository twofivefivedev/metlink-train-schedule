'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

export interface PieDatum {
  name: string;
  value: number;
  color: string;
}

export function IncidentsPieChart({ data }: { data: PieDatum[] }) {
  if (data.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
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
  );
}

export interface BarDatum {
  date: string;
  cancelled: number;
  delayed: number;
  bus_replacement: number;
}

export function IncidentsBarChart({ data }: { data: BarDatum[] }) {
  if (data.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
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
        <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" />
        <Bar dataKey="delayed" name="Delayed" fill="#f59e0b" />
        <Bar dataKey="bus_replacement" name="Bus Replacement" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}

