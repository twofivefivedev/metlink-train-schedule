/**
 * Performance monitoring utilities
 * Tracks API response times, errors, and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseAvailable } from './supabaseAdmin';
import { getPerformanceRepository } from './db';
import { logger } from './logger';

interface PerformanceContext {
  startTime: number;
  endpoint: string;
  method: string;
}

/**
 * Create performance context for tracking
 */
export function createPerformanceContext(
  request: NextRequest,
  endpoint: string
): PerformanceContext {
  return {
    startTime: Date.now(),
    endpoint,
    method: request.method,
  };
}

/**
 * Record performance metric
 */
export async function recordPerformanceMetric(
  context: PerformanceContext,
  statusCode: number,
  requestSize?: number,
  responseSize?: number,
  errorMessage?: string
): Promise<void> {
  const responseTime = Date.now() - context.startTime;

  // Log to console
  logger.debug('Performance metric', {
    endpoint: context.endpoint,
    method: context.method,
    statusCode,
    responseTime,
    requestSize,
    responseSize,
    errorMessage,
  });

  // Store in Supabase if available
  if (await isSupabaseAvailable()) {
    try {
      const perfRepo = getPerformanceRepository();
      await perfRepo.insertPerformanceMetric({
        endpoint: context.endpoint,
        method: context.method,
        statusCode,
        responseTime,
        requestSize,
        responseSize,
        errorMessage,
      });
    } catch (error) {
      logger.warn('Failed to store performance metric', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Record API request metric
 */
export async function recordApiRequestMetric(
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  cacheHit: boolean,
  errorMessage?: string
): Promise<void> {
  // Log to console
  logger.debug('API request metric', {
    endpoint,
    method,
    statusCode,
    responseTime,
    cacheHit,
    errorMessage,
  });

  // Store in Supabase if available
  if (await isSupabaseAvailable()) {
    try {
      const perfRepo = getPerformanceRepository();
      await perfRepo.insertApiRequestMetric({
        endpoint,
        method,
        statusCode,
        responseTime,
        cacheHit,
        errorMessage,
      });
    } catch (error) {
      logger.warn('Failed to store API request metric', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Performance monitoring wrapper for API routes
 */
export function withPerformanceMonitoring<T>(
  handler: (request: NextRequest, context: PerformanceContext) => Promise<NextResponse<T>>,
  endpoint: string
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    const context = createPerformanceContext(request, endpoint);
    let statusCode = 500;
    let responseSize: number | undefined;

    try {
      const response = await handler(request, context);
      statusCode = response.status;
      
      // Try to get response size (may not always be available)
      try {
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        responseSize = new Blob([text]).size;
      } catch {
        // Ignore if we can't get size
      }

      // Record metric asynchronously (don't block response)
      recordPerformanceMetric(context, statusCode, undefined, responseSize)
        .catch((error) => {
          logger.warn('Failed to record performance metric', {
            error: error instanceof Error ? error.message : String(error),
          });
        });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Record error metric
      recordPerformanceMetric(context, statusCode, undefined, responseSize, errorMessage)
        .catch((recordError) => {
          logger.warn('Failed to record error performance metric', {
            error: recordError instanceof Error ? recordError.message : String(recordError),
          });
        });

      throw error;
    }
  };
}

/**
 * Get performance statistics
 */
export async function getPerformanceStats(
  endpoint?: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  total: number;
  averageResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  statusCodes: Record<number, number>;
}> {
  if (!(await isSupabaseAvailable())) {
    return {
      total: 0,
      averageResponseTime: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      errorRate: 0,
      statusCodes: {},
    };
  }

  try {
    const perfRepo = getPerformanceRepository();
    return await perfRepo.getPerformanceStats({
      endpoint,
      startDate,
      endDate,
    });
  } catch (error) {
    logger.error('Failed to get performance stats', {
      error: error instanceof Error ? error.message : String(error),
      endpoint,
    });
    return {
      total: 0,
      averageResponseTime: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      errorRate: 0,
      statusCodes: {},
    };
  }
}

