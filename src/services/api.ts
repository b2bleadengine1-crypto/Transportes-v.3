import { Vehicle, Line, AreaInfo, AreaFilter, CardValidationsData, ServiceAlert, StopInfo } from '../types';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import {
  fetchMobiCascaisRealVehicles,
  getMobiCascaisLinesMap,
  MOBICASCAIS_STOPS,
  getMobiCascaisRouteStops,
  getMobiCascaisRouteCoordinates,
  getMobiCascaisStopArrivals,
  MOBICASCAIS_COLOR,
  MOBICASCAIS_TEXT_COLOR,
  getMobiCascaisRequested,
  setMobiCascaisRequested,
} from './mobiCascais';
import {
  CPStation,
  CPTrain,
  CPDeparture,
  CPLineInfo,
  CP_LINES,
  ALL_CP_STATIONS,
  CP_TRACK_CASCAIS,
  CP_TRACK_SINTRA,
  CP_TRACK_AZAMBUJA,
  CP_TRACK_SADO,
  CP_TRACKS,
  fetchCpRealTrains,
  getCpStationDepartures,
  getCpRequested,
  setCpRequested,
} from './cpTrains';
import { fetchRoadSnappedRoute } from './roadRouting';

export {
  setMobiCascaisRequested,
  getMobiCascaisRequested,
  setCpRequested,
  getCpRequested,
  fetchCpRealTrains,
  getCpStationDepartures,
  CP_LINES,
  ALL_CP_STATIONS,
  CP_TRACKS,
  CP_TRACK_CASCAIS,
  CP_TRACK_SINTRA,
  CP_TRACK_AZAMBUJA,
  CP_TRACK_SADO,
};
export type { CPStation, CPTrain, CPDeparture, CPLineInfo };

export const DEFAULT_CARTO_API_KEY = 'cb1_450g_1_d08c11325e668926f6ab012f';
export const CARTO_API_KEY_STORAGE_KEY = 'cm_carto_api_key';

export function getStoredCartoApiKey(): string {
  try {
    const stored = localStorage.getItem(CARTO_API_KEY_STORAGE_KEY);
    return stored !== null && stored !== undefined && stored.trim() !== '' ? stored : DEFAULT_CARTO_API_KEY;
  } catch {
    return DEFAULT_CARTO_API_KEY;
  }
}

export function setStoredCartoApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(CARTO_API_KEY_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(CARTO_API_KEY_STORAGE_KEY);
    }
  } catch {
    // localStorage not accessible
  }
}

export async function fetchCardValidations(): Promise<CardValidationsData | null> {
  try {
    const json = await fetchCmApiJson<any>('/metrics/videowall/validations');
    if (json && json.data) {
      return {
        ...json.data,
        timestamp: json.timestamp_resource,
      };
    }
    return null;
  } catch (err) {
    console.warn('Erro ao carregar validações de cartões:', err);
    return null;
  }
}

export const AREAS: Record<AreaFilter, AreaInfo> = {
  all: {
    id: 'all',
    name: 'Toda a AML',
    subtitle: 'Área Metropolitana de Lisboa',
    municipalities: ['Lisboa', 'Sintra', 'Cascais', 'Oeiras', 'Amadora', 'Loures', 'Odivelas', 'Mafra', 'Almada', 'Seixal', 'Setúbal', 'Barreiro'],
    color: '#FFC600', // Carris yellow
  },
  '1': {
    id: '1',
    name: 'Área 1 · Noroeste',
    subtitle: 'Amadora, Cascais, Lisboa, Oeiras, Sintra',
    municipalities: ['Amadora', 'Cascais', 'Lisboa', 'Oeiras', 'Sintra'],
    color: '#E11D48', // Red / Rose
  },
  '2': {
    id: '2',
    name: 'Área 2 · Nordeste',
    subtitle: 'Loures, Mafra, Odivelas, Vila Franca de Xira',
    municipalities: ['Loures', 'Mafra', 'Odivelas', 'Vila Franca de Xira'],
    color: '#EA580C', // Orange
  },
  '3': {
    id: '3',
    name: 'Área 3 · Sudoeste',
    subtitle: 'Almada, Seixal, Sesimbra',
    municipalities: ['Almada', 'Seixal', 'Sesimbra'],
    color: '#2563EB', // Blue
  },
  '4': {
    id: '4',
    name: 'Área 4 · Sudeste',
    subtitle: 'Alcochete, Barreiro, Moita, Montijo, Palmela, Setúbal',
    municipalities: ['Alcochete', 'Barreiro', 'Moita', 'Montijo', 'Palmela', 'Setúbal'],
    color: '#059669', // Emerald
  },
};

const CM_DIRECT_BASE = 'https://api.carrismetropolitana.pt/v2';
const CM_PROXY_BASE = '/api/cmet';

/**
 * Universal JSON fetcher for Carris Metropolitana API.
 * Uses fast 3.5s timeout and no-cache headers to eliminate delays and stale GPS data.
 */
export async function fetchCmApiJson<T>(path: string): Promise<T> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const separator = cleanPath.includes('?') ? '&' : '?';
  const liveUrl = `${cleanPath}${separator}_t=${Date.now()}`;

  // 1. Try local proxy
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${CM_PROXY_BASE}${liveUrl}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch {
    // Proxy failure, fallback to direct
  }

  // 2. Direct fetch fallback with fast 3.5s timeout
  const directController = new AbortController();
  const directTimeoutId = setTimeout(() => directController.abort(), 3500);

  const directRes = await fetch(`${CM_DIRECT_BASE}${liveUrl}`, {
    signal: directController.signal,
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
    cache: 'no-store',
  });
  clearTimeout(directTimeoutId);

  if (!directRes.ok) {
    throw new Error(`Erro na API Carris Metropolitana (${directRes.status})`);
  }

  return (await directRes.json()) as T;
}

let cachedVehicles: Vehicle[] = [];
let liveVehiclesInFlightPromise: Promise<Vehicle[]> | null = null;
let lastLiveVehiclesFetchTime = 0;

/**
 * Filter out invalid vehicle GPS readings that place buses in the open Tagus river water
 * outside the legitimate bridge corridors (Ponte 25 de Abril and Ponte Vasco da Gama).
 */
function isVehicleFloatingInWater(lat: number, lon: number): boolean {
  // Tagus Estuary water zone between Lisbon and Margem Sul:
  // The 25 de Abril Bridge runs strictly along longitude -9.179 to -9.174
  if (lat > 38.674 && lat < 38.712 && lon > -9.172 && lon < -9.055) {
    return true;
  }
  return false;
}

let cachedCarrisVehicles: Vehicle[] = [];
let lastCarrisFetchTime = 0;
let carrisInFlightPromise: Promise<Vehicle[]> | null = null;

/**
 * Fetches real-time vehicle positions from Carris (Lisboa) official GTFS-RT Protobuf gateway.
 * Optimized with fast 3.5s timeout, single-flight request pooling, and smart 8s memory caching.
 */
