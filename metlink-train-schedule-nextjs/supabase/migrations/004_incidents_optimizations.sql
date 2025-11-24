-- Service Incidents Performance Optimizations
-- Adds indexes and materialized view for faster analytics queries

-- Composite index for common query pattern: serviceId + incidentType + time range
-- Note: Cannot use NOW() in index predicate (volatile function), but this index
-- will still be efficient for time-range queries as PostgreSQL can use it effectively
CREATE INDEX IF NOT EXISTS idx_service_incidents_service_type_created 
  ON service_incidents("serviceId", "incidentType", "createdAt" DESC);

-- Composite index for summary queries filtered by serviceId
CREATE INDEX IF NOT EXISTS idx_service_incidents_service_created_composite
  ON service_incidents("serviceId", "createdAt" DESC);

-- Materialized view for daily incident aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_incident_aggregates AS
SELECT
  DATE_TRUNC('day', "createdAt") AS date,
  "serviceId",
  "incidentType",
  COUNT(*) AS count
FROM service_incidents
WHERE "createdAt" >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', "createdAt"), "serviceId", "incidentType";

-- Index on materialized view for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_incident_aggregates_unique
  ON daily_incident_aggregates(date, "serviceId", "incidentType");

CREATE INDEX IF NOT EXISTS idx_daily_incident_aggregates_date
  ON daily_incident_aggregates(date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_incident_aggregates_service
  ON daily_incident_aggregates("serviceId", date DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_daily_incident_aggregates()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_incident_aggregates;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON MATERIALIZED VIEW daily_incident_aggregates IS 'Daily aggregates of service incidents for fast summary queries. Refresh periodically via refresh_daily_incident_aggregates().';
COMMENT ON FUNCTION refresh_daily_incident_aggregates() IS 'Refreshes the daily_incident_aggregates materialized view. Can be called via cron job.';

-- Note: The materialized view should be refreshed periodically (e.g., every hour)
-- This can be done via a cron job or scheduled task calling:
-- SELECT refresh_daily_incident_aggregates();

