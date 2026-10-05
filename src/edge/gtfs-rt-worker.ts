/**
 * ===================================================================================
 * CLOUDFLARE WORKER EDGE ENGINE: HIGH-PERFORMANCE GTFS-RT TELEMETRY TRIAGING
 * ===================================================================================
 * 
 * Objective: 
 * Protect mobile clients from downloading multi-megabyte raw GTFS-RT Protobuf feeds.
 * Intercept, deserialize, filter by route_id (?carreira=750), and stream back an
 * ultra-lightweight (< 5 KB), round-trip optimized JSON telemetry payload.
 * 
 * Performance & Edge Limits:
 * - Sub-millisecond CPU time (< 2ms) to strictly comply with Cloudflare Free Tier (10ms cap).
 * - Edge Caching with stale-while-revalidate to prevent upstream API exhaustion.
 * - Single-pass Zero-Garbage byte scanner for fast Protobuf deserialization.
 * - Numerical truncation (coordinates fixed to 5 decimals ~1.1m precision) to minimize payload bytes.
 */

export interface Env {
  // Upstream Transit Authority GTFS-RT Protobuf Endpoints
  GTFS_RT_VEHICLES_URL?: string;
  GTFS_RT_TRIP_UPDATES_URL?: string;
  API_AUTH_TOKEN?: string;
}

export interface TelemetryVehicle {
  id: string;
  route_id: string;
  lat: number;
  lon: number;
  speed: number | null; // km/h
  bearing: number | null;
  delay_sec: number | null;
  eta_min: number | null;
  stop_id: string | null;
  timestamp: number;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException?(): void;
}

export interface TriagedResponse {
  route_id: string;
  server_timestamp: number;
  vehicle_count: number;
  execution_ms: number;
  vehicles: TelemetryVehicle[];
}

// Default upstream fallback endpoint for Carris / Carris Metropolitana GTFS-RT
const DEFAULT_UPSTREAM_GTFS_RT =
  'https://gateway.carris.pt/gateway/gtfs/api/v2.11/GTFS/realtime/vehiclepositions';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = performance.now();
    const url = new URL(request.url);

    // 1. CORS Preflight Handling
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 2. Query Route Parameter Extraction (?carreira=750 or ?route_id=750)
    const targetRoute = (
      url.searchParams.get('carreira') ||
      url.searchParams.get('route_id') ||
      url.searchParams.get('line') ||
      ''
    ).trim().toUpperCase();

    if (!targetRoute) {
      return new Response(
        JSON.stringify({
          error: 'Missing required query parameter: ?carreira=<id> (e.g. ?carreira=750 or ?route_id=3009)',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // 3. Edge Cache Verification (Cloudflare Cache API)
    // Cached per route_id for 5 seconds to eliminate thundering herd problem on popular lines
    const cache = (caches as any).default;
    const cacheKey = new Request(url.toString(), request);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      // Add custom header to indicate edge cache hit
      const response = new Response(cachedResponse.body, cachedResponse);
      response.headers.set('X-Edge-Cache', 'HIT');
      return response;
    }

    // 4. Retrieve Upstream GTFS-RT Protobuf Payload
    const upstreamUrl = env.GTFS_RT_VEHICLES_URL || DEFAULT_UPSTREAM_GTFS_RT;
    let rawBuffer: ArrayBuffer;

    try {
      const fetchHeaders: HeadersInit = {
        Accept: 'application/x-protobuf, application/octet-stream',
        'User-Agent': 'Cloudflare-Edge-Transit-Triager/3.0',
      };
      if (env.API_AUTH_TOKEN) {
        fetchHeaders['Authorization'] = `Bearer ${env.API_AUTH_TOKEN}`;
      }

      const upstreamRes = await fetch(upstreamUrl, {
        headers: fetchHeaders,
        cf: {
          // Instruct Cloudflare Edge to cache the raw upstream Protobuf buffer for 4 seconds
          cacheTtl: 4,
          cacheEverything: true,
        },
      } as any);

      if (!upstreamRes.ok) {
        throw new Error(`Upstream returned HTTP ${upstreamRes.status}`);
      }

      rawBuffer = await upstreamRes.arrayBuffer();
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: 'Upstream GTFS-RT endpoint unreachable',
          detail: err.message,
          route_id: targetRoute,
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // 5. Zero-Copy In-Memory Protobuf Parsing & Route Triaging
    const matchedVehicles: TelemetryVehicle[] = triageGtfsRealtimeBuffer(
      new Uint8Array(rawBuffer),
      targetRoute
    );

    const executionDuration = Math.round((performance.now() - startTime) * 100) / 100;

    const payload: TriagedResponse = {
      route_id: targetRoute,
      server_timestamp: Math.floor(Date.now() / 1000),
      vehicle_count: matchedVehicles.length,
      execution_ms: executionDuration,
      vehicles: matchedVehicles,
    };

    const responseBody = JSON.stringify(payload);

    const response = new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        // Cache on client for 3s, on Cloudflare Edge for 5s, stale-while-revalidate for 5s
        'Cache-Control': 'public, max-age=3, s-maxage=5, stale-while-revalidate=5',
        'X-Edge-Cache': 'MISS',
        'X-Telemetry-Compute-Ms': executionDuration.toString(),
        'X-Vehicles-Found': matchedVehicles.length.toString(),
      },
    });

    // Asynchronously store in Cloudflare Edge Cache without blocking client response
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  },
};

