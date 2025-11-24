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

### 1. Platform variant lookup & station fan-out

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
- **Actions:**
  1. Cache platform lookups per stop for their TTL and short-circuit once we find a platform that returns data.
  2. Wrap `getMultipleStationDepartures` in a tiny concurrency pool (e.g., `p-limit` with 5–8 in-flight requests) and batch stations by geographic proximity so we reuse upstream data when possible.
  3. Persist recent station responses (per-line) in our cache layer so the next request can reuse them if metadata is still fresh.

### 2. Supabase cache and metrics pressure

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
- **Actions:**
  1. Maintain an in-memory metadata index (timestamp + etag) alongside Supabase entries so `get` only queries Supabase when the local metadata expired.
  2. Add background cache warming (preload most-requested station bundles every five minutes) and adaptive TTLs (shorten during peak, stretch during off-peak) so we reduce repeated Supabase work.

### 3. Heavy analytics queries on the application tier

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
- **Actions:**
  1. Replace the `select('*')` call with a SQL function that returns `{ total, avg, p50, p95, p99, error_counts }`, computed directly in the database with window functions.
  2. Paginate detailed rows (if needed) and store daily/hourly rollups for the dashboard, so analytics pages load instantly.

### 4. Client fetches lack abort/timeouts

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
- **Actions:** Construct an `AbortController` with a 10s timeout, cancel retries when the user navigates away, and bubble timeout errors into `useTrainSchedule` so we can show cached data instead of spinners.

### 5. API validation & rate limiting

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
- **Actions:**
  1. Introduce `lib/server/middleware/withValidation.ts` (Zod schemas for body/query) and wrap each API handler so validation & consistent error responses happen before business logic.
  2. Add a lightweight `withRateLimit` helper (Redis/Vercel Edge Config) to cap requests per IP per minute and return a 429 with `Retry-After`.
  3. Fold the per-route logging/perf instrumentation into a common `withPerformance` wrapper so all APIs emit uniform metrics with correlation IDs.

### 6. Database indexing, cache warming, and invalidation

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
- **Actions:**
  1. Ship a `supabase/migrations/005_query_optimizations.sql` that adds `idx_cache_entries_key_expires` and `idx_performance_metrics_endpoint_time`, plus a `refresh_materialized_view('daily_incident_aggregates')` cron.
  2. Build `lib/server/cacheWarming.ts` to prefetch high-demand station bundles before commute hours, and `cacheMetrics.ts` to track hit/miss ratios and feed alerts.
  3. Invalidate cache keys when `recordServiceIncidents` detects cancellations (station-level bust) so downstream clients aren’t stuck with stale data, and document the warm/invalidate cadence in the runbook.

---

## Frontend Performance & UX

### 1. Duplicate preference loads & Supabase chatter

- **Current:** `useAlerts`, `FavoritesPanel`, and `AlertsButton` each call `loadPreferences()` (which may hit Supabase) on mount and after every interaction.

```17:65:hooks/useAlerts.ts
useEffect(() => {
  const checkAlerts = async () => {
    const preferences = await loadPreferences();
    ...
  };
  checkAlerts();
}, [departures, currentTime]);
```

```20:40:components/FavoritesPanel.tsx
useEffect(() => {
  const loadPrefs = async () => {
    const prefs = await loadPreferences();
    setPreferences(prefs);
  };
  loadPrefs();
}, []);
```

```14:35:components/AlertsButton.tsx
useEffect(() => {
  const loadPrefs = async () => {
    const prefs = await loadPreferences();
    setPreferences(prefs);
  };
  loadPrefs();
}, []);
```

- **Impact:** Every render path that cares about preferences triggers its own network read, increasing load time and causing config inconsistencies (alerts panel may show stale data compared to favorites).
- **Actions:**
  1.  Add a `PreferencesProvider` that hydrates once (localStorage first, Supabase second) and exposes `usePreferences()` + mutation helpers, so all consumers share a single cache.
  2.  Push Supabase syncs into a background worker/debounced effect rather than blocking UI interactions.

### 2. Per-row timers & table re-renders

- **Current:** Each `DepartureBoardRow` calls `useCurrentTime()`, which spins up its own `setInterval` every minute.

```723:847:components/DepartureBoard.tsx
function DepartureBoardRow(...) {
  ...
  const currentTime = useCurrentTime();
  const waitTime = calculateWaitTime(departure, currentTime);
  ...
}
```

- **Impact:** Showing 10 departures spawns 10 intervals, increasing CPU usage and retriggering renders even when no data changes.
- **Actions:** Hoist a single `const now = useCurrentTime();` in `DepartureBoard`, pass it down via props, and wrap row components in `React.memo` so only changed departures repaint.

### 3. Large selectors and synchronous analytics bundles

- **Current:** `StationSelector` renders every station checkbox inside a scroll list—no search, no virtualization—and `IncidentsDashboard` imports the entire `recharts` bundle synchronously in the main client chunk.

```66:168:components/StationSelector.tsx
{availableStations.map((station) => (
  <label key={station} className="flex items-center gap-2 ...">
    <input type="checkbox" ... />
    <span>{STATION_NAMES[station] || station}</span>
  </label>
))}
```

```6:12:components/IncidentsDashboard.tsx
import { BarChart, Bar, XAxis, ... , PieChart, Pie, Cell } from 'recharts';
```

- **Impact:** The selector becomes unwieldy on lines like JVL (dozens of stops), and analytics pages inflate the main bundle even for users who never visit `/analytics`.
- **Actions:**
  1. Replace the checkbox list with a searchable command palette or virtualized list (`cmdk`, `react-window`) to keep interaction under 16 ms even with 60+ stops.
  2. Lazy-load `recharts` via `next/dynamic` (with `ssr: false`) and split charts into separate chunks so the homepage isn’t penalized by analytics code.

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
