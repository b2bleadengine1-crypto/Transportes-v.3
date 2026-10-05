import { useEffect, useRef, useCallback } from 'react';
import { Vehicle } from '../types';
import { TelemetryWorkerRequest, TelemetryWorkerResponse } from '../workers/telemetry.worker';

/**
 * Custom React/Vite Hook: Instantiates the Web Worker strictly according to Vite standards.
 * In production builds, Vite rewrites `new URL(..., import.meta.url)` to chunk assets correctly.
 */
export function useTelemetryWorker() {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // VITE PRODUCTION PATTERN:
    // Ensures Vite chunks the worker and emits the correct minified URL in Cloudflare Pages
    const worker = new Worker(
      new URL('../workers/telemetry.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const filterVehiclesInWorker = useCallback(
    (rawPayload: Vehicle[], targetLineId?: string, selectedDirection?: number | null): Promise<Vehicle[]> => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          // Graceful fallback if Worker is not yet ready or supported
          resolve(rawPayload);
          return;
        }

        const handleMessage = (e: MessageEvent<TelemetryWorkerResponse>) => {
          if (e.data.type === 'PARSE_VEHICLES_SUCCESS') {
            workerRef.current?.removeEventListener('message', handleMessage);
            resolve(e.data.vehicles);
          }
        };

        workerRef.current.addEventListener('message', handleMessage);

        const request: TelemetryWorkerRequest = {
          type: 'PARSE_VEHICLES',
          payload: rawPayload,
          targetLineId,
          selectedDirection,
        };

        workerRef.current.postMessage(request);
      });
    },
    []
  );

  return { filterVehiclesInWorker };
}
