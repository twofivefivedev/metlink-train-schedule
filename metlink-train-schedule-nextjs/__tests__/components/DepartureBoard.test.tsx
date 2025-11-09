/**
 * Basic test for DepartureBoard component
 */

import { render, screen } from '@testing-library/react';
import { DepartureBoard } from '@/components/DepartureBoard';
import type { Departure } from '@/types';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
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

    expect(screen.getByText(/TRAINS TO WELLINGTON/i)).toBeInTheDocument();
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
    expect(screen.getByText(/DESTINATION/i)).toBeInTheDocument();
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