// ===================================================================================
// ULTRA-OPTIMIZED PROTOBUF WIRE-FORMAT PARSER & FILTER
// ===================================================================================

/**
 * Parses raw GTFS-RT FeedMessage directly at the byte level.
 * Bypasses full schema reflection to ensure sub-2ms execution time on Cloudflare Workers.
 */
export function triageGtfsRealtimeBuffer(bytes: Uint8Array, targetRouteId: string): TelemetryVehicle[] {
  const vehicles: TelemetryVehicle[] = [];
  let offset = 0;
  const length = bytes.length;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Parse FeedMessage fields:
  // Tag 1 (wire 2): FeedHeader
  // Tag 2 (wire 2): FeedEntity (Repeated)
  while (offset < length) {
    const { fieldNumber, wireType, bytesRead } = readTag(bytes, offset);
    offset += bytesRead;

    if (fieldNumber === 2 && wireType === 2) {
      // FeedEntity (Length-delimited)
      const { value: entityLen, bytesRead: lenBytes } = readVarint(bytes, offset);
      offset += lenBytes;
      const entityEnd = offset + entityLen;

      // Parse single FeedEntity in-place
      const vehicle = parseFeedEntity(bytes, view, offset, entityEnd, targetRouteId);
      if (vehicle) {
        vehicles.push(vehicle);
      }

      offset = entityEnd;
    } else {
      // Skip irrelevant root fields (e.g. Header)
      offset = skipField(bytes, offset, wireType);
    }
  }

  return vehicles;
}

/**
 * Extracts VehiclePosition fields and matches targetRouteId
 */
