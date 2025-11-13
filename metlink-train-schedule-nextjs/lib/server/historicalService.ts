/**
 * Historical data ingestion service
 * Collects and stores departure data for analytics
 */

import { getSupabaseAdminClient, isSupabaseAvailable } from './supabaseAdmin';
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
    const supabase = getSupabaseAdminClient();
    const records = departures.map((departure) => {
      const aimedTime = departure.departure?.aimed
        ? new Date(departure.departure.aimed)
        : new Date();
      const expectedTime = departure.departure?.expected
        ? new Date(departure.departure.expected)
        : null;

      return {
        serviceId: departure.service_id,
        stopId: departure.stop_id || '',
        station: station || departure.station || null,
        destination: departure.destination?.name || 'Unknown',
        destinationStopId: departure.destination?.stop_id || '',
        aimedTime: aimedTime.toISOString(),
        expectedTime: expectedTime?.toISOString() || null,
        status: (departure as unknown as { status?: string }).status || null,
      };
    });

    // Insert records (Supabase handles duplicates via unique constraints)
    const { error } = await supabase
      .from('historical_departures')
      .insert(records);

    if (error) {
      // Ignore duplicate key errors
      if (!error.message.includes('duplicate') && !error.code?.includes('23505')) {
        throw error;
      }
    }

    logger.debug('Stored historical departures', {
      count: records.length,
      station,
    });
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
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from('historical_departures')
      .select('*')
      .order('aimedTime', { ascending: false })
      .limit(options.limit || 1000);

    if (options.serviceId) {
      query = query.eq('serviceId', options.serviceId);
    }
    if (options.stopId) {
      query = query.eq('stopId', options.stopId);
    }
    if (options.station) {
      query = query.eq('station', options.station);
    }
    if (options.startDate) {
      query = query.gte('aimedTime', options.startDate.toISOString());
    }
    if (options.endDate) {
      query = query.lte('aimedTime', options.endDate.toISOString());
    }

    const { data: records, error } = await query;

    if (error) {
      throw error;
    }

    return (records || []).map((record) => ({
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
    const supabase = getSupabaseAdminClient();
    const { data: records, error } = await supabase
      .from('historical_departures')
      .select('aimedTime, expectedTime')
      .eq('serviceId', serviceId)
      .gte('aimedTime', startDate.toISOString())
      .lte('aimedTime', endDate.toISOString())
      .not('expectedTime', 'is', null);

    if (error) {
      throw error;
    }

    const total = records?.length || 0;
    let onTime = 0;
    let delayed = 0;
    let cancelled = 0;
    let totalDelay = 0;

    (records || []).forEach((record) => {
      if (!record.expectedTime) {
        cancelled++;
        return;
      }

      const aimedTime = new Date(record.aimedTime);
      const expectedTime = new Date(record.expectedTime);
      const delayMs = expectedTime.getTime() - aimedTime.getTime();
      const delayMinutes = delayMs / (1000 * 60);

      if (delayMinutes <= 2) {
        // Consider on-time if within 2 minutes
        onTime++;
      } else {
        delayed++;
        totalDelay += delayMinutes;
      }
    });

    const averageDelay = delayed > 0 ? totalDelay / delayed : 0;
    const onTimePercentage = total > 0 ? (onTime / total) * 100 : 0;

    return {
      total,
      onTime,
      delayed,
      cancelled,
      averageDelay: Math.round(averageDelay * 10) / 10,
      onTimePercentage: Math.round(onTimePercentage * 10) / 10,
    };
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

