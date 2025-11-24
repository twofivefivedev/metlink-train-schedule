/**
 * Performance Repository
 * Typed repository for performance_metrics and api_request_metrics tables
 */

import { getSupabaseAdminClient } from '../supabaseAdmin';
import { logger } from '../logger';
import type { Database } from '@/supabase/types';

type PerformanceMetric = Database['public']['Tables']['performance_metrics']['Row'];
type PerformanceMetricInsert = Database['public']['Tables']['performance_metrics']['Insert'];
type ApiRequestMetric = Database['public']['Tables']['api_request_metrics']['Row'];
type ApiRequestMetricInsert = Database['public']['Tables']['api_request_metrics']['Insert'];

interface PerformanceAggregate {
  total?: number;
  average_response_time?: number;
  avg_response_time?: number;
  p50?: number;
  p95?: number;
  p99?: number;
  error_rate?: number;
  status_codes?: Record<number, number>;
}

export interface PerformanceRepository {
  insertPerformanceMetric(metric: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    requestSize?: number;
    responseSize?: number;
    errorMessage?: string;
  }): Promise<void>;
  insertApiRequestMetric(metric: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    cacheHit: boolean;
    errorMessage?: string;
  }): Promise<void>;
  getPerformanceStats(options: {
    endpoint?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    total: number;
    averageResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    errorRate: number;
    statusCodes: Record<number, number>;
  }>;
}

class PerformanceRepositoryImpl implements PerformanceRepository {
  private async tryGetAggregatedStats(options: {
    endpoint?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    total: number;
    averageResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    errorRate: number;
    statusCodes: Record<number, number>;
  } | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.rpc('get_performance_stats', {
        endpoint_filter: options.endpoint ?? null,
        start_time: options.startDate?.toISOString() ?? null,
        end_time: options.endDate?.toISOString() ?? null,
      });

      if (error || !data) {
        if (error && !error.message.toLowerCase().includes('function')) {
          logger.warn('Performance stats RPC failed', {
            error: error.message,
            endpoint: options.endpoint ?? 'all',
          });
        }
        return null;
      }

      const aggregate: PerformanceAggregate | undefined = Array.isArray(data) ? data[0] : data;
      if (!aggregate) {
        return null;
      }

      return {
        total: aggregate.total ?? 0,
        averageResponseTime: Math.round(
          aggregate.average_response_time ?? aggregate.avg_response_time ?? 0
        ),
        p50: Math.round(aggregate.p50 ?? 0),
        p95: Math.round(aggregate.p95 ?? 0),
        p99: Math.round(aggregate.p99 ?? 0),
        errorRate: Math.round((aggregate.error_rate ?? 0) * 10) / 10,
        statusCodes: aggregate.status_codes ?? {},
      };
    } catch (error) {
      logger.debug('Performance stats RPC unavailable, falling back to query', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async insertPerformanceMetric(metric: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    requestSize?: number;
    responseSize?: number;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const insertData: PerformanceMetricInsert = {
        endpoint: metric.endpoint,
        method: metric.method,
        statusCode: metric.statusCode,
        responseTime: metric.responseTime,
        requestSize: metric.requestSize ?? null,
        responseSize: metric.responseSize ?? null,
        errorMessage: metric.errorMessage ?? null,
      };

      const { error } = await (supabase
        .from('performance_metrics') as any)
        .insert(insertData);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.warn('Failed to insert performance metric', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - metrics are non-critical
    }
  }

  async insertApiRequestMetric(metric: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    cacheHit: boolean;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const insertData: ApiRequestMetricInsert = {
        endpoint: metric.endpoint,
        method: metric.method,
        statusCode: metric.statusCode,
        responseTime: metric.responseTime,
        cacheHit: metric.cacheHit,
        errorMessage: metric.errorMessage ?? null,
      };

      const { error } = await (supabase
        .from('api_request_metrics') as any)
        .insert(insertData);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.warn('Failed to insert API request metric', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - metrics are non-critical
    }
  }

  async getPerformanceStats(options: {
    endpoint?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    total: number;
    averageResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    errorRate: number;
    statusCodes: Record<number, number>;
  }> {
    try {
      const aggregated = await this.tryGetAggregatedStats(options);
      if (aggregated) {
        return aggregated;
      }

      const supabase = getSupabaseAdminClient();
      let query = supabase
        .from('performance_metrics')
        .select('*')
        .order('responseTime', { ascending: true });

      if (options.endpoint) {
        query = query.eq('endpoint', options.endpoint);
      }
      if (options.startDate) {
        query = query.gte('createdAt', options.startDate.toISOString());
      }
      if (options.endDate) {
        query = query.lte('createdAt', options.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const metrics = (data || []) as Array<{ responseTime: number; statusCode: number }>;
      
      if (!metrics || metrics.length === 0) {
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

      const total = metrics.length;
      const totalResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0);
      const averageResponseTime = totalResponseTime / total;

      const responseTimes = metrics.map((m) => m.responseTime).sort((a, b) => a - b);
      const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;
      const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
      const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;

      const errors = metrics.filter((m) => m.statusCode >= 400).length;
      const errorRate = (errors / total) * 100;

      const statusCodes: Record<number, number> = {};
      metrics.forEach((m) => {
        statusCodes[m.statusCode] = (statusCodes[m.statusCode] || 0) + 1;
      });

      return {
        total,
        averageResponseTime: Math.round(averageResponseTime),
        p50,
        p95,
        p99,
        errorRate: Math.round(errorRate * 10) / 10,
        statusCodes,
      };
    } catch (error) {
      logger.error('Failed to get performance stats', {
        error: error instanceof Error ? error.message : String(error),
        options,
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
}

// Singleton instance
let performanceRepositoryInstance: PerformanceRepository | null = null;

export function getPerformanceRepository(): PerformanceRepository {
  if (!performanceRepositoryInstance) {
    performanceRepositoryInstance = new PerformanceRepositoryImpl();
  }
  return performanceRepositoryInstance;
}

