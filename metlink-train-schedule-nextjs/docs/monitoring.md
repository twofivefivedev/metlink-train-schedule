# Monitoring & Alerting Documentation

## Overview

This application uses Sentry for error tracking and monitoring. Sentry provides real-time error tracking, performance monitoring, and alerting capabilities.

## Configuration

### Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Sentry DSN (get from https://sentry.io)
SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

### Sentry Setup

1. Create a Sentry account at https://sentry.io
2. Create a new project for this application
3. Copy the DSN and add it to your environment variables
4. Configure alert rules in Sentry dashboard

## Features

### Error Tracking

- Client-side errors are automatically captured
- Server-side errors in API routes are captured
- Errors include context (endpoint, stations, etc.)

### Performance Monitoring

- API route performance is tracked
- Traces are sampled at 10% in production, 100% in development

### Session Replay

- User sessions are recorded for debugging
- Replays are sampled at 10% for normal sessions, 100% for error sessions

## Alert Configuration

Configure alerts in the Sentry dashboard:

1. Go to Alerts → Create Alert Rule
2. Set conditions (e.g., error rate > threshold)
3. Configure notification channels (email, Slack, etc.)

## User Alerts System

The application includes a user-facing alert system for favorite routes:

### Features

- **Favorites Management**: Users can save favorite routes/stations via the FavoritesPanel component
- **Alert Types**: 
  - Delay alerts (major delays)
  - Cancellation alerts
  - Approaching train alerts (configurable minutes before arrival)
- **Notification Delivery**: Browser notifications via the Notification API and service worker
- **Storage**: Preferences stored in localStorage (with API stub for future backend integration)

### Alert Configuration

Users can enable/disable alerts via the FavoritesPanel:
- Toggle alerts on/off
- Configure approaching train notification timing (default: 5 minutes)
- Manage favorite routes

### Implementation Details

- Alert detection: `lib/utils/alertUtils.ts`
- Favorites management: `lib/utils/favorites.ts`
- Alert hook: `hooks/useAlerts.ts`
- Service worker notifications: `public/sw.js`

## Logging

Application logs are handled by the logger utility (`lib/server/logger.ts`). Log levels can be configured via `LOG_LEVEL` environment variable:

- `DEBUG`: Detailed debugging information
- `INFO`: General informational messages
- `WARN`: Warning messages
- `ERROR`: Error messages

## Metrics Endpoint

Consider adding a metrics endpoint for monitoring:

```typescript
// app/api/metrics/route.ts
export async function GET() {
  return NextResponse.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    // Add custom metrics here
  });
}
```

