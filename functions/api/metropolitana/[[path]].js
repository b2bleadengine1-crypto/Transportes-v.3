/**
 * ===================================================================================
 * CLOUDFLARE PAGES FUNCTION: CARRIS METROPOLITANA CORS PROXY
 * File: /functions/api/metropolitana/[[path]].js
 * ===================================================================================
 * 
 * Intercepts frontend requests to `/api/metropolitana/*` on the same origin and
 * forwards them server-to-server to `https://api.carrismetropolitana.pt/v2/*`.
 * 
 * Solves:
 * 1. Complete elimination of Browser CORS blocks on Cloudflare Pages production.
 * 2. Proper Access-Control-Allow-* headers for GET and preflight OPTIONS.
 * 3. Preserves all path parameters, sub-routes (vehicles, lines, stops, patterns)
 *    and query string parameters (?line_id=750, ?_t=...).
 * 4. Resilient timeout and upstream error handling with clean JSON diagnostic payload.
 */

const UPSTREAM_API_BASE = 'https://api.carrismetropolitana.pt/v2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Cache-Control, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handles CORS Preflight (OPTIONS)
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Handles all incoming requests (GET, POST, etc.)
 */
export async function onRequest(context) {
  const { request, params } = context;

  // Handle preflight if not intercepted by onRequestOptions
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  try {
    // 1. Reconstruct subpath from [[path]] catch-all parameter
    let subpath = '';
    if (params && params.path) {
      subpath = Array.isArray(params.path) ? params.path.join('/') : String(params.path);
    }
    // Clean any leading slashes
    subpath = subpath.replace(/^\/+/, '');

    // 2. Extract query string from client request URL
    const requestUrl = new URL(request.url);
    const search = requestUrl.search || '';

    // 3. Assemble target upstream URL
    const targetUrl = subpath ? `${UPSTREAM_API_BASE}/${subpath}${search}` : `${UPSTREAM_API_BASE}${search}`;

    // 4. Set up abort controller for upstream timeout (8s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // 5. Build forwarded headers
    const forwardHeaders = new Headers();
    forwardHeaders.set('Accept', 'application/json, text/plain, */*');
    forwardHeaders.set('User-Agent', 'Mozilla/5.0 (compatible; CloudflarePagesTransitProxy/1.0)');
    
    // Pass along Authorization header if present
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      forwardHeaders.set('Authorization', authHeader);
    }

    // 6. Execute server-to-server fetch to Carris Metropolitana API
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      signal: controller.signal,
      body: ['POST', 'PUT', 'PATCH'].includes(request.method) ? request.body : undefined,
    });
    clearTimeout(timeoutId);

    // 7. Prepare response headers with CORS enabled
    const responseHeaders = new Headers(upstreamResponse.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(key, value);
    }

    // Ensure content-type is preserved
    if (!responseHeaders.has('content-type')) {
      responseHeaders.set('content-type', 'application/json; charset=utf-8');
    }

    // Cache-Control: keep real-time data fresh while caching static metadata slightly
    if (subpath.includes('vehicles')) {
      responseHeaders.set('Cache-Control', 'public, max-age=2, stale-while-revalidate=5');
    } else if (subpath.includes('lines') || subpath.includes('stops') || subpath.includes('routes')) {
      responseHeaders.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const isTimeout = error && (error.name === 'AbortError' || error.message?.includes('abort'));
    const errorPayload = {
      error: isTimeout ? 'Upstream transit API timed out' : 'Transit proxy gateway error',
      message: error?.message || String(error),
      upstream: UPSTREAM_API_BASE,
      timestamp: Date.now(),
    };

    const errorHeaders = new Headers(CORS_HEADERS);
    errorHeaders.set('Content-Type', 'application/json; charset=utf-8');

    return new Response(JSON.stringify(errorPayload), {
      status: isTimeout ? 504 : 502,
      headers: errorHeaders,
    });
  }
}
