/**
 * ===================================================================================
 * VITE-COMPLIANT TELEMETRY WEB WORKER (telemetry.worker.ts)
 * ===================================================================================
 * 
 * Offloads heavy JSON/Protobuf parsing and vehicle filtering from the main UI thread.
 * Instantiated via Vite's standard module URL constructor:
 * new Worker(new URL('../workers/telemetry.worker.ts', import.meta.url), { type: 'module' });
 */

/// <reference lib="webworker" />
declare const self: DedicatedWorkerGlobalScope;

export interface TelemetryWorkerRequest {
  type: 'PARSE_VEHICLES';
  payload: any[];
  targetLineId?: string;
  selectedDirection?: number | null;
}

export interface TelemetryWorkerResponse {
  type: 'PARSE_VEHICLES_SUCCESS';
  vehicles: any[];
  count: number;
}

self.addEventListener('message', (event: MessageEvent<TelemetryWorkerRequest>) => {
  const { type, payload, targetLineId, selectedDirection } = event.data;

  if (type === 'PARSE_VEHICLES') {
    try {
      let vehicles = Array.isArray(payload) ? payload : [];

      // 1. Filter out invalid/corrupted GPS coordinates
      vehicles = vehicles.filter((v) => {
        if (!v || typeof v.lat !== 'number' || typeof v.lon !== 'number') return false;
        if (isNaN(v.lat) || isNaN(v.lon) || v.lat === 0 || v.lon === 0) return false;
        return true;
      });

      // 2. Filter by line if requested
      if (targetLineId) {
        const target = targetLineId.toUpperCase().trim();
        vehicles = vehicles.filter((v) => (v.line_id || '').toUpperCase().trim() === target);
      }

      // 3. Filter by direction if requested
      if (selectedDirection !== undefined && selectedDirection !== null) {
        vehicles = vehicles.filter((v) => {
          if (v.direction_id !== undefined && v.direction_id !== null) {
            return v.direction_id === selectedDirection;
          }
          if (v.pattern_id && v.pattern_id.includes(`_${selectedDirection}_`)) {
            return true;
          }
          return true;
        });
      }

      self.postMessage({
        type: 'PARSE_VEHICLES_SUCCESS',
        vehicles,
        count: vehicles.length,
      } as TelemetryWorkerResponse);
    } catch (err: any) {
      self.postMessage({
        type: 'PARSE_VEHICLES_ERROR',
        error: err.message,
      });
    }
  }
});
