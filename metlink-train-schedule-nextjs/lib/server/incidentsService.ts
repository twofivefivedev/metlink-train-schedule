/**
 * Service Incidents Service
 * Handles recording and retrieval of service incidents (cancellations, delays, bus replacements)
 */

import { isSupabaseAvailable } from './supabaseAdmin';
import { getIncidentsRepository, type ServiceIncidentRecord } from './db';
import { getIncidentQueue } from './incidentQueue';
import { logger } from './logger';
import type { Departure } from '@/types';
import { getStatusCategory, isBusReplacement } from '@/lib/utils/departureUtils';

/**
 * Calculate delay in minutes from departure data
 */
function getDelayMinutes(departure: Departure): number | null {
  const aimed = departure.departure?.aimed;
  const expected = departure.departure?.expected;
  
  if (!aimed || !expected) {
    return null;
  }
  
  const aimedTime = new Date(aimed).getTime();
  const expectedTime = new Date(expected).getTime();
  const diffMs = expectedTime - aimedTime;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  
  // Only return delay if >= 5 minutes (threshold for "delayed")
  return diffMinutes >= 5 ? diffMinutes : null;
}

/**
 * Extract incidents from departures
 * Returns array of incidents to record (cancellations, delays >= 5min, bus replacements)
 */
export function extractIncidentsFromDepartures(
  departures: Departure[],
  station?: string
): ServiceIncidentRecord[] {
  const incidents: ServiceIncidentRecord[] = [];

  for (const departure of departures) {
    const status = (departure as unknown as { status?: string }).status;
    const category = getStatusCategory(departure);
    const aimedTime = departure.departure?.aimed;
    const expectedTime = departure.departure?.expected;

    if (!aimedTime) {
      continue; // Skip if no aimed time
    }

    const serviceId = departure.service_id;
    const stopId = departure.stop_id || '';
    const destination = departure.destination?.name || 'Unknown';
    const destinationStopId = departure.destination?.stop_id || '';

    // Check for cancellation
    if (status === 'canceled' || status === 'cancelled' || category === 'cancelled') {
      incidents.push({
        serviceId,
        stopId,
        station: station || departure.station || null,
        destination,
        destinationStopId,
        aimedTime: new Date(aimedTime),
        expectedTime: expectedTime ? new Date(expectedTime) : null,
        incidentType: 'cancelled',
        delayMinutes: null,
        details: {
          status,
          originalStatus: status,
        },
      });
    }

    // Check for bus replacement
    if (isBusReplacement(departure) || category === 'bus') {
      incidents.push({
        serviceId,
        stopId,
        station: station || departure.station || null,
        destination,
        destinationStopId,
        aimedTime: new Date(aimedTime),
        expectedTime: expectedTime ? new Date(expectedTime) : null,
        incidentType: 'bus_replacement',
        delayMinutes: null,
        details: {
          destination: departure.destination?.name,
          operator: (departure as unknown as { operator?: string }).operator,
        },
      });
    }

    // Check for delay (>= 5 minutes)
    const delayMinutes = getDelayMinutes(departure);
    if (delayMinutes !== null && category === 'delayed') {
      incidents.push({
        serviceId,
        stopId,
        station: station || departure.station || null,
        destination,
        destinationStopId,
        aimedTime: new Date(aimedTime),
        expectedTime: expectedTime ? new Date(expectedTime) : null,
        incidentType: 'delayed',
        delayMinutes: Math.round(delayMinutes),
        details: {
          delayMinutes: Math.round(delayMinutes),
          status,
        },
      });
    }
  }

  return incidents;
}

/**
 * Record service incidents from departures
 * Only records incidents (cancellations, delays >= 5min, bus replacements)
 * Uses background queue for non-blocking processing
 */
export async function recordServiceIncidents(
  departures: Departure[],
  station?: string
): Promise<void> {
  try {
    const incidents = extractIncidentsFromDepartures(departures, station);
    
    if (incidents.length === 0) {
      return; // No incidents to record
    }

    // Use background queue for non-blocking processing
    const queue = getIncidentQueue();
    await queue.enqueue(incidents);

    logger.debug('Service incidents queued for background processing', {
      count: incidents.length,
      station,
      byType: {
        cancelled: incidents.filter((i) => i.incidentType === 'cancelled').length,
        delayed: incidents.filter((i) => i.incidentType === 'delayed').length,
        bus_replacement: incidents.filter((i) => i.incidentType === 'bus_replacement').length,
      },
    });
  } catch (error) {
    logger.error('Failed to queue service incidents', {
      error: error instanceof Error ? error.message : String(error),
      count: departures.length,
      station,
    });
    // Don't throw - this is non-blocking
  }
}

/**
 * Get service incidents for analytics
 */
export async function getServiceIncidents(options: {
  serviceId?: string;
  stopId?: string;
  station?: string;
  incidentType?: 'cancelled' | 'delayed' | 'bus_replacement';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<Array<{
  id: string;
  serviceId: string;
  stopId: string;
  station: string | null;
  destination: string;
  aimedTime: Date;
  expectedTime: Date | null;
  incidentType: 'cancelled' | 'delayed' | 'bus_replacement';
  delayMinutes: number | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}>> {
  if (!(await isSupabaseAvailable())) {
    logger.debug('Supabase not available, returning empty incidents');
    return [];
  }

  try {
    const incidentsRepo = getIncidentsRepository();
    const records = await incidentsRepo.query(options);

    return records.map((record) => ({
      id: record.id,
      serviceId: record.serviceId,
      stopId: record.stopId,
      station: record.station,
      destination: record.destination,
      aimedTime: new Date(record.aimedTime),
      expectedTime: record.expectedTime ? new Date(record.expectedTime) : null,
      incidentType: record.incidentType,
      delayMinutes: record.delayMinutes,
      details: record.details as Record<string, unknown> | null,
      createdAt: new Date(record.createdAt),
    }));
  } catch (error) {
    logger.error('Failed to get service incidents', {
      error: error instanceof Error ? error.message : String(error),
      options,
    });
    return [];
  }
}

/**
 * Get incidents summary statistics
 */
export async function getIncidentsSummary(options: {
  serviceId?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  total: number;
  cancelled: number;
  delayed: number;
  busReplacement: number;
  byType: {
    cancelled: number;
    delayed: number;
    bus_replacement: number;
  };
}> {
  if (!(await isSupabaseAvailable())) {
    return {
      total: 0,
      cancelled: 0,
      delayed: 0,
      busReplacement: 0,
      byType: {
        cancelled: 0,
        delayed: 0,
        bus_replacement: 0,
      },
    };
  }

  try {
    const incidentsRepo = getIncidentsRepository();
    return await incidentsRepo.getSummary(options);
  } catch (error) {
    logger.error('Failed to get incidents summary', {
      error: error instanceof Error ? error.message : String(error),
      options,
    });
    return {
      total: 0,
      cancelled: 0,
      delayed: 0,
      busReplacement: 0,
      byType: {
        cancelled: 0,
        delayed: 0,
        bus_replacement: 0,
      },
    };
  }
}

