/**
 * Historical Data Repository
 * Typed repository for historical_departures table operations
 */

import { getSupabaseAdminClient } from '../supabaseAdmin';
import { logger } from '../logger';
import type { Database } from '@/supabase/types';
import type { Departure } from '@/types';

type HistoricalDeparture = Database['public']['Tables']['historical_departures']['Row'];
type HistoricalDepartureInsert = Database['public']['Tables']['historical_departures']['Insert'];

export interface HistoricalRepository {
  insert(departures: Departure[], station?: string): Promise<void>;
  query(options: {
    serviceId?: string;
    stopId?: string;
    station?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<HistoricalDeparture[]>;
  calculateOnTimePerformance(
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
  }>;
}

class HistoricalRepositoryImpl implements HistoricalRepository {
  async insert(departures: Departure[], station?: string): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const records: HistoricalDepartureInsert[] = departures.map((departure) => {
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

      const { error } = await supabase
        .from('historical_departures')
        .insert(records);

      if (error) {
        // Ignore duplicate key errors
        if (!error.message.includes('duplicate') && !error.code?.includes('23505')) {
          throw error;
        }
      }

      logger.debug('Historical departures inserted', {
        count: records.length,
        station,
      });
    } catch (error) {
      logger.error('Failed to insert historical departures', {
        error: error instanceof Error ? error.message : String(error),
        count: departures.length,
        station,
      });
      throw error;
    }
  }

  async query(options: {
    serviceId?: string;
    stopId?: string;
    station?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<HistoricalDeparture[]> {
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

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to query historical departures', {
        error: error instanceof Error ? error.message : String(error),
        options,
      });
      throw error;
    }
  }

  async calculateOnTimePerformance(
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
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('historical_departures')
        .select('aimedTime, expectedTime')
        .eq('serviceId', serviceId)
        .gte('aimedTime', startDate.toISOString())
        .lte('aimedTime', endDate.toISOString())
        .not('expectedTime', 'is', null);

      if (error) {
        throw error;
      }

      const total = data?.length || 0;
      let onTime = 0;
      let delayed = 0;
      let cancelled = 0;
      let totalDelay = 0;

      (data || []).forEach((record) => {
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
      throw error;
    }
  }
}

// Singleton instance
let historicalRepositoryInstance: HistoricalRepository | null = null;

export function getHistoricalRepository(): HistoricalRepository {
  if (!historicalRepositoryInstance) {
    historicalRepositoryInstance = new HistoricalRepositoryImpl();
  }
  return historicalRepositoryInstance;
}

