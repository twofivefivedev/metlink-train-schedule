# API Request Frequency Analysis

## Current Implementation

### Client-Side Polling
- **Polling Interval**: 5 minutes (300,000ms) - `REFRESH_INTERVALS.DEFAULT` (optimized from 2 minutes)
- **Location**: `hooks/useTrainSchedule.ts`
- **Behavior**: Automatic polling every 5 minutes, plus manual refresh capability
- **Visibility-based pausing**: Polling pauses when tab is hidden

### Backend Caching
- **Cache Duration**: 6 minutes (360,000ms) - `CACHE_DURATION.DEFAULT` (optimized from 1 minute)
- **Location**: `lib/server/cache.ts`
- **Cache Key**: `${sortedStations}-${serviceId}`
- **Optimization**: Cache exceeds polling interval, ensuring most polls hit cache

### API Request Pattern
- **Location**: `lib/server/metlinkService.ts`
- **Per Station**: Tries multiple platform variants (e.g., PETO → PETO, PETO1, PETO2)
- **Example**: Wairarapa Line with 12 stations = 12-36 API calls per request
  - Single platform stations: 1 API call each
  - Multi-platform stations (PETO, WELL, etc.): 2-3 API calls each
- **Frequency**: Every 5 minutes (polling interval), but cache hits mean actual API calls are rare

### Request Volume Estimate (Before Optimizations)
- **Per Poll**: 12-36 API calls (depending on station platform variants)
- **Per Hour**: ~360-1,080 API calls (30 polls × 12-36 calls at 2-min interval)
- **Per Day**: ~8,640-25,920 API calls (24 hours continuous)

### Request Volume Estimate (After Optimizations)
- **Per Poll**: 12-36 API calls (only when cache expires)
- **Per Hour**: ~12-36 API calls (12 polls/hour at 5-min interval, but cache hits mean ~1-2 actual requests)
- **Per Day (24h continuous)**: ~288-864 API calls (much lower due to cache hits)
- **Realistic Daily (per user)**: ~12-72 API calls (typical 10-30 min sessions)

## Issues Identified

1. **Cache-Polling Mismatch**: Cache expires (1 min) before next poll (2 min), causing every poll to trigger new API calls
2. **No Visibility Pausing**: Polls continue when tab is hidden/inactive
3. **No Manual-Only Mode**: Always polls automatically, no option for on-demand only
4. **No Request Metrics**: No tracking of API call volume to monitor usage

## Improvement Opportunities

1. **Align Cache Duration**: Extend cache to 3+ minutes to cover polling interval
2. **Visibility-Based Pausing**: Pause polling when tab is hidden
3. **Manual Refresh Option**: Allow disabling auto-refresh, manual refresh only
4. **Request Metrics**: Add logging/metrics to track API call volume

