/**
 * Service Incidents Repository
 * Typed repository for service_incidents table operations
 */

import { getSupabaseAdminClient } from '../supabaseAdmin';
import { logger } from '../logger';
import type { Database, Json } from '@/supabase/types';

type ServiceIncident = Database['public']['Tables']['service_incidents']['Row'];
type ServiceIncidentInsert = Database['public']['Tables']['service_incidents']['Insert'];

export type IncidentType = 'cancelled' | 'delayed' | 'bus_replacement';

export interface ServiceIncidentRecord {
  serviceId: string;
  stopId: string;
  station?: string | null;
  destination: string;
  destinationStopId: string;
  aimedTime: Date;
  expectedTime?: Date | null;
  incidentType: IncidentType;
  delayMinutes?: number | null;
  details?: Record<string, unknown> | null;
}

export interface IncidentsRepository {
  insert(incidents: ServiceIncidentRecord[]): Promise<void>;
  query(options: {
    serviceId?: string;
    stopId?: string;
    station?: string;
    incidentType?: IncidentType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ServiceIncident[]>;
  getSummary(options: {
    serviceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    total: number;
    cancelled: number;
    delayed: number;
    busReplacement: number;
    byType: Record<IncidentType, number>;
  }>;
}

class IncidentsRepositoryImpl implements IncidentsRepository {
  async insert(incidents: ServiceIncidentRecord[]): Promise<void> {
    if (incidents.length === 0) {
      return;
    }

    try {
      const supabase = getSupabaseAdminClient();
      const records: ServiceIncidentInsert[] = incidents.map((incident) => ({
        serviceId: incident.serviceId,
        stopId: incident.stopId,
        station: incident.station || null,
        destination: incident.destination,
        destinationStopId: incident.destinationStopId,
        aimedTime: incident.aimedTime.toISOString(),
        expectedTime: incident.expectedTime?.toISOString() || null,
        incidentType: incident.incidentType,
        delayMinutes: incident.delayMinutes || null,
        details: (incident.details as Json) || null,
      }));

      const { error } = await (supabase
        .from('service_incidents') as any)
        .insert(records);

      if (error) {
        // Ignore duplicate key errors (unique constraint violations)
        if (
          !error.message.includes('duplicate') &&
          !error.code?.includes('23505') &&
          !error.message.includes('unique')
        ) {
          throw error;
        }
        // Log duplicate attempts but don't fail
        logger.debug('Duplicate incident detected, skipping', {
          count: incidents.length,
        });
      } else {
        logger.debug('Service incidents inserted', {
          count: records.length,
        });
      }
    } catch (error) {
      logger.error('Failed to insert service incidents', {
        error: error instanceof Error ? error.message : String(error),
        count: incidents.length,
      });
      throw error;
    }
  }

  async query(options: {
    serviceId?: string;
    stopId?: string;
    station?: string;
    incidentType?: IncidentType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ServiceIncident[]> {
    try {
      const supabase = getSupabaseAdminClient();
      let query = supabase
        .from('service_incidents')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(options.limit || 1000);

      if (options.serviceId) {
        query = query.eq('serviceId', options.serviceId);
      }
      if (options.stopId) {
        query = query.eq('stopId', options.stopId);
      }
      if (options.station) {
        query = query.eq('station', options.station);
      }
      if (options.incidentType) {
        query = query.eq('incidentType', options.incidentType);
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

      return data || [];
    } catch (error) {
      logger.error('Failed to query service incidents', {
        error: error instanceof Error ? error.message : String(error),
        options,
      });
      throw error;
    }
  }

  async getSummary(options: {
    serviceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    total: number;
    cancelled: number;
    delayed: number;
    busReplacement: number;
    byType: Record<IncidentType, number>;
  }> {
    try {
      const supabase = getSupabaseAdminClient();
      let query = supabase.from('service_incidents').select('incidentType');

      if (options.serviceId) {
        query = query.eq('serviceId', options.serviceId);
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

      const incidents = (data || []) as Array<{ incidentType: IncidentType }>;
      const total = incidents.length;
      const cancelled = incidents.filter((i) => i.incidentType === 'cancelled').length;
      const delayed = incidents.filter((i) => i.incidentType === 'delayed').length;
      const busReplacement = incidents.filter((i) => i.incidentType === 'bus_replacement').length;

      return {
        total,
        cancelled,
        delayed,
        busReplacement,
        byType: {
          cancelled,
          delayed,
          bus_replacement: busReplacement,
        },
      };
    } catch (error) {
      logger.error('Failed to get incidents summary', {
        error: error instanceof Error ? error.message : String(error),
        options,
      });
      throw error;
    }
  }
}

// Singleton instance
let incidentsRepositoryInstance: IncidentsRepository | null = null;

export function getIncidentsRepository(): IncidentsRepository {
  if (!incidentsRepositoryInstance) {
    incidentsRepositoryInstance = new IncidentsRepositoryImpl();
  }
  return incidentsRepositoryInstance;
}

