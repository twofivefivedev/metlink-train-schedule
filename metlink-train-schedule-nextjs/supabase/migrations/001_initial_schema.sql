-- Initial database schema for Metlink Train Schedule
-- Run this migration in your Supabase SQL editor

-- Historical departure data for analytics
CREATE TABLE IF NOT EXISTS historical_departures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "serviceId" TEXT NOT NULL,
  "stopId" TEXT NOT NULL,
  station TEXT,
  destination TEXT NOT NULL,
  "destinationStopId" TEXT NOT NULL,
  "aimedTime" TIMESTAMPTZ NOT NULL,
  "expectedTime" TIMESTAMPTZ,
  status TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historical_departures_service_id ON historical_departures("serviceId");
CREATE INDEX IF NOT EXISTS idx_historical_departures_stop_id ON historical_departures("stopId");
CREATE INDEX IF NOT EXISTS idx_historical_departures_station ON historical_departures(station);
CREATE INDEX IF NOT EXISTS idx_historical_departures_aimed_time ON historical_departures("aimedTime");
CREATE INDEX IF NOT EXISTS idx_historical_departures_created_at ON historical_departures("createdAt");

-- Cache entries for API responses
CREATE TABLE IF NOT EXISTS cache_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_entries_key ON cache_entries(key);
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires_at ON cache_entries("expiresAt");

-- Performance metrics for monitoring
CREATE TABLE IF NOT EXISTS performance_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "responseTime" INTEGER NOT NULL,
  "requestSize" INTEGER,
  "responseSize" INTEGER,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_method ON performance_metrics(method);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_status_code ON performance_metrics("statusCode");
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics("createdAt");

-- API request metrics
CREATE TABLE IF NOT EXISTS api_request_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "responseTime" INTEGER NOT NULL,
  "cacheHit" BOOLEAN NOT NULL DEFAULT FALSE,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_request_metrics_endpoint ON api_request_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_request_metrics_created_at ON api_request_metrics("createdAt");

-- User preferences - identified by client-generated userId
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_user_id ON users("userId");

-- User alert preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userInternalId" TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "alertsEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "notifyOnDelay" BOOLEAN NOT NULL DEFAULT TRUE,
  "notifyOnCancellation" BOOLEAN NOT NULL DEFAULT TRUE,
  "notifyOnApproaching" BOOLEAN NOT NULL DEFAULT FALSE,
  "approachingMinutes" INTEGER NOT NULL DEFAULT 5,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schedule configurations (favorites)
CREATE TABLE IF NOT EXISTS schedule_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userInternalId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  line TEXT NOT NULL,
  "selectedStations" JSONB NOT NULL,
  direction TEXT NOT NULL,
  "selectedStation" TEXT,
  "routeFilter" TEXT NOT NULL DEFAULT 'all',
  "sortOption" TEXT NOT NULL DEFAULT 'time',
  "sortDirection" TEXT NOT NULL DEFAULT 'asc',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_configs_user_internal_id ON schedule_configs("userInternalId");
CREATE INDEX IF NOT EXISTS idx_schedule_configs_line ON schedule_configs(line);

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_configs_updated_at BEFORE UPDATE ON schedule_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

