/**
 * Metlink API DTOs and validation
 * Shared type definitions for Metlink API responses
 */

import { z } from 'zod';
import type { Departure, ServiceLocation, ServiceDisruption } from '@/types';

/**
 * Raw Metlink API response structure
 * This represents the exact shape of data returned from the Metlink API
 */
export interface MetlinkDepartureRaw {
  service_id: string;
  trip_id?: string | null;
  vehicle_id?: string | number | null;
  operator?: string | null;
  direction?: string | null;
  monitored?: boolean | null;
  line?: string | null;
  route?: string | null;
  platform?: string | null;
  delay?: string | null;
  wheelchair_accessible?: boolean | null;
  station?: string | null;
  stop_id?: string | null;
  origin?: {
    stop_id: string;
    name?: string | null;
  } | null;
  destination: {
    stop_id: string;
    name?: string | null;
  };
  departure: {
    aimed?: string | null;
    expected?: string | null;
  };
  status?: string | null;
  disruption?: Record<string, unknown> | null;
}

/**
 * Raw Metlink API response
 */
export interface MetlinkApiResponseRaw {
  departures: MetlinkDepartureRaw[];
}

/**
 * Type guard to check if an object is a MetlinkDepartureRaw
 */
export function isMetlinkDepartureRaw(value: unknown): value is MetlinkDepartureRaw {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.service_id === 'string' &&
    obj.destination !== null &&
    typeof obj.destination === 'object' &&
    typeof (obj.destination as Record<string, unknown>).stop_id === 'string'
  );
}

/**
 * Type guard to check if an object is a MetlinkApiResponseRaw
 */
export function isMetlinkApiResponseRaw(value: unknown): value is MetlinkApiResponseRaw {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    Array.isArray(obj.departures) &&
    obj.departures.every((dep: unknown) => isMetlinkDepartureRaw(dep))
  );
}

/**
 * Safely extract trip_id from a departure
 * Returns undefined if not present or invalid
 */
export function getTripId(departure: Departure | MetlinkDepartureRaw): string | undefined {
  return departure.trip_id ?? undefined;
}

/**
 * Safely extract status from a departure
 * Returns undefined if not present or invalid
 */
export function getStatus(departure: Departure | MetlinkDepartureRaw): string | undefined {
  return departure.status ?? undefined;
}

/**
 * Safely extract delay from a departure
 * Returns undefined if not present or invalid
 */
export function getDelay(departure: Departure | MetlinkDepartureRaw): string | undefined {
  return departure.delay ?? undefined;
}

