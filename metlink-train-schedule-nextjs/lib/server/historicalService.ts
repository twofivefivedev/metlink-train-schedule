/**
 * Historical data ingestion service
 * Collects and stores departure data for analytics
 */

import { isSupabaseAvailable } from './supabaseAdmin';
import { getHistoricalRepository } from './db';
import { logger } from './logger';
import type { Departure } from '@/types';

/**
 * Store historical departure data
 */
export async function storeHistoricalDepartures(
  departures: Departure[],
  station?: string
): Promise<void> {
  if (!(await isSupabaseAvailable())) {
    logger.debug('Supabase not available, skipping historical data storage');
    return;
  }

  try {
    const historicalRepo = getHistoricalRepository();
    await historicalRepo.insert(departures, station);
  } catch (error) {
    logger.error('Failed to store historical departures', {
      error: error instanceof Error ? error.message : String(error),
      count: departures.length,
      station,
    });
  }
}

/**
 * Get historical departures for analytics
 */
export async function getHistoricalDepartures(
  options: {
    serviceId?: string;
    stopId?: string;
    station?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): Promise<Array<{
  id: string;
  serviceId: string;
  stopId: string;
  station: string | null;
  destination: string;
  aimedTime: Date;
  expectedTime: Date | null;
  status: string | null;
  createdAt: Date;
}>> {
  if (!(await isSupabaseAvailable())) {
    logger.debug('Supabase not available, returning empty historical data');
    return [];
  }

  try {
    const historicalRepo = getHistoricalRepository();
    const records = await historicalRepo.query(options);

    return records.map((record) => ({
      id: record.id,
      serviceId: record.serviceId,
      stopId: record.stopId,
      station: record.station,
      destination: record.destination,
      aimedTime: new Date(record.aimedTime),
      expectedTime: record.expectedTime ? new Date(record.expectedTime) : null,
      status: record.status,
      createdAt: new Date(record.createdAt),
    }));
  } catch (error) {
    logger.error('Failed to get historical departures', {
      error: error instanceof Error ? error.message : String(error),
      options,
    });
    return [];
  }
}

/**
 * Calculate on-time performance metrics
 */
export async function calculateOnTimePerformance(
  serviceId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  total: number;
  onTime: number;
  delayed: number;
  cancelled: number;
  averageDelay: number;
  onTimePercentage: number;
}> {
  if (!(await isSupabaseAvailable())) {
    return {
      total: 0,
      onTime: 0,
      delayed: 0,
      cancelled: 0,
      averageDelay: 0,
      onTimePercentage: 0,
    };
  }

  try {
    const historicalRepo = getHistoricalRepository();
    return await historicalRepo.calculateOnTimePerformance(serviceId, startDate, endDate);
  } catch (error) {
    logger.error('Failed to calculate on-time performance', {
      error: error instanceof Error ? error.message : String(error),
      serviceId,
      startDate,
      endDate,
    });
    return {
      total: 0,
      onTime: 0,
      delayed: 0,
      cancelled: 0,
      averageDelay: 0,
      onTimePercentage: 0,
    };
  }
}

