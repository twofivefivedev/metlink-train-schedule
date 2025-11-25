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
    departure.status = 'canceled';
  }

  // Add delay information
  if (options.delayed && !options.cancelled) {
    const delayMinutes = options.delayMinutes || 15;
    departure.delay = `PT${delayMinutes}M`;
    departure.status = 'delayed';
  }

  // Add bus replacement
  if (options.busReplacement) {
    departure.destination.name = 'Bus replacement service';
    departure.operator = 'bus';
    departure.disruption = {
      summary: 'Service replaced by bus',
      replacement: {
        mode: 'bus',
        operator: 'Metlink Bus',
      },
      lineSegment: `${station} → ${destination.stop_id}`,
    };
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
  
  // Track if we've already created a cancelled/bus/approaching train for this scenario
  let cancelledCreated = false;
  let approachingCreated = false;
  let busCreated = false;
  let delayedCount = 0; // Track how many delayed trains we've created (max 3)

  // Generate departures - only for first few stations to avoid duplicates
  // Limit to first 3 stations to keep times varied and realistic
  const stationsToUse = stations.slice(0, 3);
  
  stationsToUse.forEach((station, stationIndex) => {
    // Generate inbound departures with varied times per station
    // Each station gets different base times to avoid duplicates
    const baseMinutes = stationIndex * 2; // Offset times per station
    const inboundTimes = [
      5 + baseMinutes, 
      15 + baseMinutes, 
      25 + baseMinutes, 
      35 + baseMinutes, 
      45 + baseMinutes, 
      55 + baseMinutes
    ];
    
    inboundTimes.forEach((minutes, index) => {
      let options: MockDepartureOptions = {};
      let finalMinutes = minutes;
      
      // Apply scenario-specific options
      if (scenario === 'cancelled' && index === 0 && stationIndex === 0 && !cancelledCreated) {
        // First departure is cancelled, others are normal/on-time
        options = { cancelled: true };
        cancelledCreated = true;
      } else if (scenario === 'delayed' && stationIndex === 0 && delayedCount < 3) {
        // Create delays for top 3 schedules: 5min, 10min, 30min delays
        if (index === 0) {
          options = { delayed: true, delayMinutes: 5 }; // 5 minute delay
          delayedCount++;
        } else if (index === 1) {
          options = { delayed: true, delayMinutes: 10 }; // 10 minute delay
          delayedCount++;
        } else if (index === 2) {
          options = { delayed: true, delayMinutes: 30 }; // 30 minute delay (major)
          delayedCount++;
        }
      } else if (scenario === 'approaching' && index === 0 && stationIndex === 0 && !approachingCreated) {
        options = { approaching: true };
        finalMinutes = 3; // Override to make it approaching
        approachingCreated = true;
      } else if (scenario === 'bus-replacement' && index === 0 && stationIndex === 0 && !busCreated) {
        options = { busReplacement: true };
        busCreated = true;
      }
      
      departures.push(createMockDeparture(station, serviceId, 'inbound', finalMinutes, options));
    });

    // Generate outbound departures with varied times per station
    const outboundBaseMinutes = stationIndex * 3; // Different offset for outbound
    const outboundTimes = [
      10 + outboundBaseMinutes, 
      20 + outboundBaseMinutes, 
      30 + outboundBaseMinutes, 
      40 + outboundBaseMinutes, 
      50 + outboundBaseMinutes, 
      60 + outboundBaseMinutes
    ];
    
    outboundTimes.forEach((minutes, index) => {
      let options: MockDepartureOptions = {};
      let finalMinutes = minutes;
      
      // Apply scenario-specific options for outbound
      if (scenario === 'cancelled' && index === 1 && stationIndex === 0 && !cancelledCreated) {
        // Second outbound departure is cancelled, others are normal/on-time
        options = { cancelled: true };
        cancelledCreated = true;
      } else if (scenario === 'delayed' && stationIndex === 0 && delayedCount < 3) {
        // Create delays for top 3 schedules: 5min, 10min, 30min delays
        if (index === 0) {
          options = { delayed: true, delayMinutes: 5 }; // 5 minute delay
          delayedCount++;
        } else if (index === 1) {
          options = { delayed: true, delayMinutes: 10 }; // 10 minute delay
          delayedCount++;
        } else if (index === 2) {
          options = { delayed: true, delayMinutes: 30 }; // 30 minute delay (major)
          delayedCount++;
        }
      } else if (scenario === 'approaching' && index === 0 && stationIndex === 0 && !approachingCreated) {
        options = { approaching: true };
        finalMinutes = 2; // Override to make it approaching
        approachingCreated = true;
      } else if (scenario === 'bus-replacement' && index === 1 && stationIndex === 0 && !busCreated) {
        options = { busReplacement: true };
        busCreated = true;
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
  
  // Sort by departure time (aimed time) to ensure proper ordering
  const sortedDepartures = [...allDepartures].sort((a, b) => {
    const timeA = new Date(a.departure?.aimed || 0).getTime();
    const timeB = new Date(b.departure?.aimed || 0).getTime();
    return timeA - timeB;
  });
  
  // Separate into inbound and outbound
  const inbound = sortedDepartures.filter(dep => {
    const destination = dep.destination?.stop_id || '';
    return destination === 'WELL';
  });

  const outbound = sortedDepartures.filter(dep => {
    const destination = dep.destination?.stop_id || '';
    return destination !== 'WELL';
  });

  return {
    inbound,
    outbound,
    total: sortedDepartures.length,
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

