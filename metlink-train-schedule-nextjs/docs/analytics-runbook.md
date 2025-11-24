# Analytics System Runbook

## Overview

This document provides operational procedures for the analytics system, including incident tracking, database maintenance, and troubleshooting.

## System Architecture

### Components

1. **Incident Queue** (`lib/server/incidentQueue.ts`)
   - Background queue for processing incidents
   - Batching, retries, and circuit breaker
   - In-memory queue with automatic processing

2. **Incidents Service** (`lib/server/incidentsService.ts`)
   - Extracts incidents from departures
   - Records incidents via queue
   - Retrieves incidents for analytics

3. **Database Tables**
   - `service_incidents` - Stores incidents
   - `daily_incident_aggregates` - Materialized view for fast summaries

4. **API Endpoints**
   - `/api/analytics/incidents/summary` - Summary statistics (cached)
   - `/api/analytics/incidents/recent` - Recent incidents (paginated)

## Database Migrations

### Running Migrations

1. **Initial Setup** (if not already done):
   ```sql
   -- Run migration 003_service_incidents.sql
   -- Creates service_incidents table
   ```

2. **Performance Optimizations**:
   ```sql
   -- Run migration 004_incidents_optimizations.sql
   -- Adds indexes and materialized view
   ```

3. **Refresh Materialized View** (periodic):
   ```sql
   SELECT refresh_daily_incident_aggregates();
   ```
   Recommended: Run every hour via cron job

### Verifying Migrations

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'service_incidents'
);

-- Check if materialized view exists
SELECT EXISTS (
  SELECT FROM pg_matviews 
  WHERE matviewname = 'daily_incident_aggregates'
);

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'service_incidents';
```

## Monitoring & Health Checks

### Queue Statistics

The incident queue exposes statistics via `getIncidentQueue().getStats()`:

```typescript
{
  queueSize: number;           // Current queue size
  isProcessing: boolean;        // Whether batch is processing
  circuitBreakerOpen: boolean; // Circuit breaker state
  circuitBreakerFailures: number; // Failure count
}
```

### Log Monitoring

Key log messages to monitor:

1. **Success**:
   - `"Incidents batch processed successfully"` - Normal operation
   - `"Incidents summary fetched and cached"` - API working

2. **Warnings**:
   - `"Circuit breaker opened due to repeated failures"` - Database issues
   - `"Failed to process incidents batch"` - Transient errors

3. **Errors**:
   - `"Circuit breaker opened"` - Critical: Database unavailable
   - `"Incident exceeded max retries"` - Data loss risk

### Health Check Endpoint

Monitor `/api/health` for overall system health. Check logs for:
- Queue size growing unbounded
- Circuit breaker staying open
- High error rates

## Troubleshooting

### Issue: Queue Not Processing

**Symptoms:**
- Queue size growing
- No "batch processed" logs

**Diagnosis:**
```typescript
const queue = getIncidentQueue();
const stats = queue.getStats();
console.log(stats);
```

**Solutions:**
1. Check Supabase connectivity
2. Verify RLS policies allow service role writes
3. Check for database connection errors in logs
4. Manually flush queue: `await queue.flush()`

### Issue: Circuit Breaker Open

**Symptoms:**
- `circuitBreakerOpen: true` in stats
- No incidents being recorded

**Diagnosis:**
- Check database connection
- Verify Supabase credentials
- Check for network issues

**Solutions:**
1. Fix underlying database issue
2. Circuit breaker auto-resets after 1 minute
3. Or manually reset by fixing the root cause

### Issue: High Memory Usage

**Symptoms:**
- Queue size very large (>1000 items)
- Server memory increasing

**Solutions:**
1. Check if database is down (circuit breaker)
2. Reduce batch interval if needed
3. Increase batch size for faster processing
4. Consider persistent queue (future enhancement)

### Issue: Slow API Responses

**Symptoms:**
- `/api/analytics/incidents/summary` slow
- `/api/analytics/incidents/recent` slow

**Solutions:**
1. Check cache hit rate (should see "cache hit" logs)
2. Verify indexes exist on `service_incidents`
3. Refresh materialized view if using it
4. Check database query performance

## Performance Tuning

### Queue Configuration

Adjust in `lib/server/incidentQueue.ts`:

```typescript
{
  batchSize: 50,              // Increase for more throughput
  batchIntervalMs: 5000,     // Decrease for faster processing
  maxRetries: 3,             // Increase for resilience
  retryDelayMs: 1000,        // Exponential backoff base
  circuitBreakerThreshold: 5, // Failures before opening
  circuitBreakerResetMs: 60000, // Reset after 1 minute
}
```

### Cache Configuration

Summary endpoint cache duration: `SUMMARY_CACHE_DURATION_MS` (default: 2 minutes)

Adjust in `app/api/analytics/incidents/summary/route.ts`

### Database Optimization

1. **Refresh Materialized View**:
   ```sql
   -- Set up cron job (via Supabase dashboard or pg_cron)
   SELECT cron.schedule(
     'refresh-incident-aggregates',
     '0 * * * *', -- Every hour
     $$SELECT refresh_daily_incident_aggregates()$$
   );
   ```

2. **Monitor Index Usage**:
   ```sql
   SELECT 
     schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE tablename = 'service_incidents';
   ```

3. **Vacuum and Analyze**:
   ```sql
   VACUUM ANALYZE service_incidents;
   ```

## Rollback Procedures

### Disable Incident Recording

1. **Temporary** (code change):
   ```typescript
   // In app/api/v1/departures/route.ts
   // Comment out:
   // recordServiceIncidents(allDepartures, stationCodes.join(','))
   ```

2. **Via Environment Variable** (future):
   ```bash
   DISABLE_INCIDENT_RECORDING=true
   ```

### Rollback Database Migration

```sql
-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS daily_incident_aggregates;

-- Drop indexes (if needed)
DROP INDEX IF EXISTS idx_service_incidents_service_type_created;
DROP INDEX IF EXISTS idx_service_incidents_service_created_partial;

-- Note: Do NOT drop service_incidents table (contains data)
```

### Clear Queue

```typescript
const queue = getIncidentQueue();
await queue.flush(); // Process remaining items
// Queue will be empty after flush
```

## Feature Flags

Currently no feature flags implemented. To add:

1. Create `lib/config/featureFlags.ts`
2. Add environment variable checks
3. Use in incident recording logic

Example:
```typescript
if (process.env.ENABLE_INCIDENT_RECORDING !== 'false') {
  await recordServiceIncidents(...);
}
```

## Maintenance Tasks

### Daily

- Monitor queue statistics
- Check error logs
- Verify cache hit rates

### Weekly

- Review incident counts by type
- Check database growth
- Verify materialized view refresh

### Monthly

- Analyze query performance
- Review and optimize indexes
- Clean up old cache entries (automatic)

## Emergency Contacts

- Database Issues: Check Supabase dashboard
- Code Issues: Review GitHub repository
- Performance Issues: Check Vercel logs and metrics

## Related Documentation

- [Supabase Setup](./supabase-setup.md)
- [Database Migration](./database-migration.md)
- [Monitoring](./monitoring.md)



