# Database Migration Guide

This document describes the database migration from in-memory cache to persistent database storage.

## Overview

The application has been migrated from an in-memory cache to a PostgreSQL database using Prisma ORM. The migration maintains backward compatibility by falling back to in-memory cache when the database is not available.

## Prerequisites

- PostgreSQL database (local or hosted)
- Node.js 18+
- Prisma CLI (included in dependencies)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database

Set the `DATABASE_URL` environment variable in your `.env.local` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/metlink_train_schedule?schema=public"
```

For production, use your hosted database URL (e.g., from Vercel Postgres, Supabase, or Railway).

### 3. Run Migrations

```bash
npx prisma migrate dev
```

This will:
- Create the database schema
- Generate Prisma Client
- Apply all migrations

### 4. Generate Prisma Client

```bash
npx prisma generate
```

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
- `DATABASE_URL` is not set
- Database connection fails
- Database queries fail

This ensures the application continues to work without a database.

### Cache Migration

Existing in-memory cache entries are not automatically migrated. The cache will rebuild as new requests come in.

### Historical Data

Historical data collection starts automatically once the database is available. No manual migration is needed.

## Production Deployment

### Vercel

1. Add `DATABASE_URL` to your Vercel environment variables
2. Run migrations during build:

```bash
npx prisma migrate deploy
```

3. Generate Prisma Client:

```bash
npx prisma generate
```

### Other Platforms

1. Set `DATABASE_URL` environment variable
2. Run migrations before starting the application
3. Ensure Prisma Client is generated

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

If the database is not available, check:
1. `DATABASE_URL` is set correctly
2. Database server is running
3. Network connectivity
4. Database credentials are correct

The application will log warnings and fall back to in-memory cache.

### Migration Errors

If migrations fail:
1. Check database connection
2. Verify schema conflicts
3. Review migration files in `prisma/migrations/`
4. Reset database if needed: `npx prisma migrate reset` (⚠️ deletes all data)

### Prisma Client Issues

If Prisma Client is not generated:
```bash
npx prisma generate
```

## Rollback

To rollback to in-memory cache only:
1. Remove or unset `DATABASE_URL` environment variable
2. Restart the application

The application will automatically use in-memory cache.

