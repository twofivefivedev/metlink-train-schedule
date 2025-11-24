/**
 * Type definitions for the application
 */

export interface Departure {
  service_id: string;
  destination: {
    stop_id: string;
    name?: string;
  };
  departure: {
    aimed?: string;
    expected?: string;
  };
  status?: string;
  stop_id?: string;
  station?: string;
}

export interface DeparturesResponse {
  inbound: Departure[];
  outbound: Departure[];
  total: number;
}

export interface StationDeparturesResponse {
  station: string;
  departures: Departure[];
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  meta?: {
    cached?: boolean;
    cacheAge?: string;
    cachedAt?: string;
    cacheStatus?: 'network' | 'stale';
    [key: string]: unknown;
  };
}

export interface MetlinkApiResponse {
  departures: Departure[];
}

export type StationCode = 'WELL' | 'PETO' | 'FEAT';

export interface CacheInfo {
  hasData: boolean;
  isValid: boolean;
  ageSeconds: number | null;
  durationSeconds: number;
}

