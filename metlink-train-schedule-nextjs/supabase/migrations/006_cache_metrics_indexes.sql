-- Cache and analytics indexes
create index if not exists idx_cache_entries_key_expires
  on public.cache_entries (key, "expiresAt" desc);

create index if not exists idx_performance_metrics_endpoint_time
  on public.performance_metrics (endpoint, "createdAt" desc);

create index if not exists idx_service_incidents_created_at
  on public.service_incidents ("createdAt" desc);

-- Optional helper to refresh materialized views if they exist
create or replace function public.refresh_incident_aggregates()
returns void
language plpgsql
as $$
begin
  perform 1
  from pg_matviews
  where schemaname = 'public' and matviewname = 'daily_incident_aggregates';

  if found then
    execute 'refresh materialized view concurrently public.daily_incident_aggregates';
  end if;
end;
$$;

comment on function public.refresh_incident_aggregates is
  'Refreshes the daily_incident_aggregates view if it exists.';

