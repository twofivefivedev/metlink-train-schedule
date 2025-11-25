/**
 * Basic test for DepartureBoard component
 */

import { render, screen } from '@testing-library/react';
import { DepartureBoard } from '@/components/DepartureBoard';
import type { Departure } from '@/types';

// Mock preferences context (DepartureBoard consumes usePreferences)
jest.mock('@/components/preferences-provider', () => ({
  usePreferences: () => ({
    preferences: {
      configs: [],
      favorites: [],
      alerts: {
        enabled: false,
        notifyOnDelay: true,
        notifyOnCancellation: true,
        notifyOnApproaching: false,
        approachingMinutes: 5,
      },
    },
    loading: false,
    hydrated: true,
    refresh: jest.fn().mockResolvedValue(undefined),
    syncFromStorage: jest.fn(),
    updatePreferences: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

// Mock useWaitTime hook to return a date matching the mock departure date
jest.mock('@/hooks/useWaitTime', () => ({
  useCurrentTime: () => new Date('2024-01-15T09:00:00Z'),
}));

describe('DepartureBoard', () => {
  const mockDepartures: Departure[] = [
    {
      service_id: 'WRL',
      departure: {
        aimed: '2024-01-15T10:00:00Z',
        expected: '2024-01-15T10:00:00Z',
      },
      destination: {
        name: 'Wellington',
      },
      station: 'FEAT',
    } as Departure,
  ];

  it('renders departure board with title', () => {
    render(
      <DepartureBoard
        departures={mockDepartures}
        direction="inbound"
        onDirectionToggle={jest.fn()}
        lastUpdated={new Date()}
        refreshing={false}
        onRefresh={jest.fn()}
      />
    );

    expect(
      screen.getByRole('heading', { name: /Trains from Masterton to Wellington/i })
    ).toBeInTheDocument();
  });

  it('displays departures when provided', () => {
    render(
      <DepartureBoard
        departures={mockDepartures}
        direction="inbound"
        onDirectionToggle={jest.fn()}
        lastUpdated={new Date()}
        refreshing={false}
        onRefresh={jest.fn()}
      />
    );

    expect(screen.getByText(/TIME/i)).toBeInTheDocument();
    expect(screen.getByText(/STATION/i)).toBeInTheDocument();
    expect(screen.getByText(/STATUS/i)).toBeInTheDocument();
  });

  it('shows empty state when no departures', () => {
    render(
      <DepartureBoard
        departures={[]}
        direction="inbound"
        onDirectionToggle={jest.fn()}
        lastUpdated={new Date()}
        refreshing={false}
        onRefresh={jest.fn()}
      />
    );

    expect(screen.getByText(/No trains scheduled at this time/i)).toBeInTheDocument();
  });
});




