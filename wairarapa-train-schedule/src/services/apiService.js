/**
 * API Service
 * Handles all API communication with the backend
 */

import { getApiUrl, API_CONFIG } from '../config/api';

/**
 * Fetch data from API with retry logic
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
async function fetchWithRetry(endpoint, options = {}) {
  const { retries = API_CONFIG.RETRY_ATTEMPTS, ...fetchOptions } = options;
  const url = getApiUrl(endpoint);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'API returned error');
      }

      return data;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      // Exponential backoff
      const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Get all Wairarapa departures
 * @returns {Promise<Object>} Departures data
 */
export async function getWairarapaDepartures() {
  return fetchWithRetry(API_CONFIG.ENDPOINTS.WAIRARAPA_DEPARTURES);
}

/**
 * Get departures for a specific station
 * @param {string} stationId - Station ID
 * @returns {Promise<Object>} Station departures data
 */
export async function getStationDepartures(stationId) {
  return fetchWithRetry(API_CONFIG.ENDPOINTS.STATION(stationId));
}

/**
 * Health check
 * @returns {Promise<Object>} Health status
 */
export async function healthCheck() {
  return fetchWithRetry(API_CONFIG.ENDPOINTS.HEALTH);
}

