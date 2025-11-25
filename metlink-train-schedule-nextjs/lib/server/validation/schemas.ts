import { z } from 'zod';
import { SERVICE_IDS, STATION_NAMES, normalizeStationId, type LineCode } from '@/lib/constants';
import type { Departure } from '@/types';

const lineCodes = Object.values(SERVICE_IDS) as [LineCode, ...LineCode[]];

export const lineCodeSchema = z.enum(lineCodes);

export const departuresQuerySchema = z.object({
  line: lineCodeSchema.optional(),
  stations: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) {
          return true;
        }
        return value
          .split(',')
          .map((station) => normalizeStationId(station.trim()))
          .every((station) => !!STATION_NAMES[station]);
      },
      {
        message: 'stations must be a comma-separated list of valid station IDs',
      }
    ),
  prewarm: z
    .string()
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        ['true', 'false', '1', '0'].includes(value.toLowerCase()),
      {
        message: 'prewarm must be true or false',
      }
    )
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      const normalized = value.toLowerCase();
      return normalized === 'true' || normalized === '1';
    }),
});

export const stationQuerySchema = z.object({
  line: lineCodeSchema.optional(),
});

const metlinkDepartureSchema = z.object({
  service_id: z.string(),
  destination: z.object({
    stop_id: z.string(),
    name: z.string().optional().nullable(),
  }),
  departure: z
    .object({
      aimed: z.string().optional().nullable(),
      expected: z.string().optional().nullable(),
    })
    .default({}),
  status: z.string().optional().nullable(),
  station: z.string().optional().nullable(),
});

const metlinkResponseSchema = z.object({
  departures: z.array(metlinkDepartureSchema),
});

export function parseStationsParam(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value
    .split(',')
    .map((station) => normalizeStationId(station.trim()))
    .filter((station) => station.length > 0 && STATION_NAMES[station]);

  return Array.from(new Set(normalized));
}

export function sanitizeMetlinkDepartures(payload: unknown): Departure[] {
  const parsed = metlinkResponseSchema.parse(payload);
  return parsed.departures.map((departure) => ({
    service_id: departure.service_id,
    destination: {
      stop_id: departure.destination.stop_id,
      ...(departure.destination.name ? { name: departure.destination.name } : {}),
    },
    departure: {
      ...(departure.departure.aimed ? { aimed: departure.departure.aimed } : {}),
      ...(departure.departure.expected ? { expected: departure.departure.expected } : {}),
    },
    status: departure.status ?? undefined,
    station: departure.station ?? undefined,
  }));
}