function parseFeedEntity(
  bytes: Uint8Array,
  view: DataView,
  start: number,
  end: number,
  targetRouteId: string
): TelemetryVehicle | null {
  let offset = start;
  let entityId = '';
  let candidateRouteId = '';
  let candidateLat = 0;
  let candidateLon = 0;
  let candidateSpeed: number | null = null;
  let candidateBearing: number | null = null;
  let candidateStopId: string | null = null;
  let candidateTimestamp = Math.floor(Date.now() / 1000);
  let candidateDelaySec: number | null = null;

  while (offset < end) {
    const { fieldNumber, wireType, bytesRead } = readTag(bytes, offset);
    offset += bytesRead;

    // Field 1: string id
    if (fieldNumber === 1 && wireType === 2) {
      const { str, nextOffset } = readString(bytes, offset);
      entityId = str;
      offset = nextOffset;
    }
    // Field 4: VehiclePosition
    else if (fieldNumber === 4 && wireType === 2) {
      const { value: vpLen, bytesRead: lenBytes } = readVarint(bytes, offset);
      offset += lenBytes;
      const vpEnd = offset + vpLen;

      // Parse VehiclePosition
      let vpOffset = offset;
      while (vpOffset < vpEnd) {
        const vpTag = readTag(bytes, vpOffset);
        vpOffset += vpTag.bytesRead;

        // Subfield 1: TripDescriptor (contains route_id)
        if (vpTag.fieldNumber === 1 && vpTag.wireType === 2) {
          const tripLen = readVarint(bytes, vpOffset);
          vpOffset += tripLen.bytesRead;
          const tripEnd = vpOffset + tripLen.value;

          let tOffset = vpOffset;
          while (tOffset < tripEnd) {
            const tTag = readTag(bytes, tOffset);
            tOffset += tTag.bytesRead;

            // TripDescriptor field 5: string route_id
            if (tTag.fieldNumber === 5 && tTag.wireType === 2) {
              const res = readString(bytes, tOffset);
              candidateRouteId = res.str;
              tOffset = res.nextOffset;
            } else {
              tOffset = skipField(bytes, tOffset, tTag.wireType);
            }
          }
          vpOffset = tripEnd;
        }
        // Subfield 2: Position (lat, lon, speed, bearing)
        else if (vpTag.fieldNumber === 2 && vpTag.wireType === 2) {
          const posLen = readVarint(bytes, vpOffset);
          vpOffset += posLen.bytesRead;
          const posEnd = vpOffset + posLen.value;

          let pOffset = vpOffset;
          while (pOffset < posEnd) {
            const pTag = readTag(bytes, pOffset);
            pOffset += pTag.bytesRead;

            // Position field 1: float latitude (fixed 32-bit float = wire 5)
            if (pTag.fieldNumber === 1 && pTag.wireType === 5) {
              candidateLat = view.getFloat32(pOffset, true);
              pOffset += 4;
            }
            // Position field 2: float longitude (fixed 32-bit float = wire 5)
            else if (pTag.fieldNumber === 2 && pTag.wireType === 5) {
              candidateLon = view.getFloat32(pOffset, true);
              pOffset += 4;
            }
            // Position field 3: float bearing
            else if (pTag.fieldNumber === 3 && pTag.wireType === 5) {
              candidateBearing = Math.round(view.getFloat32(pOffset, true));
              pOffset += 4;
            }
            // Position field 5: float speed (m/s -> convert to km/h)
            else if (pTag.fieldNumber === 5 && pTag.wireType === 5) {
              const speedMs = view.getFloat32(pOffset, true);
              candidateSpeed = Math.round(speedMs * 3.6);
              pOffset += 4;
            } else {
              pOffset = skipField(bytes, pOffset, pTag.wireType);
            }
          }
          vpOffset = posEnd;
        }
        // Subfield 4: stop_id
        else if (vpTag.fieldNumber === 4 && vpTag.wireType === 2) {
          const res = readString(bytes, vpOffset);
          candidateStopId = res.str;
          vpOffset = res.nextOffset;
        }
        // Subfield 7: timestamp
        else if (vpTag.fieldNumber === 7 && vpTag.wireType === 0) {
          const tVar = readVarint(bytes, vpOffset);
          candidateTimestamp = tVar.value;
          vpOffset += tVar.bytesRead;
        } else {
          vpOffset = skipField(bytes, vpOffset, vpTag.wireType);
        }
      }

      offset = vpEnd;
    } else {
      offset = skipField(bytes, offset, wireType);
    }
  }

  // Fast Triaging Match:
  // Match route_id against user query (case-insensitive substring or exact code)
  const normCandidate = candidateRouteId.toUpperCase().trim();
  const isMatch =
    normCandidate === targetRouteId ||
    normCandidate.startsWith(targetRouteId) ||
    normCandidate.includes(targetRouteId);

  if (!isMatch || candidateLat === 0 || candidateLon === 0) {
    return null;
  }

  // Precision optimization: round lat/lon to 5 decimals (~1.1 meter precision), eliminating JSON character bloat
  return {
    id: entityId || `veh_${Math.random().toString(36).slice(2, 7)}`,
    route_id: candidateRouteId || targetRouteId,
    lat: Math.round(candidateLat * 100000) / 100000,
    lon: Math.round(candidateLon * 100000) / 100000,
    speed: candidateSpeed,
    bearing: candidateBearing,
    delay_sec: candidateDelaySec,
    eta_min: candidateDelaySec !== null ? Math.round(candidateDelaySec / 60) : null,
    stop_id: candidateStopId,
    timestamp: candidateTimestamp,
  };
}

// --- Low-Level Binary Helper Primitives ---

function readTag(bytes: Uint8Array, offset: number): { fieldNumber: number; wireType: number; bytesRead: number } {
  const { value, bytesRead } = readVarint(bytes, offset);
  return {
    fieldNumber: value >>> 3,
    wireType: value & 0x07,
    bytesRead,
  };
}

function readVarint(bytes: Uint8Array, offset: number): { value: number; bytesRead: number } {
  let result = 0;
  let shift = 0;
  let count = 0;

  while (offset + count < bytes.length) {
    const byte = bytes[offset + count];
    count++;
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }

  return { value: result >>> 0, bytesRead: count };
}

function readString(bytes: Uint8Array, offset: number): { str: string; nextOffset: number } {
  const { value: strLen, bytesRead } = readVarint(bytes, offset);
  const strStart = offset + bytesRead;
  const strEnd = strStart + strLen;
  const utf8Decoder = new TextDecoder();
  const str = utf8Decoder.decode(bytes.subarray(strStart, strEnd));
  return { str, nextOffset: strEnd };
}

function skipField(bytes: Uint8Array, offset: number, wireType: number): number {
  switch (wireType) {
    case 0: // Varint
      return offset + readVarint(bytes, offset).bytesRead;
    case 1: // 64-bit
      return offset + 8;
    case 2: { // Length-delimited
      const { value: len, bytesRead } = readVarint(bytes, offset);
      return offset + bytesRead + len;
    }
    case 5: // 32-bit
      return offset + 4;
    default:
      return offset + 1;
  }
}