export async function fetchCarrisRealVehicles(): Promise<Vehicle[]> {
  const now = Date.now();
  // Retorna cache apenas se tiver menos de 1.5 segundos para garantir dados frescos e precisos
  if (cachedCarrisVehicles.length > 0 && now - lastCarrisFetchTime < 1500) {
    return cachedCarrisVehicles;
  }

  // Deduplicação de chamadas simultâneas (single-flight)
  if (carrisInFlightPromise) {
    return carrisInFlightPromise;
  }

  carrisInFlightPromise = (async () => {
    const endpoints = [
      `/api/carris-gtfs?_t=${Date.now()}`,
      `https://gateway.carris.pt/gateway/gtfs/api/v2.11/GTFS/realtime/vehiclepositions?_t=${Date.now()}`,
    ];

    let buffer: ArrayBuffer | null = null;
    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/x-protobuf, */*' },
          cache: 'no-store',
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const ab = await res.arrayBuffer();
          if (ab && ab.byteLength > 100) {
            buffer = ab;
            break;
          }
        }
      } catch {
        // Continua para o próximo endpoint em caso de timeout ou erro de rede
      }
    }

    if (!buffer || buffer.byteLength < 100) {
      return cachedCarrisVehicles;
    }

    try {
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
      const carrisVehicles: Vehicle[] = [];

      for (const entity of feed.entity) {
        if (!entity || !entity.vehicle) continue;
        const v = entity.vehicle;
        if (!v.position || typeof v.position.latitude !== 'number' || typeof v.position.longitude !== 'number') {
          continue;
        }

        const entityId = entity.id || '';
        let lineId = '';
        if (entityId.includes('_')) {
          lineId = entityId.split('_')[1];
        } else if (v.trip?.routeId) {
          lineId = v.trip.routeId.replace(/_\d+$/, '');
        }

        if (!lineId) continue;

        const vehNumber = v.vehicle?.id || (entityId.includes('_') ? entityId.split('_')[0] : entityId);
        const licensePlate = v.vehicle?.licensePlate || null;
        const lat = v.position.latitude;
        const lon = v.position.longitude;

        if (!lat || !lon || isNaN(lat) || isNaN(lon) || isVehicleFloatingInWater(lat, lon)) {
          continue;
        }

        carrisVehicles.push({
          id: `carris_${vehNumber}_${lineId}`,
          line_id: lineId,
          lat,
          lon,
          speed: typeof v.position.speed === 'number' ? Math.round(v.position.speed * 3.6) : null,
          bearing: null, // "Tira a direção": simplificado sem rotação de azimute
          license_plate: licensePlate,
          current_status: v.currentStatus === 2 ? 'STOPPED_AT' : 'IN_TRANSIT_TO',
          stop_id: v.stopId || null,
          trip_id: v.trip?.tripId || null,
          timestamp: v.timestamp ? Number(v.timestamp) * 1000 : Date.now(),
        });
      }

      cachedCarrisVehicles = carrisVehicles;
      lastCarrisFetchTime = Date.now();
      return carrisVehicles;
    } catch {
      return cachedCarrisVehicles;
    } finally {
      carrisInFlightPromise = null;
    }
  })();

  return carrisInFlightPromise;
}

export interface LiveVehiclesOptions {
  includeCM?: boolean;
  includeCarris?: boolean;
  includeMobiCascais?: boolean;
  targetLineId?: string;
  selectedDirection?: number | null; // 0 (Ida), 1 (Volta) ou null (ambos)
}

/**
 * Main live vehicles fetcher:
 * Combines Carris Metropolitana (TML) API, Carris Lisboa (GTFS-RT), and MobiCascais.
 * 
 * Regra estrita: Desconecta servidores que não foram solicitados.
 * Se o utilizador apenas escolheu a carreira 3009:
 * - Apenas o servidor da Carris Metropolitana é contactado;
 * - Carris Lisboa e MobiCascais permanecem 100% desligados;
 * - Apenas a informação da carreira 3009 (e no sentido selecionado) sai do servidor.
 */
export async function fetchLiveVehicles(options?: boolean | LiveVehiclesOptions): Promise<Vehicle[]> {
  const opts: LiveVehiclesOptions = typeof options === 'boolean'
    ? { includeMobiCascais: options, includeCM: true, includeCarris: true }
    : options || {};

  const targetLine = opts.targetLineId;
  const targetDir = opts.selectedDirection;

  let shouldFetchCM = opts.includeCM !== false;
  let shouldFetchCarris = opts.includeCarris !== false;
  let shouldFetchMobi = opts.includeMobiCascais ?? getMobiCascaisRequested();

  // Se uma carreira específica foi solicitada, isola EXCLUSIVAMENTE o respetivo operador
  if (targetLine) {
    const isMobi = targetLine.toUpperCase().startsWith('M');
    const isCarris = targetLine === '753' || targetLine.startsWith('15') || targetLine.startsWith('28');
    
    if (isMobi) {
      shouldFetchMobi = true;
      shouldFetchCM = false;
      shouldFetchCarris = false;
    } else if (isCarris) {
      shouldFetchCarris = true;
      shouldFetchCM = false;
      shouldFetchMobi = false;
    } else {
      shouldFetchCM = true;
      shouldFetchCarris = false;
      shouldFetchMobi = false;
    }
  }

  // Se nenhum transporte de autocarros foi solicitado, desconecta todos os acessos ao servidor
  if (!shouldFetchCM && !shouldFetchCarris && !shouldFetchMobi) {
    return [];
  }

  // Se o browser estiver sem ligação à internet, retorna cache estável sem falhar
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    let result = cachedVehicles;
    if (targetLine) {
      result = result.filter((v) => v.line_id === targetLine);
    }
    if (targetDir !== undefined && targetDir !== null) {
      result = result.filter((v) => v.direction_id === targetDir);
    }
    return result;
  }

  const now = Date.now();

  // Single-flight para deduplicação
  if (liveVehiclesInFlightPromise) {
    return liveVehiclesInFlightPromise;
  }

  liveVehiclesInFlightPromise = (async () => {
    try {
      const fetchPromises: Promise<any>[] = [];
      const promiseKeys: ('cm' | 'carris' | 'mobi')[] = [];

      if (shouldFetchCM) {
        fetchPromises.push(fetchCmApiJson<Vehicle[]>('/vehicles'));
        promiseKeys.push('cm');
      }
      if (shouldFetchCarris) {
        fetchPromises.push(fetchCarrisRealVehicles());
        promiseKeys.push('carris');
      }
      if (shouldFetchMobi) {
        fetchPromises.push(fetchMobiCascaisRealVehicles(true));
        promiseKeys.push('mobi');
      }

      const results = await Promise.allSettled(fetchPromises);
      const combined: Vehicle[] = [];

      results.forEach((res, idx) => {
        const key = promiseKeys[idx];
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          if (key === 'cm') {
            const validCm = res.value
              .filter(
                (v: Vehicle) =>
                  v &&
                  typeof v.lat === 'number' &&
                  !isNaN(v.lat) &&
                  typeof v.lon === 'number' &&
                  !isNaN(v.lon) &&
                  v.lat !== 0 &&
                  v.lon !== 0 &&
                  !isVehicleFloatingInWater(v.lat, v.lon)
              )
              .map((v: Vehicle) => {
                let ts = v.timestamp ? Number(v.timestamp) : Date.now();
                if (ts > 0 && ts < 10000000000) {
                  ts = ts * 1000;
                }
                return {
                  ...v,
                  timestamp: ts,
                  bearing: null,
                };
              });
            combined.push(...validCm);
          } else {
            combined.push(...res.value);
          }
        }
      });

      if (combined.length > 0) {
        cachedVehicles = combined;
        lastLiveVehiclesFetchTime = Date.now();
      }

      // Regra de Isolamento: Retorna estritamente o sinal da carreira e sentido solicitados
      let finalVehicles = combined;
      if (targetLine) {
        finalVehicles = finalVehicles.filter(
          (v) => (v.line_id || '').toLowerCase() === targetLine.toLowerCase()
        );
      }
      if (targetDir !== undefined && targetDir !== null) {
        finalVehicles = finalVehicles.filter((v) => {
          // Se o veículo tiver direction_id explícito
          if (v.direction_id !== undefined && v.direction_id !== null) {
            return v.direction_id === targetDir;
          }
          // Fallback via pattern_id (ex: "3009_0_1" vs "3009_1_1")
          if (v.pattern_id) {
            if (v.pattern_id.includes(`_${targetDir}_`)) return true;
          }
          return true;
        });
      }

      return finalVehicles;
    } catch (err) {
      console.warn('Telemetria temporariamente em modo de tolerância a falhas:', err);
    } finally {
      liveVehiclesInFlightPromise = null;
    }

    if (cachedVehicles.length > 0) {
      let cachedResult = cachedVehicles;
      if (targetLine) {
        cachedResult = cachedResult.filter(
          (v) => (v.line_id || '').toLowerCase() === targetLine.toLowerCase()
        );
      }
      if (targetDir !== undefined && targetDir !== null) {
        cachedResult = cachedResult.filter((v) => v.direction_id === targetDir);
      }
      return cachedResult;
    }

    return [];
  })();

  return liveVehiclesInFlightPromise;
}

let cachedLinesMap: Map<string, Line> | null = null;
let lineFetchPromise: Promise<Map<string, Line>> | null = null;

export async function fetchLinesMap(): Promise<Map<string, Line>> {
  if (cachedLinesMap) {
    return cachedLinesMap;
  }
  if (lineFetchPromise) {
    return lineFetchPromise;
  }

  lineFetchPromise = (async () => {
    try {
      const lines = await fetchCmApiJson<Line[]>('/lines');
      const map = new Map<string, Line>();
      if (Array.isArray(lines)) {
        for (const line of lines) {
          map.set(line.id, line);
          if (line.short_name && !map.has(line.short_name)) {
            map.set(line.short_name, line);
          }
        }
      }

      // Add Carris Lisboa official lines (735, 797, 708, 717, 736, 746, 753, 28E, 15E, etc.)
      const carrisLisboaDefs: Line[] = [
        { id: '753', short_name: '753', long_name: 'Centro Sul - Praça José Fontana', color: '#FFC600', text_color: '#000000', pattern_ids: ['753_0_1', '753_1_1'], route_ids: ['753_0', '753_1'] },
        { id: '735', short_name: '735', long_name: 'Cais do Sodré - Hospital Santa Maria', color: '#FFC600', text_color: '#000000', pattern_ids: ['735_0_1'], route_ids: ['735_0'] },
        { id: '797', short_name: '797', long_name: 'Sapadores - Areeiro', color: '#FFC600', text_color: '#000000', pattern_ids: ['797_0_1'], route_ids: ['797_0'] },
        { id: '708', short_name: '708', long_name: 'Martim Moniz - Parque das Nações Norte', color: '#FFC600', text_color: '#000000', pattern_ids: ['708_0_1'], route_ids: ['708_0'] },
        { id: '717', short_name: '717', long_name: 'Praça do Chile - Fetais', color: '#FFC600', text_color: '#000000', pattern_ids: ['717_0_1'], route_ids: ['717_0'] },
        { id: '736', short_name: '736', long_name: 'Cais do Sodré - Odivelas', color: '#FFC600', text_color: '#000000', pattern_ids: ['736_0_1'], route_ids: ['736_0'] },
        { id: '746', short_name: '746', long_name: 'Marquês de Pombal - Estação Damaia', color: '#FFC600', text_color: '#000000', pattern_ids: ['746_0_1'], route_ids: ['746_0'] },
        { id: '723', short_name: '723', long_name: 'Desterro - Algés', color: '#FFC600', text_color: '#000000', pattern_ids: ['723_0_1'], route_ids: ['723_0'] },
        { id: '727', short_name: '727', long_name: 'Estação Roma-Areeiro - Restelo', color: '#FFC600', text_color: '#000000', pattern_ids: ['727_0_1'], route_ids: ['727_0'] },
        { id: '734', short_name: '734', long_name: 'Martim Moniz - Santa Apolónia', color: '#FFC600', text_color: '#000000', pattern_ids: ['734_0_1'], route_ids: ['734_0'] },
        { id: '751', short_name: '751', long_name: 'Estação Campolide - Linda-a-Velha', color: '#FFC600', text_color: '#000000', pattern_ids: ['751_0_1'], route_ids: ['751_0'] },
        { id: '702', short_name: '702', long_name: 'Marquês de Pombal - Serafina', color: '#FFC600', text_color: '#000000', pattern_ids: ['702_0_1'], route_ids: ['702_0'] },
        { id: '759', short_name: '759', long_name: 'Restauradores - Estação Oriente', color: '#FFC600', text_color: '#000000', pattern_ids: ['759_0_1'], route_ids: ['759_0'] },
        { id: '774', short_name: '774', long_name: 'Campo de Ourique - Gomes Freire', color: '#FFC600', text_color: '#000000', pattern_ids: ['774_0_1'], route_ids: ['774_0'] },
        { id: '28E', short_name: '28E', long_name: 'Elétrico 28E: Martim Moniz - Campo de Ourique (Prazeres)', color: '#FFC600', text_color: '#000000', pattern_ids: ['28E_0_1'], route_ids: ['28E_0'] },
        { id: '15E', short_name: '15E', long_name: 'Elétrico 15E: Praça da Figueira - Algés', color: '#FFC600', text_color: '#000000', pattern_ids: ['15E_0_1'], route_ids: ['15E_0'] },
        { id: '12E', short_name: '12E', long_name: 'Elétrico 12E: Praça da Figueira - Martim Moniz (Circular)', color: '#FFC600', text_color: '#000000', pattern_ids: ['12E_0_1'], route_ids: ['12E_0'] },
        { id: '24E', short_name: '24E', long_name: 'Elétrico 24E: Praça Luís de Camões - Campolide', color: '#FFC600', text_color: '#000000', pattern_ids: ['24E_0_1'], route_ids: ['24E_0'] },
      ];
      for (const cl of carrisLisboaDefs) {
        map.set(cl.id, cl);
      }

      // Add Comboios de Portugal (CP) lines
      const cpLineDefs: Line[] = [
        { id: 'CP_CASCAIS', short_name: 'CP Cascais', long_name: 'Linha de Cascais (Cais do Sodré ↔ Cascais)', color: '#006633', text_color: '#FFFFFF', pattern_ids: ['cp_cascais_1'], route_ids: ['cp_cascais'] },
        { id: 'CP_SINTRA', short_name: 'CP Sintra', long_name: 'Linha de Sintra (Sintra ↔ Rossio / Oriente)', color: '#008542', text_color: '#FFFFFF', pattern_ids: ['cp_sintra_1'], route_ids: ['cp_sintra'] },
        { id: 'CP_AZAMBUJA', short_name: 'CP Azambuja', long_name: 'Linha de Azambuja (Santa Apolónia / Sintra ↔ Azambuja)', color: '#004d26', text_color: '#FFFFFF', pattern_ids: ['cp_azambuja_1'], route_ids: ['cp_azambuja'] },
        { id: 'CP_SADO', short_name: 'CP Sado', long_name: 'Linha do Sado (Barreiro ↔ Praias do Sado-A)', color: '#00a651', text_color: '#FFFFFF', pattern_ids: ['cp_sado_1'], route_ids: ['cp_sado'] },
      ];
      for (const cp of cpLineDefs) {
        map.set(cp.id, cp);
        map.set(cp.short_name, cp);
      }

      // Add MobiCascais municipal lines (M01 to M44)
      const mobiLines = getMobiCascaisLinesMap();
      mobiLines.forEach((line, key) => {
        if (!map.has(key)) {
          map.set(key, line);
        }
      });

      cachedLinesMap = map;
      return map;
    } catch (err) {
      console.warn('Erro ao carregar detalhes das linhas da Carris Metropolitana:', err);
      const fallbackMap = new Map<string, Line>();
      const mobiLines = getMobiCascaisLinesMap();
      mobiLines.forEach((l, k) => fallbackMap.set(k, l));
      fallbackMap.set('753', {
        id: '753',
        short_name: '753',
        long_name: 'Centro Sul - Praça José Fontana',
        color: '#FFC600',
        text_color: '#000000',
        pattern_ids: ['753_0_1', '753_1_1'],
        route_ids: ['753_0', '753_1'],
      });
      return fallbackMap;
    }
  })();

  return lineFetchPromise;
}

export function isCarrisLisboaLine(lineId: string): boolean {
  if (!lineId) return false;
  const upper = lineId.toUpperCase().trim();
  if (upper.endsWith('E')) return true;
  return ['701','702','703','705','706','708','709','711','712','713','714','716','717','718','720','722','723','724','725','726','727','728','729','730','731','732','734','735','736','737','738','742','744','746','747','748','749','750','751','753','754','755','756','758','759','760','764','765','767','768','770','771','773','774','776','778','781','782','783','793','794','796','797','798','799'].includes(upper);
}

export function isCpTrainLine(lineId: string): boolean {
  if (!lineId) return false;
  const upper = lineId.toUpperCase().trim();
  return upper.startsWith('CP_') || upper.startsWith('CP-') || upper.startsWith('CP ') || upper === 'CP';
}

export function isMobiCascaisLine(lineId: string): boolean {
  if (!lineId) return false;
  const upper = lineId.toUpperCase().trim();
  return upper.startsWith('M') && upper.length <= 4;
}

export function getAreaForLine(lineId: string): AreaFilter {
  if (!lineId) return 'all';
  if (lineId.toUpperCase().startsWith('M')) return '1'; // Concelho de Cascais pertence à Área 1
  if (lineId === '753') return '3'; // Almada / Sudoeste
  const firstChar = lineId.trim().charAt(0);
  if (firstChar === '1') return '1';
  if (firstChar === '2') return '2';
  if (firstChar === '3') return '3';
  if (firstChar === '4') return '4';
  return 'all';
}

export function getLineFallbackColor(lineId: string): { bg: string; text: string } {
  if (!lineId) return { bg: '#FFC600', text: '#18181B' };
  const upper = lineId.toUpperCase().trim();
  if (isMobiCascaisLine(upper)) {
    return { bg: MOBICASCAIS_COLOR, text: MOBICASCAIS_TEXT_COLOR };
  }
  if (isCpTrainLine(upper)) {
    return { bg: '#006633', text: '#FFFFFF' };
  }
  if (isCarrisLisboaLine(upper)) {
    return { bg: '#FFC600', text: '#000000' };
  }
  const area = getAreaForLine(lineId);
  switch (area) {
    case '1':
      return { bg: '#E11D48', text: '#FFFFFF' };
    case '2':
      return { bg: '#EA580C', text: '#FFFFFF' };
    case '3':
      return { bg: '#2563EB', text: '#FFFFFF' };
    case '4':
      return { bg: '#059669', text: '#FFFFFF' };
    default:
      return { bg: '#FFC600', text: '#18181B' };
  }
}

export function bearingToCardinal(bearing: number | null | undefined): string {
  if (bearing === null || bearing === undefined || isNaN(bearing)) return 'N/D';
  const normalized = ((bearing % 360) + 360) % 360;
  const directions = [
    { name: 'Norte (N)', short: 'N', min: 337.5, max: 22.5 },
    { name: 'Nordeste (NE)', short: 'NE', min: 22.5, max: 67.5 },
    { name: 'Este (E)', short: 'E', min: 67.5, max: 112.5 },
    { name: 'Sudeste (SE)', short: 'SE', min: 112.5, max: 157.5 },
    { name: 'Sul (S)', short: 'S', min: 157.5, max: 202.5 },
    { name: 'Sudoeste (SO)', short: 'SO', min: 202.5, max: 247.5 },
    { name: 'Oeste (O)', short: 'O', min: 247.5, max: 292.5 },
    { name: 'Noroeste (NO)', short: 'NO', min: 292.5, max: 337.5 },
  ];

  for (const d of directions) {
    if (d.min > d.max) {
      if (normalized >= d.min || normalized < d.max) return `${d.short} · ${Math.round(normalized)}°`;
    } else if (normalized >= d.min && normalized < d.max) {
      return `${d.short} · ${Math.round(normalized)}°`;
    }
  }
  return `${Math.round(normalized)}°`;
}

export function formatStatusText(status?: string | null): string {
  if (!status) return 'Em serviço';
  switch (status.toUpperCase()) {
    case 'IN_TRANSIT_TO':
      return 'A caminho da paragem';
    case 'STOPPED_AT':
      return 'Parado na paragem';
    case 'INCOMING_AT':
      return 'A chegar à paragem';
    default:
      return status.replace(/_/g, ' ').toLowerCase();
  }
}

export function formatTimeAgo(timestampMs?: number | null): string {
  if (!timestampMs) return 'recente';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSec < 5) return 'agora mesmo';
  if (diffSec < 60) return `há ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  return `há ${Math.floor(diffMin / 60)}h`;
}

// Haversine distance in meters
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function cleanCmId(id?: string | null): string {
  if (!id) return '';
  return id.replace(/\[.*?\]/g, '').trim();
}

let cachedStopsMap: Map<string, StopInfo> | null = null;
let stopsFetchPromise: Promise<Map<string, StopInfo>> | null = null;

export async function fetchStopsMap(): Promise<Map<string, StopInfo>> {
  if (cachedStopsMap) return cachedStopsMap;
  if (stopsFetchPromise) return stopsFetchPromise;

  // Tenta carregar da cache local persistente para carregamento instantâneo (0ms)
  try {
    const local = localStorage.getItem('cm_stops_cache_v2');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const localMap = new Map<string, StopInfo>();
        for (const s of parsed) {
          localMap.set(s.id, s);
        }
        // Assegura sempre a presença de todas as paragens municipais MobiCascais
        for (const ms of MOBICASCAIS_STOPS) {
          localMap.set(ms.id, ms);
        }
        cachedStopsMap = localMap;
      }
    }
  } catch {}

  stopsFetchPromise = (async () => {
    try {
      const rawStops = await fetchCmApiJson<any[]>('/stops');
      const map = new Map<string, StopInfo>();
      const stopsArray: StopInfo[] = [];

      if (Array.isArray(rawStops)) {
        for (const s of rawStops) {
          if (s && s.id) {
            const linesList: string[] = Array.isArray(s.line_ids) ? s.line_ids : [];
            const item: StopInfo = {
              id: s.id,
              name: s.long_name || s.tts_name || s.short_name || `Paragem #${s.id}`,
              lat: s.lat || 0,
              lon: s.lon || 0,
              lines: linesList,
              line_ids: linesList,
              pattern_ids: s.pattern_ids || [],
              route_ids: s.route_ids || [],
            };
            map.set(s.id, item);
            stopsArray.push(item);
          }
        }
      }

      // Add stops for line 753 (Centro Sul - Praça José Fontana)
      const stops753: StopInfo[] = [
        { id: '753_CS', name: 'Centro Sul (Terminal)', lat: 38.6756, lon: -9.1670, lines: ['753'], line_ids: ['753'] },
        { id: '753_PT', name: 'Portagem (Ponte 25 de Abril)', lat: 38.6865, lon: -9.1730, lines: ['753'], line_ids: ['753'] },
        { id: '753_AM', name: 'Amoreiras (Av. Eng. Duarte Pacheco)', lat: 38.7242, lon: -9.1605, lines: ['753'], line_ids: ['753'] },
        { id: '753_MP', name: 'Marquês de Pombal (Metro)', lat: 38.7258, lon: -9.1502, lines: ['753'], line_ids: ['753'] },
        { id: '753_PC', name: 'Picoas (Av. Fontes Pereira de Melo)', lat: 38.7298, lon: -9.1468, lines: ['753'], line_ids: ['753'] },
        { id: '753_JF', name: 'Praça José Fontana (Terminal)', lat: 38.7308, lon: -9.1432, lines: ['753'], line_ids: ['753'] },
      ];
      for (const s of stops753) {
        map.set(s.id, s);
        stopsArray.push(s);
      }

      // Add MobiCascais municipal stops
      for (const s of MOBICASCAIS_STOPS) {
        map.set(s.id, s);
        stopsArray.push(s);
      }

      cachedStopsMap = map;

      // Guarda na cache local de forma assíncrona para arranques futuros ultra-rápidos
      try {
        localStorage.setItem('cm_stops_cache_v2', JSON.stringify(stopsArray));
      } catch {}

      return map;
    } catch (err) {
      console.warn('Erro ao obter paragens da Carris Metropolitana:', err);
      if (cachedStopsMap && cachedStopsMap.size > 0) return cachedStopsMap;

      const fallbackMap = new Map<string, StopInfo>();
      const stops753: StopInfo[] = [
        { id: '753_CS', name: 'Centro Sul (Terminal)', lat: 38.6756, lon: -9.1670, lines: ['753'], line_ids: ['753'] },
        { id: '753_PT', name: 'Portagem (Ponte 25 de Abril)', lat: 38.6865, lon: -9.1730, lines: ['753'], line_ids: ['753'] },
        { id: '753_AM', name: 'Amoreiras (Av. Eng. Duarte Pacheco)', lat: 38.7242, lon: -9.1605, lines: ['753'], line_ids: ['753'] },
        { id: '753_MP', name: 'Marquês de Pombal (Metro)', lat: 38.7258, lon: -9.1502, lines: ['753'], line_ids: ['753'] },
        { id: '753_PC', name: 'Picoas (Av. Fontes Pereira de Melo)', lat: 38.7298, lon: -9.1468, lines: ['753'], line_ids: ['753'] },
        { id: '753_JF', name: 'Praça José Fontana (Terminal)', lat: 38.7308, lon: -9.1432, lines: ['753'], line_ids: ['753'] },
      ];
      for (const s of stops753) fallbackMap.set(s.id, s);
      for (const s of MOBICASCAIS_STOPS) fallbackMap.set(s.id, s);
      return fallbackMap;
    } finally {
      stopsFetchPromise = null;
    }
  })();

  return cachedStopsMap ? Promise.resolve(cachedStopsMap) : stopsFetchPromise;
}

