/**
 * ===================================================================================
 * CLOUDFLARE PAGES FUNCTION: PROXY DE LINHAS / CARREIRAS DA CARRIS METROPOLITANA
 * Ficheiro: functions/api/linhas.js
 * Rota pública no Cloudflare Pages: /api/linhas
 * ===================================================================================
 */

const CM_LINES_API = 'https://api.carrismetropolitana.pt/v2/lines';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Cache-Control',
  'Access-Control-Max-Age': '86400',
};

// Responde ao Preflight CORS do navegador (OPTIONS)
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// Intercepta pedidos GET a /api/linhas e busca à API oficial da Carris Metropolitana
export async function onRequestGet(context) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const upstreamResponse = await fetch(CM_LINES_API, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CloudflarePagesProxy/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (!upstreamResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream API returned status ${upstreamResponse.status}` }),
        {
          status: upstreamResponse.status,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    const data = await upstreamResponse.text();

    return new Response(data, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    const isTimeout = error && (error.name === 'AbortError' || error.message?.includes('abort'));
    return new Response(
      JSON.stringify({
        error: isTimeout ? 'Timeout ao consultar API Carris Metropolitana' : 'Erro no proxy de linhas',
        message: error?.message || String(error),
      }),
      {
        status: isTimeout ? 504 : 502,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}

// Fallback universal para qualquer outro método
export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return onRequestOptions();
  }
  return onRequestGet(context);
}
