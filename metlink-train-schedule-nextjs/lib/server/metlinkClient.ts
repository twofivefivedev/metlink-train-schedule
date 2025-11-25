/**
 * Metlink API HTTP client
 * Pure HTTP client with retry logic for Metlink API requests
 */

import axios, { AxiosInstance } from 'axios';
import { getMetlinkApiBase, env } from '@/lib/config/env';
import { retry } from './retry';
import { metlinkCircuitBreaker, CircuitBreakerOpenError } from './circuitBreaker';
import { sanitizeMetlinkDepartures } from './validation/schemas';
import type { MetlinkApiResponse } from '@/types';
import { requestMetrics } from './requestMetrics';

/**
 * Get or create axios instance with default configuration
 * Lazy initialization ensures environment variables are read at runtime
 */
let metlinkClientInstance: AxiosInstance | null = null;

function getMetlinkClient(): AxiosInstance {
  if (!metlinkClientInstance) {
    // Access env at runtime (lazy via Proxy)
    // Sanitize API key - remove any whitespace, newlines, or invalid characters
    const apiKey = String(env.METLINK_API_KEY).trim().replace(/[\r\n\t]/g, '');
    
    if (!apiKey) {
      throw new Error('METLINK_API_KEY is empty or invalid');
    }
    
    metlinkClientInstance = axios.create({
      baseURL: getMetlinkApiBase(),
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: env.API_TIMEOUT_MS,
    });
  }
  return metlinkClientInstance;
}

/**
 * Get stop predictions for a specific station
 * Pure HTTP request with retry logic and circuit breaker
 */
export async function getStopPredictions(stopId: string): Promise<MetlinkApiResponse> {
  if (!metlinkCircuitBreaker.canRequest()) {
    throw new CircuitBreakerOpenError();
  }

  // Track API request
  requestMetrics.increment();
  
  const response = await retry(
    () => getMetlinkClient().get<MetlinkApiResponse>(`/stop-predictions?stop_id=${stopId}`),
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

  metlinkCircuitBreaker.recordSuccess();

  return {
    departures: sanitizeMetlinkDepartures(response.data),
  };
}

