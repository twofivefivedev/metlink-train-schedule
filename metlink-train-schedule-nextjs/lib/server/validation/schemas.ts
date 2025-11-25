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

const serviceLocationSchema = z.object({
  stop_id: z.string(),
  name: z.string().optional().nullable(),
});

const disruptionSchema = z
  .object({
    summary: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    cause: z.string().optional().nullable(),
    advice: z.string().optional().nullable(),
    lineSegment: z.string().optional().nullable(),
    line_segment: z.string().optional().nullable(),
    segment: z.string().optional().nullable(),
    impactedStations: z.array(z.string()).optional().nullable(),
    impacted_stations: z.array(z.string()).optional().nullable(),
    stations: z.array(z.string()).optional().nullable(),
    resolution_eta: z.string().optional().nullable(),
    end_time: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    updatedAt: z.string().optional().nullable(),
    replacement_mode: z.string().optional().nullable(),
    replacement_operator: z.string().optional().nullable(),
    replacement: z
      .object({
        mode: z.string().optional().nullable(),
        operator: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
      .partial()
      .optional()
      .nullable(),
    resolution: z
      .object({
        eta: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      })
      .partial()
      .optional()
      .nullable(),
  })
  .partial()
  .passthrough()
  .optional()
  .nullable();

const metlinkDepartureSchema = z.object({
  service_id: z.string(),
  trip_id: z.string().optional().nullable(),
  direction: z.string().optional().nullable(),
  vehicle_id: z.union([z.string(), z.number()]).optional().nullable(),
  operator: z.string().optional().nullable(),
  monitored: z.boolean().optional().nullable(),
  line: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  platform: z.string().optional().nullable(),
  delay: z.string().optional().nullable(),
  wheelchair_accessible: z.boolean().optional().nullable(),
  destination: serviceLocationSchema,
  origin: serviceLocationSchema.optional().nullable(),
  departure: z
    .object({
      aimed: z.string().optional().nullable(),
      expected: z.string().optional().nullable(),
    })
    .default({}),
  status: z.string().optional().nullable(),
  station: z.string().optional().nullable(),
  stop_id: z.string().optional().nullable(),
  disruption: disruptionSchema,
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

function normalizeDisruption(disruption: z.infer<typeof disruptionSchema>): Departure['disruption'] {
  if (!disruption) {
    return undefined;
  }

  const impactedStationsRaw =
    disruption.impactedStations ?? disruption.impacted_stations ?? disruption.stations;
  const impactedStations = Array.isArray(impactedStationsRaw)
    ? impactedStationsRaw.filter((station): station is string => typeof station === 'string')
    : undefined;

  const resolutionEta =
    disruption.resolution_eta ??
    disruption.end_time ??
    disruption.resolution?.eta ??
    undefined;

  const replacementMode =
    disruption.replacement?.mode ?? disruption.replacement_mode ?? undefined;
  const replacementOperator =
    disruption.replacement?.operator ?? disruption.replacement_operator ?? undefined;

  const replacement =
    replacementMode || replacementOperator || disruption.replacement?.notes
      ? {
          ...(replacementMode ? { mode: replacementMode } : {}),
          ...(replacementOperator ? { operator: replacementOperator } : {}),
          ...(disruption.replacement?.notes ? { notes: disruption.replacement.notes } : {}),
        }
      : undefined;

  return {
    summary: disruption.summary ?? disruption.description ?? undefined,
    cause: disruption.cause ?? undefined,
    advice: disruption.advice ?? undefined,
    lineSegment: disruption.lineSegment ?? disruption.line_segment ?? disruption.segment ?? undefined,
    impactedStations: impactedStations ?? undefined,
    resolutionEta: resolutionEta ?? undefined,
    replacement,
    updatedAt: disruption.updated_at ?? disruption.updatedAt ?? undefined,
    raw: disruption ?? undefined,
  };
}

export function sanitizeMetlinkDepartures(payload: unknown): Departure[] {
  const parsed = metlinkResponseSchema.parse(payload);
  return parsed.departures.map((departure) => ({
    service_id: departure.service_id,
    ...(departure.trip_id ? { trip_id: departure.trip_id } : {}),
    ...(departure.direction ? { direction: departure.direction } : {}),
    ...(departure.vehicle_id !== undefined && departure.vehicle_id !== null
      ? { vehicle_id: departure.vehicle_id }
      : {}),
    ...(departure.operator ? { operator: departure.operator } : {}),
    ...(typeof departure.monitored === 'boolean' ? { monitored: departure.monitored } : {}),
    ...(departure.line ? { line: departure.line } : {}),
    ...(departure.route ? { route: departure.route } : {}),
    ...(departure.platform ? { platform: departure.platform } : {}),
    ...(departure.delay ? { delay: departure.delay } : {}),
    ...(typeof departure.wheelchair_accessible === 'boolean'
      ? { wheelchair_accessible: departure.wheelchair_accessible }
      : {}),
    destination: {
      stop_id: departure.destination.stop_id,
      ...(departure.destination.name ? { name: departure.destination.name } : {}),
    },
    ...(departure.origin
      ? {
          origin: {
            stop_id: departure.origin.stop_id,
            ...(departure.origin.name ? { name: departure.origin.name } : {}),
          },
        }
      : {}),
    departure: {
      ...(departure.departure.aimed ? { aimed: departure.departure.aimed } : {}),
      ...(departure.departure.expected ? { expected: departure.departure.expected } : {}),
    },
    ...(departure.status ? { status: departure.status } : {}),
    ...(departure.station ? { station: departure.station } : {}),
    ...(departure.stop_id ? { stop_id: departure.stop_id } : {}),
    ...(departure.disruption ? { disruption: normalizeDisruption(departure.disruption) } : {}),
  }));
}

