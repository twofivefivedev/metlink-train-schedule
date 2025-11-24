# 2025-11 Optimization Recommendations

Date: 2025-11-24  
Scope: Fast-path backend, frontend, and reliability wins for the Metlink train schedule experience.

## Executive Overview

- **Backend/API:** Focus on reducing redundant upstream calls and Supabase round trips; add server-side summarization instead of loading entire tables into Node; tighten client retries with abortable requests.
- **Frontend/UX:** Consolidate preference fetching, virtualize large selectors, and trim re-render hotspots (per-row timers, synchronous chart bundles).
- **Reliability & Offline:** Introduce stale-while-revalidate behavior, smarter polling, and a richer service worker/offline cache so riders see last-known data even when Metlink or the network blips.

Each section below lists the current behavior, why it hurts performance or accuracy, and concrete follow-ups.

---

## Backend & API Optimizations

### 1. Platform variant lookup & station fan-out _(Done – Nov 24, 2025)_

- **Current:** `getWairarapaDepartures` loops over every platform variant sequentially, and `getMultipleStationDepartures` fires an unbounded `Promise.all` for every stop on a line (60+ requests in peak cases).

```173:260:lib/server/metlinkService.ts
export async function getWairarapaDepartures(
  stopId: string,
  serviceId: string = SERVICE_IDS.WAIRARAPA_LINE
): Promise<Departure[]> {
  ...
  for (const platformId of platformVariants) {
    try {
      const data = await getStopPredictions(platformId);
      const departures = data.departures || [];
      allDepartures = allDepartures.concat(departures);
    } catch (error) {
      logger.debug(`Failed to fetch predictions for platform ${platformId}, trying next variant`);
    }
  }
  ...
}

export async function getMultipleStationDepartures(
  stopIds: string[],
  serviceId: string = SERVICE_IDS.WAIRARAPA_LINE
): Promise<Departure[][]> {
  const promises = stopIds.map(async (stopId) => {
    try {
      const departures = await getWairarapaDepartures(stopId, serviceId);
      return departures.map(departure => ({
        ...departure,
        station: stopId,
      }));
    } catch (error) {
      ...
      return [];
    }
  });

  return Promise.all(promises);
}
```

- **Impact:** A single `/api/v1/departures` call can issue hundreds of sequential Metlink requests when a station has multiple platforms, and tens of concurrent requests per line, leading to slow responses and possible rate limiting.
- **Remediation:** Added an in-memory station cache with short-lived TTLs, short-circuited platform probing once live data arrives, and wrapped the multi-station fetcher in a concurrency limiter (defaults to six inflight calls). These changes shipped in `lib/server/metlinkService.ts`.

### 2. Supabase cache and metrics pressure _(Done – Nov 24, 2025)_

- **Current:** Every cache `get`, `set`, `isValid`, and `getAge` call hits Supabase whenever `useDatabase` is true, and it flips to in-memory only once an error occurs.

```68:190:lib/server/cache.ts
async isValid(key: string = 'default'): Promise<boolean> {
  if (this.useDatabase) {
    const cacheRepo = getCacheRepository();
    const data = await cacheRepo.get(key);
    return data !== null;
  }
  ...
}

async get(key: string = 'default'): Promise<DeparturesResponse | null> {
  const valid = await this.isValid(key);
  ...
  if (this.useDatabase) {
    const cacheRepo = getCacheRepository();
    return await cacheRepo.get(key);
  }
  ...
}
```

- **Impact:** A cache hit still performs multiple Supabase round trips (validity + fetch + age), amplifying tail latency under load.
- **Remediation:** `lib/server/cache.ts` now caches metadata locally, only hitting Supabase when local TTLs expire, and adapts the cache duration dynamically (shorter during peak, longer overnight). Database calls populate the local store so subsequent requests stay in-memory.

### 3. Heavy analytics queries on the application tier _(Done – Nov 24, 2025)_

- **Current:** `getPerformanceStats` selects _all_ rows that match the filter, sorts them in Node, and computes percentiles locally.

```119:194:lib/server/db/performanceRepository.ts
let query = supabase
  .from('performance_metrics')
  .select('*')
  .order('responseTime', { ascending: true });
...
const metrics = (data || []) as Array<{ responseTime: number; statusCode: number }>;
const responseTimes = metrics.map((m) => m.responseTime).sort((a, b) => a - b);
```

- **Impact:** When performance data grows, each dashboard view drags thousands of rows into Node just to compute aggregates, slowing both Supabase and the page.
- **Remediation:** Created `supabase/migrations/005_performance_incidents_rpcs.sql`, which defines `get_performance_stats` and `get_incidents_summary`. The repositories now call these RPCs and only fall back to the legacy per-row queries if the functions are unavailable. Production was redeployed (`vercel deploy --prod`) and both `/api/analytics/performance` and `/api/analytics/incidents/summary` were verified post-deploy.

