/**
 * Request metrics tracker
 * Tracks API call volume to monitor usage and prevent rate limiting
 */

import { logger } from './logger';

export interface RequestMetricsSnapshot {
  totalRequests: number;
  requestsThisHour: number;
  estimatedHourlyRate: number;
}

/**
 * Request metrics tracker class
 * Tracks API call volume to monitor usage and prevent rate limiting
 */
export class RequestMetrics {
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
  getMetrics(): RequestMetricsSnapshot {
    const currentHourCount = this.getCurrentHourCount();
    return {
      totalRequests: this.requestCount,
      requestsThisHour: currentHourCount,
      estimatedHourlyRate: currentHourCount * 60, // Rough estimate
    };
  }
}

// Singleton instance
export const requestMetrics = new RequestMetrics();

