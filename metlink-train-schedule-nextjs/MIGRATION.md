# Migration Guide: CRA + Express to Next.js TypeScript

This document outlines the migration from the previous Create React App (CRA) frontend and Express backend to a unified Next.js 14 TypeScript application.

## Overview

The migration consolidates two separate projects into a single Next.js application:

- **Old**: `wairarapa-train-schedule` (CRA) + `wairarapa-api` (Express)
- **New**: `metlink-train-schedule-nextjs` (Next.js 14 with TypeScript)

## Key Changes

### Architecture

1. **Unified Codebase**: Frontend and backend are now in a single Next.js project
2. **TypeScript**: Full type safety across the entire application
3. **App Router**: Using Next.js 14 App Router instead of Pages Router
4. **API Routes**: Express routes migrated to Next.js API routes (`app/api/*`)

### File Structure Changes

#### Backend Migration

| Old Location | New Location |
|--------------|--------------|
| `wairarapa-api/server.js` | `app/api/*/route.ts` |
| `wairarapa-api/routes/departures.js` | `app/api/wairarapa-departures/route.ts` |
| `wairarapa-api/routes/health.js` | `app/api/health/route.ts` |
| `wairarapa-api/services/metlinkService.js` | `lib/server/metlinkService.ts` |
| `wairarapa-api/services/departureService.js` | `lib/server/departureService.ts` |
| `wairarapa-api/utils/logger.js` | `lib/server/logger.ts` |
| `wairarapa-api/utils/retry.js` | `lib/server/retry.ts` |
| `wairarapa-api/middleware/cache.js` | `lib/server/cache.ts` |
| `wairarapa-api/config/constants.js` | `lib/constants.ts` |

#### Frontend Migration

| Old Location | New Location |
|--------------|--------------|
| `wairarapa-train-schedule/src/App.js` | `app/page.tsx` |
| `wairarapa-train-schedule/src/components/TrainSchedule.js` | `app/page.tsx` (merged) |
| `wairarapa-train-schedule/src/components/*.jsx` | `components/*.tsx` |
| `wairarapa-train-schedule/src/hooks/useTrainSchedule.js` | `hooks/useTrainSchedule.ts` |
| `wairarapa-train-schedule/src/services/apiService.js` | `lib/api/client.ts` |
| `wairarapa-train-schedule/src/utils/departureUtils.js` | `lib/utils/departureUtils.ts` |
| `wairarapa-train-schedule/src/config/constants.js` | `lib/constants.ts` (merged) |

### Type Definitions

New `types/index.ts` file contains all TypeScript interfaces:
- `Departure`
- `DeparturesResponse`
- `StationDeparturesResponse`
- `ApiResponse<T>`
- `StationCode`
- `CacheInfo`

### Environment Variables

The environment variable structure remains the same, but now uses Next.js conventions:

| Variable | Old Location | New Location |
|----------|--------------|--------------|
| `METLINK_API_KEY` | `wairarapa-api/.env` | `.env.local` (root) |
| `PORT` | `wairarapa-api/.env` | Not needed (Next.js handles) |
| `NODE_ENV` | `wairarapa-api/.env` | Automatic in Next.js |

### API Client Changes

**Old (CRA)**:
```javascript
import { getWairarapaDepartures } from '../services/apiService';
// Used BASE_URL from config
```

**New (Next.js)**:
```typescript
import { getWairarapaDepartures } from '@/lib/api/client';
// Uses relative URLs (same-origin) or NEXT_PUBLIC_API_BASE
```

### Component Changes

All components converted from `.jsx` to `.tsx` with proper TypeScript types:

- `Button` - Added `ButtonProps` interface
- `Card` - Added proper HTML element types
- `Badge` - Added `BadgeProps` interface with variants
- `DepartureRow` - Added `DepartureRowProps` interface
- `DirectionTable` - Added `DirectionTableProps` interface

### Hook Changes

`useTrainSchedule` hook now has proper TypeScript return types:

```typescript
interface UseTrainScheduleReturn {
  departures: { inbound: Departure[]; outbound: Departure[] };
  loading: boolean;
  refreshing: boolean;
  error: { message: string; type: string; retry: () => void } | null;
  lastUpdated: Date | null;
  refresh: () => void;
}
```

## Deployment Changes

### Old Setup

- **Frontend**: Deployed separately (Vercel or similar)
- **Backend**: Deployed separately (Vercel serverless functions or Railway)

### New Setup

- **Unified**: Single Next.js application deployed to Vercel
- **API Routes**: Automatically converted to serverless functions
- **Environment Variables**: Set in Vercel dashboard (same variables)

## Migration Steps

1. **Backup old projects**: Keep `wairarapa-api` and `wairarapa-train-schedule` as reference
2. **Set up new project**: Clone and install dependencies
3. **Configure environment**: Copy `.env` values to `.env.local`
4. **Test locally**: Run `npm run dev` and verify functionality
5. **Deploy**: Push to Git and deploy on Vercel
6. **Update environment variables**: Set in Vercel dashboard
7. **Verify**: Test all endpoints and UI functionality
8. **Archive old projects**: Once verified, archive or remove old projects

## Breaking Changes

1. **API Base URL**: If using separate domains, update `NEXT_PUBLIC_API_BASE`
2. **CORS**: No longer needed (same-origin requests)
3. **Port Configuration**: Next.js uses port 3000 by default (configurable via `-p` flag)

## Feature Parity

All features from the old implementation are preserved:

- ✅ Real-time departure fetching
- ✅ Auto-refresh (every 2 minutes)
- ✅ Station filtering
- ✅ Direction separation (inbound/outbound)
- ✅ Status indicators
- ✅ Bus replacement detection
- ✅ Delay information
- ✅ Caching (in-memory)
- ✅ Error handling and retry logic
- ✅ Responsive design
- ✅ Loading states

## Testing Checklist

- [ ] Home page loads correctly
- [ ] Departures fetch successfully
- [ ] Auto-refresh works
- [ ] Manual refresh works
- [ ] Error handling displays correctly
- [ ] Mobile layout works
- [ ] Desktop layout works
- [ ] Status badges display correctly
- [ ] Bus replacement indicators show
- [ ] Delay information displays
- [ ] API routes respond correctly
- [ ] Health check endpoint works
- [ ] Caching works as expected

## Rollback Plan

If issues occur, you can rollback by:

1. Reverting to the old Git branch
2. Redeploying old projects separately
3. Updating frontend API base URL if needed

## Support

For issues or questions about the migration, refer to:
- Next.js documentation: https://nextjs.org/docs
- TypeScript documentation: https://www.typescriptlang.org/docs
- Project README: `README.md`

