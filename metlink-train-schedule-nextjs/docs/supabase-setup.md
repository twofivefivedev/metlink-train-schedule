# Supabase Setup Guide

This guide covers setting up Supabase for the Metlink Train Schedule application.

## Overview

The application uses Supabase as its primary database for:

- API response caching (`cache_entries`)
- Historical departure data (`historical_departures`)
- Performance metrics (`performance_metrics`, `api_request_metrics`)
- User preferences (`users`, `user_preferences`, `schedule_configs`)

## Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- Supabase CLI (for local development)

## Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project
3. Note your project URL and API keys from Settings > API

### 2. Install Supabase CLI (Optional, for local development)

```bash
npm install -g supabase
```

### 3. Link Local Project (Optional)

If using Supabase CLI for local development:

```bash
cd metlink-train-schedule-nextjs
supabase link --project-ref your-project-ref
```

### 4. Run Migrations

Apply the database schema:

**Option A: Using Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the migration

**Option B: Using Supabase CLI**

```bash
supabase db push
```

### 5. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Metlink API
METLINK_API_KEY=your_metlink_api_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Override Supabase URL for local development
# SUPABASE_URL=http://localhost:54321
```

**Important:**

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public and safe to expose in client-side code
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to the client

### 6. Generate TypeScript Types

Generate TypeScript types from your Supabase schema:

```bash
supabase gen types typescript --linked > supabase/types.ts
```

Or if not linked:

```bash
supabase gen types typescript --project-id your-project-ref > supabase/types.ts
```

## Local Development with Supabase CLI

For local development, you can run Supabase locally:

```bash
# Start local Supabase (requires Docker)
supabase start

# This will output local credentials:
# API URL: http://localhost:54321
# anon key: <local-anon-key>
# service_role key: <local-service-role-key>
```

Then update your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
```

## Database Schema

The application uses the following tables:

### `cache_entries`

Stores cached API responses with expiration times.

### `historical_departures`

Stores historical departure data for analytics and on-time performance tracking.

### `performance_metrics`

Tracks API endpoint performance metrics.

### `api_request_metrics`

Tracks API request metrics including cache hits/misses.

### `users`

User records identified by client-generated userId.

### `user_preferences`

User alert preferences.

### `schedule_configs`

User's favorite schedule configurations.

See `supabase/migrations/001_initial_schema.sql` for the complete schema.

## Row Level Security (RLS)

RLS policies are configured to ensure:

- Users can only access their own preferences and configs
- Public read access to cache entries (for performance)
- Service role has full access for server-side operations

## Troubleshooting

### Connection Issues

If you see "Supabase not available" warnings:

1. Verify environment variables are set correctly
2. Check that your Supabase project is active
3. Verify network connectivity
4. Check Supabase project status in dashboard

The application will gracefully fall back to in-memory cache if Supabase is unavailable.

### Migration Errors

If migrations fail:

1. Check that you have the correct permissions
2. Verify the migration SQL syntax
3. Check for existing tables that might conflict
4. Review Supabase logs in the dashboard

### Type Generation Issues

If type generation fails:

1. Ensure Supabase CLI is installed and up to date
2. Verify project link or project ID is correct
3. Check that migrations have been applied
4. Try regenerating: `supabase gen types typescript --linked`

## Production Deployment

### Vercel

1. Add environment variables in Vercel dashboard:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Ensure migrations are applied to production database

3. Deploy as usual - the application will automatically use Supabase

### Other Platforms

1. Set the same environment variables
2. Ensure migrations are applied
3. The application will automatically connect to Supabase

## Monitoring

Monitor Supabase usage:

- Check Supabase dashboard for database size and query performance
- Review API usage in Supabase dashboard
- Monitor error logs in application logs

## Backup and Recovery

Supabase provides automatic backups. For manual backups:

1. Use Supabase dashboard > Database > Backups
2. Or use `pg_dump` with connection string from Supabase dashboard

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)


