/**
 * ===================================================================================
 * WORKBOX MISSION-CRITICAL SERVICE WORKER (sw.ts)
 * ===================================================================================
 * 
 * Reliability Directives:
 * 1. MAP TILE AGGRESSIVE CACHE: CacheFirst for CARTO basemap tiles & MapLibre assets.
 *    - Strict quota: maxEntries: 1000, maxAgeSeconds: 30 days.
 *    - Opaque CORS compliance: statuses [0, 200].
 * 2. LIVE TELEMETRY BYPASS: NetworkOnly for real-time GTFS-RT & Edge Worker endpoints.
 *    - NEVER caches vehicle telemetry. Clean failure triggers UI reconnection state.
 * 3. APP SHELL PRECACHE: precacheAndRoute with automatic revision hashing via Vite.
 * 4. STATIC GTFS SCHEDULES: StaleWhileRevalidate + Background IndexedDB synchronization.
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ revision: string | null; url: string }>;
};

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute, Route } from 'workbox-routing';
import { CacheFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// --- 1. App Shell Lifecycle & Precaching ---
self.skipWaiting();
cleanupOutdatedCaches();

// Injected by vite-plugin-pwa at build time
precacheAndRoute(self.__WB_MANIFEST || []);

// --- 2. Live Telemetry Bypass (The Stale Data Threat) ---
// MANDATE: Real-time telemetry must NEVER touch cache. Network failures must propagate cleanly.
registerRoute(
  ({ url }) => {
    return (
      url.pathname.startsWith('/api/vehicles') ||
      url.pathname.startsWith('/api/transit/live') ||
      url.pathname.startsWith('/api/transit/status') ||
      url.searchParams.has('carreira') ||
      url.searchParams.has('route_id') ||
      url.hostname.includes('workers.dev') ||
      url.hostname.includes('api.carrismetropolitana.pt') ||
      url.hostname.includes('gateway.carris.pt')
    );
  },
  new NetworkOnly({
    networkTimeoutSeconds: 5,
  })
);

// --- 3. Map Tile Aggressive Caching (The Memory Trap) ---
// MANDATE: CARTO basemap tiles and MapLibre/Leaflet assets served instantly from cache.
// Opaque CORS responses (status 0) MUST be cached explicitly. Hard ceiling of 1000 entries.
registerRoute(
  ({ url, request }) => {
    const isCartoTile = url.hostname.endsWith('basemaps.cartocdn.com');
    const isOsmTile = url.hostname.endsWith('tile.openstreetmap.org');
    const isMapAsset =
      url.pathname.endsWith('.pbf') ||
      url.pathname.endsWith('.mvt') ||
      url.pathname.endsWith('.png') && (isCartoTile || isOsmTile);
    const isMapLibreBundle =
      (url.hostname.includes('unpkg.com') ||
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('api.mapbox.com')) &&
      (url.pathname.includes('maplibre') || url.pathname.includes('leaflet'));

    return isCartoTile || isOsmTile || isMapAsset || isMapLibreBundle;
  },
  new CacheFirst({
    cacheName: 'carto-basemap-tiles-v1',
    plugins: [
      // Handle opaque responses from CDN/cross-origin tiles without CORS headers
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      // Enforce strict quota to prevent browser evicting the entire PWA origin storage
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true, // Auto-purge old tiles if storage quota drops
      }),
    ],
  })
);

// --- 4. Google Fonts & Typography Caching ---
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-cache-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  })
);

// --- 5. Static GTFS Transit Schedules (IndexedDB Caching Engine) ---
// MANDATE: Static transit timetables are cached heavily and synced to IndexedDB.
registerRoute(
  ({ url }) =>
    url.pathname.includes('/api/transit/schedules') ||
    url.pathname.includes('/api/transit/timetable') ||
    url.pathname.includes('/api/transit/lines-static'),
  new StaleWhileRevalidate({
    cacheName: 'static-gtfs-schedules-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days freshness window
      }),
      {
        // Custom Workbox plugin hook: replicate fetched schedule into local IndexedDB
        async fetchDidSucceed({ response }) {
          const clone = response.clone();
          clone.json().then((scheduleData) => {
            syncScheduleToIndexedDB(scheduleData).catch((err) => {
              console.warn('[SW] IndexedDB background sync deferred:', err);
            });
          }).catch(() => {});
          return response;
        },
      },
    ],
  })
);

// --- 6. Navigation Route Fallback (SPA App Shell) ---
const navigationRoute = new NavigationRoute(
  new StaleWhileRevalidate({
    cacheName: 'transit-app-shell-v1',
  }),
  {
    denylist: [/^\/api\/.*/],
  }
);
registerRoute(navigationRoute);

// --- 7. Embedded IndexedDB Ingest Helper ---
async function syncScheduleToIndexedDB(data: any): Promise<void> {
  if (!('indexedDB' in self)) return;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TransitSchedulesLocalStore', 2);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('schedules')) {
        const store = db.createObjectStore('schedules', { keyPath: 'id' });
        store.createIndex('by_route', 'route_id', { unique: false });
        store.createIndex('by_stop', 'stop_id', { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('schedules')) {
        resolve();
        return;
      }

      const tx = db.transaction('schedules', 'readwrite');
      const store = tx.objectStore('schedules');

      if (Array.isArray(data?.schedules)) {
        for (const item of data.schedules) {
          store.put(item);
        }
      } else if (Array.isArray(data)) {
        for (const item of data) {
          store.put(item);
        }
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };

    request.onerror = () => reject(request.error);
  });
}
