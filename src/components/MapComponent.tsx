import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Vehicle, Line, MapTileStyle, MapLayersConfig, StopInfo, UserLocation } from '../types';
import { getLineFallbackColor, formatStatusText, formatTimeAgo, fetchPatternCoordinates } from '../services/api';
import { METRO_STATIONS, METRO_ROUTE_COORDS, METRO_LINES, MetroStation } from '../services/metroLisboa';
import { FERTAGUS_STATIONS, FERTAGUS_TRACK_COORDS, fetchFertagusRealTrains, FertagusStation, FertagusTrain } from '../services/fertagus';
import {
  CPStation,
  CPTrain,
  ALL_CP_STATIONS,
  CP_TRACKS,
  CP_TRACK_CASCAIS,
  CP_LINES,
  fetchCpRealTrains,
  getCpRequested,
} from '../services/cpTrains';
import { MOBICASCAIS_STOPS, getMobiCascaisRouteStops } from '../services/mobiCascais';
import { BoatStation, BoatVehicle, BOAT_STATIONS, BOAT_LINES, getLiveBoats } from '../services/transtejoSoflusa';
import { MSTStation, MSTVehicle, MST_STATIONS, MST_LINES, getLiveMSTVehicles } from '../services/metroSulTejo';

interface MapComponentProps {
  vehicles: Vehicle[];
  allVehicles?: Vehicle[];
  linesMap: Map<string, Line>;
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicle: Vehicle | null) => void;
  tileStyle: MapTileStyle;
  cartoApiKey?: string;
  userLocation: UserLocation | null;
  followVehicle: boolean;
  followUser?: boolean;
  onUserPannedMap?: () => void;
  flyToTarget?: { coords: [number, number]; zoom: number; timestamp: number } | null;
  layers?: MapLayersConfig;
  stopsMap?: Map<string, StopInfo>;
  activeLines?: string[];
  onSelectStop?: (stopId: string | null) => void;
  selectedStopId?: string | null;
  vehicleDelays?: Map<string, number>;
  onSelectMetroStation?: (station: MetroStation | null) => void;
  selectedMetroStation?: MetroStation | null;
  selectedMetroLine?: 'amarela' | 'azul' | 'verde' | 'vermelha' | null;
  onSelectFertagusStation?: (station: FertagusStation | null) => void;
  selectedFertagusStation?: FertagusStation | null;
  selectedFertagusTrain?: FertagusTrain | null;
  onSelectFertagusTrain?: (train: FertagusTrain | null) => void;
  selectedLineFilter?: string | null;
  onSelectCpStation?: (station: CPStation | null) => void;
  selectedCpStation?: CPStation | null;
  selectedCpLine?: 'cascais' | 'sintra' | 'azambuja' | 'sado' | null;
  onSelectCpLine?: (lineId: 'cascais' | 'sintra' | 'azambuja' | 'sado' | null) => void;
  onSelectCpTrain?: (train: CPTrain | null) => void;
  selectedCpTrain?: CPTrain | null;
  onSelectBoatStation?: (station: BoatStation | null) => void;
  selectedBoatStation?: BoatStation | null;
  selectedBoatLine?: string | null;
  onSelectMSTStation?: (station: MSTStation | null) => void;
  selectedMSTStation?: MSTStation | null;
  selectedMSTLine?: '1' | '2' | '3' | null;
  selectedDirection?: number | null;
}

const DEFAULT_CARTO_KEY = 'cb1_450g_1_d08c11325e668926f6ab012f';

const BASE_TILE_CONFIGS: Record<MapTileStyle, { url: string; attribution: string; maxZoom: number; isCarto?: boolean }> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 19,
    isCarto: false,
  },
  'carto-voyager': {
    url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    isCarto: true,
  },
  'carto-dark': {
    url: 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    isCarto: true,
  },
  'carto-light': {
    url: 'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    isCarto: true,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
    isCarto: false,
  },
};

// Helper function to create Live Bus DivIcon with Dynamic Level of Detail (LOD) based on zoom
export const createLiveBusIcon = (
  vehicle: Vehicle,
  isSelected = false,
  zoomLevel = 15,
  lineInfo?: Line
) => {
  const lineId = vehicle.line_id || 'N/A';
  const fallback = getLineFallbackColor(lineId);
  const lineColor = lineInfo?.color || fallback.bg;

  // Level of Detail: Zoom < 14 (City / Macro view) -> Compact 8px dot with line color
  if (zoomLevel < 14) {
    return L.divIcon({
      className: `cm-bus-dot-marker ${isSelected ? 'cm-bus-marker-selected' : ''}`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -8],
      html: `
        <div class="relative flex items-center justify-center w-full h-full cursor-pointer">
          ${
            isSelected
              ? `<div class="absolute w-5 h-5 rounded-full bg-amber-400/40 animate-ping"></div>`
              : ''
          }
          <div 
            class="w-2.5 h-2.5 rounded-full border border-slate-950 shadow-md ${
              isSelected ? 'ring-2 ring-amber-400 scale-125' : ''
            }"
            style="background-color: ${lineColor};"
            title="Carreira ${lineId}"
          ></div>
        </div>
      `,
    });
  }

  // Zoom >= 14: Full detailed interface with clean upright Bus icon (sem seta nem rotação de direção)
  const speed = vehicle.speed !== null && vehicle.speed !== undefined ? vehicle.speed : 0;
  const isMobi = lineId.toUpperCase().startsWith('M') || vehicle.id.startsWith('mobi_');

  return L.divIcon({
    className: `live-bus-marker-container ${isSelected ? 'cm-bus-marker-selected' : ''}`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    html: `
      <div class="relative flex flex-col items-center justify-center w-full h-full cursor-pointer">
        <!-- Badge da Linha -->
        <div class="absolute -top-3.5 ${
          isMobi
            ? 'bg-cyan-500 text-white border-cyan-400'
            : 'bg-amber-400 text-slate-950 border-amber-500'
        } text-[9px] font-black px-1.5 py-0.2 rounded z-20 shadow-sm border whitespace-nowrap">
          ${lineId}
        </div>
        
        <!-- Ícone do Autocarro Limpo (Sem Rotação de Direção) -->
        <div 
          class="w-7 h-7 bg-slate-900 border-2 ${
            isSelected
              ? isMobi ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-110' : 'border-amber-400 ring-2 ring-amber-400/50 scale-110'
              : isMobi ? 'border-cyan-400' : 'border-emerald-400'
          } rounded-full flex items-center justify-center shadow-lg"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${isSelected ? (isMobi ? '#38bdf8' : '#fbbf24') : (isMobi ? '#38bdf8' : '#34d399')}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
            <path d="M2 12h20"/>
            <path d="M6 18v2"/>
            <path d="M18 18v2"/>
            <circle cx="7" cy="15" r="1" fill="${isSelected ? (isMobi ? '#38bdf8' : '#fbbf24') : (isMobi ? '#38bdf8' : '#34d399')}"/>
            <circle cx="17" cy="15" r="1" fill="${isSelected ? (isMobi ? '#38bdf8' : '#fbbf24') : (isMobi ? '#38bdf8' : '#34d399')}"/>
          </svg>
        </div>

        <!-- Velocidade em Direto -->
        ${speed > 0 ? `
          <div class="absolute -bottom-4 bg-slate-800 ${isMobi ? 'text-cyan-300' : 'text-emerald-400'} text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm border border-slate-700 whitespace-nowrap">
            ${speed} <span class="text-[7px] text-slate-400">km/h</span>
          </div>
        ` : `
          <div class="absolute -bottom-4 bg-slate-800 text-slate-400 text-[9px] font-mono px-1.5 py-0.5 rounded shadow-sm border border-slate-700 whitespace-nowrap">
            Parado
          </div>
        `}
      </div>
    `,
  });
};

