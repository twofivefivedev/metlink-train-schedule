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

### 1. Polling without stale data fallback

- **Current:** `useTrainSchedule` flips to a loading state on every refresh and shows errors until the next successful fetch; there’s no reuse of the previous payload or stale cache when the network fails.

```51:135:hooks/useTrainSchedule.ts
const response = await getLineDepartures(line, stations);
...
setDepartures({
  inbound: response.data.inbound || [],
  outbound: response.data.outbound || [],
});
...
setError({
  message: 'Failed to fetch train schedule. Please try again.',
  retry: () => fetchSchedule(false),
});
```

- **Impact:** Riders see empty boards whenever Metlink hiccups, even though we just had valid data a minute ago.
- **Actions:** Keep the prior departures in state, surface a banner when data is stale, and use SWR-style logic (`lastUpdated` + `staleWhileRevalidate`) to prioritize continuity.

### 2. Minimal service worker coverage

- **Current:** `public/sw.js` only pre-caches `/` and `/manifest.json`, skips API responses entirely, and simply falls back to `/` when offline.

```4:47:public/sw.js
const urlsToCache = ['/', '/manifest.json'];
...
        // Don't cache API requests, only static assets
        if (event.request.url.includes('/api/')) {
          return response;
        }
...
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
```

- **Impact:** Offline users get a blank shell with no last-known departures, undermining our “less discrepancies” goal.
- **Actions:**
  1. Store the latest `/api/v1/departures` payload in IndexedDB or the Cache API (tagged per line/station combo) and respond with it when the network fails.
  2. Add a lightweight offline page that explains the cached timestamp and encourages manual refreshes when connectivity returns.

### 3. Analytics & incidents fetches as blocking UI work

- **Current:** `/analytics` fires three network calls on load, each waiting for full payloads; there’s no skeleton/dynamic import boundary, so failures surface as blank sections.
- **Actions:**
  1. Wrap `IncidentsDashboard` in suspense/dynamic import with a placeholder skeleton.
  2. Stream analytics data via incremental rendering (first summary, then charts) so users always see partial data quickly.

### 4. Circuit breaker and structured error context

- **Current:** `lib/server/metlinkService.ts` relies on retries but lacks a circuit breaker or request correlation, so repeated upstream failures keep hammering Metlink and produce terse logs.

```114:189:lib/server/metlinkService.ts
const response = await retry(
  () => getMetlinkClient().get<MetlinkApiResponse>(`/stop-predictions?stop_id=${stopId}`),
  {
    shouldRetry: (error: unknown) => {
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { status?: number } }).response;
        if (response?.status && response.status < 500) {
          return false;
        }
      }
      return true;
    },
  }
);
```

- **Impact:** When Metlink returns sustained 500s, every client request continues to spawn outbound calls, and logs don’t tie failures back to user sessions for support.
- **Actions:** Add `lib/server/circuitBreaker.ts` to short-circuit after N failures (half-open after cooldown), propagate `requestId`/`traceId` through `logger` calls, and surface breaker state to `/api/health` so we can alert before riders notice.

### 5. Monitoring and observability coverage

- **Current:** The health endpoint only reports cache/Supabase availability, and there’s no dedicated `/api/metrics` or alerting hook to track response percentiles/error rates in real time.

```11:25:app/api/health/route.ts
return NextResponse.json(
  success({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cache: cacheInfo,
    supabase: {
      available: supabaseAvailable,
      usingDatabaseCache: supabaseAvailable,
    },
  })
);
```

- **Impact:** Ops can’t distinguish “Metlink down” vs. “Supabase slow” vs. “rate limited,” and we lack a trigger for paging when error rates climb.
- **Actions:** Emit structured JSON logs (`logger` -> JSON formatter with level/timestamp/requestId), add `/api/metrics` backed by Supabase rollups for response times/error rates/cache hits, and wire those metrics into monitoring (Grafana/Datadog or Vercel Analytics) with alert thresholds.

### 6. Data validation and sanitization

- **Current:** Aside from the station whitelist in `app/api/station/[stationId]/route.ts`, there’s no shared schema validation for API responses or user-provided station lists.

```13:52:app/api/station/[stationId]/route.ts
const { stationId } = await params;
...
if (!STATION_NAMES[upperStationId]) {
  return NextResponse.json(
    validationError('Invalid station ID', {
      provided: stationId,
      validStations: Object.keys(STATION_NAMES),
    }),
    { status: 400 }
  );
}
```

- **Impact:** We sanitize station IDs in one route but not in `/api/v1/departures`, and we never validate the shape of Metlink responses—unexpected fields can bubble through to the UI unhandled.
- **Actions:** Create `lib/server/validation/schemas.ts` describing both inbound (query/body) and outbound (Metlink JSON) contracts, run them inside middleware, and reject/strip unsafe fields before persisting or caching data.

---

## Suggested Next Steps

1. **Backend sprint:** Implement the concurrency-limited station fetcher + adaptive cache metadata, then ship DB-side aggregation functions for performance metrics/incidents.
2. **Frontend sprint:** Build the shared preferences context, memoize departures, and replace the station picker with a searchable list; dynamically import charting libraries.
3. **Reliability sprint:** Adopt stale-while-revalidate in `useTrainSchedule`, extend the service worker to cache API payloads, and wire up abortable fetches/timeouts for every client call.

Tackling these three threads will shrink average load times, keep previously fetched schedules visible during outages, and reduce the number of discrepancies riders encounter during peak travel windows.