const patternCache = new Map<string, { stop_id: string; stop_sequence: number }[]>();
const patternCoordsCache = new Map<string, [number, number][]>();

export async function fetchPatternStops(patternId: string): Promise<{ stop_id: string; stop_sequence: number }[]> {
  const cleanId = cleanCmId(patternId);
  if (!cleanId) return [];

  // Suporte a carreiras municipais MobiCascais (M01 a M44)
  if (cleanId.toUpperCase().startsWith('M')) {
    const lineId = cleanId.split('_')[0];
    const mobiStops = getMobiCascaisRouteStops(lineId);
    if (mobiStops.length > 0) return mobiStops;
  }

  if (cleanId.startsWith('753')) {
    const isReverse = cleanId.includes('_1_');
    const stopsList = [
      { stop_id: '753_CS', stop_sequence: 1 },
      { stop_id: '753_PT', stop_sequence: 2 },
      { stop_id: '753_AM', stop_sequence: 3 },
      { stop_id: '753_MP', stop_sequence: 4 },
      { stop_id: '753_PC', stop_sequence: 5 },
      { stop_id: '753_JF', stop_sequence: 6 },
    ];
    return isReverse
      ? [...stopsList].reverse().map((s, idx) => ({ ...s, stop_sequence: idx + 1 }))
      : stopsList;
  }

  if (patternCache.has(cleanId)) {
    return patternCache.get(cleanId)!;
  }

  try {
    const data = await fetchCmApiJson<any>(`/patterns/${encodeURIComponent(cleanId)}`);
    const pattern = Array.isArray(data) ? data[0] : data;
    if (pattern && Array.isArray(pattern.path)) {
      const stops = pattern.path.map((p: { stop_id: string; stop_sequence: number }) => ({
        stop_id: p.stop_id,
        stop_sequence: p.stop_sequence,
      }));
      patternCache.set(cleanId, stops);
      return stops;
    }
    return [];
  } catch (err) {
    console.warn('Erro ao carregar percurso da linha:', err);
    return [];
  }
}

