/**
 * API client for frontend
 * Handles all API communication with the backend
 */

import { getApiBaseUrl } from '@/lib/config/env';
import type { ApiResponse, DeparturesResponse, StationDeparturesResponse } from '@/types';

const API_BASE = getApiBaseUrl();

/**
 * Fetch data from API with retry logic
 */
async function fetchWithRetry<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = API_BASE ? `${API_BASE}${normalizedEndpoint}` : normalizedEndpoint;
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as ApiResponse<T>;

      if (!data.success) {
        throw new Error(data.error?.message || 'API returned error');
      }

      return data;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Failed to fetch after retries');
}

/**
 * Get all departures for a specific line
 */
export async function getLineDepartures(
  line: string = 'WRL',
  stations?: string[]
): Promise<ApiResponse<DeparturesResponse>> {
  const params = new URLSearchParams({ line });
  if (stations && stations.length > 0) {
    params.append('stations', stations.join(','));
  }
  return fetchWithRetry<DeparturesResponse>(`/api/wairarapa-departures?${params.toString()}`);
}

/**
 * Get all Wairarapa departures (backward compatibility)
 */
export async function getWairarapaDepartures(): Promise<ApiResponse<DeparturesResponse>> {
  return getLineDepartures('WRL');
}

/**
 * Get departures for a specific station
 * @param stationId - The station ID (normalized, e.g., 'WELL', 'PETO')
 * @param line - Optional line code (WRL, KPL, HVL, JVL). Defaults to 'WRL' for backward compatibility.
 */
export async function getStationDepartures(
  stationId: string,
  line?: string
): Promise<ApiResponse<StationDeparturesResponse>> {
  const url = line 
    ? `/api/station/${stationId}?line=${line}`
    : `/api/station/${stationId}`;
  return fetchWithRetry<StationDeparturesResponse>(url);
}

/**
 * Health check
 */
export async function healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
  return fetchWithRetry<{ status: string; timestamp: string }>('/api/health');
}

