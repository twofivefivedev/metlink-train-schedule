/**
 * Type definitions for the application
 */

export interface ServiceLocation {
  stop_id: string;
  name?: string;
}

export interface ServiceDisruptionReplacement {
  mode?: string;
  operator?: string;
  notes?: string;
}

export interface ServiceDisruption {
  summary?: string;
  cause?: string;
  advice?: string;
  lineSegment?: string;
  impactedStations?: string[];
  resolutionEta?: string;
  replacement?: ServiceDisruptionReplacement;
  updatedAt?: string;
  raw?: Record<string, unknown>;
}

export interface Departure {
  service_id: string;
  trip_id?: string;
  vehicle_id?: string | number;
  operator?: string;
  direction?: string;
  monitored?: boolean;
  line?: string;
  route?: string;
  platform?: string;
  delay?: string;
  wheelchair_accessible?: boolean;
  station?: string;
  stop_id?: string;
  origin?: ServiceLocation;
  destination: ServiceLocation;
  departure: {
    aimed?: string;
    expected?: string;
  };
  status?: string;
  disruption?: ServiceDisruption;
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