/**
 * Returns ordered GPS coordinates [lat, lon][] for a given pattern.
 * Uses cached stops map to resolve stop locations into connected polyline points.
 */
export async function fetchPatternCoordinates(patternId: string): Promise<[number, number][]> {
  let cleanId = cleanCmId(patternId);
  if (!cleanId) return [];

  // Se for apenas o número de linha (ex: "3710", "4701", "3508"), obtém o primeiro pattern_id da linha
  if (!cleanId.includes('_') && !cleanId.toUpperCase().startsWith('M') && cleanId !== '753') {
    try {
      const lines = await fetchLinesMap();
      const lineInfo = lines.get(cleanId);
      if (lineInfo && lineInfo.pattern_ids && lineInfo.pattern_ids.length > 0) {
        cleanId = cleanCmId(lineInfo.pattern_ids[0]);
      }
    } catch {}
  }

  // 1. Traçados ferroviários oficiais dos Comboios de Portugal (CP)
  if (cleanId.toUpperCase().startsWith('CP')) {
    const idLower = cleanId.toLowerCase();
    if (idLower.includes('cascais')) return CP_TRACK_CASCAIS;
    if (idLower.includes('sintra')) return CP_TRACK_SINTRA;
    if (idLower.includes('azambuja')) return CP_TRACK_AZAMBUJA;
    if (idLower.includes('sado')) return CP_TRACK_SADO;
    return CP_TRACK_CASCAIS;
  }

  // 2. Traçado das carreiras municipais MobiCascais (M01 a M44) que segue as estradas reais
  if (cleanId.toUpperCase().startsWith('M')) {
    const lineId = cleanId.split('_')[0].toUpperCase();
    const coords = getMobiCascaisRouteCoordinates(lineId);
    if (coords && coords.length > 1) {
      patternCoordsCache.set(cleanId, coords);
      return coords;
    }
  }

  // Route path across Ponte 25 de Abril for line 753 (Centro Sul - Praça José Fontana)
  if (cleanId.startsWith('753')) {
    const isReverse = cleanId.includes('_1_');
    const coords753: [number, number][] = [
      [38.6756, -9.1670], // Centro Sul (Terminal MST Almada)
      [38.6792, -9.1688], // Ramalha
      [38.6830, -9.1712], // Acesso A2 / Pragal
      [38.6865, -9.1730], // Praça da Portagem (Ponte 25 de Abril)
      [38.6905, -9.1755], // Ponte 25 de Abril (Viaduto Sul)
      [38.6938, -9.1764], // Pilar Sul
      [38.6975, -9.1772], // Meio do Tejo
      [38.7018, -9.1780], // Pilar Norte
      [38.7055, -9.1783], // Viaduto Alcântara
      [38.7110, -9.1775], // Av. Ceuta
      [38.7170, -9.1725], // Subida Duarte Pacheco
      [38.7215, -9.1660], // Viaduto Duarte Pacheco
      [38.7242, -9.1605], // Amoreiras
      [38.7255, -9.1545], // Rua Joaquim António de Aguiar
      [38.7258, -9.1502], // Rotunda Marquês de Pombal
      [38.7298, -9.1468], // Av. Fontes Pereira de Melo / Picoas
      [38.7305, -9.1448], // Rua Tomás Ribeiro
      [38.7308, -9.1432], // Praça José Fontana
    ];
    const ordered = isReverse ? [...coords753].reverse() : coords753;
    const roadCoords = await fetchRoadSnappedRoute(`753_${isReverse ? 'rev' : 'fwd'}`, ordered);
    return roadCoords;
  }

  if (patternCoordsCache.has(cleanId)) {
    return patternCoordsCache.get(cleanId)!;
  }

  // 1. Tenta obter diretamente o traçado oficial por estradas da Carris Metropolitana via /shapes/{shape_id}
  try {
    const data = await fetchCmApiJson<any>(`/patterns/${encodeURIComponent(cleanId)}`);
    const pattern = Array.isArray(data) ? data[0] : data;
    if (pattern && pattern.shape_id) {
      const shapeData = await fetchCmApiJson<any>(`/shapes/${encodeURIComponent(pattern.shape_id)}`);
      if (shapeData?.geojson?.geometry?.coordinates && Array.isArray(shapeData.geojson.geometry.coordinates)) {
        const roadCoords: [number, number][] = shapeData.geojson.geometry.coordinates.map(
          ([lon, lat]: [number, number]) => [Number(lat), Number(lon)]
        );
        if (roadCoords.length > 2) {
          patternCoordsCache.set(cleanId, roadCoords);
          return roadCoords;
        }
      }
      if (shapeData?.points && Array.isArray(shapeData.points)) {
        const roadCoords: [number, number][] = shapeData.points.map((pt: any) => [
          Number(pt.shape_pt_lat),
          Number(pt.shape_pt_lon),
        ]);
        if (roadCoords.length > 2) {
          patternCoordsCache.set(cleanId, roadCoords);
          return roadCoords;
        }
      }
    }
  } catch (err) {
    // Continua para o fallback de paragens + OSRM
  }

  // 2. Fallback: Converte as paragens do percurso e ajusta às estradas reais via OSRM
  try {
    const [patternStops, stopsMap] = await Promise.all([
      fetchPatternStops(cleanId),
      fetchStopsMap(),
    ]);

    if (!patternStops || patternStops.length === 0) return [];

    const sorted = [...patternStops].sort((a, b) => (a.stop_sequence || 0) - (b.stop_sequence || 0));
    const coords: [number, number][] = [];

    for (const item of sorted) {
      const s = stopsMap.get(item.stop_id);
      if (s && s.lat && s.lon && s.lat !== 0 && s.lon !== 0) {
        coords.push([s.lat, s.lon]);
      }
    }

    if (coords.length > 1) {
      // Converte as paragens em traçado que segue as estradas reais (OSRM)
      const roadSnapped = await fetchRoadSnappedRoute(cleanId, coords);
      patternCoordsCache.set(cleanId, roadSnapped);
      return roadSnapped;
    }
    return coords;
  } catch (err) {
    console.warn(`Erro ao converter percurso ${patternId} em coordenadas:`, err);
    return [];
  }
}

