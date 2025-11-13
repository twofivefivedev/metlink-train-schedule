/**
 * Historical data ingestion service
 * Collects and stores departure data for analytics
 */

import { prisma, isDatabaseAvailable } from './db';
import { logger } from './logger';
import type { Departure } from '@/types';

/**
 * Store historical departure data
 */
export async function storeHistoricalDepartures(
  departures: Departure[],
  station?: string
): Promise<void> {
  if (!(await isDatabaseAvailable())) {
    logger.debug('Database not available, skipping historical data storage');
    return;
  }

  try {
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
        aimedTime,
        expectedTime,
        status: (departure as unknown as { status?: string }).status || null,
      };
    });

    // Use createMany for better performance
    await prisma.historicalDeparture.createMany({
      data: records,
      skipDuplicates: true, // Skip if exact duplicate exists
    });

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
  if (!(await isDatabaseAvailable())) {
    logger.debug('Database not available, returning empty historical data');
    return [];
  }

  try {
    const where: {
      serviceId?: string;
      stopId?: string;
      station?: string;
      aimedTime?: { gte?: Date; lte?: Date };
    } = {};

    if (options.serviceId) {
      where.serviceId = options.serviceId;
    }
    if (options.stopId) {
      where.stopId = options.stopId;
    }
    if (options.station) {
      where.station = options.station;
    }
    if (options.startDate || options.endDate) {
      where.aimedTime = {};
      if (options.startDate) {
        where.aimedTime.gte = options.startDate;
      }
      if (options.endDate) {
        where.aimedTime.lte = options.endDate;
      }
    }

    const records = await prisma.historicalDeparture.findMany({
      where,
      orderBy: {
        aimedTime: 'desc',
      },
      take: options.limit || 1000,
    });

    return records;
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
  if (!(await isDatabaseAvailable())) {
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
    const records = await prisma.historicalDeparture.findMany({
      where: {
        serviceId,
        aimedTime: {
          gte: startDate,
          lte: endDate,
        },
        expectedTime: {
          not: null,
        },
      },
    });

    const total = records.length;
    let onTime = 0;
    let delayed = 0;
    let cancelled = 0;
    let totalDelay = 0;

    records.forEach((record) => {
      if (!record.expectedTime) {
        cancelled++;
        return;
      }

      const delayMs = record.expectedTime.getTime() - record.aimedTime.getTime();
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

