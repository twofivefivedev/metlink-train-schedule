# Supabase Migration Runbook

This document provides step-by-step instructions for applying the schema hardening migration to your Supabase project.

## Prerequisites

- Supabase project created and accessible
- Admin access to Supabase project
- SQL Editor access in Supabase dashboard

## Migration Overview

The `002_hardening.sql` migration adds:
- Composite indexes for optimized queries
- Row Level Security (RLS) policies for data isolation
- Helper views for analytics
- Cleanup functions for maintenance
- Documentation comments

## Step-by-Step Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Navigate to your project at [supabase.com](https://supabase.com)
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Apply Initial Schema (if not already applied)**
   - Open `supabase/migrations/001_initial_schema.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Verify success message

4. **Apply Hardening Migration**
   - Open `supabase/migrations/002_hardening.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"
   - Verify success message

5. **Verify Migration**
   - Check that indexes were created:
     ```sql
     SELECT indexname FROM pg_indexes 
     WHERE tablename IN ('cache_entries', 'historical_departures', 'performance_metrics', 'api_request_metrics')
     ORDER BY indexname;
     ```
   - Check that RLS is enabled:
     ```sql
     SELECT tablename, rowsecurity 
     FROM pg_tables 
     WHERE schemaname = 'public' 
     AND tablename IN ('users', 'user_preferences', 'schedule_configs', 'cache_entries', 'historical_departures', 'performance_metrics', 'api_request_metrics');
     ```
   - Check that views were created:
     ```sql
     SELECT viewname FROM pg_views 
     WHERE schemaname = 'public' 
     AND viewname IN ('cache_freshness', 'on_time_performance_summary');
     ```

### Option 2: Using Supabase CLI

1. **Link Your Project** (if not already linked)
   ```bash
   cd metlink-train-schedule-nextjs
   supabase link --project-ref your-project-ref
   ```

2. **Apply Migrations**
   ```bash
   supabase db push
   ```

3. **Verify Migration**
   ```bash
   supabase db diff
   ```
   Should show no differences if migration was successful.

## Post-Migration Steps

### 1. Generate TypeScript Types

```bash
supabase gen types typescript --linked > supabase/types.ts
```

Or if not linked:

```bash
supabase gen types typescript --project-id your-project-ref > supabase/types.ts
```

### 2. Test RLS Policies

Test that RLS policies are working correctly:

```sql
-- Test service role access (should work)
SET ROLE service_role;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM user_preferences;
SELECT COUNT(*) FROM schedule_configs;
RESET ROLE;

-- Test anon access (should be restricted)
SET ROLE anon;
-- This should fail or return only user's own data
SELECT * FROM user_preferences;
RESET ROLE;
```

### 3. Test Helper Functions

```sql
-- Test cache cleanup function
SELECT cleanup_expired_cache();

-- Test archive functions (with dry-run by checking counts first)
SELECT COUNT(*) FROM performance_metrics WHERE "createdAt" < NOW() - INTERVAL '30 days';
SELECT archive_old_performance_metrics(30);

SELECT COUNT(*) FROM api_request_metrics WHERE "createdAt" < NOW() - INTERVAL '30 days';
SELECT archive_old_api_request_metrics(30);
```

### 4. Set Up Automated Cleanup (Optional)

You can set up Supabase cron jobs or use external schedulers to call cleanup functions:

```sql
-- Example: Schedule daily cache cleanup
-- This requires pg_cron extension (available on Supabase Pro plan)
SELECT cron.schedule(
  'cleanup-expired-cache',
  '0 2 * * *', -- Run daily at 2 AM
  $$SELECT cleanup_expired_cache()$$
);
```

Or use external cron service (Vercel Cron, GitHub Actions, etc.) to call:

```sql
SELECT cleanup_expired_cache();
SELECT archive_old_performance_metrics(30);
SELECT archive_old_api_request_metrics(30);
```

## Rollback Instructions

If you need to rollback the migration:

```sql
-- Disable RLS (if needed)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE cache_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE historical_departures DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_metrics DISABLE ROW LEVEL SECURITY;

-- Drop policies (example - adjust as needed)
DROP POLICY IF EXISTS "Users: Service role full access" ON users;
DROP POLICY IF EXISTS "Users: Anon can read own user" ON users;
-- ... repeat for all policies

-- Drop views
DROP VIEW IF EXISTS cache_freshness;
DROP VIEW IF EXISTS on_time_performance_summary;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_expired_cache();
DROP FUNCTION IF EXISTS archive_old_performance_metrics(INTEGER);
DROP FUNCTION IF EXISTS archive_old_api_request_metrics(INTEGER);

-- Drop indexes (optional - keep for performance)
DROP INDEX IF EXISTS idx_historical_departures_service_aimed;
DROP INDEX IF EXISTS idx_historical_departures_service_created;
DROP INDEX IF EXISTS idx_performance_metrics_endpoint_created;
DROP INDEX IF EXISTS idx_api_request_metrics_endpoint_created;
DROP INDEX IF EXISTS idx_cache_entries_expires_at_cleanup;
```

## Troubleshooting

### Migration Fails with "Already Exists" Errors

The migration uses `IF NOT EXISTS` and `DO $$` blocks to handle existing objects gracefully. If you see errors:

1. Check which objects already exist
2. Manually remove conflicting objects if needed
3. Re-run migration

### RLS Policies Blocking Service Role

If service role queries are blocked:

1. Verify you're using the service role key (not anon key)
2. Check that policies allow `service_role`:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'your_table';
   ```

### Performance Issues After Migration

If queries are slower after adding indexes:

1. Run `ANALYZE` on tables:
   ```sql
   ANALYZE cache_entries;
   ANALYZE historical_departures;
   ANALYZE performance_metrics;
   ANALYZE api_request_metrics;
   ```
2. Check index usage:
   ```sql
   SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
   ```

## Verification Checklist

- [ ] Initial schema migration applied successfully
- [ ] Hardening migration applied successfully
- [ ] All indexes created
- [ ] RLS enabled on all user tables
- [ ] RLS policies created and working
- [ ] Views created and accessible
- [ ] Functions created and executable
- [ ] TypeScript types generated
- [ ] Application connects successfully
- [ ] Queries work as expected

## Support

If you encounter issues:

1. Check Supabase logs in dashboard
2. Review migration SQL for syntax errors
3. Verify Supabase project status
4. Check application logs for connection errors



