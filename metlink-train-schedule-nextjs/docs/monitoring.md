# Performance Monitoring & Analytics

This document describes the performance monitoring and analytics features implemented in the application.

## Overview

The application includes comprehensive performance monitoring for both backend API routes and frontend performance. Metrics are collected and stored in the database for analysis.

## Features

### Backend Performance Monitoring

- API response time tracking
- Request/response size monitoring
- Error rate tracking
- Cache hit/miss tracking
- Status code distribution

### Frontend Performance Monitoring

- Next.js instrumentation hook
- Performance metrics collection
- Error tracking integration

## Implementation

### Performance Metrics Collection

Performance metrics are automatically collected for all API routes using the `withPerformanceMonitoring` wrapper or manual tracking.

#### Automatic Collection

```typescript
import { createPerformanceContext, recordPerformanceMetric } from '@/lib/server/performance';

export async function GET(request: NextRequest) {
  const perfContext = createPerformanceContext(request, '/api/endpoint');
  
  // ... handler logic ...
  
  recordPerformanceMetric(perfContext, 200, requestSize, responseSize);
}
```

#### API Request Metrics

```typescript
import { recordApiRequestMetric } from '@/lib/server/performance';

recordApiRequestMetric(
  '/api/endpoint',
  'GET',
  200,
  responseTime,
  cacheHit,
  errorMessage
);
```

### Database Storage

Performance metrics are stored in the `performance_metrics` and `api_request_metrics` tables. If the database is not available, metrics are only logged to the console.

### Analytics Endpoints

#### GET /api/analytics/performance

Get performance statistics for API endpoints.

**Query Parameters:**
- `endpoint` (optional): Filter by endpoint
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "averageResponseTime": 150,
    "p50": 120,
    "p95": 300,
    "p99": 500,
    "errorRate": 2.5,
    "statusCodes": {
      "200": 975,
      "500": 25
    }
  }
}
```

#### GET /api/analytics/on-time-performance

Get on-time performance metrics for train services.

**Query Parameters:**
- `serviceId` (required): Service ID (WRL, KPL, HVL, JVL)
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 500,
    "onTime": 450,
    "delayed": 40,
    "cancelled": 10,
    "averageDelay": 5.2,
    "onTimePercentage": 90.0
  }
}
```

## Monitoring Dashboard

### Historical Trends Component

The `HistoricalTrends` component displays:
- On-time performance metrics
- API performance statistics
- Visual charts and graphs

### Accessing Analytics

1. Navigate to the analytics page (if implemented)
2. Use the `/api/analytics/*` endpoints directly
3. Query the database directly for custom reports

## Metrics Explained

### Response Time Percentiles

- **P50 (Median)**: 50% of requests complete within this time
- **P95**: 95% of requests complete within this time
- **P99**: 99% of requests complete within this time

### Error Rate

Error rate is calculated as the percentage of requests with status codes >= 400.

### On-Time Performance

A departure is considered "on-time" if it arrives within 2 minutes of the scheduled time.

## Best Practices

### Monitoring Production

1. Set up alerts for high error rates (>5%)
2. Monitor P95 response times
3. Track cache hit rates
4. Review error logs regularly

### Performance Optimization

1. Use cache effectively
2. Monitor slow queries
3. Optimize database indexes
4. Review API response times

### Data Retention

Consider archiving old metrics:
- Performance metrics: 30 days
- Historical departures: 90 days
- API request metrics: 30 days

## Integration with External Services

### Sentry

Error tracking is integrated with Sentry for production environments. Errors are automatically reported when `SENTRY_DSN` is set.

### Custom Analytics

You can integrate with external analytics services by:
1. Extending the `recordPerformanceMetric` function
2. Adding custom logging in API routes
3. Using Next.js middleware for request tracking

## Troubleshooting

### Metrics Not Appearing

1. Check Supabase connection
2. Verify Supabase environment variables are set (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
3. Check application logs for errors
4. Verify Supabase migrations have been applied
5. Check Supabase dashboard for connection status

### High Response Times

1. Check database query performance
2. Review cache hit rates
3. Monitor external API calls
4. Review server resources

### Missing Historical Data

1. Verify historical data ingestion is running
2. Check database storage capacity
3. Review data retention policies
4. Check for database connection issues

### Supabase Health Monitoring

Monitor Supabase health:

1. **Connection Status**
   - Check `isSupabaseAvailable()` function logs
   - Monitor Supabase dashboard for connection errors
   - Review application logs for Supabase connection warnings

2. **Database Performance**
   - Monitor query performance in Supabase dashboard
   - Check for slow queries (>100ms)
   - Review index usage statistics

3. **Storage & Usage**
   - Monitor database size in Supabase dashboard
   - Check API usage limits
   - Review connection pool usage

4. **Error Rates**
   - Monitor Supabase error logs
   - Track failed repository operations
   - Review RLS policy violations

5. **Cache Performance**
   - Monitor cache hit/miss rates via `api_request_metrics`
   - Check cache cleanup function execution
   - Review cache entry expiration patterns