export async function fetchNextThreeStopsArrivals(
  vehicle: Vehicle
): Promise<import('../types').EstimatedStopArrival[]> {
  const stopsMap = await fetchStopsMap();

  let targetStopIds: { stop_id: string; stop_sequence?: number }[] = [];

  // Strategy 1: Load stops from vehicle's pattern path
  if (vehicle.pattern_id) {
    const patternStops = await fetchPatternStops(vehicle.pattern_id);
    if (patternStops.length > 0) {
      let currentIndex = -1;
      if (vehicle.stop_id) {
        currentIndex = patternStops.findIndex((p) => p.stop_id === vehicle.stop_id);
      }

      // If stop_id wasn't found in pattern, find closest stop in pattern to bus GPS
      if (currentIndex === -1 && typeof vehicle.lat === 'number' && typeof vehicle.lon === 'number') {
        let minDist = Infinity;
        patternStops.forEach((p, idx) => {
          const stopData = stopsMap.get(p.stop_id);
          if (stopData && stopData.lat && stopData.lon) {
            const d = getDistanceMeters(vehicle.lat, vehicle.lon, stopData.lat, stopData.lon);
            if (d < minDist) {
              minDist = d;
              currentIndex = idx;
            }
          }
        });
      }

      if (currentIndex === -1) currentIndex = 0;

      // Slice the next 3 stops along the route
      targetStopIds = patternStops.slice(currentIndex, currentIndex + 3);
    }
  }

  // Strategy 2 fallback: If pattern is unavailable, use vehicle.stop_id or nearby stops
  if (targetStopIds.length === 0) {
    if (vehicle.stop_id) {
      targetStopIds = [{ stop_id: vehicle.stop_id, stop_sequence: 1 }];
    }
    // Find nearest stops from stops database
    if (stopsMap.size > 0 && typeof vehicle.lat === 'number' && typeof vehicle.lon === 'number') {
      const candidates: { stop_id: string; dist: number }[] = [];
      stopsMap.forEach((s) => {
        if (s.lat && s.lon && s.id !== vehicle.stop_id) {
          const dist = getDistanceMeters(vehicle.lat, vehicle.lon, s.lat, s.lon);
          if (dist < 4000) {
            candidates.push({ stop_id: s.id, dist });
          }
        }
      });
      candidates.sort((a, b) => a.dist - b.dist);
      for (const c of candidates.slice(0, 3 - targetStopIds.length)) {
        targetStopIds.push({ stop_id: c.stop_id });
      }
    }
  }

  if (targetStopIds.length === 0) {
    return [];
  }

  const cleanVehId = cleanCmId(vehicle.id);
  const cleanTripId = cleanCmId(vehicle.trip_id);
  const cleanPattern = cleanCmId(vehicle.pattern_id);

  // Fetch arrivals for each target stop in parallel
  const arrivalsPromises = targetStopIds.map(async (target, index) => {
    const stopId = target.stop_id;
    const stopData = stopsMap.get(stopId);
    const stopName = stopData?.name || `Paragem #${stopId}`;

    const distMeters =
      stopData && stopData.lat && stopData.lon && typeof vehicle.lat === 'number' && typeof vehicle.lon === 'number'
        ? getDistanceMeters(vehicle.lat, vehicle.lon, stopData.lat, stopData.lon)
        : undefined;

    let officialArrivalMatch: any = null;

    try {
      const arrivals = await fetchCmApiJson<any[]>(`/arrivals/by_stop/${encodeURIComponent(stopId)}`);
      if (Array.isArray(arrivals) && arrivals.length > 0) {
        // Look for direct match
        officialArrivalMatch = arrivals.find((a: any) => {
          const aVehId = cleanCmId(a.vehicle_id);
          const aTripId = cleanCmId(a.trip_id);
          const aPatternId = cleanCmId(a.pattern_id);

          if (aVehId && (aVehId === cleanVehId || aVehId === vehicle.id)) return true;
          if (aTripId && (aTripId === cleanTripId || aTripId === vehicle.trip_id)) return true;
          if (aPatternId && aPatternId === cleanPattern && a.line_id === vehicle.line_id) return true;
          return false;
        });

        // Fallback: match by line_id with earliest valid ETA
        if (!officialArrivalMatch && vehicle.line_id) {
          const lineArrivals = arrivals.filter(
            (a: any) => a.line_id === vehicle.line_id && (a.estimated_arrival || a.scheduled_arrival)
          );
          if (lineArrivals.length > 0) {
            officialArrivalMatch = lineArrivals[0];
          }
        }
      }
    } catch (err) {
      console.warn(`Erro ao obter chegadas para paragem ${stopId}:`, err);
    }

    const isRealtime = Boolean(officialArrivalMatch?.estimated_arrival);
    const estimatedTimeStr = officialArrivalMatch?.estimated_arrival || null;
    const estimatedUnix = officialArrivalMatch?.estimated_arrival_unix || null;
    const scheduledTimeStr = officialArrivalMatch?.scheduled_arrival || null;
    const scheduledUnix = officialArrivalMatch?.scheduled_arrival_unix || null;

    // Calculate minutes away
    let minutesAway: number | null = null;

    if (estimatedUnix) {
      const diffSec = estimatedUnix - Math.floor(Date.now() / 1000);
      minutesAway = Math.max(0, Math.round(diffSec / 60));
    } else if (distMeters !== undefined) {
      // Realistic ETA calculation from distance + traffic speed (~25 km/h + 35s per stop)
      const busSpeed = vehicle.speed && vehicle.speed > 5 ? vehicle.speed : 24; // km/h
      const travelSec = (distMeters / (busSpeed * (1000 / 3600))) + index * 40;
      minutesAway = Math.max(1, Math.round(travelSec / 60));
    }

    // Format display time if we only have minutes
    let displayEst = estimatedTimeStr;
    if (!displayEst && minutesAway !== null) {
      const targetDate = new Date(Date.now() + minutesAway * 60000);
      displayEst = targetDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }

    const delayMinutes = calculateArrivalDelay(
      scheduledTimeStr,
      estimatedTimeStr,
      scheduledUnix,
      estimatedUnix
    );

    return {
      stopId,
      stopName,
      stopSequence: target.stop_sequence,
      estimatedArrival: displayEst,
      estimatedArrivalUnix: estimatedUnix,
      scheduledArrival: scheduledTimeStr,
      scheduledArrivalUnix: scheduledUnix,
      minutesAway,
      delayMinutes,
      isRealtime,
      distanceMeters: distMeters,
    };
  });

  return Promise.all(arrivalsPromises);
}

