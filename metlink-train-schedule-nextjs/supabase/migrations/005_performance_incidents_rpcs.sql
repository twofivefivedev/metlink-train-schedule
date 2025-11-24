-- Create helper RPC for aggregated performance metrics
create or replace function public.get_performance_stats(
  endpoint_filter text default null,
  start_time timestamptz default null,
  end_time timestamptz default null
)
returns table (
  total integer,
  average_response_time numeric,
  p50 numeric,
  p95 numeric,
  p99 numeric,
  error_rate numeric,
  status_codes jsonb
) as $$
begin
  return query
  with filtered as (
    select responseTime, statusCode, "createdAt"
    from public.performance_metrics
    where (endpoint_filter is null or endpoint = endpoint_filter)
      and (start_time is null or "createdAt" >= start_time)
      and (end_time is null or "createdAt" <= end_time)
  ),
  stats as (
    select
      count(*) as total_count,
      avg(responseTime)::numeric as avg_time,
      percentile_cont(0.5) within group (order by responseTime) as p50_time,
      percentile_cont(0.95) within group (order by responseTime) as p95_time,
      percentile_cont(0.99) within group (order by responseTime) as p99_time
    from filtered
  ),
  error_stats as (
    select
      case
        when count(*) = 0 then 0
        else (sum(case when statusCode >= 400 then 1 else 0 end)::numeric / count(*)) * 100
      end as err_rate
    from filtered
  ),
  status_counts as (
    select coalesce(jsonb_object_agg(statusCode, cnt), '{}'::jsonb) as codes
    from (
      select statusCode::text as statusCode, count(*) as cnt
      from filtered
      group by statusCode
    ) sc
  )
  select
    coalesce(stats.total_count, 0) as total,
    coalesce(stats.avg_time, 0) as average_response_time,
    coalesce(stats.p50_time, 0) as p50,
    coalesce(stats.p95_time, 0) as p95,
    coalesce(stats.p99_time, 0) as p99,
    coalesce(error_stats.err_rate, 0) as error_rate,
    status_counts.codes as status_codes
  from stats
  cross join error_stats
  cross join status_counts;
end;
$$ language plpgsql stable;

comment on function public.get_performance_stats is
  'Returns aggregated performance metrics (totals, percentiles, error rate, statusCode counts).';


-- Create helper RPC for incidents summary
create or replace function public.get_incidents_summary(
  service_id_filter text default null,
  start_time timestamptz default null,
  end_time timestamptz default null
)
returns table (
  total integer,
  cancelled integer,
  delayed integer,
  bus_replacement integer
) as $$
begin
  return query
  with filtered as (
    select incidentType
    from public.service_incidents
    where (service_id_filter is null or "serviceId" = service_id_filter)
      and (start_time is null or "createdAt" >= start_time)
      and (end_time is null or "createdAt" <= end_time)
  ),
  counts as (
    select
      count(*) filter (where incidentType = 'cancelled') as cancelled_count,
      count(*) filter (where incidentType = 'delayed') as delayed_count,
      count(*) filter (where incidentType = 'bus_replacement') as bus_count,
      count(*) as total_count
    from filtered
  )
  select
    coalesce(total_count, 0) as total,
    coalesce(cancelled_count, 0) as cancelled,
    coalesce(delayed_count, 0) as delayed,
    coalesce(bus_count, 0) as bus_replacement
  from counts;
end;
$$ language plpgsql stable;

comment on function public.get_incidents_summary is
  'Returns aggregate counts of service incidents for the requested filter window.';