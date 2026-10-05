import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Vehicle, Line, AreaFilter, MotionFilter, MapTileStyle, MapLayersConfig, ServiceAlert, StopInfo, UserLocation } from './types';
import {
  fetchLiveVehicles,
  fetchLinesMap,
  fetchStopsMap,
  fetchVehiclesDelays,
  fetchServiceAlerts,
  getAreaForLine,
  getStoredCartoApiKey,
  setStoredCartoApiKey,
  getDistanceMeters,
  setMobiCascaisRequested,
} from './services/api';
import { TopNav } from './components/TopNav';
import { MapComponent } from './components/MapComponent';
import { ControlOverlay } from './components/ControlOverlay';
import { BusDrawer } from './components/BusDrawer';
import { StopArrivalsDrawer } from './components/StopArrivalsDrawer';
import { SidebarList } from './components/SidebarList';
import { AboutModal } from './components/AboutModal';
import { SettingsModal } from './components/SettingsModal';
import { LineSelectorModal } from './components/LineSelectorModal';
import { LayerControlPanel } from './components/LayerControlPanel';
import { ServiceAlertsModal } from './components/ServiceAlertsModal';
import { FloatingSearchBar } from './components/FloatingSearchBar';
import { FloatingActionButtons } from './components/FloatingActionButtons';
import { BottomSheet } from './components/BottomSheet';
import { MetroStationDrawer } from './components/MetroStationDrawer';
import { FertagusStationDrawer } from './components/FertagusStationDrawer';
import { CPStationDrawer } from './components/CPStationDrawer';
import { BoatStationDrawer } from './components/BoatStationDrawer';
import { MSTStationDrawer } from './components/MSTStationDrawer';
import { DirectionModal } from './components/DirectionModal';
import { FavoritesModal, getStoredFavorites } from './components/FavoritesModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { ProximityAlarmBanner } from './components/ProximityAlarmBanner';
import { getTransportDirections, TransportDirectionInfo } from './services/directions';
import { MetroStation, METRO_STATIONS, METRO_LINES } from './services/metroLisboa';
import { FertagusStation, FERTAGUS_STATIONS, FertagusTrain } from './services/fertagus';
import { CPStation, CPTrain, CP_LINES, ALL_CP_STATIONS, getCpRequested, setCpRequested } from './services/cpTrains';
import { BoatStation, BOAT_STATIONS, BOAT_LINES } from './services/transtejoSoflusa';
import { MSTStation, MST_STATIONS, MST_LINES } from './services/metroSulTejo';
import { getMobiCascaisRouteCoordinates, fetchMobiCascaisRealVehicles } from './services/mobiCascais';
import { OfflineMapModal } from './components/OfflineMapModal';
import {
  DestinationStop,
  requestNotificationPermission,
  sendProximityNotification,
} from './services/proximityAlarm';
import { AlertCircle, Loader2, Bus, Plus, Globe2, X, Train, Layers, Bell, Settings, Info, BarChart3, Search, Zap, Lock, Unlock, Navigation, Ship, Star, HardDrive } from 'lucide-react';