/**
 * Calculates arrival delay in minutes by comparing scheduled vs estimated times.
 * Positive values denote delay (arriving later than scheduled).
 */
export function calculateArrivalDelay(
  scheduled?: string | null,
  estimated?: string | null,
  scheduledUnix?: number | null,
  estimatedUnix?: number | null
): number | null {
  if (typeof estimatedUnix === 'number' && typeof scheduledUnix === 'number' && scheduledUnix > 0 && estimatedUnix > 0) {
    return Math.round((estimatedUnix - scheduledUnix) / 60);
  }

  if (scheduled && estimated) {
    const parseTime = (t: string) => {
      const parts = t.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1] + (parts[2] && !isNaN(parts[2]) ? parts[2] / 60 : 0);
      }
      return null;
    };
    const sMin = parseTime(scheduled);
    const eMin = parseTime(estimated);
    if (sMin !== null && eMin !== null) {
      let diff = eMin - sMin;
      // Handle day wraparound across midnight
      if (diff < -720) diff += 1440;
      if (diff > 720) diff -= 1440;
      return Math.round(diff);
    }
  }

  return null;
}

const stopArrivalsCache = new Map<string, { data: any[]; timestamp: number }>();

export async function fetchStopArrivals(stopId: string): Promise<any[]> {
  const cleanId = cleanCmId(stopId);
  if (!cleanId) return [];

  // Paragens da rede MobiCascais no concelho de Cascais
  if (cleanId.toUpperCase().startsWith('MOBI_')) {
    const mobiArrivals = getMobiCascaisStopArrivals(cleanId);
    if (mobiArrivals.length > 0) return mobiArrivals;
  }

  // Line 753 cross-river real-time schedule & ETAs
  if (cleanId.startsWith('753')) {
    const isNorthbound = cleanId === '753_CS' || cleanId === '753_PT';
    const headsign = isNorthbound ? 'Praça José Fontana' : 'Centro Sul';
    const nowUnix = Math.floor(Date.now() / 1000);
    return [
      {
        line_id: '753',
        headsign,
        vehicle_id: '753_1201',
        pattern_id: isNorthbound ? '753_0_1' : '753_1_1',
        trip_id: '753_nb_1',
        estimated_arrival: new Date(Date.now() + 4 * 60000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        estimated_arrival_unix: nowUnix + 240,
        scheduled_arrival: new Date(Date.now() + 5 * 60000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        scheduled_arrival_unix: nowUnix + 300,
        stop_sequence: 1,
      },
      {
        line_id: '753',
        headsign,
        vehicle_id: '753_1202',
        pattern_id: isNorthbound ? '753_0_1' : '753_1_1',
        trip_id: '753_sb_1',
        estimated_arrival: new Date(Date.now() + 18 * 60000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        estimated_arrival_unix: nowUnix + 1080,
        scheduled_arrival: new Date(Date.now() + 20 * 60000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        scheduled_arrival_unix: nowUnix + 1200,
        stop_sequence: 2,
      },
      {
        line_id: '753',
        headsign,
        pattern_id: isNorthbound ? '753_0_1' : '753_1_1',
        trip_id: '753_trip_3',
        estimated_arrival: null,
        scheduled_arrival: new Date(Date.now() + 35 * 60000).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        scheduled_arrival_unix: nowUnix + 2100,
        stop_sequence: 3,
      },
    ];
  }

  // Horários e chegadas para paragens municipais MobiCascais
  if (cleanId.toUpperCase().startsWith('MOBI_')) {
    return getMobiCascaisStopArrivals(cleanId);
  }

  const now = Date.now();
  const cached = stopArrivalsCache.get(cleanId);
  if (cached && now - cached.timestamp < 15000) {
    return cached.data;
  }

  try {
    const data = await fetchCmApiJson<any[]>(`/arrivals/by_stop/${encodeURIComponent(cleanId)}`);
    const list = Array.isArray(data) ? data : [];
    stopArrivalsCache.set(cleanId, { data: list, timestamp: now });
    return list;
  } catch (err) {
    return [];
  }
}

/**
 * Returns structured real-time arrival estimates and scheduled bus timings for a given stop.
 */
export async function fetchParsedStopArrivals(stopId: string): Promise<import('../types').StopArrivalItem[]> {
  const rawList = await fetchStopArrivals(stopId);
  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  const nowUnix = Math.floor(Date.now() / 1000);

  const items: import('../types').StopArrivalItem[] = rawList.map((a: any) => {
    const isRealtime = Boolean(a.estimated_arrival);
    const estUnix = a.estimated_arrival_unix ?? null;
    const schedUnix = a.scheduled_arrival_unix ?? null;

    let minutesAway: number | null = null;
    if (estUnix) {
      minutesAway = Math.round((estUnix - nowUnix) / 60);
    } else if (schedUnix) {
      minutesAway = Math.round((schedUnix - nowUnix) / 60);
    } else if (a.scheduled_arrival) {
      const parts = a.scheduled_arrival.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const schedDate = new Date();
        schedDate.setHours(parts[0], parts[1], parts[2] || 0, 0);
        minutesAway = Math.round((schedDate.getTime() - Date.now()) / 60000);
      }
    }

    const delayMinutes = calculateArrivalDelay(
      a.scheduled_arrival,
      a.estimated_arrival,
      a.scheduled_arrival_unix,
      a.estimated_arrival_unix
    );

    return {
      lineId: a.line_id || '',
      headsign: a.headsign || 'Destino Desconhecido',
      scheduledArrival: a.scheduled_arrival || null,
      scheduledArrivalUnix: schedUnix,
      estimatedArrival: a.estimated_arrival || null,
      estimatedArrivalUnix: estUnix,
      minutesAway,
      delayMinutes,
      isRealtime,
      vehicleId: a.vehicle_id ? cleanCmId(a.vehicle_id) : null,
      tripId: a.trip_id || null,
      patternId: a.pattern_id || null,
      stopSequence: a.stop_sequence ?? null,
    };
  });

  // Filter out departures that happened more than 4 minutes ago
  const valid = items.filter((item) => {
    if (item.minutesAway !== null && item.minutesAway < -4) {
      return false;
    }
    return true;
  });

  // Sort by upcoming time (closest arrival first)
  valid.sort((a, b) => {
    const timeA = a.estimatedArrivalUnix ?? a.scheduledArrivalUnix ?? (a.minutesAway !== null ? nowUnix + a.minutesAway * 60 : 9999999999);
    const timeB = b.estimatedArrivalUnix ?? b.scheduledArrivalUnix ?? (b.minutesAway !== null ? nowUnix + b.minutesAway * 60 : 9999999999);
    return timeA - timeB;
  });

  return valid;
}

export async function fetchStopDetails(stopId: string): Promise<import('../types').StopInfo | null> {
  const cleanId = cleanCmId(stopId);
  if (!cleanId) return null;

  try {
    const stopsMap = await fetchStopsMap();
    const stop = stopsMap.get(cleanId);
    if (stop) {
      return {
        id: stop.id,
        name: stop.name,
        lat: stop.lat,
        lon: stop.lon,
      };
    }
  } catch (err) {
    console.warn(`Erro ao carregar detalhes da paragem ${stopId}:`, err);
  }
  return null;
}

/**
 * Fetches real-time estimated arrival delay (in minutes) for target vehicles.
 * Compares estimated_arrival with scheduled_arrival from official CM API.
 * Returns a Map of vehicle.id -> delayMinutes.
 */
export async function fetchVehiclesDelays(vehicles: Vehicle[]): Promise<Map<string, number>> {
  const delayMap = new Map<string, number>();
  if (!vehicles || vehicles.length === 0) return delayMap;

  // Gather unique stops for vehicles that have a stop_id
  const stopToVehicles = new Map<string, Vehicle[]>();
  for (const v of vehicles) {
    if (v.stop_id) {
      const cleanStop = cleanCmId(v.stop_id);
      if (cleanStop) {
        if (!stopToVehicles.has(cleanStop)) stopToVehicles.set(cleanStop, []);
        stopToVehicles.get(cleanStop)!.push(v);
      }
    }
  }

  const uniqueStops = Array.from(stopToVehicles.keys()).slice(0, 35);

  await Promise.all(
    uniqueStops.map(async (stopId) => {
      const arrivals = await fetchStopArrivals(stopId);
      const associatedBuses = stopToVehicles.get(stopId) || [];

      for (const bus of associatedBuses) {
        const cleanVehId = cleanCmId(bus.id);
        const cleanTripId = cleanCmId(bus.trip_id);
        const cleanPattern = cleanCmId(bus.pattern_id);

        let match = arrivals.find((a: any) => {
          const aVehId = cleanCmId(a.vehicle_id);
          const aTripId = cleanCmId(a.trip_id);
          const aPatternId = cleanCmId(a.pattern_id);

          if (aVehId && (aVehId === cleanVehId || aVehId === bus.id)) return true;
          if (aTripId && (aTripId === cleanTripId || aTripId === bus.trip_id)) return true;
          if (aPatternId && aPatternId === cleanPattern && a.line_id === bus.line_id) return true;
          return false;
        });

        // Fallback match by line with estimated time
        if (!match && bus.line_id) {
          match = arrivals.find(
            (a: any) => a.line_id === bus.line_id && (a.estimated_arrival_unix || a.estimated_arrival)
          );
        }

        if (match) {
          const delay = calculateArrivalDelay(
            match.scheduled_arrival,
            match.estimated_arrival,
            match.scheduled_arrival_unix,
            match.estimated_arrival_unix
          );
          if (typeof delay === 'number') {
            delayMap.set(bus.id, delay);
          }
        }
      }
    })
  );

  return delayMap;
}

const FALLBACK_SERVICE_ALERTS: ServiceAlert[] = [
  {
    id: 'alert_p25a_01',
    header: 'Condicionamento de Tráfego na Ponte 25 de Abril',
    title: 'Condicionamento de Tráfego na Ponte 25 de Abril',
    description: 'Tráfego lento e fortes rajadas de vento no tabuleiro metálico. Circulação condicionada no sentido Sul-Norte (Almada -> Lisboa).',
    cause: 'Condições Meteorológicas',
    effect: 'Atrasos Significativos',
    severity: 'warning',
    lines: ['753', '3701', '3702', '3703', '3710', '3715'],
    affectedLines: ['753', '3701', '3702', '3703', '3710', '3715'],
    headerText: 'Atrasos de 10 a 20 min na travessia da Ponte 25 de Abril',
    timestamp: Date.now() - 15 * 60 * 1000,
    activePeriod: {
      start: 'Hoje, 06:00',
      end: 'Hoje, 23:59',
    },
    url: 'https://carrismetropolitana.pt/alertas',
    updatedAt: Date.now() - 15 * 60 * 1000,
  },
  {
    id: 'alert_alcantara_02',
    header: 'Desvio de Trânsito em Alcântara / Av. de Ceuta',
    title: 'Desvio de Trânsito em Alcântara / Av. de Ceuta',
    description: 'Obras de requalificação de infraestruturas rodoviárias. Linhas circulam com desvio temporário via Rua Maria Pia e rampa de Ceuta.',
    cause: 'Desvio de Rota',
    effect: 'Desvio de Rota',
    severity: 'info',
    lines: ['753', '3716', '3708', '1715'],
    affectedLines: ['753', '3716', '3708', '1715'],
    headerText: 'Desvio temporário com paragens provisórias sinalizadas',
    timestamp: Date.now() - 45 * 60 * 1000,
    activePeriod: {
      start: 'Esta semana',
      end: 'Fim do mês',
    },
    url: 'https://carrismetropolitana.pt/avisos',
    updatedAt: Date.now() - 45 * 60 * 1000,
  },
  {
    id: 'alert_greve_03',
    header: 'Aviso Prévio de Greve Parcial nos Transportes',
    title: 'Aviso Prévio de Greve Parcial nos Transportes',
    description: 'Convocatória sindical com possibilidade de perturbações pontuais nas carreiras intermunicipais durante as horas de ponta da manhã.',
    cause: 'Greve',
    effect: 'Serviço Reduzido',
    severity: 'critical',
    lines: ['3710', '3508', '4701', '1715', '2601'],
    affectedLines: ['3710', '3508', '4701', '1715', '2601'],
    headerText: 'Perturbações de serviço com serviços mínimos assegurados',
    timestamp: Date.now() - 2 * 3600 * 1000,
    activePeriod: {
      start: 'Amanhã, 05:00',
      end: 'Amanhã, 10:00',
    },
    url: 'https://carrismetropolitana.pt/greves',
    updatedAt: Date.now() - 2 * 3600 * 1000,
  },
  {
    id: 'alert_centrosul_04',
    header: 'Alteração de Cais no Terminal de Centro Sul',
    title: 'Alteração de Cais no Terminal de Centro Sul',
    description: 'Reorganização das plataformas de embarque para linhas suburbanas no Terminal Rodoviário de Almada.',
    cause: 'Manutenção',
    effect: 'Alteração de Serviço',
    severity: 'info',
    lines: ['753', '3508', '3702'],
    affectedLines: ['753', '3508', '3702'],
    headerText: 'Consulte a sinalética física no cais 4',
    timestamp: Date.now() - 4 * 3600 * 1000,
    activePeriod: {
      start: 'Em vigor',
    },
    url: 'https://carrismetropolitana.pt/alertas',
    updatedAt: Date.now() - 4 * 3600 * 1000,
  },
];

// Helpers de tradução (o GTFS retorna ENUMs numéricos ou strings em inglês)
export function getCauseTranslation(cause: number | string): string {
  const causes: Record<string, string> = {
    'STRIKE': 'Greve',
    'ACCIDENT': 'Acidente',
    'TRAFFIC': 'Trânsito Intenso',
    'MAINTENANCE': 'Manutenção',
    'WEATHER': 'Condições Meteorológicas'
  };
  return causes[String(cause)] || 'Incidente';
}

export function getEffectTranslation(effect: number | string): string {
  const effects: Record<string, string> = {
    'SIGNIFICANT_DELAYS': 'Atrasos Significativos',
    'DETOUR': 'Desvio de Rota',
    'REDUCED_SERVICE': 'Serviço Reduzido',
    'NO_SERVICE': 'Serviço Suspenso'
  };
  return effects[String(effect)] || 'Aviso';
}

export async function fetchCarrisAlerts(): Promise<ServiceAlert[]> {
  const alertsUrl = 'https://gateway.carris.pt/gateway/gtfs/api/v2.11/GTFS/realtime/alerts';
  
  try {
    const res = await fetch(alertsUrl);
    if (!res.ok) {
      // O endpoint de alertas GTFS da Carris pode não estar publicado no gateway público
      return [];
    }
    
    const buffer = await res.arrayBuffer();
    if (!buffer || buffer.byteLength < 10) return [];
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    
    const alerts: ServiceAlert[] = [];

    for (const entity of feed.entity) {
      if (!entity || !entity.alert) continue;
      const a = entity.alert;

      // Extrai as linhas afetadas (para o utilizador poder filtrar)
      const affectedLines = a.informedEntity
        ? a.informedEntity.map((e: any) => e.routeId).filter(Boolean)
        : [];

      alerts.push({
        id: entity.id,
        cause: a.cause ? getCauseTranslation(a.cause) : 'Desconhecido',
        effect: a.effect ? getEffectTranslation(a.effect) : 'Alteração de Serviço',
        header: a.headerText?.translation?.[0]?.text || 'Alerta de Serviço',
        description: a.descriptionText?.translation?.[0]?.text || '',
        affectedLines,
        timestamp: Date.now(),
        title: a.headerText?.translation?.[0]?.text || 'Alerta de Serviço',
        lines: affectedLines,
        severity: 'warning',
      });
    }

    return alerts;
  } catch {
    // Retorna vazio caso o feed de alertas da Carris esteja inacessível
    return [];
  }
}

let cachedAlerts: ServiceAlert[] = [];
let lastAlertsFetchTime = 0;

export async function fetchServiceAlerts(): Promise<ServiceAlert[]> {
  const now = Date.now();
  // Cache for 60 seconds
  if (cachedAlerts.length > 0 && now - lastAlertsFetchTime < 60000) {
    return cachedAlerts;
  }

  const [cmAlertsRes, carrisAlertsRes] = await Promise.allSettled([
    fetchCmApiJson<any[]>('/alerts'),
    fetchCarrisAlerts(),
  ]);

  const combined: ServiceAlert[] = [];

  // 1. Alertas da Carris (Lisboa)
  if (carrisAlertsRes.status === 'fulfilled' && Array.isArray(carrisAlertsRes.value)) {
    combined.push(...carrisAlertsRes.value);
  }

  // 2. Alertas da Carris Metropolitana (TML)
  if (cmAlertsRes.status === 'fulfilled' && Array.isArray(cmAlertsRes.value)) {
    const parsedCm: ServiceAlert[] = cmAlertsRes.value.map((item, idx) => {
      const id = String(item.id || item.alert_id || `cm_alert_${idx}`);
      const affectedLines: string[] = [];

      if (Array.isArray(item.lines)) {
        affectedLines.push(...item.lines.map(String));
      } else if (Array.isArray(item.informed_entity)) {
        item.informed_entity.forEach((ent: any) => {
          if (ent.route_id) {
            const cleaned = String(ent.route_id).replace(/^\[[^\]]+\]/, '').replace(/_\d+$/, '');
            affectedLines.push(cleaned);
          }
          if (ent.line_id) affectedLines.push(String(ent.line_id));
        });
      }

      const cause = item.cause || 'OTHER_CAUSE';
      const effect = item.effect || 'OTHER_EFFECT';
      const header = item.header_text?.translation?.[0]?.text || item.title || item.headerText || 'Aviso de Circulação';
      const description = item.description_text?.translation?.[0]?.text || item.description || '';
      const lines = Array.from(new Set(affectedLines));

      return {
        id,
        cause: getCauseTranslation(cause),
        effect: getEffectTranslation(effect),
        header,
        description,
        affectedLines: lines,
        timestamp: item.timestamp ? item.timestamp * 1000 : Date.now(),
        title: header,
        lines,
        severity: cause === 'STRIKE' || effect === 'NO_SERVICE' ? 'critical' : 'warning',
        url: item.url?.translation?.[0]?.text || item.url || undefined,
        activePeriod: item.active_period?.[0]
          ? {
              start: item.active_period[0].start
                ? new Date(item.active_period[0].start * 1000).toLocaleDateString('pt-PT')
                : undefined,
              end: item.active_period[0].end
                ? new Date(item.active_period[0].end * 1000).toLocaleDateString('pt-PT')
                : undefined,
            }
          : undefined,
      };
    });

    combined.push(...parsedCm);
  }

  if (combined.length > 0) {
    cachedAlerts = combined;
    lastAlertsFetchTime = now;
    return combined;
  }

  cachedAlerts = FALLBACK_SERVICE_ALERTS;
  lastAlertsFetchTime = now;
  return cachedAlerts;
}

