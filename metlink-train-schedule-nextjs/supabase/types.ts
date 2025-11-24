/**
 * Supabase TypeScript Types
 * 
 * This file is auto-generated from your Supabase schema.
 * 
 * To regenerate:
 *   supabase gen types typescript --linked > supabase/types.ts
 * 
 * Or if not linked:
 *   supabase gen types typescript --project-id your-project-ref > supabase/types.ts
 */

// Placeholder types - replace with generated types from Supabase CLI
// Run: supabase gen types typescript --linked > supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      cache_entries: {
        Row: {
          id: string
          key: string
          data: Json
          timestamp: string
          expiresAt: string
        }
        Insert: {
          id?: string
          key: string
          data: Json
          timestamp?: string
          expiresAt: string
        }
        Update: {
          id?: string
          key?: string
          data?: Json
          timestamp?: string
          expiresAt?: string
        }
      }
      historical_departures: {
        Row: {
          id: string
          serviceId: string
          stopId: string
          station: string | null
          destination: string
          destinationStopId: string
          aimedTime: string
          expectedTime: string | null
          status: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          serviceId: string
          stopId: string
          station?: string | null
          destination: string
          destinationStopId: string
          aimedTime: string
          expectedTime?: string | null
          status?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          serviceId?: string
          stopId?: string
          station?: string | null
          destination?: string
          destinationStopId?: string
          aimedTime?: string
          expectedTime?: string | null
          status?: string | null
          createdAt?: string
        }
      }
      service_incidents: {
        Row: {
          id: string
          serviceId: string
          stopId: string
          station: string | null
          destination: string
          destinationStopId: string
          aimedTime: string
          expectedTime: string | null
          incidentType: 'cancelled' | 'delayed' | 'bus_replacement'
          delayMinutes: number | null
          details: Json | null
          createdAt: string
        }
        Insert: {
          id?: string
          serviceId: string
          stopId: string
          station?: string | null
          destination: string
          destinationStopId: string
          aimedTime: string
          expectedTime?: string | null
          incidentType: 'cancelled' | 'delayed' | 'bus_replacement'
          delayMinutes?: number | null
          details?: Json | null
          createdAt?: string
        }
        Update: {
          id?: string
          serviceId?: string
          stopId?: string
          station?: string | null
          destination?: string
          destinationStopId?: string
          aimedTime?: string
          expectedTime?: string | null
          incidentType?: 'cancelled' | 'delayed' | 'bus_replacement'
          delayMinutes?: number | null
          details?: Json | null
          createdAt?: string
        }
      }
      performance_metrics: {
        Row: {
          id: string
          endpoint: string
          method: string
          statusCode: number
          responseTime: number
          requestSize: number | null
          responseSize: number | null
          errorMessage: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          endpoint: string
          method: string
          statusCode: number
          responseTime: number
          requestSize?: number | null
          responseSize?: number | null
          errorMessage?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          endpoint?: string
          method?: string
          statusCode?: number
          responseTime?: number
          requestSize?: number | null
          responseSize?: number | null
          errorMessage?: string | null
          createdAt?: string
        }
      }
      api_request_metrics: {
        Row: {
          id: string
          endpoint: string
          method: string
          statusCode: number
          responseTime: number
          cacheHit: boolean
          errorMessage: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          endpoint: string
          method: string
          statusCode: number
          responseTime: number
          cacheHit?: boolean
          errorMessage?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          endpoint?: string
          method?: string
          statusCode?: number
          responseTime?: number
          cacheHit?: boolean
          errorMessage?: string | null
          createdAt?: string
        }
      }
      users: {
        Row: {
          id: string
          userId: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          userId: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userId?: string
          createdAt?: string
          updatedAt?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          userInternalId: string
          alertsEnabled: boolean
          notifyOnDelay: boolean
          notifyOnCancellation: boolean
          notifyOnApproaching: boolean
          approachingMinutes: number
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          userInternalId: string
          alertsEnabled?: boolean
          notifyOnDelay?: boolean
          notifyOnCancellation?: boolean
          notifyOnApproaching?: boolean
          approachingMinutes?: number
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userInternalId?: string
          alertsEnabled?: boolean
          notifyOnDelay?: boolean
          notifyOnCancellation?: boolean
          notifyOnApproaching?: boolean
          approachingMinutes?: number
          createdAt?: string
          updatedAt?: string
        }
      }
      schedule_configs: {
        Row: {
          id: string
          userInternalId: string
          name: string
          line: string
          selectedStations: Json
          direction: string
          selectedStation: string | null
          routeFilter: string
          sortOption: string
          sortDirection: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          userInternalId: string
          name: string
          line: string
          selectedStations: Json
          direction: string
          selectedStation?: string | null
          routeFilter?: string
          sortOption?: string
          sortDirection?: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userInternalId?: string
          name?: string
          line?: string
          selectedStations?: Json
          direction?: string
          selectedStation?: string | null
          routeFilter?: string
          sortOption?: string
          sortDirection?: string
          createdAt?: string
          updatedAt?: string
        }
      }
    }
    Views: {
      cache_freshness: {
        Row: {
          key: string
          timestamp: string
          expiresAt: string
          status: string
          age_seconds: number | null
          remaining_seconds: number | null
        }
      }
      on_time_performance_summary: {
        Row: {
          serviceId: string
          date: string | null
          total_departures: number
          cancelled: number
          completed: number
          on_time: number
          delayed: number
          avg_delay_seconds: number | null
        }
      }
    }
    Functions: {
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      archive_old_performance_metrics: {
        Args: {
          days_to_keep?: number
        }
        Returns: number
      }
      archive_old_api_request_metrics: {
        Args: {
          days_to_keep?: number
        }
        Returns: number
      }
      get_performance_stats: {
        Args: {
          endpoint_filter?: string | null
          start_time?: string | null
          end_time?: string | null
        }
        Returns: Array<{
          total: number | null
          average_response_time: number | null
          p50: number | null
          p95: number | null
          p99: number | null
          error_rate: number | null
          status_codes: Json | null
        }>
      }
      get_incidents_summary: {
        Args: {
          service_id_filter?: string | null
          start_time?: string | null
          end_time?: string | null
        }
        Returns: Array<{
          total: number | null
          cancelled: number | null
          delayed: number | null
          bus_replacement: number | null
        }>
      }
    }
  }
}