const DEFAULT_REFRESH_INTERVAL = 3;
const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export default function App() {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [linesMap, setLinesMap] = useState<Map<string, Line>>(new Map());
  const [stopsMap, setStopsMap] = useState<Map<string, StopInfo>>(new Map());
  const [vehicleDelays, setVehicleDelays] = useState<Map<string, number>>(new Map());
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Frequência de atualização configurada pelo utilizador: ao momento (2-3s) ou mais espaçada (5s, 15s, 30s)
  const [baseRefreshInterval, setBaseRefreshInterval] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cm_refresh_interval');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch {}
    return DEFAULT_REFRESH_INTERVAL;
  });

  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(baseRefreshInterval);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Smart Refresh (10s active -> 30s when inactive for > 5 min to save battery and data)
  const [smartRefreshEnabled, setSmartRefreshEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cm_smart_refresh');
      if (saved !== null) return saved === 'true';
      return true;
    } catch {
      return true;
    }
  });
  const [lastActivityTime, setLastActivityTime] = useState<number>(() => Date.now());
  const [isUserInactive, setIsUserInactive] = useState<boolean>(false);
  const [inactivitySeconds, setInactivitySeconds] = useState<number>(0);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'refresh' | 'carto' | 'cards' | 'offline'>('refresh');
  const [isOfflineMapModalOpen, setIsOfflineMapModalOpen] = useState(false);

  // Active lines chosen by user (starts empty or with saved preferences)
  const [activeLines, setActiveLines] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cm_active_lines');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });

  // Sinal dos autocarros: ativo por defeito para apresentar autocarros em tempo real no arranque
  const [showAllVehicles, setShowAllVehicles] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cm_show_all_vehicles');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  // Layer control state (bus stops, route lines, traffic congestion heatmap, mobicascais)
  const [mapLayers, setMapLayers] = useState<MapLayersConfig>(() => {
    try {
      const saved = localStorage.getItem('cm_map_layers');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      showStops: false,
      showRouteLines: true,
      showTrafficHeatmap: false,
      showMetro: true,
      showFertagus: true,
      showMobiCascais: true,
      showCp: true,
      showBoats: true,
      showMST: true,
    };
  });

  const [isLayerControlOpen, setIsLayerControlOpen] = useState(false);
  const [isLineSelectorOpen, setIsLineSelectorOpen] = useState(false);
  const [lineSelectorInitialTab, setLineSelectorInitialTab] = useState<'mobi' | 'cmet' | 'carris' | 'cp'>('mobi');
  const [showMiddlePrompt, setShowMiddlePrompt] = useState(false);

  const handleOpenLineSelector = (tab: 'mobi' | 'cmet' | 'carris' | 'cp' = 'mobi') => {
    setLineSelectorInitialTab(tab);
    setIsLineSelectorOpen(true);
  };

  // Active Bottom Sheet drawer state
  type ActiveSheet = 'none' | 'menu' | 'search' | 'alerts' | 'layers' | 'settings' | 'about' | 'metro' | 'fertagus' | 'cp' | 'boat' | 'mst' | 'favorites';
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>('none');
  const [selectedMetroStation, setSelectedMetroStation] = useState<MetroStation | null>(null);
  const [selectedMetroLine, setSelectedMetroLine] = useState<'amarela' | 'azul' | 'verde' | 'vermelha' | null>(null);
  const [selectedFertagusStation, setSelectedFertagusStation] = useState<FertagusStation | null>(null);
  const [selectedFertagusTrain, setSelectedFertagusTrain] = useState<FertagusTrain | null>(null);
  const [selectedCpStation, setSelectedCpStation] = useState<CPStation | null>(null);
  const [selectedCpLine, setSelectedCpLine] = useState<'cascais' | 'sintra' | 'azambuja' | 'sado' | null>(null);
  const [selectedCpTrain, setSelectedCpTrain] = useState<CPTrain | null>(null);
  const [isCpUnlocked, setIsCpUnlocked] = useState<boolean>(() => getCpRequested());

  // Boat & MST state
  const [selectedBoatStation, setSelectedBoatStation] = useState<BoatStation | null>(null);
  const [selectedBoatLine, setSelectedBoatLine] = useState<string | null>(null);
  const [selectedMSTStation, setSelectedMSTStation] = useState<MSTStation | null>(null);
  const [selectedMSTLine, setSelectedMSTLine] = useState<'1' | '2' | '3' | null>(null);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState<boolean>(false);
  const [favoritesOnlyMode, setFavoritesOnlyMode] = useState<boolean>(false);

  // Sentido do trajeto selecionado (0 = Ida, 1 = Volta, null = Ambos)
  const [selectedDirection, setSelectedDirection] = useState<number | null>(null);
  const [directionModalInfo, setDirectionModalInfo] = useState<TransportDirectionInfo | null>(null);
  const [isDirectionModalOpen, setIsDirectionModalOpen] = useState<boolean>(false);
  const [currentDirectionLabel, setCurrentDirectionLabel] = useState<string | null>(null);

  const handleSelectDirection = (dir: number | null, label: string) => {
    setSelectedDirection(dir);
    setCurrentDirectionLabel(label);
    loadVehicles(false);
  };

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<AreaFilter>('all');
  const [selectedMotion, setSelectedMotion] = useState<MotionFilter>('all');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [followVehicle, setFollowVehicle] = useState(false);

  // Map & Navigation: OpenStreetMap is the primary default
  const [tileStyle, setTileStyle] = useState<MapTileStyle>(() => {
    try {
      const saved = localStorage.getItem('cm_tile_style');
      if (saved && (saved === 'osm' || saved === 'satellite' || saved.startsWith('carto'))) {
        return saved as MapTileStyle;
      }
    } catch {}
    return 'osm';
  });
  const [cartoApiKey, setCartoApiKey] = useState<string>(() => getStoredCartoApiKey());
  const [activeView, setActiveView] = useState<'map' | 'lines' | 'stats' | 'about'>('map');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isCartoModalOpen, setIsCartoModalOpen] = useState(false);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  // User Geolocation & Live GPS Tracking
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isLiveTrackingUser, setIsLiveTrackingUser] = useState(false);
  const [followUser, setFollowUser] = useState(false);
  const [gpsFeedbackToast, setGpsFeedbackToast] = useState<string | null>(null);
  const userWatchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const lastRawUserLocRef = useRef<{ lat: number; lon: number } | null>(null);
  const fetchEpochRef = useRef(0);
  const isFetchingVehiclesRef = useRef(false);
  const lastAutoCenteredLineRef = useRef<string | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<{ coords: [number, number]; zoom: number; timestamp: number } | null>(null);

  // Selected bus stop for arrival estimates & full timetables
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Proximity alarm for destination stop (< 500m)
  const [destinationStop, setDestinationStop] = useState<DestinationStop | null>(null);
  const [hasAlertedProximity, setHasAlertedProximity] = useState(false);

  const handleToggleDestinationStop = async (stop: { id: string; name: string; lat: number; lon: number }) => {
    if (destinationStop?.id === stop.id) {
      setDestinationStop(null);
      setHasAlertedProximity(false);
    } else {
      await requestNotificationPermission();
      let lat = stop.lat;
      let lon = stop.lon;
      if (!lat || !lon) {
        const fullStop = stopsMap.get(stop.id);
        if (fullStop && fullStop.lat && fullStop.lon) {
          lat = fullStop.lat;
          lon = fullStop.lon;
        }
      }
      setDestinationStop({
        id: stop.id,
        name: stop.name,
        lat,
        lon,
      });
      setHasAlertedProximity(false);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          },
          () => {},
          { enableHighAccuracy: true }
        );
      }
    }
  };

  const distanceToDestination = useMemo(() => {
    if (!destinationStop || !userLocation || !destinationStop.lat || !destinationStop.lon) {
      return null;
    }
    return getDistanceMeters(
      userLocation.lat,
      userLocation.lon,
      destinationStop.lat,
      destinationStop.lon
    );
  }, [destinationStop, userLocation]);

  const handleSelectStop = (stopId: string | null) => {
    setSelectedStopId(stopId);
    if (stopId) {
      const stop = stopsMap.get(stopId);
      if (stop && stop.lat && stop.lon) {
        setFlyToTarget({
          coords: [stop.lat, stop.lon],
          zoom: 16,
          timestamp: Date.now(),
        });
      }
      // Automatically ensure stops layer is enabled so user sees the marker
      if (!mapLayers.showStops) {
        setMapLayers((prev) => {
          const updated = { ...prev, showStops: true };
          try {
            localStorage.setItem('cm_map_layers', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    }
  };

  const handleSaveCartoApiKey = (newKey: string) => {
    setCartoApiKey(newKey);
    setStoredCartoApiKey(newKey);
  };

  const handleToggleLayer = (layerKey: keyof MapLayersConfig) => {
    setMapLayers((prev) => {
      const updated = { ...prev, [layerKey]: !prev[layerKey] };
      try {
        localStorage.setItem('cm_map_layers', JSON.stringify(updated));
      } catch {}
      if (layerKey === 'showMobiCascais') {
        setMobiCascaisRequested(Boolean(updated.showMobiCascais));
        setTimeout(() => loadVehicles(false), 50);
      }
      return updated;
    });
  };

  const handleSetActiveLines = (lines: string[]) => {
    setActiveLines(lines);
    try {
      localStorage.setItem('cm_active_lines', JSON.stringify(lines));
    } catch {}
  };

  const handleSetShowAllVehicles = (show: boolean) => {
    setShowAllVehicles(show);
    try {
      localStorage.setItem('cm_show_all_vehicles', String(show));
    } catch {}
  };

  const handleRemoveActiveLine = (lineId: string) => {
    handleSetActiveLines(activeLines.filter((id) => id !== lineId));
  };

  const handleToggleActiveLine = (lineId: string) => {
    if (activeLines.includes(lineId)) {
      handleSetActiveLines(activeLines.filter((id) => id !== lineId));
    } else {
      handleSetActiveLines([...activeLines, lineId]);
    }
  };

  // Map of active bus counts per line
  const busesPerLine = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of allVehicles) {
      if (v.line_id) {
        counts.set(v.line_id, (counts.get(v.line_id) || 0) + 1);
      }
    }
    return counts;
  }, [allVehicles]);

  // Traffic congestion metrics
  const trafficMetrics = useMemo(() => {
    let slow = 0;
    let moderate = 0;
    let fluid = 0;
    let speedSum = 0;
    let speedCount = 0;

    allVehicles.forEach((v) => {
      if (typeof v.speed === 'number' && !isNaN(v.speed)) {
        speedSum += v.speed;
        speedCount++;
        if (v.speed < 12) slow++;
        else if (v.speed < 25) moderate++;
        else fluid++;
      }
    });

    return {
      slowCount: slow,
      moderateCount: moderate,
      fluidCount: fluid,
      avgSpeed: speedCount > 0 ? Math.round(speedSum / speedCount) : 0,
    };
  }, [allVehicles]);

  // Fetch Lines, Stops & Service Alerts metadata on startup
  useEffect(() => {
    fetchLinesMap()
      .then((map) => setLinesMap(map))
      .catch((err) => console.warn('Could not load lines metadata:', err));

    fetchStopsMap()
      .then((stops) => setStopsMap(stops))
      .catch((err) => console.warn('Could not load stops metadata:', err));

    const loadAlerts = () => {
      fetchServiceAlerts()
        .then((data) => setAlerts(data))
        .catch((err) => console.warn('Could not load service alerts:', err));
    };

    loadAlerts();
    const alertTimer = setInterval(loadAlerts, 60000); // Poll alerts every 60s
    return () => clearInterval(alertTimer);
  }, []);

  const pinnedAlertsCount = useMemo(() => {
    return alerts.filter((a) => a.lines.some((l) => activeLines.includes(l))).length;
  }, [alerts, activeLines]);

  // Current polling interval: baseado na escolha do utilizador e no Smart Refresh quando inativo > 5 min
  const currentRefreshInterval = useMemo(() => {
    if (baseRefreshInterval === 0) return 0; // Modo manual
    if (smartRefreshEnabled && isUserInactive) {
      // Quando inativo há mais de 5 min, espaça automaticamente
      return Math.max(baseRefreshInterval * 2.5, 20);
    }
    return baseRefreshInterval;
  }, [baseRefreshInterval, smartRefreshEnabled, isUserInactive]);

  // Handler para definir a frequência (ao momento ou espaçada)
  const handleSetRefreshInterval = (seconds: number) => {
    setBaseRefreshInterval(seconds);
    try {
      localStorage.setItem('cm_refresh_interval', String(seconds));
    } catch {}
    setSecondsUntilRefresh(seconds > 0 ? seconds : 0);
    // Se escolheu 'ao momento' (<=3s) ou ativou novo intervalo, recarrega de imediato
    if (seconds > 0 && seconds <= 5) {
      loadVehicles(false);
    }
  };

  // Alterna ciclicamente entre modos: Ao Momento (2s), Rápido (5s), Espaçado (15s), Eco (30s)
  const handleCycleRefreshInterval = () => {
    const cycle = [2, 5, 15, 30];
    const currentIndex = cycle.indexOf(baseRefreshInterval);
    const nextInterval = cycle[(currentIndex + 1) % cycle.length];
    handleSetRefreshInterval(nextInterval);
  };

  // User activity tracker for Smart Refresh
  useEffect(() => {
    const resetActivity = () => {
      setLastActivityTime(Date.now());
      setIsUserInactive(false);
    };

    let lastThrottledTime = 0;
    const handleEvent = () => {
      const now = Date.now();
      if (now - lastThrottledTime > 1500) {
        lastThrottledTime = now;
        resetActivity();
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'wheel', 'pointerdown'];
    events.forEach((evt) => window.addEventListener(evt, handleEvent, { passive: true }));
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleEvent));
    };
  }, []);

  // Check inactivity and live seconds counter every second
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - lastActivityTime) / 1000);
      setInactivitySeconds(diff);
      if (Date.now() - lastActivityTime >= INACTIVITY_THRESHOLD_MS) {
        setIsUserInactive(true);
      } else {
        setIsUserInactive(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastActivityTime]);

  // When user returns from inactivity, ensure countdown doesn't linger at high values
  useEffect(() => {
    if (!isUserInactive && secondsUntilRefresh > baseRefreshInterval) {
      setSecondsUntilRefresh(baseRefreshInterval);
    }
  }, [isUserInactive, secondsUntilRefresh, baseRefreshInterval]);

  const handleToggleSmartRefresh = (enabled: boolean) => {
    setSmartRefreshEnabled(enabled);
    try {
      localStorage.setItem('cm_smart_refresh', String(enabled));
    } catch {}
  };

  const handleSimulateInactivity = () => {
    setLastActivityTime(Date.now() - (INACTIVITY_THRESHOLD_MS + 2000));
    setIsUserInactive(true);
    setSecondsUntilRefresh(Math.max(baseRefreshInterval * 2.5, 20));
  };

  const handleSimulateActivity = () => {
    setLastActivityTime(Date.now());
    setIsUserInactive(false);
    if (secondsUntilRefresh > baseRefreshInterval) {
      setSecondsUntilRefresh(baseRefreshInterval);
    }
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // Ignora se o browser ou modo poupança de bateria recusar
    }
  };

  const releaseWakeLock = () => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // ignore
    }
  };

  // Fetch Vehicles com Controlo de Backpressure e Deduplicação Monotónica
  const loadVehicles = useCallback(async (isSilent = false) => {
    const targetLine = selectedLineFilter || (activeLines.length > 0 ? activeLines[0] : null);

    // Se o sinal geral estiver desligado e nenhuma carreira estiver selecionada, mantém TODOS os servidores desligados
    if (!showAllVehicles && !targetLine && !searchQuery) {
      setAllVehicles([]);
      setIsRefreshing(false);
      setIsLoadingInitial(false);
      return;
    }

    // Se já estiver uma sincronização em curso, não dispara pedido concorrente para evitar colisão
    if (isFetchingVehiclesRef.current) {
      return;
    }

    const currentEpoch = ++fetchEpochRef.current;
    isFetchingVehiclesRef.current = true;
    if (!isSilent) setIsRefreshing(true);

    try {
      const isMobi = Boolean(targetLine && targetLine.toUpperCase().startsWith('M'));
      const isCarris = Boolean(targetLine && (targetLine === '753' || targetLine.startsWith('15') || targetLine.startsWith('28')));
      const isCM = Boolean(targetLine && !isMobi && !isCarris);

      const data = await fetchLiveVehicles({
        targetLineId: targetLine || undefined,
        selectedDirection: selectedDirection,
        includeCM: (isCM && !isMobi && !isCarris) || showAllVehicles,
        includeCarris: isCarris || showAllVehicles,
        includeMobiCascais: mapLayers.showMobiCascais !== false && (isMobi || showAllVehicles),
      });
      // Descarta respostas obsoletas de pedidos anteriores fora de ordem
      if (currentEpoch === fetchEpochRef.current && data) {
        setAllVehicles(data);
        setErrorMessage(null);
      }
    } catch (err: unknown) {
      if (currentEpoch === fetchEpochRef.current) {
        const msg = err instanceof Error ? err.message : 'Falha na ligação à rede da Carris Metropolitana';
        console.warn('Tentativa de sincronização de viaturas:', msg);
        if (allVehicles.length === 0) {
          setErrorMessage(msg);
        }
      }
    } finally {
      if (currentEpoch === fetchEpochRef.current) {
        isFetchingVehiclesRef.current = false;
        setIsRefreshing(false);
        setIsLoadingInitial(false);
        setSecondsUntilRefresh(currentRefreshInterval);
      }
    }
  }, [allVehicles.length, currentRefreshInterval, showAllVehicles, activeLines, selectedLineFilter, searchQuery, mapLayers.showMobiCascais, selectedDirection]);

  // Carrega imediatamente as viaturas assim que o utilizador seleciona uma carreira
  useEffect(() => {
    if (showAllVehicles || activeLines.length > 0 || selectedLineFilter || searchQuery) {
      loadVehicles(false);
    } else {
      setAllVehicles([]);
      setIsLoadingInitial(false);
    }
  }, [showAllVehicles, activeLines, selectedLineFilter, searchQuery]);

  // Initial load
  useEffect(() => {
    if (showAllVehicles || activeLines.length > 0) {
      loadVehicles(false);
    } else {
      setIsLoadingInitial(false);
    }
  }, []);

  // Auto-refresh countdown com proteção contra sobreposição (backpressure)
  useEffect(() => {
    if (currentRefreshInterval <= 0) return; // Modo manual/pausado

    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          if (!isFetchingVehiclesRef.current) {
            loadVehicles(true);
          }
          return currentRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loadVehicles, currentRefreshInterval]);

  // Micro-interpolação e avanço contínuo a cada 1 segundo para os autocarros MobiCascais
  useEffect(() => {
    const hasMobiInView =
      mapLayers.showMobiCascais !== false &&
      (showAllVehicles ||
        (selectedLineFilter && selectedLineFilter.toUpperCase().startsWith('M')) ||
        activeLines.some((l) => l.toUpperCase().startsWith('M')));

    if (!hasMobiInView) return;

    const mobiLiveTimer = setInterval(async () => {
      try {
        const freshMobi = await fetchMobiCascaisRealVehicles(true);
        if (freshMobi && freshMobi.length > 0) {
          const targetLine = selectedLineFilter || (activeLines.length > 0 ? activeLines[0] : null);
          let filteredMobi = freshMobi;
          if (targetLine && targetLine.toUpperCase().startsWith('M')) {
            filteredMobi = filteredMobi.filter(
              (v) => (v.line_id || '').toUpperCase() === targetLine.toUpperCase()
            );
          }
          if (filteredMobi.length > 0) {
            setAllVehicles((prev) => {
              const nonMobi = prev.filter((v) => !v.id.startsWith('mobi_'));
              return [...nonMobi, ...filteredMobi];
            });
          }
        }
      } catch {}
    }, 1000);

    return () => clearInterval(mobiLiveTimer);
  }, [mapLayers.showMobiCascais, showAllVehicles, selectedLineFilter, activeLines]);

  // Handle Geolocation with Continuous Live Tracking & Follow Mode
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setGpsFeedbackToast('Geolocalização não suportada neste dispositivo.');
      return;
    }

    // Se já estiver em modo de seguimento ativo com câmara a seguir, pausa o seguimento de câmara
    if (isLiveTrackingUser && followUser) {
      setFollowUser(false);
      setGpsFeedbackToast('Seguimento de câmara pausado');
      return;
    }

    // Se já tiver GPS ativo mas com câmara pausada, recentra imediatamente e retoma o seguimento
    if (isLiveTrackingUser && !followUser && userLocation) {
      setFollowUser(true);
      setFlyToTarget({
        coords: [userLocation.lat, userLocation.lon],
        zoom: 16,
        timestamp: Date.now(),
      });
      setGpsFeedbackToast('A seguir a sua posição em direto');
      return;
    }

    // Início de nova sessão de Live GPS
    setIsLocating(true);
    setIsLiveTrackingUser(true);
    setFollowUser(true);
    requestWakeLock();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const loc: UserLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: Date.now(),
        };
        lastRawUserLocRef.current = { lat: loc.lat, lon: loc.lon };
        setUserLocation(loc);
        setFlyToTarget({
          coords: [loc.lat, loc.lon],
          zoom: 16,
          timestamp: Date.now(),
        });
        setGpsFeedbackToast('GPS em direto ativo · A centrar');
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
        let msg = 'Não foi possível obter o sinal GPS.';
        if (err.code === 1) msg = 'Permissão de localização negada pelo utilizador.';
        else if (err.code === 2) msg = 'Sinal GPS indisponível no dispositivo.';
        else if (err.code === 3) msg = 'Tempo limite de espera pelo sinal GPS excedido.';
        setGpsFeedbackToast(msg);
        setIsLiveTrackingUser(false);
        setFollowUser(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 }
    );
  };

  // Filter vehicles based on search, active lines, area, and motion
  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const activeLinesSet = new Set(activeLines);

    return allVehicles.filter((v) => {
      // 1. Text search: When user searches, search across ALL buses in the entire network!
      if (q) {
        const lineMeta = linesMap.get(v.line_id);
        const matchLineId = v.line_id?.toLowerCase().includes(q) || v.line_id?.toLowerCase() === q;
        const matchVehicleId = v.id?.toLowerCase().includes(q);
        const matchLongName = lineMeta?.long_name?.toLowerCase().includes(q);
        const matchShortName = lineMeta?.short_name?.toLowerCase().includes(q);
        const matchStop = v.stop_id?.toLowerCase().includes(q);

        const isMatch =
          matchLineId ||
          matchVehicleId ||
          matchLongName ||
          matchShortName ||
          matchStop;

        if (!isMatch) return false;
      } else {
        // When not searching: apply active lines / show all / specific line filter
        if (!showAllVehicles) {
          if (selectedLineFilter) {
            if (v.line_id !== selectedLineFilter) return false;
          } else if (activeLines.length > 0) {
            if (!activeLinesSet.has(v.line_id)) return false;
          } else if (selectedArea === 'all') {
            return false;
          }
        } else if (selectedLineFilter && v.line_id !== selectedLineFilter) {
          return false;
        }
      }

      // 2. Area filter (if selected)
      if (selectedArea !== 'all') {
        const area = getAreaForLine(v.line_id);
        if (area !== selectedArea) return false;
      }

      // 3. Motion filter (if selected)
      if (selectedMotion === 'moving') {
        if ((v.speed || 0) <= 3) return false;
      } else if (selectedMotion === 'stopped') {
        if ((v.speed || 0) > 3) return false;
      }

      // MobiCascais filter: se a camada MobiCascais estiver desativada pelo utilizador, oculta
      if (mapLayers.showMobiCascais === false && (v.id.startsWith('mobi_') || v.line_id.toUpperCase().startsWith('M'))) {
        return false;
      }

      // 4. Direction filter (sentido 0 ou 1): Só exibe os veículos a circular no sentido escolhido
      if (selectedDirection !== null && selectedDirection !== undefined) {
        if (v.direction_id !== null && v.direction_id !== undefined) {
          if (v.direction_id !== selectedDirection) return false;
        } else if (v.pattern_id) {
          if (!v.pattern_id.includes(`_${selectedDirection}_`)) return false;
        }
      }

      return true;
    });
  }, [allVehicles, searchQuery, selectedArea, selectedMotion, selectedLineFilter, linesMap, showAllVehicles, activeLines, mapLayers.showMobiCascais, selectedDirection]);

  // Fetch real-time API arrival delays for currently active/visible vehicles
  useEffect(() => {
    if (filteredVehicles.length === 0) return;

    let isMounted = true;
    fetchVehiclesDelays(filteredVehicles.slice(0, 30))
      .then((delays) => {
        if (isMounted && delays.size > 0) {
          setVehicleDelays((prev) => {
            const merged = new Map(prev);
            delays.forEach((val, key) => merged.set(key, val));
            return merged;
          });
        }
      })
      .catch((err) => console.warn('Could not fetch vehicle delays:', err));

    return () => {
      isMounted = false;
    };
  }, [filteredVehicles]);

  // Generic auto-center when filtering or searching a specific line (runs once per line change, never during tracking)
  useEffect(() => {
    // If a vehicle is selected or followed, do not override camera zoom
    if (selectedVehicleId) return;

    const q = searchQuery.trim().toLowerCase();
    const targetLine = selectedLineFilter || (q.length >= 3 && linesMap.has(q) ? q : null);
    if (!targetLine) {
      lastAutoCenteredLineRef.current = null;
      return;
    }

    // Only auto-center once when the user chooses a new line, avoiding zoom reset on every 3s telemetry update
    if (lastAutoCenteredLineRef.current === targetLine) return;
    lastAutoCenteredLineRef.current = targetLine;

    const matchingBuses = allVehicles.filter((v) => v.line_id.toLowerCase() === targetLine.toLowerCase() && v.lat && v.lon);
    if (matchingBuses.length > 0) {
      let sumLat = 0;
      let sumLon = 0;
      matchingBuses.forEach((b) => {
        sumLat += b.lat;
        sumLon += b.lon;
      });
      setFlyToTarget({
        coords: [sumLat / matchingBuses.length, sumLon / matchingBuses.length],
        zoom: matchingBuses.length > 1 ? 13 : 15,
        timestamp: Date.now(),
      });
    }
  }, [searchQuery, selectedLineFilter, allVehicles, linesMap, selectedVehicleId]);

  // Unified Continuous Live GPS Engine & Proximity Alert Watcher
  useEffect(() => {
    if (!isLiveTrackingUser && !destinationStop) {
      if (userWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(userWatchIdRef.current);
        userWatchIdRef.current = null;
      }
      releaseWakeLock();
      return;
    }

    if (!navigator.geolocation) return;

    userWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const speed = pos.coords.speed;
        const heading = pos.coords.heading;

        // Filtro anti-tremor / dead-reckoning para utilizador parado ou a pé em paragem
        if (lastRawUserLocRef.current) {
          const d = getDistanceMeters(lastRawUserLocRef.current.lat, lastRawUserLocRef.current.lon, lat, lon);
          if (d < 3.0 && (speed === null || speed < 0.4)) {
            setUserLocation((old) =>
              old ? { ...old, accuracy, heading: heading ?? old.heading, timestamp: Date.now() } : null
            );
            return;
          }
        }

        lastRawUserLocRef.current = { lat, lon };
        const loc: UserLocation = {
          lat,
          lon,
          accuracy,
          speed,
          heading,
          timestamp: Date.now(),
        };
        setUserLocation(loc);

        // Alarme de proximidade à paragem de destino (<500m)
        if (destinationStop && destinationStop.lat && destinationStop.lon) {
          const dist = getDistanceMeters(loc.lat, loc.lon, destinationStop.lat, destinationStop.lon);
          if (dist <= 500 && !hasAlertedProximity) {
            setHasAlertedProximity(true);
            sendProximityNotification(destinationStop.name, dist);
          }
        }
      },
      (err) => {
        console.warn('Geolocation continuous watch error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      if (userWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(userWatchIdRef.current);
        userWatchIdRef.current = null;
      }
    };
  }, [isLiveTrackingUser, destinationStop, hasAlertedProximity]);

  // Bússola e orientação do dispositivo (DeviceOrientation) para o feixe direcional
  useEffect(() => {
    if (!isLiveTrackingUser) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const heading = (e as any).webkitCompassHeading ?? (e.alpha !== null ? (360 - e.alpha) % 360 : null);
      if (typeof heading === 'number' && !isNaN(heading)) {
        setUserLocation((prev) => (prev ? { ...prev, heading } : null));
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, [isLiveTrackingUser]);

  // Page Visibility API: poupança de bateria em segundo plano e sincronização instantânea ao regressar
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsUserInactive(true);
      } else {
        setIsUserInactive(false);
        setLastActivityTime(Date.now());
        loadVehicles(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadVehicles]);

  // Auto-dismiss do toast de feedback GPS
  useEffect(() => {
    if (!gpsFeedbackToast) return;
    const timer = setTimeout(() => {
      setGpsFeedbackToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [gpsFeedbackToast]);

  // Currently selected vehicle object
  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return allVehicles.find((v) => v.id === selectedVehicleId) || null;
  }, [allVehicles, selectedVehicleId]);

  // Selected vehicle's line metadata
  const selectedLineInfo = useMemo(() => {
    if (!selectedVehicle) return undefined;
    return linesMap.get(selectedVehicle.line_id);
  }, [selectedVehicle, linesMap]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedArea('all');
    setSelectedMotion('all');
    setSelectedLineFilter(null);
  };

  const handleToggleCpUnlocked = async (unlocked?: boolean) => {
    const nextVal = unlocked !== undefined ? unlocked : !isCpUnlocked;
    await setCpRequested(nextVal);
    setIsCpUnlocked(nextVal);
    setMapLayers((prev) => {
      const updated = { ...prev, showCp: nextVal };
      try {
        localStorage.setItem('cm_map_layers', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSelectCpLine = (lineKey: 'cascais' | 'sintra' | 'azambuja' | 'sado' | null) => {
    // 1 selecionado cancela o anterior: limpa autocarros, metro e fertagus
    setSelectedLineFilter(null);
    handleSetActiveLines([]);
    setSelectedVehicleId(null);
    setSelectedStopId(null);
    setSelectedMetroStation(null);
    setSelectedMetroLine(null);
    setSelectedFertagusStation(null);
    setSelectedFertagusTrain(null);

    setSelectedCpLine(lineKey);
    setSelectedCpStation(null);
    setSelectedCpTrain(null);
    setSelectedBoatStation(null);
    setSelectedBoatLine(null);
    setSelectedMSTStation(null);
    setSelectedMSTLine(null);

    if (!lineKey) {
      setSelectedDirection(null);
      setCurrentDirectionLabel(null);
      return;
    }

    // Questiona o Sentido da Linha CP Escolhida!
    const dirInfo = getTransportDirections('cp', lineKey);
    setDirectionModalInfo(dirInfo);
    setSelectedDirection(0);
    setCurrentDirectionLabel(dirInfo.direction0Label);
    setIsDirectionModalOpen(true);

    handleToggleCpUnlocked(true); // Desbloqueia na seleção a pedido do utilizador
    setMapLayers((prev) => {
      const updated = { ...prev, showCp: true, showRouteLines: true };
      try {
        localStorage.setItem('cm_map_layers', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    // Centra a câmara na respetiva linha ferroviária
    if (lineKey === 'cascais') {
      setFlyToTarget({ coords: [38.6961, -9.2845], zoom: 12, timestamp: Date.now() });
    } else if (lineKey === 'sintra') {
      setFlyToTarget({ coords: [38.7588, -9.2562], zoom: 12, timestamp: Date.now() });
    } else if (lineKey === 'azambuja') {
      setFlyToTarget({ coords: [38.8312, -9.0855], zoom: 11, timestamp: Date.now() });
    } else if (lineKey === 'sado') {
      setFlyToTarget({ coords: [38.6063, -8.9912], zoom: 11, timestamp: Date.now() });
    }
  };

  const handleSelectLine = (lineId: string) => {
    // 1 selecionado cancela o anterior: se clicar na mesma linha, desmarca; senão, define como linha única
    const isAlreadySelected = selectedLineFilter === lineId && activeLines.length === 1 && activeLines[0] === lineId;
    if (isAlreadySelected) {
      setSelectedLineFilter(null);
      handleSetActiveLines([]);
      setSelectedVehicleId(null);
      return;
    }

    // Cancela todas as outras seleções (1 selecionado cancela o anterior)
    setSelectedStopId(null);
    setSelectedMetroStation(null);
    setSelectedMetroLine(null);
    setSelectedFertagusStation(null);
    setSelectedFertagusTrain(null);
    setSelectedCpStation(null);
    setSelectedCpLine(null);
    setSelectedCpTrain(null);
    setSelectedBoatStation(null);
    setSelectedBoatLine(null);
    setSelectedMSTStation(null);
    setSelectedMSTLine(null);

    // Aplica seleção exclusiva de linha (1 selecionado cancela o anterior)
    setSelectedLineFilter(lineId);
    handleSetActiveLines([lineId]);
    setActiveView('map');

    // Questiona o Sentido da Carreira Escolhida (Ex: 3009 -> Cacilhas-Trafaria ou Trafaria-Cacilhas)!
    const lineInfo = linesMap.get(lineId);
    const dirInfo = getTransportDirections('bus', lineId, lineInfo);
    setDirectionModalInfo(dirInfo);
    setSelectedDirection(0); // Sentido 0 por defeito
    setCurrentDirectionLabel(dirInfo.direction0Label);
    setIsDirectionModalOpen(true);

    const isMobi = lineId.toUpperCase().startsWith('M');

    // Assegura que traçados pelas estradas e paragens ficam ativas para a linha escolhida
    setMapLayers((prev) => {
      const updated = {
        ...prev,
        showRouteLines: true,
        showStops: true,
        showMobiCascais: isMobi ? true : prev.showMobiCascais,
      };
      try {
        localStorage.setItem('cm_map_layers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (isMobi) {
      setMobiCascaisRequested(true);
    }

    // Se houver viatura em circulação, centra nela
    const busOfLine = allVehicles.find((v) => v.line_id === lineId);
    if (busOfLine && busOfLine.lat && busOfLine.lon) {
      setFlyToTarget({
        coords: [busOfLine.lat, busOfLine.lon],
        zoom: 14,
        timestamp: Date.now(),
      });
      setSelectedVehicleId(busOfLine.id);
    } else if (isMobi) {
      // Centra na rota de estrada da carreira MobiCascais
      const coords = getMobiCascaisRouteCoordinates(lineId);
      if (coords && coords.length > 0) {
        const midPoint = coords[Math.floor(coords.length / 2)];
        setFlyToTarget({
          coords: midPoint,
          zoom: 14,
          timestamp: Date.now(),
        });
      }
    }
  };

  const handleQuickJump = (coords: [number, number], zoom: number) => {
    setFlyToTarget({
      coords,
      zoom,
      timestamp: Date.now(),
    });
  };

  // Nav view change handling
  const handleNavViewChange = (view: 'map' | 'lines' | 'stats' | 'about') => {
    setActiveView(view);
    if (view === 'about') {
      setIsAboutModalOpen(true);
    } else if (view === 'lines' || view === 'stats') {
      setIsSidebarOpen(true);
    }
  };

  // Filtered metro stations for search
  const filteredMetroStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return METRO_STATIONS.filter(
      (st) =>
        st.name.toLowerCase().includes(q) ||
        st.lines.some((l) => METRO_LINES[l].name.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [searchQuery]);

  // Filtered Fertagus stations for search
  const filteredFertagusStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return FERTAGUS_STATIONS.filter((st) => st.name.toLowerCase().includes(q) || 'fertagus'.includes(q)).slice(0, 6);
  }, [searchQuery]);

  // Filtered CP stations for search
  const filteredCpStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return ALL_CP_STATIONS.filter(
      (st) =>
        st.name.toLowerCase().includes(q) ||
        st.lines.some((l) => CP_LINES[l].name.toLowerCase().includes(q)) ||
        'comboios'.includes(q) ||
        'cp'.includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // Filtered bus stops for search
  const filteredStops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const matches: { id: string; name: string; lat: number; lon: number }[] = [];
    stopsMap.forEach((st) => {
      if (st.name.toLowerCase().includes(q) || st.id.toLowerCase().includes(q)) {
        matches.push(st);
      }
    });
    return matches.slice(0, 10);
  }, [searchQuery, stopsMap]);

  // Filtered bus lines for direct search (only matches what user types)
  const filteredBusLines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const matches: Line[] = [];
    linesMap.forEach((line) => {
      if (
        line.id.toLowerCase().includes(q) ||
        (line.short_name && line.short_name.toLowerCase().includes(q)) ||
        (line.long_name && line.long_name.toLowerCase().includes(q))
      ) {
        matches.push(line);
      }
    });
    return matches.slice(0, 10);
  }, [searchQuery, linesMap]);

  // Filtered boat terminals (Transtejo & Soflusa)
  const filteredBoatStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return BOAT_STATIONS.filter(
      (st) =>
        st.name.toLowerCase().includes(q) ||
        st.locality.toLowerCase().includes(q) ||
        'barco'.includes(q) ||
        'barcos'.includes(q) ||
        'transtejo'.includes(q) ||
        'soflusa'.includes(q) ||
        'cacilheiro'.includes(q) ||
        'tejo'.includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // Filtered MST stations (Metro Sul do Tejo)
  const filteredMSTStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return MST_STATIONS.filter(
      (st) =>
        st.name.toLowerCase().includes(q) ||
        st.locality.toLowerCase().includes(q) ||
        'mst'.includes(q) ||
        'metro sul'.includes(q) ||
        'tram'.includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 1. Floating Google Maps Style Search Bar + Chips Row (escondido quando sidebar ou outros menus estão abertos) */}
      {!isSidebarOpen && activeSheet === 'none' && !isSettingsModalOpen && !isLineSelectorOpen && !isAboutModalOpen && !isAlertsModalOpen && !isFavoritesModalOpen && (
        <FloatingSearchBar
          onOpenMenu={() => setActiveSheet('menu')}
          onOpenSearch={(query) => {
            if (query) setSearchQuery(query);
            setActiveSheet('search');
          }}
          onOpenAlerts={() => setActiveSheet('alerts')}
          onOpenFavorites={() => setIsFavoritesModalOpen(true)}
          onOpenBoat={() => {
            setSearchQuery('barco');
            setActiveSheet('search');
          }}
          onOpenMST={() => {
            setSearchQuery('mst');
            setActiveSheet('search');
          }}
          onOpenMetro={() => {
            setSearchQuery('metro');
            setActiveSheet('search');
          }}
          alertsCount={alerts.length}
          pinnedAlertsCount={pinnedAlertsCount}
          activeLines={activeLines}
          linesMap={linesMap}
          onRemoveLine={handleRemoveActiveLine}
          onAddLine={() => setActiveSheet('search')}
          onOpenLineSelector={handleOpenLineSelector}
          showAllVehicles={showAllVehicles}
          onToggleShowAll={() => handleSetShowAllVehicles(!showAllVehicles)}
          totalBusesCount={allVehicles.length}
          filteredBusesCount={filteredVehicles.length}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery('')}
          currentDirectionLabel={currentDirectionLabel}
          onOpenDirectionModal={() => setIsDirectionModalOpen(true)}
        />
      )}

      {/* 2. Floating Action Buttons (Bottom Right): Camadas, GPS, Refresh (escondido quando sidebar, drawers ou sheets estão abertos) */}
      {!isSidebarOpen && activeSheet === 'none' && !isFavoritesModalOpen && selectedVehicleId === null && selectedStopId === null && selectedMetroStation === null && selectedFertagusStation === null && selectedCpStation === null && selectedCpTrain === null && selectedBoatStation === null && selectedMSTStation === null && (
        <FloatingActionButtons
          onLocateUser={handleLocateUser}
          isLocating={isLocating}
          isLiveTracking={isLiveTrackingUser}
          followUser={followUser}
          onOpenLayers={() => setActiveSheet('layers')}
          onManualRefresh={() => loadVehicles(false)}
          isRefreshing={isRefreshing}
          secondsUntilRefresh={secondsUntilRefresh}
          baseRefreshInterval={baseRefreshInterval}
          onCycleRefreshInterval={handleCycleRefreshInterval}
        />
      )}

      {/* Toast Feedback de GPS ao Vivo */}
      {gpsFeedbackToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-sky-500/60 text-sky-200 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-medium pointer-events-none">
          <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0 animate-pulse" />
          <span>{gpsFeedbackToast}</span>
        </div>
      )}

      {/* Loading Spinner for initial load */}
      {isLoadingInitial && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-slate-700/80 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs text-white">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <span className="font-medium">A carregar autocarros e metro em direto...</span>
        </div>
      )}

      {/* Error message banner if API is unreachable */}
      {errorMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-rose-950/95 border border-rose-800 text-rose-200 px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => loadVehicles(false)}
            className="ml-2 font-bold underline hover:text-white cursor-pointer"
          >
            Tentar
          </button>
        </div>
      )}

      {/* 3. Fullscreen Leaflet Interactive Map (OpenStreetMap by default, No Direction Arrow, Metro Layer) */}
      <main className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <MapComponent
          vehicles={filteredVehicles}
          allVehicles={allVehicles}
          linesMap={linesMap}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={(v) => {
            setSelectedVehicleId(v ? v.id : null);
            if (v) {
              setSelectedStopId(null);
              setSelectedMetroStation(null);
              setSelectedMetroLine(null);
              setSelectedFertagusStation(null);
              setSelectedFertagusTrain(null);
              setSelectedCpStation(null);
              setSelectedCpLine(null);
              setSelectedCpTrain(null);
              setSelectedLineFilter(v.line_id);
              handleSetActiveLines([v.line_id]);
              setMapLayers((prev) => ({
                ...prev,
                showRouteLines: true,
                showStops: true,
                showMobiCascais: v.line_id.toUpperCase().startsWith('M') ? true : prev.showMobiCascais,
              }));
              setActiveSheet('none');
            }
            if (!v) setFollowVehicle(false);
          }}
          tileStyle={tileStyle}
          cartoApiKey={cartoApiKey}
          userLocation={userLocation}
          followVehicle={followVehicle}
          followUser={followUser}
          onUserPannedMap={() => {
            if (followVehicle) {
              setFollowVehicle(false);
            }
            if (followUser) {
              setFollowUser(false);
              setGpsFeedbackToast('Seguimento de câmara pausado');
            }
          }}
          flyToTarget={flyToTarget}
          layers={mapLayers}
          stopsMap={stopsMap}
          activeLines={activeLines}
          vehicleDelays={vehicleDelays}
          onSelectStop={(stopId) => {
            setSelectedVehicleId(null);
            setSelectedMetroStation(null);
            setSelectedMetroLine(null);
            setSelectedFertagusStation(null);
            setSelectedFertagusTrain(null);
            handleSelectStop(stopId);
          }}
          selectedStopId={selectedStopId}
          onSelectMetroStation={(station) => {
            setSelectedVehicleId(null);
            setSelectedStopId(null);
            setSelectedFertagusStation(null);
            setSelectedFertagusTrain(null);
            setSelectedLineFilter(null);
            setSelectedMetroStation(station);
            if (station) {
              setSelectedMetroLine((station.lines[0] || 'azul') as 'amarela' | 'azul' | 'verde' | 'vermelha');
              setActiveSheet('metro');
            } else {
              setSelectedMetroLine(null);
            }
          }}
          selectedMetroStation={selectedMetroStation}
          selectedMetroLine={selectedMetroLine}
          onSelectFertagusStation={(station) => {
            setSelectedVehicleId(null);
            setSelectedStopId(null);
            setSelectedMetroStation(null);
            setSelectedMetroLine(null);
            setSelectedFertagusTrain(null);
            setSelectedLineFilter(null);
            setSelectedFertagusStation(station);
            if (station) {
              const dirInfo = getTransportDirections('fertagus', 'fertagus');
              setDirectionModalInfo(dirInfo);
              setSelectedDirection(0);
              setCurrentDirectionLabel(dirInfo.direction0Label);
              setIsDirectionModalOpen(true);
              setActiveSheet('fertagus');
            }
          }}
          selectedFertagusStation={selectedFertagusStation}
          selectedFertagusTrain={selectedFertagusTrain}
          onSelectFertagusTrain={(train) => {
            setSelectedVehicleId(null);
            setSelectedStopId(null);
            setSelectedMetroStation(null);
            setSelectedMetroLine(null);
            setSelectedLineFilter(null);
            setSelectedFertagusTrain(train);
            if (train) {
              const nearestStation =
                FERTAGUS_STATIONS.find(
                  (s) =>
                    train.destination.toLowerCase().includes(s.name.toLowerCase()) ||
                    (train.nextStation && train.nextStation.toLowerCase().includes(s.name.toLowerCase()))
                ) || FERTAGUS_STATIONS[0];
              setSelectedFertagusStation(nearestStation);
              setActiveSheet('fertagus');
            } else {
              setSelectedFertagusStation(null);
            }
          }}
          selectedLineFilter={selectedLineFilter}
          onSelectCpStation={(station) => {
            setSelectedVehicleId(null);
            setSelectedStopId(null);
            setSelectedMetroStation(null);
            setSelectedMetroLine(null);
            setSelectedFertagusStation(null);
            setSelectedFertagusTrain(null);
            setSelectedLineFilter(null);
            setSelectedCpTrain(null);
            setSelectedCpStation(station);
            if (station) {
              const cpLine = station.lines[0];
              setSelectedCpLine(cpLine);
              const dirInfo = getTransportDirections('cp', cpLine);
              setDirectionModalInfo(dirInfo);
              setSelectedDirection(0);
              setCurrentDirectionLabel(dirInfo.direction0Label);
              setIsDirectionModalOpen(true);
              setActiveSheet('cp');
            } else {
              setSelectedCpLine(null);
            }
          }}
          selectedCpStation={selectedCpStation}
          selectedCpLine={selectedCpLine}
          onSelectCpLine={handleSelectCpLine}
          onSelectCpTrain={(train) => {
            setSelectedVehicleId(null);
            setSelectedStopId(null);
            setSelectedMetroStation(null);
            setSelectedMetroLine(null);
            setSelectedFertagusStation(null);
            setSelectedFertagusTrain(null);
            setSelectedLineFilter(null);
            setSelectedCpTrain(train);
            if (train) {
              setSelectedCpLine(train.lineId);
              const nearestStation = ALL_CP_STATIONS.find(
                (s) => s.lines.includes(train.lineId) && train.destination.toLowerCase().includes(s.name.toLowerCase())
              ) || ALL_CP_STATIONS.find((s) => s.lines.includes(train.lineId)) || null;
              setSelectedCpStation(nearestStation);
              setActiveSheet('cp');
            }
          }}
          selectedCpTrain={selectedCpTrain}
          onSelectBoatStation={(station) => {
            setSelectedVehicleId(null);
            setSelectedStopId(null);
            setSelectedMetroStation(null);
            setSelectedMetroLine(null);
            setSelectedFertagusStation(null);
            setSelectedFertagusTrain(null);
            setSelectedCpStation(null);
            setSelectedCpTrain(null);
            setSelectedMSTStation(null);
            setSelectedBoatStation(station);
            if (station) {
              const bLine = station.lines[0] || 'boat_cacilhas';
              setSelectedBoatLine(bLine);
              const dirInfo = getTransportDirections('boat', bLine);
              setDirectionModalInfo(dirInfo);
              setSelectedDirection(0);
              setCurrentDirectionLabel(dirInfo.direction0Label);
              setIsDirectionModalOpen(true);
              setActiveSheet('boat');
            }
          }}
          selectedBoatStation={selectedBoatStation}
          selectedBoatLine={selectedBoatLine}
          onSelectMSTStation={(station) => {
            setSelectedVehicleId(null);
            setSelectedStopId(null);
            setSelectedMetroStation(null);
            setSelectedMetroLine(null);
            setSelectedFertagusStation(null);
            setSelectedFertagusTrain(null);
            setSelectedCpStation(null);
            setSelectedCpTrain(null);
            setSelectedBoatStation(null);
            setSelectedMSTStation(station);
            if (station) {
              const mstLine = (station.lines[0] || '1') as '1' | '2' | '3';
              setSelectedMSTLine(mstLine);
              const dirInfo = getTransportDirections('mst', mstLine);
              setDirectionModalInfo(dirInfo);
              setSelectedDirection(0);
              setCurrentDirectionLabel(dirInfo.direction0Label);
              setIsDirectionModalOpen(true);
              setActiveSheet('mst');
            }
          }}
          selectedMSTStation={selectedMSTStation}
          selectedMSTLine={selectedMSTLine}
          selectedDirection={selectedDirection}
        />
      </main>

      {/* 4. Selected Bus Drawer */}
      <BusDrawer
        vehicle={selectedVehicle}
        lineInfo={selectedLineInfo}
        delayMinutes={selectedVehicleId ? vehicleDelays.get(selectedVehicleId) : undefined}
        onClose={() => {
          setSelectedVehicleId(null);
          setFollowVehicle(false);
        }}
        followVehicle={followVehicle}
        setFollowVehicle={setFollowVehicle}
        onFilterByLine={(lineId) => {
          setSelectedLineFilter(lineId);
          if (!showAllVehicles && !activeLines.includes(lineId)) {
            handleSetActiveLines([...activeLines, lineId]);
          }
        }}
        userLocation={userLocation}
        onSelectStop={handleSelectStop}
        destinationStopId={destinationStop?.id}
        onToggleDestinationStop={handleToggleDestinationStop}
        showRouteLines={mapLayers.showRouteLines}
        onToggleRouteLines={() => handleToggleLayer('showRouteLines')}
      />

      {/* 5. Selected Stop Arrivals & Schedules Drawer (apenas renderizado com paragem selecionada para consistência total de Hooks) */}
      {selectedStopId && (
        <StopArrivalsDrawer
          key={selectedStopId}
          stopId={selectedStopId}
          onClose={() => setSelectedStopId(null)}
          stopsMap={stopsMap}
          linesMap={linesMap}
          allVehicles={allVehicles}
          onSelectVehicle={(v) => {
            setSelectedVehicleId(v.id);
          }}
          onFlyToStop={(coords, zoom) => {
            setFlyToTarget({ coords, zoom, timestamp: Date.now() });
          }}
          userLocation={userLocation}
          onFilterByLine={(lineId) => {
            setSelectedLineFilter(lineId);
            if (!showAllVehicles && !activeLines.includes(lineId)) {
              handleSetActiveLines([...activeLines, lineId]);
            }
          }}
          destinationStopId={destinationStop?.id}
          onToggleDestinationStop={handleToggleDestinationStop}
        />
      )}

      {/* Proximity Alarm Destination Banner (<500m alert & distance tracker) */}
      <ProximityAlarmBanner
        destination={destinationStop}
        distanceMeters={distanceToDestination}
        isWithinProximity={distanceToDestination !== null && distanceToDestination <= 500}
        onClearDestination={() => {
          setDestinationStop(null);
          setHasAlertedProximity(false);
        }}
        onFlyToDestination={() => {
          if (destinationStop?.lat && destinationStop?.lon) {
            setFlyToTarget({
              coords: [destinationStop.lat, destinationStop.lon],
              zoom: 16,
              timestamp: Date.now(),
            });
          }
        }}
      />

      {/* BOTTOM SHEET 1: Pesquisa Direta de Linhas, Paragens, Comboios, Barcos e Metro */}
      <BottomSheet
        isOpen={activeSheet === 'search'}
        onClose={() => setActiveSheet('none')}
        title="Pesquisa Direta"
        subtitle="Escreva para pesquisar qualquer transporte da Área Metropolitana"
        icon={<Search className="w-5 h-5 text-amber-400" />}
      >
        <div className="space-y-4 text-xs">
          {/* Search Input Field */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escreva a carreira, paragem, metro, comboio, barco ou MST..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white cursor-pointer"
                title="Limpar pesquisa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Estado Inicial sem texto: Sem sugestões predefinidas */}
          {!searchQuery.trim() && (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 mx-auto flex items-center justify-center text-amber-400 shadow-md">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">Pesquisa Direta Ativa</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Apenas os transportes correspondentes ao que escrever aparecerão nesta lista.
              </p>
            </div>
          )}

          {/* Resultados da Pesquisa (Apenas exibidos quando o utilizador escreve algo) */}
          {searchQuery.trim().length > 0 && (
            <div className="space-y-3.5">
              {/* Carreiras de Autocarro Encontradas */}
              {filteredBusLines.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-2 flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5" />
                    Carreiras de Autocarro
                  </span>
                  <div className="space-y-1.5">
                    {filteredBusLines.map((line) => {
                      const isActive = activeLines.includes(line.id);
                      return (
                        <div
                          key={line.id}
                          onClick={() => {
                            handleSelectLine(line.id);
                            setActiveSheet('none');
                          }}
                          className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="px-2 py-0.5 rounded-md font-mono font-bold text-xs shadow-xs"
                              style={{ backgroundColor: line.color || '#fbbf24', color: line.text_color || '#000000' }}
                            >
                              {line.short_name || line.id}
                            </span>
                            <span className="text-white text-xs font-medium truncate max-w-[200px] sm:max-w-xs">
                              {line.long_name}
                            </span>
                          </div>
                          <span className="text-amber-400 text-xs font-semibold">Ativar &rarr;</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Metro Search Results */}
              {filteredMetroStations.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 block mb-2 flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5" />
                    Estações de Metro
                  </span>
                  <div className="space-y-1.5">
                    {filteredMetroStations.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedMetroStation(st);
                          setActiveSheet('metro');
                          setFlyToTarget({ coords: [st.lat, st.lon], zoom: 16, timestamp: Date.now() });
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px] border border-sky-500/30">
                            M
                          </div>
                          <div>
                            <strong className="text-white text-xs block">{st.name}</strong>
                            <span className="text-[10px] text-slate-400">
                              {st.lines.map((l) => METRO_LINES[l].name).join(' · ')}
                            </span>
                          </div>
                        </div>
                        <span className="text-amber-400 text-xs font-semibold">Ver horários &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fertagus Station Search Results */}
              {filteredFertagusStations.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 block mb-2 flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5" />
                    Estações Fertagus
                  </span>
                  <div className="space-y-1.5">
                    {filteredFertagusStations.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedFertagusStation(st);
                          setActiveSheet('fertagus');
                          setFlyToTarget({ coords: [st.lat, st.lon], zoom: 16, timestamp: Date.now() });
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-sky-600 text-white flex items-center justify-center font-bold text-[9px] font-mono shadow-xs">
                            FT
                          </div>
                          <div>
                            <strong className="text-white text-xs block">{st.name}</strong>
                            <span className="text-[10px] text-slate-400">
                              Zona {st.zone} · {st.connections.slice(0, 2).join(', ')}
                            </span>
                          </div>
                        </div>
                        <span className="text-sky-400 text-xs font-semibold">Ver partidas &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CP Train Station Search Results */}
              {filteredCpStations.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-2 flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5" />
                    Estações CP
                  </span>
                  <div className="space-y-1.5">
                    {filteredCpStations.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedCpStation(st);
                          setActiveSheet('cp');
                          setFlyToTarget({ coords: [st.lat, st.lon], zoom: 16, timestamp: Date.now() });
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-emerald-500/40 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px] font-mono shadow-xs">
                            CP
                          </div>
                          <div>
                            <strong className="text-white text-xs block">{st.name}</strong>
                            <span className="text-[10px] text-emerald-300 font-medium">
                              {st.lines.map((l) => CP_LINES[l].shortName).join(' · ')}
                            </span>
                          </div>
                        </div>
                        <span className="text-emerald-400 text-xs font-semibold">Ver horários &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Barcos Transtejo & Soflusa Search Results */}
              {filteredBoatStations.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 block mb-2 flex items-center gap-1.5">
                    <Ship className="w-3.5 h-3.5" />
                    Terminais Fluviais (Transtejo & Soflusa)
                  </span>
                  <div className="space-y-1.5">
                    {filteredBoatStations.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedBoatStation(st);
                          setActiveSheet('boat');
                          setFlyToTarget({ coords: [st.lat, st.lon], zoom: 16, timestamp: Date.now() });
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-sky-500/40 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-sky-600 text-white flex items-center justify-center font-bold text-[9px] font-mono shadow-xs">
                            <Ship className="w-3 h-3" />
                          </div>
                          <div>
                            <strong className="text-white text-xs block">{st.name}</strong>
                            <span className="text-[10px] text-sky-300 font-medium">{st.locality}</span>
                          </div>
                        </div>
                        <span className="text-sky-400 text-xs font-semibold">Ver barcos &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metro Sul do Tejo (MST) Search Results */}
              {filteredMSTStations.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 block mb-2 flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5" />
                    Estações Metro Sul do Tejo (MST)
                  </span>
                  <div className="space-y-1.5">
                    {filteredMSTStations.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedMSTStation(st);
                          setActiveSheet('mst');
                          setFlyToTarget({ coords: [st.lat, st.lon], zoom: 16, timestamp: Date.now() });
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-teal-500/40 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-teal-600 text-white flex items-center justify-center font-bold text-[9px] font-mono shadow-xs">
                            MST
                          </div>
                          <div>
                            <strong className="text-white text-xs block">{st.name}</strong>
                            <span className="text-[10px] text-teal-300 font-medium">
                              Linhas {st.lines.join(', ')} · {st.locality}
                            </span>
                          </div>
                        </div>
                        <span className="text-teal-400 text-xs font-semibold">Ver partidas &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bus Stops Search Results */}
              {filteredStops.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-2">
                    Paragens de Autocarro
                  </span>
                  <div className="space-y-1.5">
                    {filteredStops.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          handleSelectStop(st.id);
                          setActiveSheet('none');
                        }}
                        className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <strong className="text-white text-xs block">{st.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">#{st.id}</span>
                        </div>
                        <span className="text-amber-400 text-xs font-semibold">Ver chegadas &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zero Results Feedback */}
              {filteredBusLines.length === 0 &&
                filteredMetroStations.length === 0 &&
                filteredFertagusStations.length === 0 &&
                filteredCpStations.length === 0 &&
                filteredBoatStations.length === 0 &&
                filteredMSTStations.length === 0 &&
                filteredStops.length === 0 && (
                  <div className="py-10 text-center text-slate-400 space-y-1">
                    <p className="text-sm font-semibold text-slate-300">Nenhum resultado encontrado</p>
                    <p className="text-xs text-slate-500">
                      Não foi encontrada nenhuma linha, paragem ou estação para "{searchQuery}".
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* BOTTOM SHEET 2: Alertas de Serviço & Avisos */}
      <BottomSheet
        isOpen={activeSheet === 'alerts'}
        onClose={() => setActiveSheet('none')}
        title="Alertas & Avisos de Serviço"
        subtitle={`${alerts.length} avisos de circulação e greves ativas`}
        icon={<Bell className="w-5 h-5 text-rose-400" />}
      >
        <div className="space-y-2.5 text-xs">
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p>Nenhum alerta de circulação ativo no momento.</p>
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1.5 shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-sm leading-tight">
                    {alert.title || alert.header}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                      alert.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    }`}
                  >
                    {alert.cause || 'Aviso'}
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{alert.description}</p>
                {alert.lines && alert.lines.length > 0 && (
                  <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400 text-[10px]">Linhas afetadas:</span>
                    {alert.lines.map((l, lIdx) => (
                      <span
                        key={lIdx}
                        className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[10px] border border-slate-700"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </BottomSheet>

      {/* BOTTOM SHEET 3: Camadas do Mapa & OpenStreetMap */}
      <BottomSheet
        isOpen={activeSheet === 'layers'}
        onClose={() => setActiveSheet('none')}
        title="Camadas & Estilo do Mapa"
        subtitle="Configure as camadas visíveis e o mapa base OpenStreetMap"
        icon={<Layers className="w-5 h-5 text-amber-400" />}
      >
        <LayerControlPanel
          layers={mapLayers}
          onToggleLayer={handleToggleLayer}
          tileStyle={tileStyle}
          setTileStyle={setTileStyle}
          stopsCount={stopsMap.size}
          activeLinesCount={activeLines.length}
          trafficMetrics={trafficMetrics}
          isOpen={true}
          setIsOpen={() => {}}
          onOpenOfflineMap={() => {
            setActiveSheet('none');
            setIsOfflineMapModalOpen(true);
          }}
        />
      </BottomSheet>

      {/* BOTTOM SHEET 4: Menu Principal */}
      <BottomSheet
        isOpen={activeSheet === 'menu'}
        onClose={() => setActiveSheet('none')}
        title="Menu Principal"
        subtitle="Guia de Transportes Públicos · Em Direto"
        icon={<Bus className="w-5 h-5 text-amber-400" />}
      >
        <div className="space-y-4">
          {/* Cartão de Estado do Sinal e Seleção de Carreiras (movido do centro do ecrã para o menu de topo) */}
          <div className="bg-slate-800/90 border border-slate-700/90 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    showAllVehicles
                      ? 'bg-emerald-400 animate-pulse'
                      : activeLines.length > 0
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="text-white text-xs font-bold uppercase tracking-wider">
                  Sinal dos Autocarros
                </span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  showAllVehicles
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : activeLines.length > 0
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {showAllVehicles
                  ? `${allVehicles.length} em direto`
                  : activeLines.length > 0
                  ? `${activeLines.length} ativas (${filteredVehicles.length} visíveis)`
                  : 'Desligado (Economia)'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {showAllVehicles
                ? 'Toda a frota metropolitana (Carris, Carris Metropolitana & MobiCascais) está a ser transmitida em direto no mapa.'
                : activeLines.length > 0
                ? `A transmitir telemetria GPS para ${activeLines.length} carreiras selecionadas. Pode alternar ou ligar toda a rede.`
                : 'O sinal de GPS só é transmitido quando selecionar carreiras, evitando lentidão e poupando bateria e dados móveis.'}
            </p>

            {/* Ações Rápidas: Ativar Linhas Populares ou Toda a Rede */}
            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Carreiras Rápidas:</span>
                <button
                  onClick={() => {
                    handleSetShowAllVehicles(!showAllVehicles);
                  }}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                    showAllVehicles
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                  }`}
                >
                  {showAllVehicles ? 'Desligar Geral' : 'Ligar Toda a Rede'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {['753', '3710', '4701', '3508', 'M01', 'M22'].map((line) => {
                  const isActive = activeLines.includes(line);
                  const busCount = busesPerLine.get(line) || 0;
                  return (
                    <button
                      key={line}
                      onClick={() => handleToggleActiveLine(line)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md'
                          : line.startsWith('M')
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
                          : 'bg-slate-700/80 hover:bg-slate-700 text-slate-200 border-slate-600'
                      }`}
                    >
                      <span>{isActive ? '✓' : '+'} {line}</span>
                      {busCount > 0 && (
                        <span className={`text-[9px] px-1 rounded-sm ${isActive ? 'bg-black/20 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                          {busCount}
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    setActiveSheet('none');
                    setIsLineSelectorOpen(true);
                  }}
                  className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer ml-auto"
                >
                  Todas &rarr;
                </button>
              </div>
            </div>

            {/* Escolha da Frequência de Atualizações do Trajeto */}
            <div className="space-y-1.5 pt-2 border-t border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Frequência do Trajeto:
                </span>
                <button
                  onClick={() => {
                    setActiveSheet('none');
                    setSettingsInitialTab('refresh');
                    setIsSettingsModalOpen(true);
                  }}
                  className="text-[10px] text-amber-400 hover:underline font-mono font-bold cursor-pointer"
                >
                  {baseRefreshInterval <= 3
                    ? '⚡ Ao momento (2s)'
                    : baseRefreshInterval <= 6
                    ? '⏱ Rápido (5s)'
                    : baseRefreshInterval <= 15
                    ? '🔋 Espaçado (15s)'
                    : `🍃 Eco (${baseRefreshInterval}s)`}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
                {[
                  { sec: 2, label: 'Ao momento', badge: '2s', icon: '⚡' },
                  { sec: 5, label: 'Rápido', badge: '5s', icon: '⏱' },
                  { sec: 15, label: 'Espaçado', badge: '15s', icon: '🔋' },
                  { sec: 30, label: 'Eco', badge: '30s', icon: '🍃' },
                ].map((item) => {
                  const isSelected = baseRefreshInterval === item.sec;
                  return (
                    <button
                      key={item.sec}
                      onClick={() => handleSetRefreshInterval(item.sec)}
                      className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400 shadow-md ring-1 ring-amber-400/30'
                          : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 border-slate-600'
                      }`}
                      title={`Definir atualização a cada ${item.sec}s`}
                    >
                      <span className="text-[10px] font-sans font-semibold leading-none">{item.label}</span>
                      <span className="text-[9px] opacity-80 mt-0.5">{item.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PWA Install Banner */}
          <PWAInstallBanner />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {/* Opção 1: Metro de Lisboa */}
            <button
              onClick={() => {
                setActiveSheet('none');
                setFlyToTarget({ coords: [38.7369, -9.1426], zoom: 13, timestamp: Date.now() });
                if (!mapLayers.showMetro) handleToggleLayer('showMetro');
              }}
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Train className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Metro de Lisboa</span>
                <span className="text-slate-400 text-[11px]">4 Linhas, 56 estações e chegadas em direto</span>
              </div>
            </button>

            {/* Opção 2: Comboios Fertagus */}
            <button
              onClick={() => {
                setActiveSheet('none');
                setFlyToTarget({ coords: [38.66567, -9.17947], zoom: 14, timestamp: Date.now() });
                const pragal = FERTAGUS_STATIONS.find((s) => s.id === 'FT_PRAGAL') || FERTAGUS_STATIONS[4];
                setSelectedFertagusStation(pragal);
                setActiveSheet('fertagus');
              }}
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Train className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Comboios Fertagus</span>
                <span className="text-slate-400 text-[11px]">Ponte 25 de Abril, 14 estações e GPS em direto</span>
              </div>
            </button>

            {/* Opção 3: MobiCascais (Separado) */}
            <button
              onClick={() => {
                setActiveSheet('none');
                setFlyToTarget({ coords: [38.7003, -9.4215], zoom: 14, timestamp: Date.now() });
                if (mapLayers.showMobiCascais === false) handleToggleLayer('showMobiCascais');
                handleOpenLineSelector('mobi');
              }}
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-cyan-500/40 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm block">MobiCascais</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">Cascais</span>
                </div>
                <span className="text-slate-400 text-[11px]">44 Linhas (M01-M44) por cima das estradas reais</span>
              </div>
            </button>

            {/* Opção 4: Carris Metropolitana (Separado) */}
            <button
              onClick={() => {
                setActiveSheet('none');
                handleOpenLineSelector('cmet');
              }}
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-amber-400/40 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm block">Carris Metropolitana</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono font-bold">AML</span>
                </div>
                <span className="text-slate-400 text-[11px]">Áreas 1, 2, 3 e 4 intermunicipais</span>
              </div>
            </button>

            {/* Opção 5: Carris Lisboa (Separado) */}
            <button
              onClick={() => {
                setActiveSheet('none');
                handleOpenLineSelector('carris');
              }}
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-amber-500/40 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm block">Carris Lisboa</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">753</span>
                </div>
                <span className="text-slate-400 text-[11px]">Linha 753 (Ponte 25 de Abril) e carreiras urbanas</span>
              </div>
            </button>

            {/* Opção 6: Comboios CP (Linha de Cascais, Sintra, Azambuja, Sado) */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-emerald-500/40 flex items-center justify-between gap-3 text-left">
              <div
                onClick={() => {
                  setActiveSheet('none');
                  handleOpenLineSelector('cp');
                }}
                className="flex items-center gap-3 cursor-pointer min-w-0 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Train className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm block">Comboios CP</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        isCpUnlocked
                          ? 'bg-emerald-500/30 text-emerald-200'
                          : 'bg-rose-500/30 text-rose-200'
                      }`}
                    >
                      {isCpUnlocked ? 'Desbloqueado' : 'Bloqueado Servidor'}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px] truncate block">
                    Cascais, Sintra, Azambuja e Sado
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggleCpUnlocked(!isCpUnlocked)}
                  className={`px-2 py-1.5 rounded-xl font-bold font-mono text-[10px] transition-colors cursor-pointer flex items-center gap-1 ${
                    isCpUnlocked
                      ? 'bg-slate-700 hover:bg-slate-600 text-rose-300'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                  }`}
                  title={isCpUnlocked ? 'Bloquear no servidor' : 'Desbloquear a pedido'}
                >
                  {!isCpUnlocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{!isCpUnlocked ? 'Desbloquear' : 'Bloquear'}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSheet('none');
                    handleOpenLineSelector('cp');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  Linhas &rarr;
                </button>
              </div>
            </div>

            {/* Opção 7: Estatísticas & Validações */}
            <button
              onClick={() => {
                setActiveSheet('none');
                setIsSidebarOpen(true);
              }}
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Estatísticas & Validações</span>
                <span className="text-slate-400 text-[11px]">Painel de viagens e métricas de tráfego</span>
              </div>
            </button>

            {/* Opção Favoritos */}
            <button
              onClick={() => {
                setActiveSheet('none');
                setIsFavoritesModalOpen(true);
              }}
              className="p-3.5 rounded-2xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <span className="font-bold text-amber-300 text-sm block">Meus Transportes Favoritos</span>
                <span className="text-slate-300 text-[11px]">Escolha e filtre os transportes que mais utiliza</span>
              </div>
            </button>

            {/* Opção Barcos Transtejo & Soflusa */}
            <button
              onClick={() => {
                setActiveSheet('none');
                setFlyToTarget({ coords: [38.7058, -9.1448], zoom: 14, timestamp: Date.now() });
                const cais = BOAT_STATIONS.find((s) => s.id === 'FLUV_CAIS_SODRE') || BOAT_STATIONS[0];
                setSelectedBoatStation(cais);
                setActiveSheet('boat');
              }}
              className="p-3.5 rounded-2xl bg-sky-600/15 hover:bg-sky-600/25 border border-sky-500/40 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Barcos Transtejo & Soflusa</span>
                <span className="text-slate-400 text-[11px]">Cacilhas, Seixal, Barreiro, Montijo, Trafaria</span>
              </div>
            </button>

            {/* Opção Metro Sul do Tejo (MST) */}
            <button
              onClick={() => {
                setActiveSheet('none');
                setFlyToTarget({ coords: [38.6872, -9.1485], zoom: 14, timestamp: Date.now() });
                const cacilhasMST = MST_STATIONS.find((s) => s.id === 'MST_CACILHAS') || MST_STATIONS[0];
                setSelectedMSTStation(cacilhasMST);
                setActiveSheet('mst');
              }}
              className="p-3.5 rounded-2xl bg-teal-600/15 hover:bg-teal-600/25 border border-teal-500/40 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Train className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Metro Sul do Tejo (MST)</span>
                <span className="text-slate-400 text-[11px]">Metro ligeiro de Almada e Seixal (Linhas 1, 2 e 3)</span>
              </div>
            </button>

            {/* Opção 6: Camadas & Mapa */}
            <button
              onClick={() => {
                setActiveSheet('layers');
              }}
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Camadas do Mapa</span>
                <span className="text-slate-400 text-[11px]">Paragens, satélite, MobiCascais e traçados</span>
              </div>
            </button>

            {/* Opção 7: Definições */}
            <button
              onClick={() => {
                setActiveSheet('none');
                setIsSettingsModalOpen(true);
              }}
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Definições</span>
                <span className="text-slate-400 text-[11px]">Smart Refresh de bateria e dados</span>
              </div>
            </button>

            {/* Opção 8: Mapa Offline da AML */}
            <button
              onClick={() => {
                setActiveSheet('none');
                setIsOfflineMapModalOpen(true);
              }}
              className="p-3.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Mapa Offline da AML</span>
                <span className="text-slate-400 text-[11px]">Guardar no telemóvel para 0ms e sem gastar dados</span>
              </div>
            </button>

            {/* Opção 9: Sobre o Projeto */}
            <button
              onClick={() => {
                setActiveSheet('none');
                setIsAboutModalOpen(true);
              }}
              className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-3 text-left transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-700/40 text-slate-300 border border-slate-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Sobre</span>
                <span className="text-slate-400 text-[11px]">Fontes de dados oficiais em direto</span>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* BOTTOM SHEET 5: Metro de Lisboa - Estação e Tempos de Chegada */}
      <BottomSheet
        isOpen={activeSheet === 'metro' && selectedMetroStation !== null}
        onClose={() => {
          setSelectedMetroStation(null);
          setSelectedMetroLine(null);
          setActiveSheet('none');
        }}
        title={selectedMetroStation ? `Metro ${selectedMetroStation.name}` : 'Metro de Lisboa'}
        subtitle="Tempos de espera e próximos comboios em tempo real"
        icon={<Train className="w-5 h-5 text-sky-400" />}
      >
        <MetroStationDrawer
          station={selectedMetroStation}
          onClose={() => {
            setSelectedMetroStation(null);
            setSelectedMetroLine(null);
            setActiveSheet('none');
          }}
          selectedLine={selectedMetroLine}
          onSelectLine={(lineKey) => setSelectedMetroLine(lineKey)}
          showRouteLines={mapLayers.showRouteLines}
          onToggleRouteLines={() => handleToggleLayer('showRouteLines')}
        />
      </BottomSheet>

      {/* BOTTOM SHEET 6: Comboios Fertagus - Estação e Partidas em Tempo Real */}
      <BottomSheet
        isOpen={activeSheet === 'fertagus' && selectedFertagusStation !== null}
        onClose={() => {
          setSelectedFertagusStation(null);
          setSelectedFertagusTrain(null);
          setActiveSheet('none');
        }}
        title={selectedFertagusStation ? `Fertagus ${selectedFertagusStation.name}` : 'Comboios Fertagus'}
        subtitle="Partidas em direto e ligações da Ponte 25 de Abril"
        icon={<Train className="w-5 h-5 text-sky-400" />}
      >
        <FertagusStationDrawer
          station={selectedFertagusStation}
          onClose={() => {
            setSelectedFertagusStation(null);
            setSelectedFertagusTrain(null);
            setActiveSheet('none');
          }}
          onFlyToStation={(coords, zoom) => {
            setFlyToTarget({ coords, zoom, timestamp: Date.now() });
          }}
          showRouteLines={mapLayers.showRouteLines}
          onToggleRouteLines={() => handleToggleLayer('showRouteLines')}
        />
      </BottomSheet>

      {/* BOTTOM SHEET 7: Comboios CP - Estação e Partidas em Tempo Real */}
      <BottomSheet
        isOpen={activeSheet === 'cp' && selectedCpStation !== null}
        onClose={() => {
          setSelectedCpStation(null);
          setSelectedCpTrain(null);
          setActiveSheet('none');
        }}
        title={selectedCpStation ? `CP ${selectedCpStation.name}` : 'Comboios de Portugal'}
        subtitle={
          selectedCpStation
            ? `Linhas: ${selectedCpStation.lines.map((l) => CP_LINES[l].shortName).join(' · ')}`
            : 'Horários e partidas em direto'
        }
        icon={<Train className="w-5 h-5 text-emerald-400" />}
        maxHeight="max-h-[85vh]"
      >
        <CPStationDrawer
          station={selectedCpStation}
          onClose={() => {
            setSelectedCpStation(null);
            setSelectedCpTrain(null);
            setActiveSheet('none');
          }}
          onFlyToStation={(coords, zoom) => {
            setFlyToTarget({ coords, zoom, timestamp: Date.now() });
          }}
          onSelectLine={(lineKey) => {
            handleSelectCpLine(lineKey);
            setActiveSheet('none');
          }}
        />
      </BottomSheet>

      {/* BOTTOM SHEET 8: Barcos Transtejo & Soflusa - Estação Fluvial e Partidas */}
      <BottomSheet
        isOpen={activeSheet === 'boat' && selectedBoatStation !== null}
        onClose={() => {
          setSelectedBoatStation(null);
          setSelectedBoatLine(null);
          setActiveSheet('none');
        }}
        title={selectedBoatStation ? selectedBoatStation.name : 'Terminal Fluvial'}
        subtitle="Travessia do Rio Tejo · Partidas em tempo real"
        icon={<Ship className="w-5 h-5 text-sky-400" />}
        maxHeight="max-h-[85vh]"
      >
        <BoatStationDrawer
          station={selectedBoatStation}
          onClose={() => {
            setSelectedBoatStation(null);
            setSelectedBoatLine(null);
            setActiveSheet('none');
          }}
          onSelectLine={(lineId) => {
            setSelectedBoatLine(lineId);
            setActiveSheet('none');
          }}
          userLocation={userLocation}
        />
      </BottomSheet>

      {/* BOTTOM SHEET 9: Metro Sul do Tejo (MST) - Estação e Partidas */}
      <BottomSheet
        isOpen={activeSheet === 'mst' && selectedMSTStation !== null}
        onClose={() => {
          setSelectedMSTStation(null);
          setSelectedMSTLine(null);
          setActiveSheet('none');
        }}
        title={selectedMSTStation ? selectedMSTStation.name : 'Metro Sul do Tejo'}
        subtitle="Metro Ligeiro de Superfície · Partidas em tempo real"
        icon={<Train className="w-5 h-5 text-teal-400" />}
        maxHeight="max-h-[85vh]"
      >
        <MSTStationDrawer
          station={selectedMSTStation}
          onClose={() => {
            setSelectedMSTStation(null);
            setSelectedMSTLine(null);
            setActiveSheet('none');
          }}
          onSelectLine={(lineId) => {
            setSelectedMSTLine(lineId);
            setActiveSheet('none');
          }}
          userLocation={userLocation}
        />
      </BottomSheet>

      {/* MODAL FAVORITOS: Acesso rápido aos transportes mais usados */}
      <FavoritesModal
        isOpen={isFavoritesModalOpen}
        onClose={() => setIsFavoritesModalOpen(false)}
        onSelectLine={(lineId) => {
          handleSelectLine(lineId);
          setIsFavoritesModalOpen(false);
          setActiveSheet('none');
        }}
        onSelectBoatLine={(lineId) => {
          setSelectedBoatLine(lineId);
          const st = BOAT_STATIONS.find((s) => s.lines.includes(lineId)) || BOAT_STATIONS[0];
          setSelectedBoatStation(st);
          setFlyToTarget({ coords: [st.lat, st.lon], zoom: 15, timestamp: Date.now() });
          setIsFavoritesModalOpen(false);
          setActiveSheet('boat');
        }}
        onSelectMSTLine={(lineId) => {
          const lKey = lineId === '1' || lineId === '2' || lineId === '3' ? lineId : '1';
          setSelectedMSTLine(lKey);
          const st = MST_STATIONS.find((s) => s.lines.includes(lKey)) || MST_STATIONS[0];
          setSelectedMSTStation(st);
          setFlyToTarget({ coords: [st.lat, st.lon], zoom: 15, timestamp: Date.now() });
          setIsFavoritesModalOpen(false);
          setActiveSheet('mst');
        }}
        onSelectCpLine={(lineKey) => {
          handleSelectCpLine(lineKey);
          setIsFavoritesModalOpen(false);
          setActiveSheet('none');
        }}
        onSelectMetroLine={(lineKey) => {
          setSelectedMetroLine(lineKey);
          setIsFavoritesModalOpen(false);
          setActiveSheet('none');
        }}
        activeLines={activeLines}
        onToggleActiveLine={handleToggleActiveLine}
      />

      {/* Fallback Modals */}
      <DirectionModal
        isOpen={isDirectionModalOpen}
        onClose={() => setIsDirectionModalOpen(false)}
        directionInfo={directionModalInfo}
        selectedDirection={selectedDirection}
        onSelectDirection={handleSelectDirection}
      />

      <LineSelectorModal
        isOpen={isLineSelectorOpen}
        onClose={() => setIsLineSelectorOpen(false)}
        linesMap={linesMap}
        activeLines={activeLines}
        setActiveLines={handleSetActiveLines}
        showAllVehicles={showAllVehicles}
        setShowAllVehicles={handleSetShowAllVehicles}
        busesPerLine={busesPerLine}
        totalVehiclesCount={allVehicles.length}
        onSelectExclusiveLine={handleSelectLine}
        isCpUnlocked={isCpUnlocked}
        onToggleCpUnlocked={handleToggleCpUnlocked}
        onSelectCpLine={handleSelectCpLine}
        selectedCpLine={selectedCpLine}
        initialTab={lineSelectorInitialTab}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab={settingsInitialTab}
        smartRefreshEnabled={smartRefreshEnabled}
        onToggleSmartRefresh={handleToggleSmartRefresh}
        isUserInactive={isUserInactive}
        currentRefreshInterval={currentRefreshInterval}
        baseRefreshInterval={baseRefreshInterval}
        onSelectRefreshInterval={handleSetRefreshInterval}
        inactivitySeconds={inactivitySeconds}
        onSimulateInactivity={handleSimulateInactivity}
        onSimulateActivity={handleSimulateActivity}
        cartoApiKey={cartoApiKey}
        onSaveCartoApiKey={handleSaveCartoApiKey}
        tileStyle={tileStyle}
        setTileStyle={setTileStyle}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => {
          setIsAboutModalOpen(false);
          setActiveView('map');
        }}
      />

      <OfflineMapModal
        isOpen={isOfflineMapModalOpen}
        onClose={() => setIsOfflineMapModalOpen(false)}
      />

      <SidebarList
        vehicles={filteredVehicles}
        allVehicles={allVehicles}
        linesMap={linesMap}
        selectedVehicleId={selectedVehicleId}
        vehicleDelays={vehicleDelays}
        onSelectVehicle={(v) => {
          setSelectedVehicleId(v.id);
          setIsSidebarOpen(false);
        }}
        onSelectLine={handleSelectLine}
        selectedLineFilter={selectedLineFilter}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userLocation={userLocation}
        activeLines={activeLines}
        onToggleActiveLine={handleToggleActiveLine}
        showAllVehicles={showAllVehicles}
        stopsMap={stopsMap}
        onSelectStop={handleSelectStop}
        onToggleShowAll={() => handleSetShowAllVehicles(!showAllVehicles)}
      />
    </div>
  );
}
