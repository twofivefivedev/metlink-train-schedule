# Database Migration Guide

This document describes the database migration from in-memory cache to persistent database storage.

## Overview

The application has been migrated from an in-memory cache to Supabase (PostgreSQL). The migration maintains backward compatibility by falling back to in-memory cache when Supabase is not available.

**Note:** This document is kept for historical reference. For current setup instructions, see [Supabase Setup Guide](./supabase-setup.md).

## Prerequisites

- Supabase account and project
- Node.js 18+
- Supabase CLI (optional, for local development)

## Setup

See [Supabase Setup Guide](./supabase-setup.md) for detailed setup instructions.

### Quick Start

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Configure environment variables (see `supabase-setup.md`)
3. Run migrations from `supabase/migrations/001_initial_schema.sql`
4. Generate TypeScript types: `supabase gen types typescript --linked`

## Database Schema

The database includes the following tables:

### `historical_departures`
Stores historical departure data for analytics.

- `id`: Unique identifier
- `serviceId`: Service line identifier (WRL, KPL, HVL, JVL)
- `stopId`: Stop identifier
- `station`: Station code
- `destination`: Destination name
- `destinationStopId`: Destination stop ID
- `aimedTime`: Scheduled departure time
- `expectedTime`: Expected departure time
- `status`: Departure status
- `createdAt`: Record creation timestamp

### `cache_entries`
Stores API response cache.

- `id`: Unique identifier
- `key`: Cache key
- `data`: Cached response data (JSON)
- `timestamp`: Cache creation timestamp
- `expiresAt`: Cache expiration timestamp

### `performance_metrics`
Stores API performance metrics.

- `id`: Unique identifier
- `endpoint`: API endpoint path
- `method`: HTTP method
- `statusCode`: HTTP status code
- `responseTime`: Response time in milliseconds
- `requestSize`: Request size in bytes (optional)
- `responseSize`: Response size in bytes (optional)
- `errorMessage`: Error message (if any)
- `createdAt`: Metric timestamp

### `api_request_metrics`
Stores API request metrics.

- `id`: Unique identifier
- `endpoint`: API endpoint path
- `method`: HTTP method
- `statusCode`: HTTP status code
- `responseTime`: Response time in milliseconds
- `cacheHit`: Whether cache was hit
- `errorMessage`: Error message (if any)
- `createdAt`: Metric timestamp

## Migration Process

### Automatic Fallback

The application automatically falls back to in-memory cache if:
- Supabase environment variables are not set
- Supabase connection fails
- Supabase queries fail

This ensures the application continues to work without Supabase.

### Cache Migration

Existing in-memory cache entries are not automatically migrated. The cache will rebuild as new requests come in.

### Historical Data

Historical data collection starts automatically once the database is available. No manual migration is needed.

## Production Deployment

### Vercel

1. Add Supabase environment variables to your Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Ensure migrations are applied to your Supabase project
3. Deploy as usual

### Other Platforms

1. Set Supabase environment variables
2. Ensure migrations are applied to your Supabase project
3. The application will automatically connect to Supabase

## Maintenance

### Cleanup Expired Cache Entries

Expired cache entries are automatically cleaned up on application startup. You can also manually clean them:

```sql
DELETE FROM cache_entries WHERE expires_at < NOW();
```

### Archive Old Historical Data

Consider archiving historical data older than a certain period:

```sql
DELETE FROM historical_departures 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Performance Metrics Retention

Performance metrics can grow large over time. Consider archiving old metrics:

```sql
DELETE FROM performance_metrics 
WHERE created_at < NOW() - INTERVAL '30 days';
```

## Troubleshooting

### Database Connection Issues

If Supabase is not available, check:
1. Supabase environment variables are set correctly
2. Supabase project is active
3. Network connectivity
4. Supabase credentials are correct

The application will log warnings and fall back to in-memory cache.

### Migration Errors

If migrations fail:
1. Check Supabase connection
2. Verify schema conflicts
3. Review migration files in `supabase/migrations/`
4. Check Supabase dashboard for error logs

### Type Generation Issues

If TypeScript types are not generated:
```bash
supabase gen types typescript --linked
```

## Rollback

To rollback to in-memory cache only:
1. Remove or unset Supabase environment variables
2. Restart the application

The application will automatically use in-memory cache.

## Current Status

The application now uses Supabase as the primary database. See [Supabase Setup Guide](./supabase-setup.md) for current setup instructions.