export const MapComponent: React.FC<MapComponentProps> = ({
  vehicles,
  allVehicles,
  linesMap,
  selectedVehicleId,
  onSelectVehicle,
  tileStyle,
  cartoApiKey,
  userLocation,
  followVehicle,
  followUser,
  onUserPannedMap,
  flyToTarget,
  layers,
  stopsMap,
  activeLines,
  onSelectStop,
  selectedStopId,
  vehicleDelays,
  onSelectMetroStation,
  selectedMetroStation,
  selectedMetroLine,
  onSelectFertagusStation,
  selectedFertagusStation,
  selectedFertagusTrain,
  onSelectFertagusTrain,
  selectedLineFilter,
  onSelectCpStation,
  selectedCpStation,
  selectedCpLine,
  onSelectCpLine,
  onSelectCpTrain,
  selectedCpTrain,
  onSelectBoatStation,
  selectedBoatStation,
  selectedBoatLine,
  onSelectMSTStation,
  selectedMSTStation,
  selectedMSTLine,
  selectedDirection,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const canvasRendererRef = useRef<L.Canvas | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const lastSelectedVehicleIdRef = useRef<string | null>(null);

  // Layer groups for toggled map overlays
  const heatmapLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLinesGroupRef = useRef<L.LayerGroup | null>(null);
  const stopsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const metroLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const fertagusLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const cpLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const boatLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const mstLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const lastFittedLineRef = useRef<string | null>(null);
  const onUserPannedMapRef = useRef(onUserPannedMap);
  onUserPannedMapRef.current = onUserPannedMap;

  // Helper to build tile url with Carto API Key (?key=...)
  const getTileUrl = (style: MapTileStyle) => {
    const conf = BASE_TILE_CONFIGS[style] || BASE_TILE_CONFIGS['carto-voyager'];
    if (conf.isCarto) {
      const activeKey = (cartoApiKey || DEFAULT_CARTO_KEY).trim();
      if (activeKey) {
        return `${conf.url}?key=${encodeURIComponent(activeKey)}`;
      }
    }
    return conf.url;
  };

  // Safe check if map is ready for layer manipulation (prevents zoom animation race conditions)
  const isMapZooming = (map: L.Map | null): boolean => {
    if (!map) return true;
    return Boolean((map as any)._animatingZoom);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize Leaflet map with zoom protection settings
    const initialMap = L.map(mapContainerRef.current, {
      center: [38.7369, -9.1426], // Lisbon center
      zoom: 11,
      minZoom: 8,
      maxZoom: 19,
      zoomControl: false,
      zoomSnap: 1, // Snap to integer zoom to prevent subpixel tile & canvas distortion
      zoomDelta: 1,
      wheelPxPerZoomLevel: 100, // Smooth mousewheel zoom
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });

    // Add zoom control at bottom right for ergonomic desktop/mobile reach
    L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(initialMap);

    // Create a stable shared canvas renderer for vectors and markers
    const canvasRenderer = L.canvas({ padding: 0.5 }).addTo(initialMap);
    canvasRendererRef.current = canvasRenderer;

    const tileConf = BASE_TILE_CONFIGS[tileStyle] || BASE_TILE_CONFIGS['carto-dark'];
    const currentLayer = L.tileLayer(getTileUrl(tileStyle), {
      attribution: tileConf.attribution,
      maxZoom: tileConf.maxZoom,
      minZoom: 8,
      subdomains: tileConf.isCarto ? 'abcd' : 'abc',
      updateWhenZooming: false, // Prevents thrashing HTTP requests during zoom animation
      updateWhenIdle: true,
      keepBuffer: 4,
    }).addTo(initialMap);

    tileLayerRef.current = currentLayer;
    mapInstanceRef.current = initialMap;

    // Initialize layer groups in z-index order
    heatmapLayerGroupRef.current = L.layerGroup().addTo(initialMap);
    routeLinesGroupRef.current = L.layerGroup().addTo(initialMap);
    metroLayerGroupRef.current = L.layerGroup().addTo(initialMap);
    fertagusLayerGroupRef.current = L.layerGroup().addTo(initialMap);
    cpLayerGroupRef.current = L.layerGroup().addTo(initialMap);
    boatLayerGroupRef.current = L.layerGroup().addTo(initialMap);
    mstLayerGroupRef.current = L.layerGroup().addTo(initialMap);
    stopsLayerGroupRef.current = L.layerGroup().addTo(initialMap);

    // Clique no fundo limpo do mapa desmarca transporte e remove o traçado
    initialMap.on('click', (e) => {
      const target = e.originalEvent?.target as HTMLElement | null;
      if (
        target &&
        target.closest &&
        (target.closest('.leaflet-marker-icon') ||
          target.closest('.leaflet-popup') ||
          target.closest('.leaflet-control'))
      ) {
        return;
      }
      onSelectVehicle(null);
      if (onSelectStop) onSelectStop(null);
      if (onSelectMetroStation) onSelectMetroStation(null);
      if (onSelectFertagusStation) onSelectFertagusStation(null);
      if (onSelectFertagusTrain) onSelectFertagusTrain(null);
      if (onSelectCpStation) onSelectCpStation(null);
      if (onSelectCpTrain) onSelectCpTrain(null);
      if (onSelectCpLine) onSelectCpLine(null);
      if (onSelectBoatStation) onSelectBoatStation(null);
      if (onSelectMSTStation) onSelectMSTStation(null);
    });

    const handleDragStart = () => {
      onUserPannedMapRef.current?.();
    };
    initialMap.on('dragstart', handleDragStart);

    // Trigger invalidateSize to fix 0-height container issues when mounted in React
    const t1 = setTimeout(() => {
      if (initialMap) initialMap.invalidateSize();
    }, 60);

    const t2 = setTimeout(() => {
      if (initialMap) initialMap.invalidateSize();
    }, 300);

    const onResize = () => {
      if (initialMap) initialMap.invalidateSize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', onResize);
      initialMap.off('dragstart', handleDragStart);
      if (heatmapLayerGroupRef.current) heatmapLayerGroupRef.current.clearLayers();
      if (routeLinesGroupRef.current) routeLinesGroupRef.current.clearLayers();
      if (stopsLayerGroupRef.current) stopsLayerGroupRef.current.clearLayers();
      if (metroLayerGroupRef.current) metroLayerGroupRef.current.clearLayers();
      if (fertagusLayerGroupRef.current) fertagusLayerGroupRef.current.clearLayers();
      if (cpLayerGroupRef.current) cpLayerGroupRef.current.clearLayers();
      if (boatLayerGroupRef.current) boatLayerGroupRef.current.clearLayers();
      if (mstLayerGroupRef.current) mstLayerGroupRef.current.clearLayers();
      heatmapLayerGroupRef.current = null;
      routeLinesGroupRef.current = null;
      stopsLayerGroupRef.current = null;
      metroLayerGroupRef.current = null;
      fertagusLayerGroupRef.current = null;
      cpLayerGroupRef.current = null;
      boatLayerGroupRef.current = null;
      mstLayerGroupRef.current = null;
      if (canvasRendererRef.current) {
        initialMap.removeLayer(canvasRendererRef.current);
        canvasRendererRef.current = null;
      }
      initialMap.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Style or API Key
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileConf = BASE_TILE_CONFIGS[tileStyle] || BASE_TILE_CONFIGS['carto-dark'];
    tileLayerRef.current = L.tileLayer(getTileUrl(tileStyle), {
      attribution: tileConf.attribution,
      maxZoom: tileConf.maxZoom,
      minZoom: 8,
      subdomains: tileConf.isCarto ? 'abcd' : 'abc',
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 4,
    }).addTo(map);

    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 50);
  }, [tileStyle, cartoApiKey]);

  // Update User Location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      const latLng: [number, number] = [userLocation.lat, userLocation.lon];
      const heading = typeof userLocation.heading === 'number' && !isNaN(userLocation.heading) ? userLocation.heading : null;
      const speedKmH = typeof userLocation.speed === 'number' && userLocation.speed > 0.5 ? Math.round(userLocation.speed * 3.6) : null;
      const accuracy = Math.round(userLocation.accuracy || 20);

      const userIcon = L.divIcon({
        className: 'cm-user-live-gps-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
        html: `
          <div class="relative flex items-center justify-center w-9 h-9 pointer-events-auto">
            ${heading !== null ? `
              <!-- Feixe de Orientação Direcional (Heading Cone) -->
              <div class="absolute -top-3 w-14 h-14 pointer-events-none transition-transform duration-300" style="transform: rotate(${heading}deg); transform-origin: 50% 64.3%;">
                <div class="w-full h-full bg-gradient-to-t from-sky-400/50 via-sky-400/15 to-transparent" style="clip-path: polygon(50% 100%, 15% 0%, 85% 0%);"></div>
              </div>
            ` : `
              <!-- Halo Pulsante GPS quando parado ou sem bússola -->
              <div class="absolute w-8 h-8 rounded-full bg-sky-400/35 animate-ping"></div>
            `}
            <!-- Núcleo de Alta Visibilidade Azul Celeste com Bordo Branco -->
            <div class="relative w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-xl shadow-sky-950/70 flex items-center justify-center z-10">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>
        `,
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(latLng);
        userMarkerRef.current.setIcon(userIcon);
      } else {
        userMarkerRef.current = L.marker(latLng, {
          icon: userIcon,
          zIndexOffset: 3000,
        }).addTo(map);

        userMarkerRef.current.bindPopup(
          `<div class="p-2.5 text-xs font-sans text-white">
            <div class="flex items-center gap-1.5 text-sky-400 font-bold mb-1">
              <span class="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              A sua posição (GPS ao Vivo)
            </div>
            <div class="text-[11px] text-slate-300 space-y-0.5">
              <div>Precisão: <b class="text-white">~${accuracy}m</b></div>
              ${speedKmH !== null ? `<div>Velocidade: <b class="text-amber-400 font-mono font-bold">${speedKmH} km/h</b></div>` : ''}
              ${heading !== null ? `<div>Rumo: <b class="text-sky-300 font-mono">${Math.round(heading)}°</b></div>` : ''}
            </div>
          </div>`,
          { closeButton: true, autoPan: false }
        );
      }

      if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.setLatLng(latLng);
        userAccuracyCircleRef.current.setRadius(userLocation.accuracy || 35);
      } else {
        userAccuracyCircleRef.current = L.circle(latLng, {
          radius: userLocation.accuracy || 35,
          color: '#38bdf8',
          weight: 1,
          fillColor: '#38bdf8',
          fillOpacity: 0.10,
        }).addTo(map);
      }

      // Se o modo Seguir GPS estiver ativado pelo utilizador, desliza suavemente para centrar
      if (followUser && !isMapZooming(map)) {
        map.panTo(latLng, { animate: true, duration: 0.5 });
      }
    } else {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        map.removeLayer(userAccuracyCircleRef.current);
        userAccuracyCircleRef.current = null;
      }
    }
  }, [userLocation, followUser]);

  // Helper function to create DivIcon HTML fallback
  const createMarkerHtml = (
    v: Vehicle,
    lineInfo: Line | undefined,
    isSelected: boolean,
    delayMinutes?: number | null
  ): string => {
    const fallback = getLineFallbackColor(v.line_id);
    const bgColor = lineInfo?.color || fallback.bg;
    const textColor = lineInfo?.text_color || fallback.text;
    const isMoving = typeof v.speed === 'number' && v.speed > 3;
    const isDelayed = typeof delayMinutes === 'number' && delayMinutes > 5;

    const pulseRing =
      isMoving || isSelected
        ? `<div class="cm-pulse-ring" style="background-color: ${bgColor};"></div>`
        : '';

    let ringStyle = '';
    if (isSelected) {
      ringStyle = `box-shadow: 0 0 0 4px #fbbf24, 0 10px 25px rgba(0,0,0,0.8);`;
    } else if (isDelayed) {
      ringStyle = `box-shadow: 0 0 0 2.5px #ef4444, 0 4px 14px rgba(239, 68, 68, 0.7);`;
    }

    // Delay alert badge (> 5 min delay based on official API estimation)
    const delayBadge = isDelayed
      ? `
        <div class="cm-bus-delay-badge" title="Atraso estimado: +${Math.round(delayMinutes)} min (> 5 min)">
          <svg viewBox="0 0 24 24" width="10" height="10" stroke="#ffffff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
      `
      : '';

    return `
      <div class="cm-bus-marker-wrapper ${isSelected ? 'cm-bus-marker-selected' : ''}">
        ${pulseRing}
        <div class="cm-bus-marker-inner" style="background-color: ${bgColor}; color: ${textColor}; ${ringStyle}">
          <span>${v.line_id || 'BUS'}</span>
          ${delayBadge}
        </div>
      </div>
    `;
  };

  // Helper to create Popup HTML
  const createPopupHtml = (v: Vehicle, lineInfo: Line | undefined, delayMinutes?: number | null): string => {
    const fallback = getLineFallbackColor(v.line_id);
    const bgColor = lineInfo?.color || fallback.bg;
    const textColor = lineInfo?.text_color || fallback.text;
    const speed = typeof v.speed === 'number' ? Math.round(v.speed) : 0;
    const status = formatStatusText(v.current_status);
    const timeAgo = formatTimeAgo(v.timestamp);
    const routeName = lineInfo?.long_name || `Linha ${v.line_id}`;
    const isDelayed = typeof delayMinutes === 'number' && delayMinutes > 5;

    const delayAlert = isDelayed
      ? `
        <div class="flex items-center gap-2 p-2 mb-2 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-200 text-xs">
          <div class="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            ⚠️
          </div>
          <div>
            <div class="font-bold text-white text-[11px] leading-tight">Atraso Superior a 5 Minutos</div>
            <div class="text-[10px] text-rose-300 font-mono font-bold">+${Math.round(delayMinutes)} min face ao horário previsto</div>
          </div>
        </div>
      `
      : '';

    return `
      <div class="w-64 p-3.5 text-slate-100 font-sans">
        ${delayAlert}
        <div class="flex items-center gap-2 mb-2">
          <div class="px-2.5 py-1 rounded-md text-xs font-bold font-mono tracking-tight" style="background-color: ${bgColor}; color: ${textColor};">
            ${v.line_id}
          </div>
          <div class="text-xs text-slate-400 truncate flex-1 font-mono">
            #${v.id.replace(/[^\w]/g, '') || v.id}
          </div>
          ${isDelayed ? `<span class="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold font-mono">+${Math.round(delayMinutes)}m</span>` : ''}
        </div>

        <div class="text-sm font-semibold text-white leading-tight mb-2.5 line-clamp-2">
          ${routeName}
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-700/60 mb-3">
          <div>
            <span class="text-slate-400 block text-[10px] uppercase tracking-wider">Velocidade</span>
            <span class="font-mono font-bold text-amber-400 tabular-nums">${speed} km/h</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[10px] uppercase tracking-wider">Estado</span>
            <span class="font-medium text-slate-200 truncate block">${status}</span>
          </div>
        </div>

        <div class="flex items-center justify-between text-[11px] text-slate-400">
          <span>Atualizado ${timeAgo}</span>
          <button id="view-bus-btn-${v.id}" class="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline">
            Ver detalhes &rarr;
          </button>
        </div>
      </div>
    `;
  };

  // Update Markers with Zoom Guard
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let isDisposed = false;

    const applyMarkerUpdates = () => {
      if (isDisposed || !mapInstanceRef.current) return;

      // Crucial: Defer marker mutation if the map is mid-zoom animation
      if (isMapZooming(mapInstanceRef.current)) {
        mapInstanceRef.current.once('zoomend', applyMarkerUpdates);
        return;
      }

      try {
        const currentMarkers = markersRef.current;

        // If buses layer is toggled off in menu, clear markers and return immediately
        if (layers?.showBuses === false) {
          currentMarkers.forEach((marker) => {
            map.removeLayer(marker);
          });
          currentMarkers.clear();
          return;
        }

        const activeVehicleIds = new Set<string>();
        const currentZoom = map.getZoom();

        vehicles.forEach((v) => {
          if (!v || typeof v.lat !== 'number' || typeof v.lon !== 'number' || isNaN(v.lat) || isNaN(v.lon)) return;
          activeVehicleIds.add(v.id);
          const isSelected = v.id === selectedVehicleId;
          const lineInfo = linesMap.get(v.line_id);
          const delay = vehicleDelays?.get(v.id) ?? v.delayMinutes ?? null;
          const customIcon = createLiveBusIcon(v, isSelected, currentZoom, lineInfo);
          const iconHtml = (customIcon.options as any).html;

          const existingMarker = currentMarkers.get(v.id);

          if (existingMarker) {
            existingMarker.setLatLng([v.lat, v.lon]);
            const prevHtml = (existingMarker as any)._customIconHtml;
            if (prevHtml !== iconHtml) {
              existingMarker.setIcon(customIcon);
              (existingMarker as any)._customIconHtml = iconHtml;
            }
            existingMarker.setZIndexOffset(isSelected ? 2000 : 100);

            const popup = existingMarker.getPopup();
            if (popup && popup.isOpen()) {
              popup.setContent(createPopupHtml(v, lineInfo, delay));
            }
          } else {
            const newMarker = L.marker([v.lat, v.lon], {
              icon: customIcon,
              zIndexOffset: isSelected ? 2000 : 100,
            }).addTo(map);
            (newMarker as any)._customIconHtml = iconHtml;

            const popupContent = createPopupHtml(v, lineInfo, delay);
            newMarker.bindPopup(popupContent, {
              closeButton: true,
              autoPan: false, // Prevents conflicting pan animation during zoom!
              className: 'cm-leaflet-popup-custom',
            });

            newMarker.on('click', () => {
              onSelectVehicle(v);
            });

            newMarker.on('popupopen', () => {
              const btn = document.getElementById(`view-bus-btn-${v.id}`);
              if (btn) {
                btn.onclick = () => {
                  onSelectVehicle(v);
                };
              }
            });

            currentMarkers.set(v.id, newMarker);
          }
        });

        // Remove markers that are no longer active
        currentMarkers.forEach((marker, id) => {
          if (!activeVehicleIds.has(id)) {
            map.removeLayer(marker);
            currentMarkers.delete(id);
          }
        });
      } catch (err) {
        console.warn('Safe catch in marker update:', err);
      }
    };

    applyMarkerUpdates();
    map.on('zoomend', applyMarkerUpdates);

    return () => {
      isDisposed = true;
      map.off('zoomend', applyMarkerUpdates);
    };
  }, [vehicles, linesMap, selectedVehicleId, vehicleDelays, layers?.showBuses]);

  // Handle selected vehicle centering & follow mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedVehicleId) return;

    if (isMapZooming(map)) return;

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle) return;

    const marker = markersRef.current.get(selectedVehicleId);

    try {
      if (lastSelectedVehicleIdRef.current !== selectedVehicleId) {
        lastSelectedVehicleIdRef.current = selectedVehicleId;
        map.flyTo([selectedVehicle.lat, selectedVehicle.lon], Math.max(map.getZoom(), 14), {
          duration: 0.8,
        });
        if (marker && !marker.getPopup()?.isOpen()) {
          marker.openPopup();
        }
      } else if (followVehicle) {
        map.panTo([selectedVehicle.lat, selectedVehicle.lon], {
          animate: true,
          duration: 0.4,
        });
      }
    } catch (err) {
      console.warn('Safe catch in vehicle focus:', err);
    }
  }, [selectedVehicleId, vehicles, followVehicle]);

  // Handle explicit flyTo requests (e.g. quick jump buttons)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !flyToTarget) return;

    try {
      if (isMapZooming(map)) {
        map.stop();
      }
      map.flyTo(flyToTarget.coords, flyToTarget.zoom, {
        duration: 0.8,
        easeLinearity: 0.25,
      });
    } catch (err) {
      console.warn('Safe catch in flyToTarget:', err);
    }
  }, [flyToTarget]);

  // LAYER 1: Traffic Congestion Heatmap Overlay with Zoom Guard
  useEffect(() => {
    const map = mapInstanceRef.current;
    const heatmapGroup = heatmapLayerGroupRef.current;
    if (!map || !heatmapGroup) return;

    let isDisposed = false;

    const renderHeatmap = () => {
      if (isDisposed || !mapInstanceRef.current || !heatmapLayerGroupRef.current) return;

      if (isMapZooming(mapInstanceRef.current)) {
        mapInstanceRef.current.once('zoomend', renderHeatmap);
        return;
      }

      try {
        heatmapGroup.clearLayers();
        if (!layers?.showTrafficHeatmap) return;

        const sourceVehicles = allVehicles && allVehicles.length > 0 ? allVehicles : vehicles;
        const canvasRenderer = canvasRendererRef.current || undefined;

        sourceVehicles.forEach((v) => {
          if (typeof v.lat !== 'number' || typeof v.lon !== 'number' || v.lat === 0 || v.lon === 0) return;

          const speed = typeof v.speed === 'number' ? v.speed : 0;

          // Heavy congestion / severe slowdown (< 12 km/h)
          if (speed < 12) {
            L.circleMarker([v.lat, v.lon], {
              renderer: canvasRenderer,
              radius: 28,
              stroke: false,
              fillColor: '#ef4444',
              fillOpacity: 0.26,
            }).addTo(heatmapGroup);

            const core = L.circleMarker([v.lat, v.lon], {
              renderer: canvasRenderer,
              radius: 12,
              color: '#b91c1c',
              weight: 1.5,
              fillColor: '#dc2626',
              fillOpacity: 0.75,
            }).addTo(heatmapGroup);

            core.bindTooltip(
              `<div class="p-1.5 text-xs text-white">
                <strong class="text-rose-400">🔴 Congestionamento Intenso</strong><br>
                Velocidade: <span class="font-mono font-bold">${Math.round(speed)} km/h</span><br>
                Linha: <span class="font-mono font-bold">${v.line_id}</span>
              </div>`,
              { direction: 'top', className: 'cm-leaflet-popup-custom' }
            );
          } else if (speed < 25) {
            // Moderate traffic / delay (12-25 km/h)
            L.circleMarker([v.lat, v.lon], {
              renderer: canvasRenderer,
              radius: 18,
              stroke: false,
              fillColor: '#f59e0b',
              fillOpacity: 0.22,
            }).addTo(heatmapGroup);

            const core = L.circleMarker([v.lat, v.lon], {
              renderer: canvasRenderer,
              radius: 8,
              color: '#d97706',
              weight: 1,
              fillColor: '#f59e0b',
              fillOpacity: 0.6,
            }).addTo(heatmapGroup);

            core.bindTooltip(
              `<div class="p-1.5 text-xs text-white">
                <strong class="text-amber-400">🟡 Trânsito Moderado</strong><br>
                Velocidade: <span class="font-mono font-bold">${Math.round(speed)} km/h</span><br>
                Linha: <span class="font-mono font-bold">${v.line_id}</span>
              </div>`,
              { direction: 'top', className: 'cm-leaflet-popup-custom' }
            );
          } else {
            // Fluid flow (>= 25 km/h)
            L.circleMarker([v.lat, v.lon], {
              renderer: canvasRenderer,
              radius: 12,
              stroke: false,
              fillColor: '#10b981',
              fillOpacity: 0.14,
            }).addTo(heatmapGroup);

            const core = L.circleMarker([v.lat, v.lon], {
              renderer: canvasRenderer,
              radius: 5,
              color: '#059669',
              weight: 0.5,
              fillColor: '#10b981',
              fillOpacity: 0.45,
            }).addTo(heatmapGroup);

            core.bindTooltip(
              `<div class="p-1.5 text-xs text-white">
                <strong class="text-emerald-400">🟢 Trânsito Fluido</strong><br>
                Velocidade: <span class="font-mono font-bold">${Math.round(speed)} km/h</span><br>
                Linha: <span class="font-mono font-bold">${v.line_id}</span>
              </div>`,
              { direction: 'top', className: 'cm-leaflet-popup-custom' }
            );
          }
        });
      } catch (err) {
        console.warn('Safe catch in heatmap render:', err);
      }
    };

    renderHeatmap();

    return () => {
      isDisposed = true;
      map.off('zoomend', renderHeatmap);
    };
  }, [layers?.showTrafficHeatmap, allVehicles, vehicles]);

  // LAYER 2: Traçado Único e Exclusivo do Transporte Selecionado (Autocarro, Metro ou Comboio Fertagus)
  // - Opcional via layers?.showRouteLines (se desativado, o mapa fica 100% limpo)
  // - Rigorosamente 1 de cada vez e NUNCA todos em simultâneo
  // - Se selecionar outro transporte (ou fechar), desativa o anterior imediatamente
  // - Segue estradas reais (shapes oficiais CM / OSRM) para autocarros e carris reais para Metro/Fertagus
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeGroup = routeLinesGroupRef.current;
    if (!map || !routeGroup) return;

    let isCancelled = false;

    const renderSelectedTrajectory = async () => {
      if (isCancelled || !mapInstanceRef.current || !routeLinesGroupRef.current) return;

      if (isMapZooming(mapInstanceRef.current)) {
        mapInstanceRef.current.once('zoomend', renderSelectedTrajectory);
        return;
      }

      try {
        // Limpa SEMPRE qualquer traçado anterior imediatamente (1 de cada vez)
        routeGroup.clearLayers();

        // Se o utilizador desativou os traçados nas camadas (opcional), não desenha
        if (layers?.showRouteLines === false) return;

        // 1. Caso A: AUTOCARRO SELECIONADO (Viatura ou Filtro de Linha)
        const selectedBus = selectedVehicleId ? vehicles.find((v) => v.id === selectedVehicleId) : null;
        const targetBusLine = selectedBus?.line_id || selectedLineFilter;

        if (targetBusLine) {
          const lineInfo = linesMap.get(targetBusLine);
          const fallback = getLineFallbackColor(targetBusLine);
          const lineColor = lineInfo?.color || fallback.bg || '#009FE3';

          // Carrega as coordenadas oficiais ou adaptadas que seguem as estradas reais (não retas)
          let coords: [number, number][] = [];
          if (selectedBus?.pattern_id) {
            coords = await fetchPatternCoordinates(selectedBus.pattern_id);
          } else if (lineInfo?.pattern_ids && lineInfo.pattern_ids.length > 0) {
            coords = await fetchPatternCoordinates(lineInfo.pattern_ids[0]);
          } else {
            coords = await fetchPatternCoordinates(targetBusLine);
          }

          if (isCancelled || !coords || coords.length < 2) return;

          // Contorno exterior escuro para contraste nítido em qualquer mapa
          L.polyline(coords, {
            color: '#020617',
            weight: 7,
            opacity: 0.75,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeGroup);

          // Traçado principal colorido pelas estradas reais
          const poly = L.polyline(coords, {
            color: lineColor,
            weight: 4.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeGroup);

          poly.bindTooltip(
            `<div class="p-1.5 text-xs text-white">
              <span class="px-1.5 py-0.5 rounded font-mono font-bold" style="background-color: ${lineColor}; color: ${lineInfo?.text_color || '#ffffff'};">
                ${targetBusLine}
              </span>
              <span class="ml-1.5 font-medium">${lineInfo?.long_name || `Carreira ${targetBusLine}`}</span>
              <div class="text-[10px] text-emerald-400 mt-0.5">Trajeto real por estradas</div>
            </div>`,
            { className: 'cm-leaflet-popup-custom' }
          );

          // Ajusta a câmara para enquadrar perfeitamente o trajeto completo da carreira
          if (poly.getBounds().isValid() && lastFittedLineRef.current !== targetBusLine) {
            lastFittedLineRef.current = targetBusLine;
            map.fitBounds(poly.getBounds(), { padding: [50, 50], maxZoom: 15 });
          }
          return;
        }

        // Se nenhuma carreira estiver selecionada, limpa a referência
        lastFittedLineRef.current = null;

        // 2. Caso B: METRO SELECIONADO (Estação de Metro ou Linha de Metro selecionada)
        if (selectedMetroStation || selectedMetroLine) {
          const targetLineKey = (
            selectedMetroLine ||
            (selectedMetroStation?.lines && selectedMetroStation.lines[0]) ||
            'azul'
          ) as 'amarela' | 'azul' | 'verde' | 'vermelha';

          const metroCoords = METRO_ROUTE_COORDS[targetLineKey];
          const metroLineInfo = METRO_LINES[targetLineKey];

          if (metroCoords && metroLineInfo) {
            // Contorno escuro da linha
            L.polyline(metroCoords, {
              color: '#020617',
              weight: 7.5,
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(routeGroup);

            // Linha de carris do Metro com traço estilizado
            const metroPoly = L.polyline(metroCoords, {
              color: metroLineInfo.color,
              weight: 4.5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(routeGroup);

            // Traço central para visual ferroviário
            L.polyline(metroCoords, {
              color: '#ffffff',
              weight: 1.5,
              opacity: 0.7,
              lineCap: 'round',
              lineJoin: 'round',
              dashArray: '6, 6',
            }).addTo(routeGroup);

            metroPoly.bindTooltip(
              `<div class="p-1.5 text-xs text-white">
                <span class="px-1.5 py-0.5 rounded font-bold" style="background-color: ${metroLineInfo.color}; color: ${metroLineInfo.textColor};">
                  Metro
                </span>
                <span class="ml-1.5 font-bold">${metroLineInfo.name}</span>
                <div class="text-[10px] text-slate-300 mt-0.5">${metroLineInfo.terminals.join(' ↔ ')}</div>
              </div>`,
              { className: 'cm-leaflet-popup-custom' }
            );
          }
          return;
        }

        // 3. Caso C: COMBOIO FERTAGUS SELECIONADO (Estação ou comboio Fertagus)
        if (selectedFertagusStation || selectedFertagusTrain) {
          // Contorno exterior escuro
          L.polyline(FERTAGUS_TRACK_COORDS, {
            color: '#020617',
            weight: 7.5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeGroup);

          // Linha de carris férreos Fertagus
          const ftPoly = L.polyline(FERTAGUS_TRACK_COORDS, {
            color: '#0284c7',
            weight: 4.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeGroup);

          // Travessas ferroviárias estilizadas
          L.polyline(FERTAGUS_TRACK_COORDS, {
            color: '#e0f2fe',
            weight: 2,
            opacity: 0.85,
            dashArray: '3, 9',
            lineCap: 'butt',
          }).addTo(routeGroup);

          ftPoly.bindTooltip(
            `<div class="p-1.5 text-xs text-white">
              <span class="px-1.5 py-0.5 rounded bg-sky-500 text-slate-950 font-bold font-mono">
                Fertagus
              </span>
              <span class="ml-1.5 font-bold">Linha do Sul · Ponte 25 de Abril</span>
              <div class="text-[10px] text-sky-300 mt-0.5">Roma-Areeiro ↔ Setúbal</div>
            </div>`,
            { className: 'cm-leaflet-popup-custom' }
          );
          return;
        }

        // 4. Caso D: COMBOIO CP SELECIONADO (Estação, comboio ou linha CP)
        if (selectedCpStation || selectedCpLine || selectedCpTrain) {
          const targetLineId = (
            selectedCpLine ||
            selectedCpTrain?.lineId ||
            (selectedCpStation?.lines && selectedCpStation.lines[0]) ||
            'cascais'
          ) as 'cascais' | 'sintra' | 'azambuja' | 'sado';

          const cpTrack = CP_TRACKS[targetLineId];
          const lineInfo = CP_LINES[targetLineId];

          if (cpTrack && lineInfo) {
            // Contorno exterior escuro
            L.polyline(cpTrack, {
              color: '#020617',
              weight: 7.5,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(routeGroup);

            // Linha CP com cor oficial da linha
            const cpPoly = L.polyline(cpTrack, {
              color: lineInfo.color,
              weight: 4.5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(routeGroup);

            // Travessas ferroviárias
            L.polyline(cpTrack, {
              color: '#ffffff',
              weight: 1.8,
              opacity: 0.8,
              dashArray: '4, 8',
              lineCap: 'butt',
            }).addTo(routeGroup);

            cpPoly.bindTooltip(
              `<div class="p-1.5 text-xs text-white">
                <span class="px-1.5 py-0.5 rounded font-bold font-mono" style="background-color: ${lineInfo.color}; color: ${lineInfo.textColor};">
                  ${lineInfo.shortName}
                </span>
                <span class="ml-1.5 font-bold">${lineInfo.name}</span>
                <div class="text-[10px] text-emerald-300 mt-0.5">${lineInfo.terminals.join(' ↔ ')}</div>
              </div>`,
              { className: 'cm-leaflet-popup-custom' }
            );
            return;
          }
        }

        // 5. Caso E: Nenhum selecionado -> nenhum traçado desenhado (mapa limpo)
      } catch (err) {
        console.warn('Safe catch in selected trajectory render:', err);
      }
    };

    renderSelectedTrajectory();

    return () => {
      isCancelled = true;
      map.off('zoomend', renderSelectedTrajectory);
    };
  }, [
    layers?.showRouteLines,
    selectedVehicleId,
    selectedLineFilter,
    selectedMetroStation,
    selectedMetroLine,
    selectedFertagusStation,
    selectedFertagusTrain,
    selectedCpStation,
    selectedCpLine,
    selectedCpTrain,
    linesMap,
    vehicles,
  ]);

  // LAYER 3: Bus Stops Overlay (Apenas paragens dos trajectos dos autocarros selecionados)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const stopsGroup = stopsLayerGroupRef.current;
    if (!map || !stopsGroup) return;

    let isDisposed = false;

    const renderDirectStops = () => {
      if (isDisposed || !mapInstanceRef.current || !stopsLayerGroupRef.current) return;

      if (isMapZooming(mapInstanceRef.current)) {
        mapInstanceRef.current.once('zoomend', renderDirectStops);
        return;
      }

      try {
        stopsGroup.clearLayers();

        // Regra do utilizador: as paragens SÓ aparecem se for a dos trajectos dos autocarros selecionados
        // Identifica a linha selecionada pelo utilizador (1 selecionado cancela o anterior)
        const selectedBus = selectedVehicleId ? vehicles.find((v) => v.id === selectedVehicleId) : null;
        const focusedLine = selectedLineFilter || selectedBus?.line_id || (activeLines && activeLines.length === 1 ? activeLines[0] : null);

        // Se houver uma linha focada, mostra estritamente as paragens dessa linha selecionada (ou se layers.showStops estiver ligado)
        const targetLines = focusedLine ? [focusedLine] : (activeLines || []);
        if ((!layers?.showStops && !focusedLine) || targetLines.length === 0) {
          return;
        }

        const targetLinesSet = new Set(targetLines.map((l) => l.toUpperCase().trim()));

        // Para linhas MobiCascais ou carreiras com stop_ids definidos
        const focusedLineInfo = focusedLine ? linesMap.get(focusedLine) : null;
        const focusedStopIds = new Set<string>();
        if (focusedLineInfo?.stop_ids) {
          focusedLineInfo.stop_ids.forEach((id) => focusedStopIds.add(id.toUpperCase().trim()));
        }
        const isMobi = focusedLine ? focusedLine.toUpperCase().startsWith('M') : false;
        if (isMobi && focusedLine) {
          const mStops = getMobiCascaisRouteStops(focusedLine);
          mStops.forEach((s) => focusedStopIds.add(s.stop_id.toUpperCase().trim()));
        }

        // Recolhe paragens de todas as fontes disponíveis (stopsMap e paragens oficiais MobiCascais)
        const stopsToProcess: StopInfo[] = [];
        if (stopsMap && stopsMap.size > 0) {
          for (const s of stopsMap.values()) {
            stopsToProcess.push(s);
          }
        }
        for (const ms of MOBICASCAIS_STOPS) {
          if (!stopsToProcess.some((st) => st.id.toUpperCase() === ms.id.toUpperCase())) {
            stopsToProcess.push(ms);
          }
        }

        for (const stop of stopsToProcess) {
          if (!stop.lat || !stop.lon || stop.lat === 0 || stop.lon === 0) continue;

          // Filtro estrito: a paragem tem de pertencer à linha selecionada
          const stopUpperId = stop.id.toUpperCase().trim();
          const stopLines = (((stop as any).lines || (stop as any).line_ids || []) as string[]).map((l) => l.toUpperCase().trim());
          const belongsToSelectedBus =
            focusedStopIds.has(stopUpperId) ||
            stopLines.some((l: string) => targetLinesSet.has(l)) ||
            (targetLinesSet.has('753') && stopUpperId.startsWith('753'));

          if (!belongsToSelectedBus) continue;

          const isSelected = stop.id === selectedStopId;

          const stopIcon = L.divIcon({
            className: 'cm-custom-stop-marker',
            html: `
              <div class="relative flex flex-col items-center justify-center cursor-pointer group ${isSelected ? 'scale-125 z-50' : 'hover:scale-115'} transition-all duration-150">
                ${isSelected ? `
                  <div class="absolute -inset-2 rounded-full ${isMobi ? 'bg-cyan-400/60' : 'bg-amber-400/60'} animate-ping pointer-events-none"></div>
                ` : `
                  <!-- Auréola luminosa suave para destacar das bombas de combustível e POIs vizinhos -->
                  <div class="absolute -inset-1 rounded-full ${isMobi ? 'bg-cyan-400/40' : 'bg-amber-400/40'} blur-[3px] pointer-events-none"></div>
                `}
                <div 
                  class="w-7 h-7 rounded-full flex items-center justify-center shadow-2xl border-[2.5px] border-white ring-2 ${
                    isSelected 
                      ? isMobi ? 'ring-cyan-300 shadow-cyan-400/80' : 'ring-amber-300 shadow-amber-400/80'
                      : 'ring-slate-950/80 shadow-black/90'
                  } relative z-10"
                  style="background-color: ${isMobi ? '#009FE3' : '#FFC600'};"
                >
                  <!-- Ícone Oficial de Paragem de Autocarro -->
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${isMobi ? '#ffffff' : '#0f172a'}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 6h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
                    <path d="M2 12h20"/>
                    <path d="M6 18v2"/>
                    <path d="M18 18v2"/>
                    <circle cx="7" cy="15" r="1" fill="${isMobi ? '#ffffff' : '#0f172a'}"/>
                    <circle cx="17" cy="15" r="1" fill="${isMobi ? '#ffffff' : '#0f172a'}"/>
                  </svg>
                </div>
                <!-- Ponta inferior do pino de paragem -->
                <div class="w-2 h-2 rotate-45 -mt-1 bg-white border-r border-b border-slate-900/60 shadow-md relative z-10"></div>
              </div>
            `,
            iconSize: isSelected ? [32, 34] : [28, 30],
            iconAnchor: isSelected ? [16, 32] : [14, 28],
            popupAnchor: [0, -28],
          });

          const marker = L.marker([stop.lat, stop.lon], {
            icon: stopIcon,
            zIndexOffset: isSelected ? 3500 : 850,
          }).addTo(stopsGroup);

          marker.bindTooltip(
            `<div class="p-1.5 text-xs text-white max-w-[200px]">
              <strong class="${isSelected ? 'text-amber-300' : isMobi ? 'text-cyan-300' : 'text-amber-300'} block font-bold">${stop.name}</strong>
              <div class="flex items-center justify-between text-slate-400 font-mono text-[10px] mt-0.5">
                <span>#${stop.id}</span>
                <span class="${isMobi ? 'text-cyan-400' : 'text-amber-400'} font-sans font-semibold">Ver horários &rarr;</span>
              </div>
            </div>`,
            { direction: 'top', className: 'cm-leaflet-popup-custom' }
          );

          marker.on('click', () => {
            if (onSelectStop) onSelectStop(stop.id);
          });
        }
      } catch (err) {
        console.warn('Safe catch in stops direct render:', err);
      }
    };

    renderDirectStops();

    // Re-renderiza as paragens visíveis ao mover ou fazer zoom no mapa
    map.on('moveend', renderDirectStops);

    return () => {
      isDisposed = true;
      map.off('moveend', renderDirectStops);
      if (stopsLayerGroupRef.current) {
        stopsLayerGroupRef.current.clearLayers();
      }
    };
  }, [layers?.showStops, stopsMap, onSelectStop, selectedStopId, activeLines, selectedLineFilter, selectedVehicleId, linesMap, vehicles]);

  // LAYER 4: Metro de Lisboa (Estações interativas com chegadas em direto)
  // Nota: o traçado da linha só é desenhado quando uma estação/linha for selecionada (1 de cada vez)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const metroGroup = metroLayerGroupRef.current;
    if (!map || !metroGroup) return;

    metroGroup.clearLayers();

    // Default to true if undefined
    if (layers?.showMetro === false) return;

    try {
      // Renderizar os marcadores das 56 estações de Metro (o traçado é desenhado na Layer 2 sob seleção)
      METRO_STATIONS.forEach((station) => {
        const primaryLine = METRO_LINES[station.lines[0]];
        const isMultiLine = station.lines.length > 1;

        const iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group hover:scale-125 transition-transform">
            <div 
              class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] text-white shadow-lg border-2 ${
                isMultiLine ? 'ring-2 ring-white border-slate-900 bg-slate-900' : 'border-white'
              }"
              style="${!isMultiLine ? `background-color: ${primaryLine.color}; color: ${primaryLine.textColor};` : ''}"
              title="Estação de Metro: ${station.name}"
            >
              ${isMultiLine ? `<span class="text-amber-400 font-black">M</span>` : 'M'}
            </div>
            ${
              isMultiLine
                ? `<div class="absolute -bottom-1 flex gap-0.5">
                    ${station.lines
                      .map(
                        (l) =>
                          `<span class="w-1.5 h-1.5 rounded-full" style="background-color: ${METRO_LINES[l].color};"></span>`
                      )
                      .join('')}
                   </div>`
                : ''
            }
          </div>
        `;

        const metroIcon = L.divIcon({
          className: 'cm-metro-station-marker',
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -14],
        });

        const marker = L.marker([station.lat, station.lon], {
          icon: metroIcon,
          zIndexOffset: 1600,
        }).addTo(metroGroup);

        marker.bindTooltip(
          `<div class="p-1.5 text-xs text-white">
            <div class="flex items-center gap-1.5 font-bold">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${primaryLine.color};"></span>
              <span>Metro ${station.name}</span>
            </div>
            <div class="text-[10px] text-amber-400 mt-1 font-semibold">
              Ver tempos de chegada em direto &rarr;
            </div>
          </div>`,
          { direction: 'top', className: 'cm-leaflet-popup-custom' }
        );

        marker.on('click', () => {
          if (onSelectMetroStation) {
            onSelectMetroStation(station);
          }
        });
      });
    } catch (err) {
      console.warn('Erro ao renderizar rede Metro de Lisboa:', err);
    }
  }, [layers?.showMetro, onSelectMetroStation]);

  // LAYER 5: Fertagus (Estações & Comboios em Direto)
  // Nota: o traçado ferroviário só é desenhado quando a estação/comboio for selecionado (1 de cada vez)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const fertagusGroup = fertagusLayerGroupRef.current;
    if (!map || !fertagusGroup) return;

    let isDisposed = false;

    const renderFertagus = async () => {
      if (isDisposed || !fertagusLayerGroupRef.current) return;

      try {
        fertagusGroup.clearLayers();

        if (layers?.showFertagus === false) {
          return;
        }

        // 1. Estações da Linha Fertagus
        FERTAGUS_STATIONS.forEach((station) => {
          const iconHtml = `
            <div class="relative flex items-center justify-center w-6 h-6 cursor-pointer group">
              <div class="absolute w-5 h-5 rounded-lg bg-sky-500/30 group-hover:scale-125 transition-transform"></div>
              <div class="w-4 h-4 rounded-md bg-sky-600 border border-white text-white flex items-center justify-center shadow-md">
                <span class="font-bold text-[8px] font-mono leading-none">FT</span>
              </div>
            </div>
          `;

          const ftIcon = L.divIcon({
            className: 'cm-fertagus-station-marker',
            html: iconHtml,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -14],
          });

          const marker = L.marker([station.lat, station.lon], {
            icon: ftIcon,
            zIndexOffset: 1700,
          }).addTo(fertagusGroup);

          marker.bindTooltip(
            `<div class="p-1.5 text-xs text-white">
              <div class="flex items-center gap-1.5 font-bold">
                <span class="px-1 py-0.2 rounded bg-sky-500 text-slate-950 font-mono text-[9px]">Zona ${station.zone}</span>
                <span class="text-sky-300">Fertagus ${station.name}</span>
              </div>
              <div class="text-[10px] text-amber-400 mt-1 font-semibold">
                Ver partidas em direto &rarr;
              </div>
            </div>`,
            { direction: 'top', className: 'cm-leaflet-popup-custom' }
          );

          marker.on('click', () => {
            if (onSelectFertagusStation) {
              onSelectFertagusStation(station);
            }
          });
        });

        // 2. Comboios em circulação em tempo real (GPS LiveTagus / Fertagus)
        const trains = await fetchFertagusRealTrains();
        if (isDisposed || !fertagusLayerGroupRef.current) return;

        trains.forEach((train) => {
          const trainHtml = `
            <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer">
              <div class="absolute w-7 h-7 rounded-full bg-sky-400/40 animate-ping"></div>
              <div class="w-6 h-6 rounded-full bg-sky-500 border-2 border-white shadow-xl flex items-center justify-center text-white">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="4" y="3" width="16" height="16" rx="2"/>
                  <path d="M4 11h16"/>
                  <path d="M12 3v8"/>
                  <path d="m8 19-2 3"/>
                  <path d="m16 19 2 3"/>
                </svg>
              </div>
              <div class="absolute -bottom-3 bg-slate-900 border border-sky-400 text-sky-300 font-mono text-[8px] font-bold px-1 rounded shadow-sm whitespace-nowrap">
                ${train.destination}
              </div>
            </div>
          `;

          const trainIcon = L.divIcon({
            className: 'cm-fertagus-train-marker',
            html: trainHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
          });

          const trainMarker = L.marker([train.lat, train.lon], {
            icon: trainIcon,
            zIndexOffset: 2500,
          }).addTo(fertagusGroup);

          trainMarker.bindTooltip(
            `<div class="p-1.5 text-xs text-white">
              <strong class="text-sky-300 block font-bold">Comboio Fertagus 3500</strong>
              <div class="text-[10px] text-slate-300 mt-0.5">Destino: <strong>${train.destination}</strong></div>
              <div class="text-[10px] text-emerald-400 font-semibold mt-0.5">Velocidade: ~${train.speed || 80} km/h</div>
            </div>`,
            { direction: 'top', className: 'cm-leaflet-popup-custom' }
          );

          trainMarker.on('click', () => {
            if (onSelectFertagusTrain) {
              onSelectFertagusTrain(train);
            }
          });
        });
      } catch (err) {
        console.warn('Erro ao renderizar camada Fertagus:', err);
      }
    };

    renderFertagus();

    // Atualiza os comboios da Fertagus a cada 10 segundos
    const pollInterval = setInterval(renderFertagus, 10000);

    return () => {
      isDisposed = true;
      clearInterval(pollInterval);
      if (fertagusLayerGroupRef.current) {
        fertagusLayerGroupRef.current.clearLayers();
      }
    };
  }, [layers?.showFertagus, onSelectFertagusStation]);

  // LAYER 6: Comboios de Portugal (CP) - Estações & Comboios em Direto
  // Bloqueado no servidor por defeito. Só desbloqueia sob pedido explícito do utilizador por seleção.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const cpGroup = cpLayerGroupRef.current;
    if (!map || !cpGroup) return;

    let isDisposed = false;

    const renderCp = async () => {
      if (isDisposed || !cpLayerGroupRef.current) return;

      try {
        cpGroup.clearLayers();

        if (layers?.showCp === false) {
          return;
        }

        const isUnlocked = getCpRequested();

        // 1. Estações Ferroviárias da CP (Linhas de Cascais, Sintra, Azambuja e Sado)
        ALL_CP_STATIONS.forEach((station) => {
          const isSelected = selectedCpStation?.id === station.id;
          const primaryLine = station.lines[0];
          const lineInfo = CP_LINES[primaryLine];
          const lineColor = lineInfo?.color || '#006633';

          const stationHtml = `
            <div class="relative flex items-center justify-center w-7 h-7 cursor-pointer group">
              ${
                isSelected
                  ? `<div class="absolute w-8 h-8 rounded-full bg-emerald-400/50 animate-ping"></div>`
                  : ''
              }
              <div class="w-6 h-6 rounded-lg ${
                isSelected
                  ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300 scale-125'
                  : 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-500/80 hover:scale-110'
              } flex items-center justify-center shadow-lg transition-transform font-mono text-[9px] font-bold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="16" height="16" x="4" y="3" rx="2"/>
                  <path d="M4 11h16"/>
                  <path d="M12 3v8"/>
                  <path d="m8 19-2 3"/>
                  <path d="m18 22-2-3"/>
                  <path d="M8 15h0"/>
                  <path d="M16 15h0"/>
                </svg>
              </div>
            </div>
          `;

          const stationIcon = L.divIcon({
            className: 'cm-custom-cp-marker',
            html: stationHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14],
          });

          const marker = L.marker([station.lat, station.lon], {
            icon: stationIcon,
            zIndexOffset: isSelected ? 2900 : 700,
          }).addTo(cpGroup);

          const linesBadges = station.lines
            .map((l) => `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold" style="background-color: ${CP_LINES[l].color}; color: #ffffff;">${CP_LINES[l].shortName}</span>`)
            .join(' ');

          marker.bindTooltip(
            `<div class="p-1.5 text-xs text-white max-w-[210px]">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="px-1 py-0.2 rounded bg-emerald-600 text-white font-bold text-[9px] font-mono">CP</span>
                <span class="text-[10px] text-emerald-300 font-medium">Estação Ferroviária</span>
              </div>
              <strong class="${isSelected ? 'text-emerald-300' : 'text-white'} block font-bold text-sm leading-tight">${station.name}</strong>
              <div class="flex items-center gap-1 mt-1 flex-wrap">${linesBadges}</div>
              <div class="text-[10px] text-amber-400 mt-1 font-semibold">Ver partidas e horários &rarr;</div>
            </div>`,
            { direction: 'top', className: 'cm-leaflet-popup-custom' }
          );

          marker.on('click', () => {
            if (onSelectCpStation) {
              onSelectCpStation(station);
            }
          });
        });

        // 2. Comboios em circulação em tempo real da CP (Apenas se desbloqueado pelo utilizador)
        if (isUnlocked) {
          const allTrains = await fetchCpRealTrains();
          if (isDisposed || !cpLayerGroupRef.current) return;

          let trains = allTrains;
          if (selectedCpLine) {
            trains = trains.filter((t) => t.lineId === selectedCpLine);
          }
          if (selectedDirection !== null && selectedDirection !== undefined && selectedCpLine) {
            const lineInfo = CP_LINES[selectedCpLine];
            if (lineInfo) {
              const targetDest = selectedDirection === 0 ? lineInfo.terminals[1] : lineInfo.terminals[0];
              const cleanTarget = targetDest.toLowerCase().split('/')[0].trim();
              trains = trains.filter((t) => t.destination.toLowerCase().includes(cleanTarget));
            }
          }

          trains.forEach((train) => {
            const isTrainSelected = selectedCpTrain?.id === train.id;
            const lineInfo = CP_LINES[train.lineId];

            const trainHtml = `
              <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer">
                <div class="absolute w-7 h-7 rounded-full bg-emerald-400/40 animate-ping"></div>
                <div class="w-6 h-6 rounded-full bg-emerald-700 text-white border-2 ${
                  isTrainSelected ? 'border-amber-300 ring-2 ring-amber-400 scale-125' : 'border-white'
                } flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="16" height="16" x="4" y="3" rx="2"/>
                    <path d="M4 11h16"/>
                    <path d="M12 3v8"/>
                    <path d="m8 19-2 3"/>
                    <path d="m18 22-2-3"/>
                  </svg>
                </div>
                <div class="absolute -top-3 bg-emerald-900 border border-emerald-400/60 text-white text-[8px] font-bold font-mono px-1 rounded whitespace-nowrap">
                  CP ${train.trainNumber}
                </div>
              </div>
            `;

            const trainIcon = L.divIcon({
              className: 'cm-custom-cp-train-marker',
              html: trainHtml,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
              popupAnchor: [0, -16],
            });

            const trainMarker = L.marker([train.lat, train.lon], {
              icon: trainIcon,
              zIndexOffset: 2600,
            }).addTo(cpGroup);

            trainMarker.bindTooltip(
              `<div class="p-1.5 text-xs text-white">
                <strong class="text-emerald-300 block font-bold">CP ${train.service} · ${lineInfo?.name || 'Comboios'}</strong>
                <div class="text-[10px] text-slate-300 mt-0.5">Destino: <strong>${train.destination}</strong></div>
                <div class="text-[10px] text-emerald-400 font-semibold mt-0.5">Velocidade: ~${train.speed} km/h · ${train.carsCount} carruagens</div>
              </div>`,
              { direction: 'top', className: 'cm-leaflet-popup-custom' }
            );

            trainMarker.on('click', () => {
              if (onSelectCpTrain) {
                onSelectCpTrain(train);
              }
            });
          });
        }
      } catch (err) {
        console.warn('Erro ao renderizar camada CP:', err);
      }
    };

    renderCp();

    const pollInterval = setInterval(renderCp, 10000);

    return () => {
      isDisposed = true;
      clearInterval(pollInterval);
      if (cpLayerGroupRef.current) {
        cpLayerGroupRef.current.clearLayers();
      }
    };
  }, [layers?.showCp, selectedCpStation, selectedCpTrain, selectedCpLine, selectedDirection, onSelectCpStation, onSelectCpTrain]);

  // LAYER 7: Barcos Transtejo & Soflusa (Travessias Fluviais do Rio Tejo)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const boatGroup = boatLayerGroupRef.current;
    if (!map || !boatGroup) return;

    let isDisposed = false;

    const renderBoats = () => {
      if (isDisposed || !boatLayerGroupRef.current) return;

      try {
        boatGroup.clearLayers();

        if (layers?.showBoats === false) {
          return;
        }

        // 1. Traçados Fluviais das Linhas de Barco (Cais do Sodré, Terreiro do Paço, Belém, etc.)
        Object.keys(BOAT_LINES).forEach((lineKey) => {
          const line = BOAT_LINES[lineKey];
          const isLineSelected = selectedBoatLine === line.id;

          const polyline = L.polyline(line.track, {
            color: line.color,
            weight: isLineSelected ? 5 : 3.5,
            opacity: isLineSelected ? 0.95 : 0.7,
            dashArray: '8, 8',
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(boatGroup);

          polyline.bindTooltip(
            `<div class="p-1 text-xs text-white">
              <strong style="color: ${line.color};">${line.name}</strong>
              <div class="text-[10px] text-slate-300">Tempo de travessia: ~${line.crossingTimeMin} min (${line.operator})</div>
            </div>`,
            { sticky: true, className: 'cm-leaflet-popup-custom' }
          );
        });

        // 2. Terminais e Estações Fluviais (9 Terminais da AML)
        BOAT_STATIONS.forEach((station) => {
          const isSelected = selectedBoatStation?.id === station.id;

          const stationHtml = `
            <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer group">
              ${
                isSelected
                  ? `<div class="absolute w-9 h-9 rounded-full bg-sky-400/50 animate-ping"></div>`
                  : ''
              }
              <div class="w-6.5 h-6.5 rounded-full ${
                isSelected
                  ? 'bg-sky-400 text-slate-950 ring-2 ring-sky-300 scale-125'
                  : 'bg-slate-900 text-sky-400 hover:bg-slate-800 border-2 border-sky-400 hover:scale-110'
              } flex items-center justify-center shadow-lg transition-transform font-bold">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
                  <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
                  <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
                  <path d="M12 10v4"/>
                  <path d="M12 2v3"/>
                </svg>
              </div>
            </div>
          `;

          const stationIcon = L.divIcon({
            className: 'cm-custom-boat-marker',
            html: stationHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
          });

          const marker = L.marker([station.lat, station.lon], {
            icon: stationIcon,
            zIndexOffset: isSelected ? 2900 : 750,
          }).addTo(boatGroup);

          marker.bindTooltip(
            `<div class="p-1.5 text-xs text-white max-w-[210px]">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="px-1 py-0.2 rounded bg-sky-600 text-white font-bold text-[9px] font-mono">TRANSTEJO</span>
                <span class="text-[10px] text-sky-300 font-medium">Terminal Fluvial</span>
              </div>
              <strong class="${isSelected ? 'text-sky-300' : 'text-white'} block font-bold text-sm leading-tight">${station.name}</strong>
              <div class="text-[10px] text-slate-300 mt-1">${station.locality} · Conexões: ${station.connections.slice(0, 2).join(', ')}</div>
              <div class="text-[10px] text-amber-400 mt-1.5 font-semibold">Ver partidas e barcos &rarr;</div>
            </div>`,
            { direction: 'top', className: 'cm-leaflet-popup-custom' }
          );

          marker.on('click', () => {
            if (onSelectBoatStation) {
              onSelectBoatStation(station);
            }
          });
        });

        // 3. Embarcações em Tempo Real Navegando no Rio Tejo
        let liveBoats = getLiveBoats();
        if (selectedBoatLine) {
          liveBoats = liveBoats.filter((b) => b.lineId === selectedBoatLine);
        }
        if (selectedDirection !== null && selectedDirection !== undefined && selectedBoatLine) {
          const line = BOAT_LINES[selectedBoatLine];
          if (line && line.terminals.length >= 2) {
            const targetDest = selectedDirection === 0 ? line.terminals[line.terminals.length - 1] : line.terminals[0];
            liveBoats = liveBoats.filter((b) => b.destination.toLowerCase().includes(targetDest.toLowerCase()));
          }
        }

        liveBoats.forEach((boat) => {
          const line = BOAT_LINES[boat.lineId];
          const isDocked = boat.status === 'ATRACADO';

          const boatHtml = `
            <div class="relative flex items-center justify-center w-9 h-9 cursor-pointer group">
              <div class="absolute w-8 h-8 rounded-full bg-sky-500/30 ${isDocked ? '' : 'animate-ping'}"></div>
              <div class="w-7 h-7 rounded-full bg-slate-900 border-2 border-sky-400 text-sky-300 flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${boat.heading}deg);">
                  <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="#0284c7" stroke="#ffffff"/>
                </svg>
              </div>
              <div class="absolute -top-3.5 bg-slate-900 border border-sky-400/80 text-sky-300 text-[8px] font-bold font-mono px-1 rounded whitespace-nowrap shadow-md">
                ${boat.name}
              </div>
            </div>
          `;

          const boatIcon = L.divIcon({
            className: 'cm-custom-live-boat-marker',
            html: boatHtml,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -18],
          });

          const boatMarker = L.marker([boat.lat, boat.lon], {
            icon: boatIcon,
            zIndexOffset: 2700,
          }).addTo(boatGroup);

          boatMarker.bindTooltip(
            `<div class="p-1.5 text-xs text-white">
              <div class="flex items-center gap-1.5 mb-0.5">
                <span class="px-1 py-0.2 rounded bg-sky-600 text-white font-bold text-[9px] font-mono">${boat.vesselType}</span>
                <span class="text-[10px] text-sky-300 font-semibold">${boat.name}</span>
              </div>
              <div class="text-[11px] font-bold text-white">${line?.name || 'Ligação Fluvial'}</div>
              <div class="text-[10px] text-slate-300 mt-0.5">Destino: <strong>${boat.destination}</strong></div>
              <div class="text-[10px] text-emerald-400 font-semibold mt-0.5">
                ${isDocked ? 'Atracado no cais' : `Velocidade: ~${boat.speedKnots} nós (${boat.speedKmh} km/h) · ETA: ~${boat.etaMinutes} min`}
              </div>
            </div>`,
            { direction: 'top', className: 'cm-leaflet-popup-custom' }
          );

          boatMarker.on('click', () => {
            const term = BOAT_STATIONS.find((s) => s.name.includes(boat.destination)) || BOAT_STATIONS[0];
            if (onSelectBoatStation) {
              onSelectBoatStation(term);
            }
          });
        });
      } catch (err) {
        console.warn('Erro ao renderizar camada Barcos:', err);
      }
    };

    renderBoats();

    const boatInterval = setInterval(renderBoats, 3500);

    return () => {
      isDisposed = true;
      clearInterval(boatInterval);
      if (boatLayerGroupRef.current) {
        boatLayerGroupRef.current.clearLayers();
      }
    };
  }, [layers?.showBoats, selectedBoatStation, selectedBoatLine, selectedDirection, onSelectBoatStation]);

  // LAYER 8: Metro Sul do Tejo (MST / Trams de Almada e Seixal)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const mstGroup = mstLayerGroupRef.current;
    if (!map || !mstGroup) return;

    let isDisposed = false;

    const renderMST = () => {
      if (isDisposed || !mstLayerGroupRef.current) return;

      try {
        mstGroup.clearLayers();

        if (layers?.showMST === false) {
          return;
        }

        // 1. Traçados das Linhas 1, 2 e 3 do MST
        (['1', '2', '3'] as const).forEach((lineId) => {
          const line = MST_LINES[lineId];
          const isSelected = selectedMSTLine === lineId;

          const polyline = L.polyline(line.track, {
            color: line.color,
            weight: isSelected ? 5.5 : 3.5,
            opacity: isSelected ? 0.95 : 0.75,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(mstGroup);

          polyline.bindTooltip(
            `<div class="p-1 text-xs text-white">
              <strong style="color: ${line.color};">${line.name}</strong>
              <div class="text-[10px] text-slate-300">Metro Ligeiro de Superfície (Margem Sul)</div>
            </div>`,
            { sticky: true, className: 'cm-leaflet-popup-custom' }
          );
        });

        // 2. Paragens e Estações do MST
        MST_STATIONS.forEach((station) => {
          const isSelected = selectedMSTStation?.id === station.id;

          const stationHtml = `
            <div class="relative flex items-center justify-center w-7 h-7 cursor-pointer group">
              ${
                isSelected
                  ? `<div class="absolute w-8 h-8 rounded-full bg-teal-400/50 animate-ping"></div>`
                  : ''
              }
              <div class="w-6 h-6 rounded-lg ${
                isSelected
                  ? 'bg-teal-400 text-slate-950 ring-2 ring-teal-300 scale-125'
                  : 'bg-teal-950 text-teal-300 hover:bg-teal-900 border border-teal-500/80 hover:scale-110'
              } flex items-center justify-center shadow-lg transition-transform font-mono text-[9px] font-bold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="16" height="16" x="4" y="3" rx="2"/>
                  <path d="M4 11h16"/>
                  <path d="M12 3v8"/>
                  <path d="m8 19-2 3"/>
                  <path d="m18 22-2-3"/>
                  <path d="M8 15h0"/>
                  <path d="M16 15h0"/>
                </svg>
              </div>
            </div>
          `;

          const stationIcon = L.divIcon({
            className: 'cm-custom-mst-marker',
            html: stationHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14],
          });

          const marker = L.marker([station.lat, station.lon], {
            icon: stationIcon,
            zIndexOffset: isSelected ? 2900 : 720,
          }).addTo(mstGroup);

          const linesBadges = station.lines
            .map((l) => `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold" style="background-color: ${MST_LINES[l].color}; color: #ffffff;">L${l}</span>`)
            .join(' ');

          marker.bindTooltip(
            `<div class="p-1.5 text-xs text-white max-w-[210px]">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="px-1 py-0.2 rounded bg-teal-600 text-white font-bold text-[9px] font-mono">MST</span>
                <span class="text-[10px] text-teal-300 font-medium">Metro Sul do Tejo</span>
              </div>
              <strong class="${isSelected ? 'text-teal-300' : 'text-white'} block font-bold text-sm leading-tight">${station.name}</strong>
              <div class="flex items-center gap-1 mt-1 flex-wrap">${linesBadges}</div>
              <div class="text-[10px] text-slate-300 mt-1">${station.locality}</div>
              <div class="text-[10px] text-amber-400 mt-1 font-semibold">Ver partidas &rarr;</div>
            </div>`,
            { direction: 'top', className: 'cm-leaflet-popup-custom' }
          );

          marker.on('click', () => {
            if (onSelectMSTStation) {
              onSelectMSTStation(station);
            }
          });
        });

        // 3. Veículos (Trams Combino Plus) em Tempo Real
        let liveTrams = getLiveMSTVehicles();
        if (selectedMSTLine) {
          liveTrams = liveTrams.filter((v) => v.lineId === selectedMSTLine);
        }
        if (selectedDirection !== null && selectedDirection !== undefined && selectedMSTLine) {
          const line = MST_LINES[selectedMSTLine];
          if (line && line.terminals.length >= 2) {
            const targetDest = selectedDirection === 0 ? line.terminals[1] : line.terminals[0];
            liveTrams = liveTrams.filter((v) => v.destination.toLowerCase().includes(targetDest.toLowerCase()));
          }
        }

        liveTrams.forEach((tram) => {
          const line = MST_LINES[tram.lineId];
          const isStopped = tram.status === 'PARADO';

          const tramHtml = `
            <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer">
              <div class="absolute w-7 h-7 rounded-full bg-teal-400/40 ${isStopped ? '' : 'animate-ping'}"></div>
              <div class="w-6 h-6 rounded-full text-white border-2 border-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform" style="background-color: ${line.color};">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="16" height="16" x="4" y="3" rx="2"/>
                  <path d="M4 11h16"/>
                  <path d="M12 3v8"/>
                  <path d="m8 19-2 3"/>
                  <path d="m18 22-2-3"/>
                </svg>
              </div>
              <div class="absolute -top-3 text-[8px] font-bold font-mono px-1 rounded whitespace-nowrap shadow-md" style="background-color: ${line.color}; color: #ffffff;">
                MST ${tram.lineId}
              </div>
            </div>
          `;

          const tramIcon = L.divIcon({
            className: 'cm-custom-mst-tram-marker',
            html: tramHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
          });

          const tramMarker = L.marker([tram.lat, tram.lon], {
            icon: tramIcon,
            zIndexOffset: 2650,
          }).addTo(mstGroup);

          tramMarker.bindTooltip(
            `<div class="p-1.5 text-xs text-white">
              <strong style="color: ${line.color};" class="block font-bold">Metro Sul do Tejo · Linha ${tram.lineId}</strong>
              <div class="text-[10px] text-slate-300 mt-0.5">Destino: <strong>${tram.destination}</strong></div>
              <div class="text-[10px] text-emerald-400 font-semibold mt-0.5">
                ${isStopped ? 'Parado na estação' : `Velocidade: ~${tram.speed} km/h · ETA: ~${tram.etaMinutes} min`}
              </div>
            </div>`,
            { direction: 'top', className: 'cm-leaflet-popup-custom' }
          );

          tramMarker.on('click', () => {
            const st = MST_STATIONS.find((s) => s.name.includes(tram.destination)) || MST_STATIONS[0];
            if (onSelectMSTStation) {
              onSelectMSTStation(st);
            }
          });
        });
      } catch (err) {
        console.warn('Erro ao renderizar camada MST:', err);
      }
    };

    renderMST();

    const mstInterval = setInterval(renderMST, 3500);

    return () => {
      isDisposed = true;
      clearInterval(mstInterval);
      if (mstLayerGroupRef.current) {
        mstLayerGroupRef.current.clearLayers();
      }
    };
  }, [layers?.showMST, selectedMSTStation, selectedMSTLine, selectedDirection, onSelectMSTStation]);

  return (
    <div
      ref={mapContainerRef}
      id="meuMapa"
      className="absolute inset-0 w-full h-full z-0 bg-slate-950"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        minHeight: '100%',
      }}
    />
  );
};
