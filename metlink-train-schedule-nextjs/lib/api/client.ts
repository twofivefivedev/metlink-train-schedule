/**
 * API client for frontend
 * Handles all API communication with the backend
 */

import type { ApiResponse, DeparturesResponse, StationDeparturesResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/**
 * Fetch data from API with retry logic
 */
async function fetchWithRetry<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;
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
 * Get all Wairarapa departures
 */
export async function getWairarapaDepartures(): Promise<ApiResponse<DeparturesResponse>> {
  return fetchWithRetry<DeparturesResponse>('/api/wairarapa-departures');
}

/**
 * Get departures for a specific station
 */
export async function getStationDepartures(stationId: string): Promise<ApiResponse<StationDeparturesResponse>> {
  return fetchWithRetry<StationDeparturesResponse>(`/api/station/${stationId}`);
}

/**
 * Health check
 */
export async function healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
  return fetchWithRetry<{ status: string; timestamp: string }>('/api/health');
}

