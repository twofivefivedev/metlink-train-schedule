-- Add structured incident detail columns
begin;

alter table public.service_incidents
  add column if not exists "cause" text,
  add column if not exists "lineSegment" text,
  add column if not exists "replacementMode" text,
  add column if not exists "replacementOperator" text,
  add column if not exists "impactedStations" text[];

commit;

