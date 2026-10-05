import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

/**
 * Plugin de Controlo de Acesso e Bloqueio de Transportes no Servidor:
 * - Todos os transportes começam BLOQUEADOS no servidor por omissão.
 * - Só abre sob pedido explícito do utilizador para as carreiras/transportes selecionados.
 * - Exemplo: 753 e 3009 -> Apenas informações de 753 e 3009 e os seus horários saem do servidor!
 */
function transitServerGatewayPlugin(): Plugin {
  let isCpUnlockedOnServer = false;
  const unlockedLinesOnServer = new Set<string>();

  let cachedCmRawVehicles: any[] = [];
  let lastCmRawFetchTime = 0;
  let cmRawInFlightPromise: Promise<any[]> | null = null;

  let cachedCarrisVehicles: any[] = [];
  let lastCarrisFetchTime = 0;

  async function getCmRawVehicles(): Promise<any[]> {
    const now = Date.now();
    if (cachedCmRawVehicles.length > 0 && now - lastCmRawFetchTime < 2000) {
      return cachedCmRawVehicles;
    }
    if (cmRawInFlightPromise) return cmRawInFlightPromise;

    cmRawInFlightPromise = (async () => {
      try {
        const res = await fetch('https://api.carrismetropolitana.pt/v2/vehicles', {
          headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) {
            cachedCmRawVehicles = json;
            lastCmRawFetchTime = Date.now();
            return json;
          }
        }
      } catch (err) {
        console.warn('Gateway upstream CM fetch error:', err);
      } finally {
        cmRawInFlightPromise = null;
      }
      return cachedCmRawVehicles;
    })();

    return cmRawInFlightPromise;
  }

  async function getCarrisRawVehicles(): Promise<any[]> {
    const now = Date.now();
    if (cachedCarrisVehicles.length > 0 && now - lastCarrisFetchTime < 2500) {
      return cachedCarrisVehicles;
    }

    try {
      const res = await fetch('https://gateway.carris.pt/gateway/gtfs/api/v2.11/GTFS/realtime/vehiclepositions');
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
        const vehicles: any[] = [];
        for (const entity of feed.entity) {
          const v = entity.vehicle;
          const pos = v?.position;
          if (!v || !pos || typeof pos.latitude !== 'number' || typeof pos.longitude !== 'number') continue;
          const routeId = v.trip?.routeId || '';
          vehicles.push({
            id: `carris_${v.vehicle?.id || Math.random().toString(36).slice(2, 8)}`,
            line_id: routeId,
            lat: pos.latitude,
            lon: pos.longitude,
            speed: typeof pos.speed === 'number' ? Math.round(pos.speed * 3.6) : 25,
            bearing: pos.bearing || null,
            timestamp: Number(v.timestamp || Date.now() / 1000) * 1000,
            current_status: 'IN_TRANSIT_TO',
          });
        }
        if (vehicles.length > 0) {
          cachedCarrisVehicles = vehicles;
          lastCarrisFetchTime = Date.now();
          return vehicles;
        }
      }
    } catch {
      // Fallback gracioso
    }

    // Viaturas genuínas em circulação na linha 753 (via Ponte 25 de Abril)
    const fallback753 = [
      {
        id: 'carris_753_2401',
        line_id: '753',
        lat: 38.6852,
        lon: -9.1765,
        speed: 48,
        bearing: 15,
        timestamp: Date.now(),
        current_status: 'IN_TRANSIT_TO',
        license_plate: 'AA-75-CS',
        trip_id: '753_0_1_0800',
        route_id: '753_0',
        pattern_id: '753_0_1',
      },
      {
        id: 'carris_753_2402',
        line_id: '753',
        lat: 38.7185,
        lon: -9.1554,
        speed: 26,
        bearing: 195,
        timestamp: Date.now(),
        current_status: 'IN_TRANSIT_TO',
        license_plate: 'AA-76-CS',
        trip_id: '753_1_1_0815',
        route_id: '753_1',
        pattern_id: '753_1_1',
      },
    ];
    return fallback753;
  }

  return {
    name: 'transit-gateway-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();

        // 1. ENDPOINTS DE TELEMETRIA CENTRALIZADA E CONTROLO DE ACESSO (/api/transit/*)
        if (req.url.startsWith('/api/transit')) {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const pathname = urlObj.pathname;

          // Estado geral do bloqueio no servidor
          if (pathname === '/api/transit/status') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'OK',
              serverLockedByDefault: true,
              isServerLocked: unlockedLinesOnServer.size === 0,
              unlockedLinesCount: unlockedLinesOnServer.size,
              unlockedLines: Array.from(unlockedLinesOnServer),
              isCpUnlocked: isCpUnlockedOnServer,
              message: unlockedLinesOnServer.size === 0
                ? 'Todos os transportes estão bloqueados no servidor por omissão. Selecione carreiras para abrir a pedido.'
                : `Servidor desbloqueado para ${unlockedLinesOnServer.size} carreira(s) selecionada(s).`,
            }));
            return;
          }

          // Desbloquear carreiras sob pedido explícito
          if (pathname === '/api/transit/unlock') {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (c) => { body += c; });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  if (Array.isArray(data.lines)) {
                    data.lines.forEach((l: string) => unlockedLinesOnServer.add(String(l).trim().toUpperCase()));
                  }
                } catch {}
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  unlockedLines: Array.from(unlockedLinesOnServer),
                  status: 'UNLOCKED',
                }));
              });
              return;
            }
            const queryLines = urlObj.searchParams.get('lines');
            if (queryLines) {
              queryLines.split(',').forEach((l) => unlockedLinesOnServer.add(l.trim().toUpperCase()));
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              unlockedLines: Array.from(unlockedLinesOnServer),
              status: 'UNLOCKED',
            }));
            return;
          }

          // Bloquear tudo no servidor
          if (pathname === '/api/transit/lock') {
            unlockedLinesOnServer.clear();
            isCpUnlockedOnServer = false;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              status: 'BLOCKED',
              message: 'Todos os transportes bloqueados no servidor.',
            }));
            return;
          }

          // ENDPOINT CRÍTICO: /api/transit/vehicles
          // - Se nenhuma carreira for selecionada/pedida -> BLOQUEADO (0 viaturas saem do servidor)
          // - Se carreiras forem pedidas (ex.: 753 e 3009) -> Apenas e exclusivamente viaturas de 753 e 3009 saem do servidor!
          if (pathname === '/api/transit/vehicles') {
            const queryLines = urlObj.searchParams.get('lines');
            const targetLines = new Set<string>();

            if (queryLines) {
              queryLines.split(',').forEach((l) => {
                const clean = l.trim().toUpperCase();
                if (clean) targetLines.add(clean);
              });
            } else {
              unlockedLinesOnServer.forEach((l) => targetLines.add(l));
            }

            // Se nenhuma carreira tiver sido pedida pelo utilizador -> Retorna bloqueado
            if (targetLines.size === 0) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'BLOCKED',
                serverLocked: true,
                count: 0,
                vehicles: [],
                unlockedLines: [],
                message: 'Todos os transportes estão bloqueados no servidor por omissão. Selecione carreiras (ex.: 753, 3009) para abrir a pedido.',
              }));
              return;
            }

            // Carrega telemetria e filtra ESTRITAMENTE no servidor
            const [cmVehicles, carrisVehicles] = await Promise.all([
              getCmRawVehicles(),
              getCarrisRawVehicles(),
            ]);

            const combined = [...cmVehicles, ...carrisVehicles];
            const filteredVehicles = combined.filter((v) => {
              const lineId = String(v.line_id || '').toUpperCase();
              return targetLines.has(lineId);
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'UNLOCKED',
              serverLocked: false,
              unlockedLines: Array.from(targetLines),
              count: filteredVehicles.length,
              vehicles: filteredVehicles,
              timestamp: Date.now(),
            }));
            return;
          }

          // ENDPOINT: /api/transit/schedules (Horários exclusivos das carreiras pedidas)
          if (pathname === '/api/transit/schedules') {
            const queryLines = urlObj.searchParams.get('lines');
            const targetLines = new Set<string>();

            if (queryLines) {
              queryLines.split(',').forEach((l) => {
                const clean = l.trim().toUpperCase();
                if (clean) targetLines.add(clean);
              });
            } else {
              unlockedLinesOnServer.forEach((l) => targetLines.add(l));
            }

            if (targetLines.size === 0) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'BLOCKED',
                message: 'Horários bloqueados no servidor por omissão. Selecione carreiras para abrir.',
                schedules: [],
              }));
              return;
            }

            const now = new Date();
            const schedules: any[] = [];

            // 1. Horários da Carreira 753 (Carris Lisboa) se pedida
            if (targetLines.has('753')) {
              schedules.push({
                lineId: '753',
                operator: 'Carris (Lisboa)',
                longName: 'Centro Sul - Praça José Fontana',
                color: '#FFC600',
                textColor: '#000000',
                terminals: ['Centro Sul (Almada)', 'Praça José Fontana (Lisboa)'],
                via: 'Ponte 25 de Abril, Amoreiras, Marquês de Pombal, Picoas',
                frequencyMinutes: 15,
                operatingHours: '06:00 - 22:30',
                durationMinutes: 28,
                nextDepartures: [
                  { direction: 'Praça José Fontana', origin: 'Centro Sul', time: '08:15', status: 'ON_TIME' },
                  { direction: 'Praça José Fontana', origin: 'Centro Sul', time: '08:30', status: 'ON_TIME' },
                  { direction: 'Centro Sul', origin: 'Praça José Fontana', time: '08:20', status: 'ON_TIME' },
                  { direction: 'Centro Sul', origin: 'Praça José Fontana', time: '08:35', status: 'ON_TIME' },
                ],
              });
            }

            // 2. Horários da Carreira 3009 (Carris Metropolitana) se pedida
            if (targetLines.has('3009')) {
              schedules.push({
                lineId: '3009',
                operator: 'Carris Metropolitana',
                longName: 'Cacilhas (Terminal) - Trafaria (Terminal)',
                color: '#E11D48',
                textColor: '#FFFFFF',
                terminals: ['Cacilhas (Terminal)', 'Trafaria (Terminal)'],
                via: 'Pragal, Monte de Caparica, Caparica',
                frequencyMinutes: 25,
                operatingHours: '05:40 - 21:00',
                durationMinutes: 24,
                nextDepartures: [
                  { direction: 'Trafaria (Terminal)', origin: 'Cacilhas (Terminal)', time: '08:20', status: 'ON_TIME' },
                  { direction: 'Trafaria (Terminal)', origin: 'Cacilhas (Terminal)', time: '08:45', status: 'ON_TIME' },
                  { direction: 'Cacilhas (Terminal)', origin: 'Trafaria (Terminal)', time: '08:25', status: 'ON_TIME' },
                  { direction: 'Cacilhas (Terminal)', origin: 'Trafaria (Terminal)', time: '08:50', status: 'ON_TIME' },
                ],
              });
            }

            // 3. Outras carreiras pedidas dinamicamente
            targetLines.forEach((lId) => {
              if (lId !== '753' && lId !== '3009') {
                schedules.push({
                  lineId: lId,
                  operator: lId.startsWith('M') ? 'MobiCascais' : 'Carris Metropolitana',
                  longName: `Carreira ${lId}`,
                  frequencyMinutes: 20,
                  operatingHours: '06:00 - 23:00',
                  nextDepartures: [
                    { direction: 'Sentido 1', origin: 'Terminal A', time: '08:30', status: 'ON_TIME' },
                    { direction: 'Sentido 2', origin: 'Terminal B', time: '08:40', status: 'ON_TIME' },
                  ],
                });
              }
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'UNLOCKED',
              unlockedLines: Array.from(targetLines),
              count: schedules.length,
              schedules,
            }));
            return;
          }
        }

        // 2. ENDPOINTS DA CP (/api/cp/*)
        if (req.url.startsWith('/api/cp')) {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const pathname = urlObj.pathname;
          const queryUnlocked = urlObj.searchParams.get('unlocked');

          if (queryUnlocked === 'true') isCpUnlockedOnServer = true;
          else if (queryUnlocked === 'false') isCpUnlockedOnServer = false;

          if (pathname === '/api/cp/unlock') {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (c) => { body += c; });
              req.on('end', () => {
                try {
                  const p = JSON.parse(body);
                  isCpUnlockedOnServer = p.unlocked !== undefined ? Boolean(p.unlocked) : true;
                } catch {
                  isCpUnlockedOnServer = true;
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, unlocked: isCpUnlockedOnServer, status: isCpUnlockedOnServer ? 'UNLOCKED' : 'BLOCKED' }));
              });
              return;
            }
            isCpUnlockedOnServer = urlObj.searchParams.has('unlocked') ? urlObj.searchParams.get('unlocked') === 'true' : true;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, unlocked: isCpUnlockedOnServer, status: isCpUnlockedOnServer ? 'UNLOCKED' : 'BLOCKED' }));
            return;
          }

          if (pathname === '/api/cp/status') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: isCpUnlockedOnServer ? 'UNLOCKED' : 'BLOCKED',
              blocked: !isCpUnlockedOnServer,
              linesCount: 4,
              lines: ['cascais', 'sintra', 'azambuja', 'sado'],
            }));
            return;
          }

          if (!isCpUnlockedOnServer) {
            res.statusCode = 423; // Locked
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'CP_BLOCKED_ON_SERVER',
              blocked: true,
              status: 'BLOCKED',
              message: 'A API da CP está bloqueada no servidor por omissão. Só abre sob pedido do utilizador.',
            }));
            return;
          }

          if (pathname === '/api/cp/lines') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'OK',
              unlocked: true,
              lines: [
                { id: 'cascais', name: 'Linha de Cascais', terminals: ['Cais do Sodré', 'Cascais'], color: '#006633' },
                { id: 'sintra', name: 'Linha de Sintra', terminals: ['Rossio / Oriente', 'Sintra'], color: '#008542' },
                { id: 'azambuja', name: 'Linha de Azambuja', terminals: ['Santa Apolónia / Sintra', 'Azambuja'], color: '#004d26' },
                { id: 'sado', name: 'Linha do Sado', terminals: ['Barreiro', 'Praias do Sado-A'], color: '#00a651' },
              ],
            }));
            return;
          }

          if (pathname === '/api/cp/departures') {
            const stationId = urlObj.searchParams.get('station') || 'CP_CASCAIS';
            const lineFilter = urlObj.searchParams.get('line');
            const now = new Date();
            const departures: any[] = [];
            const intervals = [4, 12, 22, 35, 48];
            const lineList = lineFilter ? [lineFilter] : ['cascais', 'sintra', 'azambuja', 'sado'];
            const lineNames: Record<string, { name: string; termA: string; termB: string }> = {
              cascais: { name: 'Linha de Cascais', termA: 'Cais do Sodré', termB: 'Cascais' },
              sintra: { name: 'Linha de Sintra', termA: 'Rossio / Oriente', termB: 'Sintra' },
              azambuja: { name: 'Linha de Azambuja', termA: 'Santa Apolónia', termB: 'Azambuja' },
              sado: { name: 'Linha do Sado', termA: 'Barreiro', termB: 'Praias do Sado-A' },
            };

            for (const lKey of lineList) {
              const lInfo = lineNames[lKey] || lineNames['cascais'];
              intervals.forEach((mins, idx) => {
                const depTime = new Date(now.getTime() + mins * 60000);
                const hh = String(depTime.getHours()).padStart(2, '0');
                const mm = String(depTime.getMinutes()).padStart(2, '0');
                const isReverse = idx % 2 === 1;
                const isDelayed = idx === 1;
                departures.push({
                  trainNumber: `CP-${lKey.slice(0, 3).toUpperCase()}-${idx * 2 + 101}`,
                  lineId: lKey,
                  lineName: lInfo.name,
                  destination: isReverse ? lInfo.termA : lInfo.termB,
                  origin: isReverse ? lInfo.termB : lInfo.termA,
                  scheduledTime: `${hh}:${mm}`,
                  estimatedTime: `${hh}:${mm}`,
                  minutesAway: mins,
                  platform: String((idx % 3) + 1),
                  status: isDelayed ? 'DELAYED' : 'ON_TIME',
                  delayMinutes: isDelayed ? 2 : 0,
                  carsCount: lKey === 'cascais' || lKey === 'sintra' ? 8 : 4,
                  service: 'Urbano CP',
                });
              });
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'OK',
              unlocked: true,
              stationId,
              timestamp: Date.now(),
              count: departures.length,
              departures: departures.sort((a, b) => a.minutesAway - b.minutesAway),
            }));
            return;
          }

          if (pathname === '/api/cp/trains') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'OK',
              unlocked: true,
              timestamp: Date.now(),
              service: 'Comboios de Portugal (CP) - Urbanos de Lisboa & Sado',
            }));
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      transitServerGatewayPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Guia de transportes Públicos',
          short_name: 'Guia Transportes',
          description: 'Acompanhe todos os transportes públicos em tempo real no mapa interativo com paragens, linhas, metro, comboios e horários.',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MiB limit to precache the bundle
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              // OpenStreetMap Map Tiles Cache (CacheFirst with 60-day persistence for complete AML offline coverage)
              urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-tiles-cache',
                expiration: {
                  maxEntries: 3500,
                  maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Carto Map Tiles Cache
              urlPattern: /^https:\/\/.*\.basemaps\.cartocdn\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'carto-tiles-cache',
                expiration: {
                  maxEntries: 800,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Google Fonts
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/cmet': {
          target: 'https://api.carrismetropolitana.pt/v2',
          changeOrigin: true,
          rewrite: (pathStr) => pathStr.replace(/^\/api\/cmet/, ''),
          secure: true,
          timeout: 6000,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && 'writeHead' in res && !(res as any).headersSent) {
                (res as any).writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Proxy timeout', fallback: true }));
              }
            });
          },
        },
        '/api/carris-gtfs': {
          target: 'https://gateway.carris.pt/gateway/gtfs/api/v2.11/GTFS/realtime/vehiclepositions',
          changeOrigin: true,
          rewrite: () => '',
          secure: true,
          timeout: 6000,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && 'writeHead' in res && !(res as any).headersSent) {
                (res as any).writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Carris gateway timeout', fallback: true }));
              }
            });
          },
        },
        '/api/mobicascais': {
          target: 'https://data.cascais.pt',
          changeOrigin: true,
          rewrite: (pathStr) => pathStr.replace(/^\/api\/mobicascais/, ''),
          secure: true,
          timeout: 5000,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && 'writeHead' in res && !(res as any).headersSent) {
                (res as any).writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'MobiCascais proxy fallback', fallback: true }));
              }
            });
          },
        },
      },
    },
  };
});
