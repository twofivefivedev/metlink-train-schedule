/**
 * Mock data generator for testing alerts and announcements
 * Generates realistic departure data with various alert scenarios
 */

import type { Departure, DeparturesResponse } from '@/types';
import { LINE_STATIONS, STATION_NAMES, SERVICE_IDS } from '@/lib/constants';
import type { LineCode } from '@/lib/constants';

export type MockScenario = 
  | 'cancelled' 
  | 'delayed' 
  | 'approaching' 
  | 'multiple' 
  | 'normal' 
  | 'bus-replacement';

interface MockDataOptions {
  line?: LineCode;
  stations?: string[];
  scenario?: MockScenario;
  baseTime?: Date;
}

/**
 * Generate a mock departure with configurable properties
 */
interface MockDepartureOptions {
  cancelled?: boolean;
  delayed?: boolean;
  delayMinutes?: number;
  approaching?: boolean;
  busReplacement?: boolean;
}

function createMockDeparture(
  station: string,
  serviceId: string,
  direction: 'inbound' | 'outbound',
  minutesFromNow: number,
  options: MockDepartureOptions = {}
): Departure {
  const now = new Date();
  const departureTime = new Date(now.getTime() + minutesFromNow * 60 * 1000);
  
  // Determine destination based on direction and line
  let destination: { stop_id: string; name: string };
  if (direction === 'inbound') {
    destination = { stop_id: 'WELL', name: 'Wellington Station' };
  } else {
    // Outbound: destination depends on line
    // serviceId is the line code (WRL, KPL, HVL, JVL)
    if (serviceId === 'WRL' || serviceId === SERVICE_IDS.WAIRARAPA_LINE) {
      destination = { stop_id: 'MAST', name: 'Masterton Station' };
    } else if (serviceId === 'KPL' || serviceId === SERVICE_IDS.KAPITI_LINE) {
      destination = { stop_id: 'WAIK', name: 'Waikanae Station' };
    } else if (serviceId === 'HVL' || serviceId === SERVICE_IDS.HUTT_VALLEY_LINE) {
      destination = { stop_id: 'UPPE', name: 'Upper Hutt Station' };
    } else {
      // Default for JVL or unknown
      destination = { stop_id: 'MAST', name: 'Masterton Station' };
    }
  }

  const departure: Departure = {
    service_id: serviceId,
    destination,
    departure: {
      aimed: departureTime.toISOString(),
      expected: options.delayed 
        ? new Date(departureTime.getTime() + (options.delayMinutes || 15) * 60 * 1000).toISOString()
        : departureTime.toISOString(),
    },
    stop_id: station,
    station,
  };

  // Add cancellation status
  if (options.cancelled) {
    (departure as unknown as { status: string }).status = 'canceled';
  }

  // Add delay information
  if (options.delayed && !options.cancelled) {
    const delayMinutes = options.delayMinutes || 15;
    (departure as unknown as { delay: string }).delay = `PT${delayMinutes}M`;
    (departure as unknown as { status: string }).status = 'delayed';
  }

  // Add bus replacement
  if (options.busReplacement) {
    departure.destination.name = 'Bus replacement service';
    (departure as unknown as { operator: string }).operator = 'bus';
  }

  return departure;
}

/**
 * Generate mock departures based on scenario
 */
function generateMockDepartures(
  line: LineCode,
  stations: string[],
  scenario: MockScenario,
  baseTime: Date = new Date()
): Departure[] {
  const departures: Departure[] = [];
  // Use line code directly as service_id (WRL, KPL, HVL, JVL)
  const serviceId = line;
  
  // Generate departures for each station
  stations.forEach((station) => {
    // Generate inbound departures
    const inboundTimes = [5, 15, 25, 35, 45, 55]; // Minutes from now
    inboundTimes.forEach((minutes, index) => {
      let options: MockDepartureOptions = {};
      let finalMinutes = minutes;
      
      // Apply scenario-specific options
      if (scenario === 'cancelled' && index === 0) {
        options = { cancelled: true };
      } else if (scenario === 'delayed' && index === 0) {
        options = { delayed: true, delayMinutes: 20 };
      } else if (scenario === 'approaching' && index === 0) {
        options = { approaching: true };
        finalMinutes = 3; // Override to make it approaching
      } else if (scenario === 'bus-replacement' && index === 0) {
        options = { busReplacement: true };
      } else if (scenario === 'multiple' && index === 0) {
        options = { delayed: true, delayMinutes: 30 };
      } else if (scenario === 'multiple' && index === 1) {
        options = { cancelled: true };
      }
      
      departures.push(createMockDeparture(station, serviceId, 'inbound', finalMinutes, options));
    });

    // Generate outbound departures
    const outboundTimes = [10, 20, 30, 40, 50, 60];
    outboundTimes.forEach((minutes, index) => {
      let options: MockDepartureOptions = {};
      let finalMinutes = minutes;
      
      // Apply scenario-specific options for outbound
      if (scenario === 'cancelled' && index === 1) {
        options = { cancelled: true };
      } else if (scenario === 'delayed' && index === 1) {
        options = { delayed: true, delayMinutes: 25 };
      } else if (scenario === 'approaching' && index === 0) {
        options = { approaching: true };
        finalMinutes = 2; // Override to make it approaching
      } else if (scenario === 'bus-replacement' && index === 1) {
        options = { busReplacement: true };
      }
      
      departures.push(createMockDeparture(station, serviceId, 'outbound', finalMinutes, options));
    });
  });

  return departures;
}

/**
 * Generate mock departures response
 */
export function generateMockDeparturesResponse(
  options: MockDataOptions = {}
): DeparturesResponse {
  const {
    line = 'WRL',
    stations = LINE_STATIONS[line] || LINE_STATIONS.WRL,
    scenario = 'normal',
    baseTime = new Date(),
  } = options;

  const allDepartures = generateMockDepartures(line, stations, scenario, baseTime);
  
  // Separate into inbound and outbound
  const inbound = allDepartures.filter(dep => {
    const destination = dep.destination?.stop_id || '';
    return destination === 'WELL';
  });

  const outbound = allDepartures.filter(dep => {
    const destination = dep.destination?.stop_id || '';
    return destination !== 'WELL';
  });

  return {
    inbound,
    outbound,
    total: allDepartures.length,
  };
}

/**
 * Generate mock station departures
 */
export function generateMockStationDepartures(
  stationId: string,
  line: LineCode = 'WRL',
  scenario: MockScenario = 'normal'
): Departure[] {
  // Use line code directly as service_id (WRL, KPL, HVL, JVL)
  const serviceId = line;
  const departures: Departure[] = [];
  
  const times = [5, 15, 25, 35, 45];
  times.forEach((minutes, index) => {
    let options: MockDepartureOptions = {};
    let finalMinutes = minutes;
    
    if (scenario === 'cancelled' && index === 0) {
      options = { cancelled: true };
    } else if (scenario === 'delayed' && index === 0) {
      options = { delayed: true, delayMinutes: 20 };
    } else if (scenario === 'approaching' && index === 0) {
      options = { approaching: true };
      finalMinutes = 3;
    }
    
    // Determine direction based on station
    const direction: 'inbound' | 'outbound' = stationId === 'WELL' ? 'outbound' : 'inbound';
    departures.push(createMockDeparture(stationId, serviceId, direction, finalMinutes, options));
  });

  return departures;
}

