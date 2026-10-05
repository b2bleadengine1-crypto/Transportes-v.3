import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  MapPin,
  RefreshCw,
  Bus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Compass,
  Layers,
  ChevronRight,
  Filter,
  Radio,
  ExternalLink,
  Bell,
} from 'lucide-react';
import { Line, StopInfo, StopArrivalItem, Vehicle } from '../types';
import {
  fetchParsedStopArrivals,
  getLineFallbackColor,
  getDistanceMeters,
} from '../services/api';

interface StopArrivalsDrawerProps {
  stopId: string | null;
  onClose: () => void;
  stopsMap: Map<string, { id: string; name: string; lat: number; lon: number }>;
  linesMap: Map<string, Line>;
  allVehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
  onFlyToStop: (coords: [number, number], zoom: number) => void;
  userLocation: { lat: number; lon: number } | null;
  onFilterByLine?: (lineId: string) => void;
  destinationStopId?: string | null;
  onToggleDestinationStop?: (stop: { id: string; name: string; lat: number; lon: number }) => void;
}

export const StopArrivalsDrawer: React.FC<StopArrivalsDrawerProps> = ({
  stopId,
  onClose,
  stopsMap,
  linesMap,
  allVehicles,
  onSelectVehicle,
  onFlyToStop,
  userLocation,
  onFilterByLine,
  destinationStopId,
  onToggleDestinationStop,
}) => {
  const [activeTab, setActiveTab] = useState<'realtime' | 'schedule' | 'lines'>('realtime');
  const [arrivals, setArrivals] = useState<StopArrivalItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLineFilter, setSelectedLineFilter] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Stop metadata from map or fallback
  const stopData = useMemo(() => {
    if (!stopId) return null;
    return stopsMap.get(stopId) || { id: stopId, name: `Paragem #${stopId}`, lat: 0, lon: 0 };
  }, [stopId, stopsMap]);

  // Load arrivals from API
  const loadArrivals = async (id: string, isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchParsedStopArrivals(id);
      setArrivals(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Erro ao carregar chegadas da paragem:', err);
      setError('Não foi possível obter horários e estimativas para esta paragem.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (stopId) {
      setSelectedLineFilter(null);
      loadArrivals(stopId);
    } else {
      setArrivals([]);
    }
  }, [stopId]);

  // Auto-refresh every 20 seconds while drawer is open
  useEffect(() => {
    if (!stopId) return;
    const interval = setInterval(() => {
      loadArrivals(stopId, true);
    }, 20000);
    return () => clearInterval(interval);
  }, [stopId]);

  // Unique lines that serve this stop from current arrivals
  const availableLines = useMemo(() => {
    const linesSet = new Set<string>();
    arrivals.forEach((a) => {
      if (a.lineId) linesSet.add(a.lineId);
    });
    return Array.from(linesSet).sort();
  }, [arrivals]);

  // Filtered arrivals
  const filteredArrivals = useMemo(() => {
    if (!selectedLineFilter) return arrivals;
    return arrivals.filter((a) => a.lineId === selectedLineFilter);
  }, [arrivals, selectedLineFilter]);

  // Real-time vs Scheduled counts
  const realtimeCount = useMemo(() => arrivals.filter((a) => a.isRealtime).length, [arrivals]);

  // Distance from user to stop
  const distanceToUser = useMemo(() => {
    if (!userLocation || !stopData || !stopData.lat || !stopData.lon) return null;
    return getDistanceMeters(userLocation.lat, userLocation.lon, stopData.lat, stopData.lon);
  }, [userLocation, stopData]);

  // Group departures for the Timetable tab
  const timetableGroups = useMemo(() => {
    const groups: {
      morning: StopArrivalItem[];
      afternoon: StopArrivalItem[];
      evening: StopArrivalItem[];
    } = {
      morning: [], // 05:00 - 12:00
      afternoon: [], // 12:00 - 18:00
      evening: [], // 18:00 - 05:00
    };

    filteredArrivals.forEach((item) => {
      const timeStr = item.scheduledArrival || item.estimatedArrival;
      if (!timeStr) return;
      const hour = parseInt(timeStr.split(':')[0], 10);
      if (isNaN(hour)) return;

      if (hour >= 5 && hour < 12) {
        groups.morning.push(item);
      } else if (hour >= 12 && hour < 18) {
        groups.afternoon.push(item);
      } else {
        groups.evening.push(item);
      }
    });

    return groups;
  }, [filteredArrivals]);

  // Early return ONLY after all hooks have been unconditionally invoked
  if (!stopId || !stopData) return null;

  // Copy stop ID
  const handleCopyStopId = () => {
    if (!stopId) return;
    navigator.clipboard.writeText(stopId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Center on map
  const handleCenterOnMap = () => {
    if (stopData.lat && stopData.lon) {
      onFlyToStop([stopData.lat, stopData.lon], 16);
    }
  };

  // Find vehicle by ID to select on map
  const handleLocateVehicle = (vehId?: string | null, lineId?: string) => {
    if (!vehId && !lineId) return;
    let foundBus: Vehicle | undefined;
    if (vehId) {
      foundBus = allVehicles.find((v) => v.id === vehId || v.id.includes(vehId));
    }
    if (!foundBus && lineId) {
      foundBus = allVehicles.find((v) => v.line_id === lineId);
    }
    if (foundBus) {
      onSelectVehicle(foundBus);
    }
  };

  return (
    <div className="fixed sm:absolute bottom-0 left-0 right-0 sm:left-auto sm:top-20 sm:bottom-6 sm:right-6 w-full sm:w-[420px] z-30 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/80 flex flex-col max-h-[85vh] sm:max-h-[calc(100vh-120px)] overflow-hidden text-slate-100 animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 shadow-md shadow-amber-400/20">
                <Bus className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-mono text-amber-400 font-semibold">Paragem #{stopId}</span>
                  {distanceToUser !== null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400 font-medium">
                        {distanceToUser < 1000 ? `${distanceToUser}m a pé` : `${(distanceToUser / 1000).toFixed(1)}km`}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-base font-bold text-white leading-snug truncate mt-0.5" title={stopData.name}>
                  {stopData.name}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleCenterOnMap}
                title="Centrar no mapa"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Compass className="w-4 h-4 text-sky-400" />
              </button>
              <button
                onClick={() => loadArrivals(stopId)}
                disabled={isLoading}
                title="Atualizar estimativas"
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              </button>
              <button
                onClick={onClose}
                title="Fechar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Proximity Alarm Destination Button */}
          {onToggleDestinationStop && stopData && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Bell className={`w-3.5 h-3.5 ${destinationStopId === stopId ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-slate-300 text-[11px]">
                  {destinationStopId === stopId
                    ? 'Alarme ativo: serás avisado a 500m'
                    : 'Avisar no telemóvel a 500m desta paragem'}
                </span>
              </div>
              <button
                onClick={() => onToggleDestinationStop(stopData)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  destinationStopId === stopId
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{destinationStopId === stopId ? 'Alarme Ativo ✓' : 'Avisar a 500m'}</span>
              </button>
            </div>
          )}

          {/* Navigation Tabs (Slidable on narrow screens) */}
          <div className="mt-3.5 cm-slider-track flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
            <button
              onClick={() => setActiveTab('realtime')}
              className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'realtime'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Chegadas ({arrivals.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'schedule'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Horários do Dia</span>
            </button>
            <button
              onClick={() => setActiveTab('lines')}
              className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'lines'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Carreiras ({availableLines.length})</span>
            </button>
          </div>

          {/* Quick Line Filter Bar (if more than 1 line) */}
          {availableLines.length > 1 && activeTab !== 'lines' && (
            <div className="mt-2.5 cm-slider-track flex items-center gap-1.5 pb-1 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1 text-[10px] uppercase font-bold shrink-0">
                <Filter className="w-3 h-3" />
                Filtrar:
              </span>
              <button
                onClick={() => setSelectedLineFilter(null)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedLineFilter === null
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                Todas
              </button>
              {availableLines.map((lineId) => {
                const line = linesMap.get(lineId);
                const fb = getLineFallbackColor(lineId);
                const isSel = selectedLineFilter === lineId;
                return (
                  <button
                    key={lineId}
                    onClick={() => setSelectedLineFilter(isSel ? null : lineId)}
                    className={`px-2 py-0.5 rounded-md font-mono font-bold transition-transform cursor-pointer shrink-0 ${
                      isSel ? 'ring-2 ring-amber-400 scale-105' : 'opacity-85 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: line?.color || fb.bg,
                      color: line?.text_color || fb.text,
                    }}
                  >
                    {lineId}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && arrivals.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
              <p className="text-xs">A carregar horários e estimativas da paragem...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Falha ao obter dados</div>
                <div className="text-[11px] text-rose-300 mt-0.5">{error}</div>
                <button
                  onClick={() => loadArrivals(stopId)}
                  className="mt-2 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : activeTab === 'realtime' ? (
            /* TAB 1: REALTIME ESTIMATED ARRIVALS */
            <div className="space-y-2.5">
              {filteredArrivals.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-1 bg-slate-800/20 rounded-xl p-4 border border-slate-800">
                  <Clock className="w-6 h-6 mx-auto text-slate-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">Sem partidas previstas de momento</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Não existem autocarros em trânsito ou partidas agendadas para esta paragem nas próximas horas.
                  </p>
                </div>
              ) : (
                filteredArrivals.map((item, idx) => {
                  const line = linesMap.get(item.lineId);
                  const fb = getLineFallbackColor(item.lineId);
                  const isSoon = item.minutesAway !== null && item.minutesAway <= 2;
                  const hasVehicle = Boolean(item.vehicleId);

                  return (
                    <div
                      key={`${item.lineId}-${item.tripId || idx}-${item.scheduledArrival || ''}`}
                      className={`p-3 rounded-xl border transition-all ${
                        isSoon && item.isRealtime
                          ? 'bg-amber-400/10 border-amber-400/40 shadow-sm shadow-amber-400/5'
                          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        {/* Line Badge & Destination */}
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs tracking-tight shrink-0 shadow-xs flex items-center justify-center min-w-[46px]"
                            style={{
                              backgroundColor: line?.color || fb.bg,
                              color: line?.text_color || fb.text,
                            }}
                          >
                            {item.lineId}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-white truncate" title={item.headsign}>
                              {item.headsign}
                            </h3>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              {item.isRealtime ? (
                                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  Tempo Real (GPS)
                                </span>
                              ) : (
                                <span className="text-slate-400">Horário Previsto</span>
                              )}

                              {item.delayMinutes !== null && item.delayMinutes > 2 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-rose-400 font-semibold font-mono">
                                    +{item.delayMinutes} min atraso
                                  </span>
                                </>
                              )}
                              {item.delayMinutes !== null && item.delayMinutes < -1 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-sky-400 font-semibold font-mono">
                                    {Math.abs(item.delayMinutes)} min adiantado
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Estimated Time / Minutes remaining */}
                        <div className="text-right shrink-0">
                          {item.minutesAway !== null ? (
                            item.minutesAway <= 1 ? (
                              <div className="text-xs font-black text-amber-400 uppercase tracking-wider animate-pulse flex items-center gap-1 justify-end">
                                <Radio className="w-3 h-3" />
                                <span>A Chegar</span>
                              </div>
                            ) : (
                              <div className="text-sm font-extrabold font-mono text-white tabular-nums">
                                em {item.minutesAway} min
                              </div>
                            )
                          ) : (
                            <div className="text-sm font-extrabold font-mono text-slate-200 tabular-nums">
                              {item.scheduledArrival?.slice(0, 5) || 'N/D'}
                            </div>
                          )}

                          <div className="text-[10px] font-mono text-slate-400">
                            {item.estimatedArrival ? (
                              <span className="text-slate-300">{item.estimatedArrival.slice(0, 5)}</span>
                            ) : item.scheduledArrival ? (
                              <span>tabela: {item.scheduledArrival.slice(0, 5)}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Bottom action bar */}
                      <div className="mt-2.5 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.vehicleId ? `Viatura #${item.vehicleId}` : 'Programação regular'}
                        </span>

                        <div className="flex items-center gap-2">
                          {onFilterByLine && (
                            <button
                              onClick={() => onFilterByLine(item.lineId)}
                              className="text-slate-400 hover:text-amber-400 transition-colors text-[10px] font-medium cursor-pointer"
                            >
                              Ver Carreira {item.lineId}
                            </button>
                          )}

                          {hasVehicle && (
                            <button
                              onClick={() => handleLocateVehicle(item.vehicleId, item.lineId)}
                              className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white font-medium text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="Ver este autocarro no mapa"
                            >
                              <Navigation className="w-2.5 h-2.5 text-amber-400" />
                              <span>Seguir no mapa</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : activeTab === 'schedule' ? (
            /* TAB 2: FULL TIMETABLE BY PERIOD */
            <div className="space-y-3">
              <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Horários programados e passagens para hoje</span>
                <span className="font-mono text-slate-300 font-semibold">{filteredArrivals.length} partidas</span>
              </div>

              {/* Morning Period */}
              {timetableGroups.morning.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider px-1">
                    <span>🌅 Manhã (05:00 - 12:00)</span>
                    <span className="text-[10px] text-slate-400 font-normal">({timetableGroups.morning.length})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {timetableGroups.morning.map((m, idx) => (
                      <div
                        key={`m-${idx}`}
                        className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300">
                            {m.lineId}
                          </span>
                          <span className="truncate text-slate-300 text-[11px]" title={m.headsign}>
                            {m.headsign}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-white text-xs shrink-0 ml-1">
                          {(m.scheduledArrival || m.estimatedArrival || '').slice(0, 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Afternoon Period */}
              {timetableGroups.afternoon.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 uppercase tracking-wider px-1">
                    <span>☀️ Tarde (12:00 - 18:00)</span>
                    <span className="text-[10px] text-slate-400 font-normal">({timetableGroups.afternoon.length})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {timetableGroups.afternoon.map((m, idx) => (
                      <div
                        key={`a-${idx}`}
                        className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-400/20 text-sky-300">
                            {m.lineId}
                          </span>
                          <span className="truncate text-slate-300 text-[11px]" title={m.headsign}>
                            {m.headsign}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-white text-xs shrink-0 ml-1">
                          {(m.scheduledArrival || m.estimatedArrival || '').slice(0, 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evening / Night Period */}
              {timetableGroups.evening.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider px-1">
                    <span>🌙 Noite & Madrugada (18:00+)</span>
                    <span className="text-[10px] text-slate-400 font-normal">({timetableGroups.evening.length})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {timetableGroups.evening.map((m, idx) => (
                      <div
                        key={`e-${idx}`}
                        className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-400/20 text-indigo-300">
                            {m.lineId}
                          </span>
                          <span className="truncate text-slate-300 text-[11px]" title={m.headsign}>
                            {m.headsign}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-white text-xs shrink-0 ml-1">
                          {(m.scheduledArrival || m.estimatedArrival || '').slice(0, 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredArrivals.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Sem dados de horários adicionais disponíveis para hoje.
                </div>
              )}
            </div>
          ) : (
            /* TAB 3: LINES PASSING THROUGH THIS STOP */
            <div className="space-y-2.5">
              {availableLines.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  A carregar lista de carreiras associadas...
                </div>
              ) : (
                availableLines.map((lineId) => {
                  const line = linesMap.get(lineId);
                  const fb = getLineFallbackColor(lineId);
                  // Find all destinations served from this stop by this line
                  const lineArrivals = arrivals.filter((a) => a.lineId === lineId);
                  const destinations = Array.from(new Set(lineArrivals.map((a) => a.headsign)));

                  return (
                    <div
                      key={lineId}
                      className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="px-3 py-1.5 rounded-lg font-mono font-bold text-sm tracking-tight shrink-0 shadow-xs"
                          style={{
                            backgroundColor: line?.color || fb.bg,
                            color: line?.text_color || fb.text,
                          }}
                        >
                          {lineId}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white leading-tight truncate">
                            {line?.long_name || `Carreira ${lineId}`}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            Destino: {destinations.join(' / ') || 'Rede Carris Metropolitana'}
                          </p>
                        </div>
                      </div>

                      {onFilterByLine && (
                        <button
                          onClick={() => {
                            onFilterByLine(lineId);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          Filtrar
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <button
            onClick={handleCopyStopId}
            className="flex items-center gap-1 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">ID copiado!</span>
              </>
            ) : (
              <>
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar ID da paragem</span>
              </>
            )}
          </button>
          <span>Atualizado às {lastRefreshed.toLocaleTimeString('pt-PT')}</span>
        </div>
      </div>
    </div>
  );
};
