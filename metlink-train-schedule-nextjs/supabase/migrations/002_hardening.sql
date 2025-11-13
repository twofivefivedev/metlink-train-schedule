-- Schema Hardening Migration
-- Adds indexes, constraints, RLS policies, and optimizations for production

-- ============================================================================
-- UNIQUE CONSTRAINTS & INDEXES
-- ============================================================================

-- Add unique constraint on cache_entries key (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cache_entries_key_key'
  ) THEN
    ALTER TABLE cache_entries ADD CONSTRAINT cache_entries_key_key UNIQUE (key);
  END IF;
END $$;

-- Composite index for historical_departures queries (serviceId + aimedTime)
CREATE INDEX IF NOT EXISTS idx_historical_departures_service_aimed 
  ON historical_departures("serviceId", "aimedTime" DESC);

-- Composite index for historical_departures queries (serviceId + createdAt)
CREATE INDEX IF NOT EXISTS idx_historical_departures_service_created 
  ON historical_departures("serviceId", "createdAt" DESC);

-- Composite index for performance metrics queries (endpoint + createdAt)
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint_created 
  ON performance_metrics(endpoint, "createdAt" DESC);

-- Composite index for api_request_metrics queries (endpoint + createdAt)
CREATE INDEX IF NOT EXISTS idx_api_request_metrics_endpoint_created 
  ON api_request_metrics(endpoint, "createdAt" DESC);

-- Note: Partial index with NOW() removed - cannot use VOLATILE functions in index predicates
-- The existing idx_cache_entries_expires_at index from 001_initial_schema.sql is sufficient
-- for cleanup queries (WHERE "expiresAt" < NOW() will use that index)

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_configs ENABLE ROW LEVEL SECURITY;

-- Users table: Service role can do everything, anon can only read their own
CREATE POLICY "Users: Service role full access"
  ON users FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users: Anon can read own user"
  ON users FOR SELECT
  USING (auth.role() = 'anon' AND "userId" = current_setting('request.jwt.claims', true)::json->>'userId');

-- User preferences: Service role full access, anon can only access their own
CREATE POLICY "User preferences: Service role full access"
  ON user_preferences FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "User preferences: Anon can access own preferences"
  ON user_preferences FOR ALL
  USING (
    auth.role() = 'anon' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_preferences."userInternalId"
      AND users."userId" = current_setting('request.jwt.claims', true)::json->>'userId'
    )
  );

-- Schedule configs: Service role full access, anon can only access their own
CREATE POLICY "Schedule configs: Service role full access"
  ON schedule_configs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Schedule configs: Anon can access own configs"
  ON schedule_configs FOR ALL
  USING (
    auth.role() = 'anon' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = schedule_configs."userInternalId"
      AND users."userId" = current_setting('request.jwt.claims', true)::json->>'userId'
    )
  );

-- Cache entries: Public read access (for performance), service role write access
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache entries: Public read access"
  ON cache_entries FOR SELECT
  USING (true);

CREATE POLICY "Cache entries: Service role write access"
  ON cache_entries FOR ALL
  USING (auth.role() = 'service_role');

-- Historical departures: Public read access (for analytics), service role write access
ALTER TABLE historical_departures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Historical departures: Public read access"
  ON historical_departures FOR SELECT
  USING (true);

CREATE POLICY "Historical departures: Service role write access"
  ON historical_departures FOR ALL
  USING (auth.role() = 'service_role');

-- Performance metrics: Service role only (sensitive data)
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Performance metrics: Service role only"
  ON performance_metrics FOR ALL
  USING (auth.role() = 'service_role');

-- API request metrics: Service role only (sensitive data)
ALTER TABLE api_request_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "API request metrics: Service role only"
  ON api_request_metrics FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER VIEWS FOR ANALYTICS
-- ============================================================================

-- View for cache freshness analysis
CREATE OR REPLACE VIEW cache_freshness AS
SELECT
  key,
  timestamp,
  "expiresAt",
  CASE 
    WHEN "expiresAt" > NOW() THEN 'valid'
    ELSE 'expired'
  END AS status,
  EXTRACT(EPOCH FROM (NOW() - timestamp)) AS age_seconds,
  EXTRACT(EPOCH FROM ("expiresAt" - NOW())) AS remaining_seconds
FROM cache_entries;

-- View for on-time performance summary
CREATE OR REPLACE VIEW on_time_performance_summary AS
SELECT
  "serviceId",
  DATE_TRUNC('day', "aimedTime") AS date,
  COUNT(*) AS total_departures,
  COUNT(*) FILTER (WHERE "expectedTime" IS NULL) AS cancelled,
  COUNT(*) FILTER (WHERE "expectedTime" IS NOT NULL) AS completed,
  COUNT(*) FILTER (
    WHERE "expectedTime" IS NOT NULL 
    AND EXTRACT(EPOCH FROM ("expectedTime" - "aimedTime")) <= 120
  ) AS on_time,
  COUNT(*) FILTER (
    WHERE "expectedTime" IS NOT NULL 
    AND EXTRACT(EPOCH FROM ("expectedTime" - "aimedTime")) > 120
  ) AS delayed,
  AVG(EXTRACT(EPOCH FROM ("expectedTime" - "aimedTime"))) FILTER (
    WHERE "expectedTime" IS NOT NULL
  ) AS avg_delay_seconds
FROM historical_departures
WHERE "aimedTime" >= NOW() - INTERVAL '90 days'
GROUP BY "serviceId", DATE_TRUNC('day', "aimedTime")
ORDER BY date DESC, "serviceId";

-- ============================================================================
-- FUNCTIONS FOR AUTOMATED CLEANUP
-- ============================================================================

-- Function to clean expired cache entries (can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cache_entries
  WHERE "expiresAt" < NOW() - INTERVAL '1 hour'; -- Keep expired entries for 1 hour for debugging
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old performance metrics (can be called by cron)
CREATE OR REPLACE FUNCTION archive_old_performance_metrics(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM performance_metrics
  WHERE "createdAt" < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old API request metrics (can be called by cron)
CREATE OR REPLACE FUNCTION archive_old_api_request_metrics(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_request_metrics
  WHERE "createdAt" < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE cache_entries IS 'Stores cached API responses with expiration times. Public read access for performance, service role write access.';
COMMENT ON TABLE historical_departures IS 'Historical departure data for analytics and on-time performance tracking. Public read access, service role write access.';
COMMENT ON TABLE performance_metrics IS 'API performance metrics. Service role access only.';
COMMENT ON TABLE api_request_metrics IS 'API request tracking metrics. Service role access only.';
COMMENT ON TABLE users IS 'User records identified by client-generated userId. RLS enabled.';
COMMENT ON TABLE user_preferences IS 'User alert preferences. RLS enabled for user isolation.';
COMMENT ON TABLE schedule_configs IS 'User favorite schedule configurations. RLS enabled for user isolation.';

COMMENT ON VIEW cache_freshness IS 'View showing cache entry status and age for monitoring.';
COMMENT ON VIEW on_time_performance_summary IS 'Daily summary of on-time performance by service line.';

COMMENT ON FUNCTION cleanup_expired_cache() IS 'Cleans up expired cache entries. Returns count of deleted rows.';
COMMENT ON FUNCTION archive_old_performance_metrics(INTEGER) IS 'Archives performance metrics older than specified days. Returns count of deleted rows.';
COMMENT ON FUNCTION archive_old_api_request_metrics(INTEGER) IS 'Archives API request metrics older than specified days. Returns count of deleted rows.';