### 4. Client fetches lack abort/timeouts _(Done – Nov 24, 2025)_

- **Current:** `lib/api/client.ts` retries requests but never sets a timeout or abort signal.

```19:72:lib/api/client.ts
const response = await fetch(url, {
  ...options,
  headers: {
    'Content-Type': 'application/json',
    ...options.headers,
  },
});
```

- **Impact:** Hung fetches tie up browser/network threads and block UI feedback (no spinner completion).
- **Remediation:** `lib/api/client.ts` now wraps every call with an `AbortController`, enforcing `API_TIMEOUT_MS` (10s default), tying into any user-provided signal, and surfacing consistent timeout errors back to `useTrainSchedule`.

### 5. API validation & rate limiting _(Done – Nov 24, 2025)_

- **Current:** High-traffic routes (`app/api/v1/departures/route.ts`, `app/api/station/[stationId]/route.ts`) read query params directly without schema validation, rate limiting, or shared middleware.

```17:85:app/api/v1/departures/route.ts
const searchParams = request.nextUrl.searchParams;
const stationsParam = searchParams.get('stations');
const lineParam = searchParams.get('line') || 'WRL';
...
return NextResponse.json(success({
  inbound,
  outbound,
  total,
  version: 'v1',
}));
```

- **Impact:** Invalid payloads (e.g., oversized `stations` lists) can slip through unchecked, and a single client can spam `/api/v1/departures` without throttling, increasing upstream costs.
- **Remediation:** Added `lib/server/middleware/withValidation.ts` (Zod-backed query parsing) and `withRateLimit.ts` (in-memory token bucket) and applied them to `/api/v1/departures`, `/api/wairarapa-departures`, and `/api/station/[stationId]`, ensuring bad inputs fail fast and each IP is capped to 60 requests/minute.

### 6. Database indexing, cache warming, and invalidation _(In progress)_

- **Current:** Supabase lookups for cache entries (`lib/server/db/cacheRepository.ts`) and metrics tables rely on basic equality filters and ad-hoc cleanup queries, with no supporting composite indexes or materialized views.

```27:90:lib/server/db/cacheRepository.ts
const { data, error } = await supabase
  .from('cache_entries')
  .select('data, expiresAt')
  .eq('key', key)
  .single();
...
await supabase
  .from('cache_entries')
  .delete()
  .lt('expiresAt', now);
```

- **Impact:** Each cache read still scans the table (and `cleanupExpired` performs a full delete), while analytics queries hit raw tables instead of pre-aggregated views, leading to slower Supabase responses during rush periods.
- **Progress:** Added `supabase/migrations/006_cache_metrics_indexes.sql`, which creates the recommended indexes and a helper function to refresh `daily_incident_aggregates` when present. Remaining work: implement cache warming/metrics emitters and targeted invalidation hooks per incident.

---

## Frontend Performance & UX

### 1. Duplicate preference loads & Supabase chatter _(Done – Nov 24, 2025)_

- **Change:** Added a client-side `PreferencesProvider` that hydrates from `loadPreferencesSync()` immediately, refreshes Supabase data once in the background, and exposes `usePreferences()` with `updatePreferences`, `syncFromStorage`, and `refresh`. The provider now wraps the entire app in `app/layout.tsx`.
- **Result:** `useAlerts`, `FavoritesPanel`, `FavoritesButton`, `AlertsButton`, and the home page all read from the shared context instead of calling `loadPreferences()` individually. Mutation flows rely on the context setters (or a single `syncFromStorage` after invoking `add/removeScheduleConfig`), so Supabase is no longer hammered on every render.

### 2. Per-row timers & table re-renders _(Done – Nov 24, 2025)_

- **Change:** `DepartureBoard` now owns the single `useCurrentTime()` subscription and passes the timestamp, along with memo-friendly props, down to a `React.memo`-wrapped `DepartureBoardRow`.
- **Result:** Only one interval runs per board, and rows re-render only when their data, selection state, or the minute-level clock actually changes, cutting idle CPU work roughly 10× when 10 departures are visible.

### 3. Large selectors and synchronous analytics bundles _(Done – Nov 24, 2025)_

