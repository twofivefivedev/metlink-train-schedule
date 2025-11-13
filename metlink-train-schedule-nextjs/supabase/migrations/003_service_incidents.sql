-- Service Incidents Migration
-- Creates table for tracking cancellations, delays, and bus replacements

-- Service incidents table
CREATE TABLE IF NOT EXISTS service_incidents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "serviceId" TEXT NOT NULL,
  "stopId" TEXT NOT NULL,
  station TEXT,
  destination TEXT NOT NULL,
  "destinationStopId" TEXT NOT NULL,
  "aimedTime" TIMESTAMPTZ NOT NULL,
  "expectedTime" TIMESTAMPTZ,
  "incidentType" TEXT NOT NULL CHECK ("incidentType" IN ('cancelled', 'delayed', 'bus_replacement')),
  "delayMinutes" INTEGER,
  details JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint to prevent duplicate incidents for the same service/departure/type
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_incidents_unique 
  ON service_incidents("serviceId", "aimedTime", "incidentType", "stopId");

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_service_incidents_service_id ON service_incidents("serviceId");
CREATE INDEX IF NOT EXISTS idx_service_incidents_stop_id ON service_incidents("stopId");
CREATE INDEX IF NOT EXISTS idx_service_incidents_station ON service_incidents(station);
CREATE INDEX IF NOT EXISTS idx_service_incidents_incident_type ON service_incidents("incidentType");
CREATE INDEX IF NOT EXISTS idx_service_incidents_aimed_time ON service_incidents("aimedTime");
CREATE INDEX IF NOT EXISTS idx_service_incidents_created_at ON service_incidents("createdAt");

-- Composite index for time-based queries
CREATE INDEX IF NOT EXISTS idx_service_incidents_type_created 
  ON service_incidents("incidentType", "createdAt" DESC);

-- Composite index for service + time queries
CREATE INDEX IF NOT EXISTS idx_service_incidents_service_created 
  ON service_incidents("serviceId", "createdAt" DESC);

-- RLS Policies
ALTER TABLE service_incidents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Service incidents: Public read access" ON service_incidents;
DROP POLICY IF EXISTS "Service incidents: Service role write access" ON service_incidents;

CREATE POLICY "Service incidents: Public read access"
  ON service_incidents FOR SELECT
  USING (true);

CREATE POLICY "Service incidents: Service role write access"
  ON service_incidents FOR ALL
  USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE service_incidents IS 'Tracks service incidents (cancellations, delays, bus replacements) for analytics. Public read access, service role write access.';
COMMENT ON COLUMN service_incidents."incidentType" IS 'Type of incident: cancelled, delayed, or bus_replacement';
COMMENT ON COLUMN service_incidents."delayMinutes" IS 'Delay in minutes (only for delayed incidents)';
COMMENT ON COLUMN service_incidents.details IS 'Additional incident details stored as JSON';

