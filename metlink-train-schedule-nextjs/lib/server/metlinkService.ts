/**
 * Metlink API service
 * Handles all interactions with the external Metlink API
 */

import axios, { AxiosInstance } from 'axios';
import { METLINK_API_BASE, SERVICE_IDS } from '@/lib/constants';
import { retry } from './retry';
import { logger } from './logger';
import type { Departure, MetlinkApiResponse } from '@/types';

const metlinkApiKey = process.env.METLINK_API_KEY;
if (!metlinkApiKey) {
  throw new Error('METLINK_API_KEY environment variable is required');
}

const apiTimeout = parseInt(process.env.API_TIMEOUT_MS || '10000', 10);

/**
 * Create axios instance with default configuration
 */
const metlinkClient: AxiosInstance = axios.create({
  baseURL: METLINK_API_BASE,
  headers: {
    'x-api-key': metlinkApiKey,
    'Content-Type': 'application/json',
  },
  timeout: apiTimeout,
});

/**
 * Get stop predictions for a specific station
 */
export async function getStopPredictions(stopId: string): Promise<MetlinkApiResponse> {
  try {
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

    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch stop predictions for ${stopId}`, error as Error);
    throw error;
  }
}

/**
 * Get Wairarapa line departures for a specific station
 */
export async function getWairarapaDepartures(
  stopId: string,
  serviceId: string = SERVICE_IDS.WAIRARAPA_LINE
): Promise<Departure[]> {
  try {
    const data = await getStopPredictions(stopId);
    const departures = data.departures || [];

    const filtered = departures.filter(
      departure => departure.service_id === serviceId
    );

    logger.debug(`Fetched ${filtered.length} WRL departures for ${stopId}`, {
      total: departures.length,
      filtered: filtered.length,
    });

    return filtered;
  } catch (error) {
    logger.error(`Failed to fetch Wairarapa departures for ${stopId}`, error as Error);
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