- **Change:** `StationSelector` now opens a searchable `cmdk`-powered command dialog with draft selections, bulk actions, and faster filtering instead of rendering 60+ checkboxes inline. `IncidentsDashboard` lazy-loads `recharts` via two `next/dynamic` chart components (`IncidentsPieChart`, `IncidentsBarChart`) with lightweight skeletons, so analytics code ships in its own chunk.
- **Result:** Station picking stays under the 16 ms interactivity target even on dense lines, and the main bundle drops the `recharts` payload unless riders visit `/analytics`.

---

## Reliability & Offline Behavior

### 1. Polling without stale data fallback _(Done – Nov 24, 2025)_

- **Change:** `useTrainSchedule` now keeps the last successful payload in memory, tracks a `staleState`, and writes the timestamp to `localStorage`, while `lib/api/client.ts` ships cache metadata from the service worker back up to the hook via response headers. `DepartureBoard` renders a cached-data banner and never clears departures during background refreshes, and `app/page.tsx` wires the new hook contract through to the UI.
- **Result:** Riders continue seeing previously fetched departures with an explicit “using cached data” callout whenever Metlink or the network blips, and manual refreshes no longer blank the board.

### 2. Minimal service worker coverage _(Done – Nov 24, 2025)_

- **Change:** `public/sw.js` now caches `/api/v1/departures` and `/api/wairarapa-departures` responses per normalized query key, stamps them with `x-metlink-cache-*` headers, and falls back to cached JSON plus an `/offline` document whenever fetches fail. `app/offline/page.tsx` explains the cached timestamp, `app/sw-register.tsx` registers the worker in production, and `app/layout.tsx` opts the entire app into the registration flow.
- **Result:** Offline riders get the last-known departures (with their cached timestamp) instead of an empty shell, and the dedicated offline page gives clear recovery instructions.

### 3. Analytics & incidents fetches as blocking UI work _(Done – Nov 24, 2025)_

- **Change:** `/analytics` now lazy-loads `IncidentsDashboard` behind a Suspense boundary, and the dashboard itself uses dynamic `IncidentsPieChart`/`IncidentsBarChart` imports plus card-level skeletons and partial error messaging while it streams summary, recent incidents, and metrics requests in parallel.
- **Result:** The analytics page renders immediately with placeholders, progressively fills each panel as its data arrives, and no longer fails wholesale if one fetch errors out.

### 4. Circuit breaker and structured error context _(Done – Nov 24, 2025)_

- **Change:** Added `lib/server/circuitBreaker.ts` with an open/half-open flow around `getStopPredictions`, introduced `lib/server/requestContext.ts` + `withRequestContext` to attach `requestId`/`traceId` metadata to every log, and moved `logger` to JSON-formatted entries. `/api/v1/departures`, `/api/station/[stationId]`, and the Metlink client now emit structured logs, respect the breaker, and propagate context into downstream warnings.
- **Result:** We stop hammering Metlink after repeated failures, each log line is correlated to a request, and `/api/health` can expose breaker status before customers notice.

### 5. Monitoring and observability coverage _(Done – Nov 24, 2025)_

- **Change:** `lib/server/performance.ts` instruments API handlers and stores metrics through `getPerformanceRepository`, `/api/v1/departures` records cache-hit/miss latency via `recordApiRequestMetric`, `/api/health` returns Metlink request counts plus breaker snapshots, and the new `/api/metrics` route exposes percentile/error/cache-hit rollups (either through Supabase RPCs or raw table fallbacks).
- **Result:** Ops can now chart latency percentiles, cache effectiveness, and error rates in real time, distinguish “Metlink down” vs. “Supabase slow,” and hook `/api/metrics` into Grafana/Datadog alerts.

### 6. Data validation and sanitization _(Done – Nov 24, 2025)_

- **Change:** Created `lib/server/validation/schemas.ts` (query Zod schemas, station parsing helpers, and `sanitizeMetlinkDepartures`), wired it through a reusable `withValidation` middleware for `/api/v1/departures` and `/api/station/[stationId]`, and sanitize upstream responses before they hit caches or clients.
- **Result:** Oversized/invalid station lists are rejected up front, downstream code only touches normalized departures, and the cache/database never sees unexpected Metlink payloads.

---

## Suggested Next Steps

1. **Backend sprint:** Implement the concurrency-limited station fetcher + adaptive cache metadata, then ship DB-side aggregation functions for performance metrics/incidents.
2. **Frontend sprint:** Build the shared preferences context, memoize departures, and replace the station picker with a searchable list; dynamically import charting libraries.
3. **Reliability sprint:** Adopt stale-while-revalidate in `useTrainSchedule`, extend the service worker to cache API payloads, and wire up abortable fetches/timeouts for every client call.

Tackling these three threads will shrink average load times, keep previously fetched schedules visible during outages, and reduce the number of discrepancies riders encounter during peak travel windows.
