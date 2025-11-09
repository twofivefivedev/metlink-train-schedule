/**
 * Metlink API service
 * Handles all interactions with the external Metlink API
 */

import axios, { AxiosInstance } from 'axios';
import { SERVICE_IDS, getStationPlatformVariants } from '@/lib/constants';
import { getMetlinkApiBase, env } from '@/lib/config/env';
import { retry } from './retry';
import { logger } from './logger';
import type { Departure, MetlinkApiResponse } from '@/types';

/**
 * Request metrics tracker
 * Tracks API call volume to monitor usage and prevent rate limiting
 */
class RequestMetrics {
  private requestCount: number = 0;
  private requestCountByHour: Map<number, number> = new Map();

  /**
   * Increment request counter
   */
  increment(): void {
    this.requestCount++;
    const currentHour = Math.floor(Date.now() / (60 * 60 * 1000));
    const currentCount = this.requestCountByHour.get(currentHour) || 0;
    this.requestCountByHour.set(currentHour, currentCount + 1);
    
    // Log metrics periodically (every 10 requests)
    if (this.requestCount % 10 === 0) {
      this.logMetrics();
    }
  }

  /**
   * Get current request count
   */
  getCount(): number {
    return this.requestCount;
  }

  /**
   * Get requests in the current hour
   */
  getCurrentHourCount(): number {
    const currentHour = Math.floor(Date.now() / (60 * 60 * 1000));
    return this.requestCountByHour.get(currentHour) || 0;
  }

  /**
   * Log metrics summary
   */
  private logMetrics(): void {
    const currentHourCount = this.getCurrentHourCount();
    logger.info('API Request Metrics', {
      totalRequests: this.requestCount,
      requestsThisHour: currentHourCount,
      estimatedHourlyRate: currentHourCount * 60, // Extrapolate from current count
    });
  }

  /**
   * Get metrics summary
   */
  getMetrics(): {
    totalRequests: number;
    requestsThisHour: number;
    estimatedHourlyRate: number;
  } {
    const currentHourCount = this.getCurrentHourCount();
    return {
      totalRequests: this.requestCount,
      requestsThisHour: currentHourCount,
      estimatedHourlyRate: currentHourCount * 60, // Rough estimate
    };
  }
}

// Singleton instance
const requestMetrics = new RequestMetrics();

/**
 * Create axios instance with default configuration
 */
const metlinkClient: AxiosInstance = axios.create({
  baseURL: getMetlinkApiBase(),
  headers: {
    'x-api-key': env.METLINK_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: env.API_TIMEOUT_MS,
});

/**
 * Get stop predictions for a specific station
 */
export async function getStopPredictions(stopId: string): Promise<MetlinkApiResponse> {
  try {
    // Track API request
    requestMetrics.increment();
    
    const response = await retry(
      () => metlinkClient.get<MetlinkApiResponse>(`/stop-predictions?stop_id=${stopId}`),
      {
        shouldRetry: (error: unknown) => {
          // Retry on network errors or 5xx, but not on 4xx (client errors)
          if (error && typeof error === 'object' && 'response' in error) {
            const response = (error as { response?: { status?: number } }).response;
            if (response?.status && response.status < 500) {
              return false;
            }
          }
          return true;
        },
      }
    );

    logger.debug(`Fetched stop predictions for ${stopId}`, {
      requestCount: requestMetrics.getCount(),
      requestsThisHour: requestMetrics.getCurrentHourCount(),
    });

    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch stop predictions for ${stopId}`, error as Error);
    throw error;
  }
}

/**
 * Get request metrics for monitoring
 */
export function getRequestMetrics() {
  return requestMetrics.getMetrics();
}

/**
 * Get departures for a specific station and service line
 * Handles normalized station IDs by trying platform variants if needed
 */
export async function getWairarapaDepartures(
  stopId: string,
  serviceId: string = SERVICE_IDS.WAIRARAPA_LINE
): Promise<Departure[]> {
  try {
    // Get platform variants for the station ID
    const platformVariants = getStationPlatformVariants(stopId);
    let allDepartures: Departure[] = [];

    // Try each platform variant and collect all departures
    for (const platformId of platformVariants) {
      try {
        const data = await getStopPredictions(platformId);
        const departures = data.departures || [];
        allDepartures = allDepartures.concat(departures);
      } catch (error) {
        // If a platform variant fails, continue with others
        logger.debug(`Failed to fetch predictions for platform ${platformId}, trying next variant`);
      }
    }

    // Filter by service ID and remove duplicates (by service_id, destination, and departure time)
    const filtered = allDepartures.filter(
      departure => departure.service_id === serviceId
    );

    // Remove duplicates based on service_id, destination, and departure time
    const uniqueDepartures = filtered.filter((departure, index, self) =>
      index === self.findIndex(d => 
        d.service_id === departure.service_id &&
        d.destination.stop_id === departure.destination.stop_id &&
        d.departure?.aimed === departure.departure?.aimed
      )
    );

    logger.debug(`Fetched ${uniqueDepartures.length} departures for ${stopId} (service: ${serviceId})`, {
      total: allDepartures.length,
      filtered: filtered.length,
      unique: uniqueDepartures.length,
      platformsTried: platformVariants.length,
    });

    return uniqueDepartures;
  } catch (error) {
    logger.error(`Failed to fetch departures for ${stopId}`, error as Error);
    throw error;
  }
}

/**
 * Get departures for multiple stations in parallel
 */
export async function getMultipleStationDepartures(
  stopIds: string[],
  serviceId: string = SERVICE_IDS.WAIRARAPA_LINE
): Promise<Departure[][]> {
  const promises = stopIds.map(async (stopId) => {
    try {
      const departures = await getWairarapaDepartures(stopId, serviceId);
      return departures.map(departure => ({
        ...departure,
        station: stopId,
      }));
    } catch (error) {
      logger.warn(`Failed to fetch departures for station ${stopId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return []; // Return empty array on error for this station
    }
  });

  return Promise.all(promises);
}

