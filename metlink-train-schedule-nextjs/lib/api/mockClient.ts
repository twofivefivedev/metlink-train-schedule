/**
 * Mock API client for testing alerts and announcements
 * Returns mock data instead of calling the real API
 */

import { generateMockDeparturesResponse, generateMockStationDepartures, type MockScenario } from '@/lib/utils/mockData';
import type { ApiResponse, DeparturesResponse, StationDeparturesResponse } from '@/types';
import type { LineCode } from '@/lib/constants';

/**
 * Get mock scenario from URL query parameter or default
 */
function getMockScenario(): MockScenario {
  if (typeof window === 'undefined') {
    return 'normal';
  }
  
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get('mockScenario') as MockScenario;
  
  if (scenario && ['cancelled', 'delayed', 'approaching', 'normal', 'bus-replacement'].includes(scenario)) {
    return scenario;
  }
  
  return 'normal';
}

/**
 * Simulate API delay for realistic testing
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get all departures for a specific line (mock)
 */
export async function getLineDeparturesMock(
  line: string = 'WRL',
  stations?: string[]
): Promise<ApiResponse<DeparturesResponse>> {
  // Simulate network delay
  await delay(200);
  
  const scenario = getMockScenario();
  
  // Debug: log scenario being used
  if (typeof console !== 'undefined') {
    console.log('[Mock Client] Using scenario:', scenario);
  }
  
  const mockData = generateMockDeparturesResponse({
    line: line as LineCode,
    stations,
    scenario,
  });

  // Debug: log delayed trains in the response
  if (typeof console !== 'undefined' && scenario === 'delayed') {
    const delayedTrains = [...mockData.inbound, ...mockData.outbound].filter(dep => {
      const status = (dep as unknown as { status?: string }).status;
      return status === 'delayed';
    });
    console.log('[Mock Client] Delayed trains found:', delayedTrains.length, delayedTrains.slice(0, 2));
  }

  return {
    success: true,
    data: mockData,
    meta: {
      cached: false,
    },
  };
}

/**
 * Get departures for a specific station (mock)
 */
export async function getStationDeparturesMock(
  stationId: string,
  line?: string
): Promise<ApiResponse<StationDeparturesResponse>> {
  // Simulate network delay
  await delay(150);
  
  const scenario = getMockScenario();
  const mockData = generateMockStationDepartures(
    stationId,
    (line || 'WRL') as LineCode,
    scenario
  );

  return {
    success: true,
    data: {
      station: stationId,
      departures: mockData,
      total: mockData.length,
    },
    meta: {
      cached: false,
    },
  };
}

/**
 * Health check (mock)
 */
export async function healthCheckMock(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
  await delay(50);
  
  return {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  };
}

