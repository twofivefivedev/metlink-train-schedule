/**
 * Validation schemas for user preferences and schedule configs
 * Ensures JSON payloads are validated before persisting to Supabase
 */

import { z } from 'zod';
import { SERVICE_IDS, type LineCode } from '@/lib/constants';

const lineCodes = Object.values(SERVICE_IDS) as [LineCode, ...LineCode[]];

/**
 * Schema for schedule config filters
 */
const scheduleConfigFiltersSchema = z.object({
  selectedStation: z.string().nullable(),
  routeFilter: z.enum(['all', 'express', 'all-stops']),
  sortOption: z.enum(['time', 'delay', 'status', 'station']),
  sortDirection: z.enum(['asc', 'desc']),
});

/**
 * Schema for schedule config (used for validation before DB insert)
 */
export const scheduleConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  line: z.enum(lineCodes),
  selectedStations: z.array(z.string()).min(1),
  direction: z.enum(['inbound', 'outbound']),
  filters: scheduleConfigFiltersSchema,
  createdAt: z.string().optional(),
});

/**
 * Schema for alert preferences
 */
export const alertPreferencesSchema = z.object({
  enabled: z.boolean(),
  notifyOnDelay: z.boolean(),
  notifyOnCancellation: z.boolean(),
  notifyOnApproaching: z.boolean(),
  approachingMinutes: z.number().int().min(1).max(60).default(5),
});

/**
 * Schema for schedule config selectedStations JSON field
 * Used when validating data from Supabase
 */
export const selectedStationsJsonSchema = z.array(z.string()).min(1);

/**
 * Parse and validate schedule config from unknown input
 */
export function parseScheduleConfig(input: unknown): z.infer<typeof scheduleConfigSchema> {
  return scheduleConfigSchema.parse(input);
}

/**
 * Parse and validate alert preferences from unknown input
 */
export function parseAlertPreferences(input: unknown): z.infer<typeof alertPreferencesSchema> {
  return alertPreferencesSchema.parse(input);
}

/**
 * Parse and validate selectedStations JSON array from Supabase
 */
export function parseSelectedStations(input: unknown): string[] {
  return selectedStationsJsonSchema.parse(input);
}

/**
 * Safe parse schedule config (returns null on error instead of throwing)
 */
export function safeParseScheduleConfig(
  input: unknown
): { success: true; data: z.infer<typeof scheduleConfigSchema> } | { success: false; error: z.ZodError } {
  const result = scheduleConfigSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Safe parse alert preferences (returns null on error instead of throwing)
 */
export function safeParseAlertPreferences(
  input: unknown
): { success: true; data: z.infer<typeof alertPreferencesSchema> } | { success: false; error: z.ZodError } {
  const result = alertPreferencesSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Safe parse selectedStations JSON array
 */
export function safeParseSelectedStations(
  input: unknown
): { success: true; data: string[] } | { success: false; error: z.ZodError } {
  const result = selectedStationsJsonSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

