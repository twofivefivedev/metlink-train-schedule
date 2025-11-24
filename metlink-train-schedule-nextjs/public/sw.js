// Service worker to provide offline support and cached departures

const STATIC_CACHE = 'metlink-static-v2';
const API_CACHE = 'metlink-api-v1';
const OFFLINE_URL = '/offline';
const STATIC_ASSETS = ['/', OFFLINE_URL, '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (![STATIC_CACHE, API_CACHE].includes(cacheName)) {
            return caches.delete(cacheName);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (
    url.pathname.startsWith('/api/v1/departures') ||
    url.pathname.startsWith('/api/wairarapa-departures')
  ) {
    event.respondWith(handleDeparturesRequest(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleDocumentRequest(request));
    return;
  }

  event.respondWith(handleStaticRequest(request));
});

async function handleDeparturesRequest(request) {
  const cache = await caches.open(API_CACHE);
  const cacheKey = normalizeCacheKey(request);

  try {
    const networkResponse = await fetch(request);
    const timestamp = new Date().toISOString();
    const cacheReady = stampResponse(networkResponse.clone(), {
      status: 'network',
      cachedAt: timestamp,
    });
    await cache.put(cacheKey, cacheReady.clone());
    return stampResponse(networkResponse, {
      status: 'network',
      cachedAt: timestamp,
    });
  } catch (error) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return stampResponse(cached, {
        status: 'stale',
        cachedAt: cached.headers.get('x-metlink-cache-timestamp') || new Date().toISOString(),
        reason: 'network-error',
      });
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Offline and no cached departures are available yet.',
          code: 'OFFLINE',
        },
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

async function handleDocumentRequest(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    return cached || (await cache.match(OFFLINE_URL)) || (await cache.match('/'));
  }
}

async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return cached ?? new Response('', { status: 504 });
  }
}

function normalizeCacheKey(request) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.searchParams);
  const sortedEntries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  const normalized = new URLSearchParams(sortedEntries);
  return `${url.pathname}?${normalized.toString()}`;
}

function stampResponse(response, metadata) {
  const headers = new Headers(response.headers);
  if (metadata.cachedAt) {
    headers.set('x-metlink-cache-timestamp', metadata.cachedAt);
  }
  if (metadata.status) {
    headers.set('x-metlink-cache-status', metadata.status);
  }
  if (metadata.reason) {
    headers.set('x-metlink-cache-reason', metadata.reason);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Message handler for showing notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});

