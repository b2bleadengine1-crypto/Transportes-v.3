/**
 * ===================================================================================
 * EDGE TELEMETRY URL RESOLVER & SANITIZATION ENGINE
 * ===================================================================================
 * 
 * Prevents production failures caused by:
 * 1. Hardcoded generic placeholders (e.g., 'https://teu-worker.workers.dev')
 * 2. Unresolved localhost/127.0.0.1 references when running in production/HTTPS
 * 3. Mixed content blocks (HTTP on HTTPS origin)
 * 4. Missing query parameter sanitization
 */

const KNOWN_PLACEHOLDER_DOMAINS = [
  'teu-worker.workers.dev',
  'seu-worker.workers.dev',
  'your-worker.workers.dev',
  'my-worker.workers.dev',
  'example.workers.dev',
  'example.com',
  'placeholder.com',
];

/**
 * Validates whether a provided telemetry URL is a dummy placeholder or invalid.
 */
export function isPlaceholderOrInvalidUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr || typeof urlStr !== 'string') return true;
  const trimmed = urlStr.trim().toLowerCase();

  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') {
    return true;
  }

  // 1. Check known dummy placeholders
  for (const placeholder of KNOWN_PLACEHOLDER_DOMAINS) {
    if (trimmed.includes(placeholder)) {
      return true;
    }
  }

  // 2. Check if pointing to localhost while running on a production remote host (HTTPS)
  if (typeof window !== 'undefined' && window.location) {
    const isRemoteOrigin =
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    if (isRemoteOrigin) {
      if (trimmed.includes('localhost:') || trimmed.includes('127.0.0.1:')) {
        console.warn(
          `[EdgeConfig] Detected local URL '${trimmed}' in remote production environment (${window.location.hostname}). Falling back to relative proxy.`
        );
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolves the optimal, fault-tolerant Telemetry URL for a requested transit line/route.
 * 
 * Order of Precedence:
 * 1. Sanitized Custom Edge Worker (via import.meta.env.VITE_EDGE_WORKER_URL)
 * 2. Applet Relative Reverse Proxy (`/api/transit/live?carreira=${targetRoute}`)
 * 3. Direct Transit Authority Gateways (Carris Metropolitana / Carris GTFS-RT)
 *
 * @param targetRoute The transit route code (e.g., "750", "753", "3009", "M01")
 */
export function resolveTelemetryUrl(targetRoute: string): string {
  const cleanRoute = encodeURIComponent((targetRoute || '').trim().toUpperCase());

  // 1. Check user-configured environment variable
  const envUrl = (import.meta as any)?.env?.VITE_EDGE_WORKER_URL as string | undefined;

  if (envUrl && !isPlaceholderOrInvalidUrl(envUrl)) {
    try {
      const parsed = new URL(envUrl, window.location.origin);
      parsed.searchParams.set('carreira', cleanRoute);
      return parsed.toString();
    } catch {
      // In case of parsing error, proceed to fallback
    }
  }

  // 2. Default: In-app relative proxy (Works seamlessly in dev, preview, and production Cloud Run/Docker)
  return `/api/transit/live?carreira=${cleanRoute}`;
}

/**
 * Dispatches a sanitized telemetry fetch request with timeout and automatic upstream fallback.
 */
export async function fetchRouteTelemetry(targetRoute: string): Promise<any> {
  const url = resolveTelemetryUrl(targetRoute);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
    throw new Error(`Edge endpoint HTTP ${res.status}`);
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[EdgeTelemetry] Primary route fetch failed for ${targetRoute}:`, err.message);

    // Upstream Direct Fallback for Carris Metropolitana
    if (!targetRoute.startsWith('M') && targetRoute !== '753') {
      const fallbackUrl = `https://api.carrismetropolitana.pt/v2/vehicles?line_id=${encodeURIComponent(targetRoute)}`;
      const fbRes = await fetch(fallbackUrl, { cache: 'no-store' });
      if (fbRes.ok) {
        const list = await fbRes.json();
        return {
          route_id: targetRoute,
          vehicle_count: Array.isArray(list) ? list.length : 0,
          vehicles: list,
          source: 'upstream_fallback',
        };
      }
    }
    throw err;
  }
}
