/**
 * Tests for departure utility functions
 */

import { calculateWaitTime } from '@/lib/utils/departureUtils';
import type { Departure } from '@/types';

describe('calculateWaitTime', () => {
  const baseDeparture: Departure = {
    service_id: 'WRL',
    destination: {
      stop_id: 'WELL',
      name: 'Wellington',
    },
    departure: {
      aimed: '2024-01-01T10:00:00Z',
      expected: '2024-01-01T10:00:00Z',
    },
  };

  it('should return correct wait time for future departure', () => {
    const currentTime = new Date('2024-01-01T09:55:00Z'); // 5 minutes before
    const result = calculateWaitTime(baseDeparture, currentTime);
    
    expect(result.minutes).toBe(5);
    expect(result.displayText).toBe('5 minutes');
  });

  it('should return "Now" for departure happening now', () => {
    const currentTime = new Date('2024-01-01T10:00:00Z');
    const result = calculateWaitTime(baseDeparture, currentTime);
    
    expect(result.minutes).toBe(0);
    expect(result.displayText).toBe('Now');
  });

  it('should return "1 minute" for single minute wait', () => {
    const currentTime = new Date('2024-01-01T09:59:00Z');
    const result = calculateWaitTime(baseDeparture, currentTime);
    
    expect(result.minutes).toBe(1);
    expect(result.displayText).toBe('1 minute');
  });

  it('should return null for past departure', () => {
    const currentTime = new Date('2024-01-01T10:05:00Z'); // 5 minutes after
    const result = calculateWaitTime(baseDeparture, currentTime);
    
    expect(result.minutes).toBe(null);
    expect(result.displayText).toBe('Departed');
  });

  it('should return null for cancelled departure', () => {
    const cancelledDeparture: Departure = {
      ...baseDeparture,
      status: 'cancelled',
    };
    const currentTime = new Date('2024-01-01T09:55:00Z');
    const result = calculateWaitTime(cancelledDeparture, currentTime);
    
    expect(result.minutes).toBe(null);
    expect(result.displayText).toBe('Cancelled');
  });

  it('should use expected time when available', () => {
    const departure: Departure = {
      ...baseDeparture,
      departure: {
        aimed: '2024-01-01T10:00:00Z',
        expected: '2024-01-01T10:05:00Z', // 5 minutes delay
      },
    };
    const currentTime = new Date('2024-01-01T10:00:00Z');
    const result = calculateWaitTime(departure, currentTime);
    
    expect(result.minutes).toBe(5);
    expect(result.displayText).toBe('5 minutes');
  });

  it('should fallback to aimed time when expected is not available', () => {
    const departure: Departure = {
      ...baseDeparture,
      departure: {
        aimed: '2024-01-01T10:00:00Z',
      },
    };
    const currentTime = new Date('2024-01-01T09:55:00Z');
    const result = calculateWaitTime(departure, currentTime);
    
    expect(result.minutes).toBe(5);
    expect(result.displayText).toBe('5 minutes');
  });

  it('should return null when no departure time is available', () => {
    const departure: Departure = {
      ...baseDeparture,
      departure: {},
    };
    const currentTime = new Date('2024-01-01T09:55:00Z');
    const result = calculateWaitTime(departure, currentTime);
    
    expect(result.minutes).toBe(null);
    expect(result.displayText).toBe('Time unknown');
  });

  it('should handle "canceled" status (alternative spelling)', () => {
    const cancelledDeparture: Departure = {
      ...baseDeparture,
      status: 'canceled',
    };
    const currentTime = new Date('2024-01-01T09:55:00Z');
    const result = calculateWaitTime(cancelledDeparture, currentTime);
    
    expect(result.minutes).toBe(null);
    expect(result.displayText).toBe('Cancelled');
  });
});

