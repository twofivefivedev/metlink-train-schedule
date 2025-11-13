/**
 * Tests for sort utilities
 */

import { sortDepartures } from '@/lib/utils/sortUtils';
import type { Departure } from '@/types';

describe('sortDepartures', () => {
  const mockDepartures: Departure[] = [
    {
      service_id: 'WRL',
      departure: {
        aimed: '2024-01-15T10:00:00Z',
      },
      station: 'FEAT',
    } as Departure,
    {
      service_id: 'WRL',
      departure: {
        aimed: '2024-01-15T09:00:00Z',
      },
      station: 'PETO',
    } as Departure,
    {
      service_id: 'WRL',
      departure: {
        aimed: '2024-01-15T11:00:00Z',
      },
      station: 'WELL',
    } as Departure,
  ];

  it('sorts by time ascending', () => {
    const sorted = sortDepartures(mockDepartures, 'time', 'asc');
    expect(sorted[0].departure?.aimed).toBe('2024-01-15T09:00:00Z');
    expect(sorted[2].departure?.aimed).toBe('2024-01-15T11:00:00Z');
  });

  it('sorts by time descending', () => {
    const sorted = sortDepartures(mockDepartures, 'time', 'desc');
    expect(sorted[0].departure?.aimed).toBe('2024-01-15T11:00:00Z');
    expect(sorted[2].departure?.aimed).toBe('2024-01-15T09:00:00Z');
  });

  it('sorts by station', () => {
    const sorted = sortDepartures(mockDepartures, 'station', 'asc');
    expect(sorted[0].station).toBe('FEAT');
    expect(sorted[1].station).toBe('PETO');
    expect(sorted[2].station).toBe('WELL');
  });
});


