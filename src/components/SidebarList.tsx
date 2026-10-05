import React, { useState, useMemo } from 'react';
import {
  Bus,
  Layers,
  BarChart3,
  X,
  ArrowUpDown,
  Navigation,
  Gauge,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  MapPin,
  Search,
  Clock,
} from 'lucide-react';
import { Vehicle, Line, AreaFilter } from '../types';
import {
  getLineFallbackColor,
  formatStatusText,
  formatTimeAgo,
  getDistanceMeters,
  AREAS,
  getAreaForLine,
} from '../services/api';
import { ResponsiveOverflowContainer } from './ResponsiveOverflowContainer';

interface SidebarListProps {
  vehicles: Vehicle[];
  allVehicles: Vehicle[];
  linesMap: Map<string, Line>;
  selectedVehicleId: string | null;
  onSelectVehicle: (v: Vehicle) => void;
  onSelectLine: (lineId: string) => void;
  selectedLineFilter: string | null;
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lon: number } | null;
  activeLines?: string[];
  onToggleActiveLine?: (lineId: string) => void;
  showAllVehicles?: boolean;
  vehicleDelays?: Map<string, number>;
  stopsMap?: Map<string, any>;
  onSelectStop?: (stopId: string) => void;
  onToggleShowAll?: () => void;
}

type TabType = 'vehicles' | 'lines' | 'stops' | 'stats';
type SortType = 'line' | 'speed' | 'distance';

export const SidebarList: React.FC<SidebarListProps> = ({
  vehicles,
  allVehicles,
  linesMap,
  selectedVehicleId,
  onSelectVehicle,
  onSelectLine,
  selectedLineFilter,
  isOpen,
  onClose,
  userLocation,
  activeLines = [],
  onToggleActiveLine,
  showAllVehicles = false,
  vehicleDelays,
  stopsMap,
  onSelectStop,
  onToggleShowAll,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('vehicles');
  const [sortBy, setSortBy] = useState<SortType>('line');
  const [lineSearch, setLineSearch] = useState('');
  const [stopSearch, setStopSearch] = useState('');

  const activeLinesSet = useMemo(() => new Set(activeLines), [activeLines]);

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

  // Sorted vehicles
  const sortedVehicles = useMemo(() => {
    const list = [...vehicles];
    if (sortBy === 'speed') {
      return list.sort((a, b) => (b.speed || 0) - (a.speed || 0));
    }
    if (sortBy === 'distance' && userLocation) {
      return list.sort((a, b) => {
        const da = getDistanceMeters(userLocation.lat, userLocation.lon, a.lat, a.lon);
        const db = getDistanceMeters(userLocation.lat, userLocation.lon, b.lat, b.lon);
        return da - db;
      });
    }
    // Default: by line ID ascending
    return list.sort((a, b) => (a.line_id || '').localeCompare(b.line_id || '', undefined, { numeric: true }));
  }, [vehicles, sortBy, userLocation]);

  // Filtered stops for the Paragens & Horários tab
  const filteredStops = useMemo(() => {
    if (!stopsMap || stopsMap.size === 0) return [];
    const query = stopSearch.trim().toLowerCase();
    const allStops = Array.from(stopsMap.values());

    if (!query) {
      if (userLocation) {
        return allStops
          .filter((s) => s.lat && s.lon && s.lat !== 0 && s.lon !== 0)
          .map((s) => ({
            ...s,
            dist: getDistanceMeters(userLocation.lat, userLocation.lon, s.lat, s.lon),
          }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 30);
      }
      return allStops.slice(0, 30);
    }

    const matches: typeof allStops = [];
    for (const s of allStops) {
      if (s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query)) {
        matches.push(s);
        if (matches.length >= 40) break;
      }
    }
    return matches;
  }, [stopsMap, stopSearch, userLocation]);

  // Unique lines list
  const uniqueLines = useMemo(() => {
    const linesArray = Array.from(linesMap.values());
    const query = lineSearch.trim().toLowerCase();

    const filtered = linesArray.filter((l) => {
      if (!query) return true;
      return (
        l.short_name?.toLowerCase().includes(query) ||
        l.long_name?.toLowerCase().includes(query) ||
        l.id?.toLowerCase().includes(query)
      );
    });

    // Sort by: lines with active buses first, then by line number
    return filtered.sort((a, b) => {
      const busesA = busesPerLine.get(a.short_name || a.id) || 0;
      const busesB = busesPerLine.get(b.short_name || b.id) || 0;
      if (busesA !== busesB) return busesB - busesA;
      return (a.short_name || a.id).localeCompare(b.short_name || b.id, undefined, { numeric: true });
    });
  }, [linesMap, lineSearch, busesPerLine]);

  // Fleet Statistics
  const stats = useMemo(() => {
    let moving = 0;
    let stopped = 0;
    let totalSpeed = 0;
    let maxSpeed = 0;
    let fastestBus: Vehicle | null = null;
    const areaCounts: Record<AreaFilter, number> = { all: allVehicles.length, '1': 0, '2': 0, '3': 0, '4': 0 };

    for (const v of allVehicles) {
      const sp = v.speed || 0;
      if (sp > 3) {
        moving++;
        totalSpeed += sp;
        if (sp > maxSpeed) {
          maxSpeed = sp;
          fastestBus = v;
        }
      } else {
        stopped++;
      }

      const area = getAreaForLine(v.line_id);
      if (area !== 'all') {
        areaCounts[area]++;
      }
    }

    const avgSpeed = moving > 0 ? Math.round(totalSpeed / moving) : 0;

    // Top lines with most buses
    const topLines = Array.from(busesPerLine.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lineId, count]) => ({
        lineId,
        count,
        line: linesMap.get(lineId),
      }));

    return {
      total: allVehicles.length,
      moving,
      stopped,
      avgSpeed,
      maxSpeed: Math.round(maxSpeed),
      fastestBus,
      areaCounts,
      topLines,
    };
  }, [allVehicles, busesPerLine, linesMap]);

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-0 sm:inset-y-0 sm:left-0 sm:w-[420px] max-w-[100vw] bg-slate-950/98 sm:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-800 z-50 flex flex-col shadow-2xl shadow-black text-slate-100 overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] animate-fade-in">
      {/* Mobile Top Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
            <Bus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white leading-tight">Lista de Veículos & Rede</h2>
            <span className="text-[10px] text-slate-400">Tempo real Carris & Metropolitana</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
          title="Fechar painel"
        >
          <span>Fechar</span>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs with Responsive Overflow Detection */}
      <div className="p-2.5 border-b border-slate-800/80 bg-slate-900/40 shrink-0">
        <ResponsiveOverflowContainer
          className="flex-1 min-w-0"
          contentClassName="flex items-center gap-1 p-1 bg-slate-800/80 rounded-xl text-xs"
          scrollStep={140}
          dragToScroll
          showArrows
          showIndicator
          forceScrollBelowWidth={420}
          ariaLabel="Separadores do painel lateral"
        >
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'vehicles'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bus className="w-3.5 h-3.5 shrink-0" />
            <span>Autocarros ({vehicles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('lines')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'lines'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Linhas</span>
          </button>
          <button
            onClick={() => setActiveTab('stops')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'stops'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>Paragens</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'stats'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span>Rede</span>
          </button>
        </ResponsiveOverflowContainer>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title="Fechar painel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tab 1: Vehicles List */}
      {activeTab === 'vehicles' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sorting sub-bar */}
          <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-amber-400" />
              Ordenar por:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortBy('line')}
                className={`transition-colors cursor-pointer ${
                  sortBy === 'line' ? 'text-amber-400 font-semibold' : 'hover:text-white'
                }`}
              >
                Linha
              </button>
              <span>·</span>
              <button
                onClick={() => setSortBy('speed')}
                className={`transition-colors cursor-pointer ${
                  sortBy === 'speed' ? 'text-amber-400 font-semibold' : 'hover:text-white'
                }`}
              >
                Velocidade
              </button>
              {userLocation && (
                <>
                  <span>·</span>
                  <button
                    onClick={() => setSortBy('distance')}
                    className={`transition-colors cursor-pointer ${
                      sortBy === 'distance' ? 'text-amber-400 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    Mais perto
                  </button>
                </>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {sortedVehicles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm space-y-3">
                <Bus className="w-10 h-10 mx-auto text-slate-600" />
                <p className="font-bold text-slate-200">Nenhum autocarro com os filtros atuais</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {activeLines.length === 0 && !showAllVehicles
                    ? 'O sinal de GPS está em modo de poupança. Ative a visualização em tempo real para ver todos os veículos.'
                    : 'Nenhum autocarro em circulação com os filtros selecionados.'}
                </p>
                {onToggleShowAll && (
                  <button
                    onClick={onToggleShowAll}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-transform hover:scale-105 cursor-pointer mt-2"
                  >
                    Mostrar Todos os Autocarros em Direto ({allVehicles.length})
                  </button>
                )}
              </div>
            ) : (
              sortedVehicles.map((v) => {
                const lineInfo = linesMap.get(v.line_id);
                const fallback = getLineFallbackColor(v.line_id);
                const bgColor = lineInfo?.color || fallback.bg;
                const textColor = lineInfo?.text_color || fallback.text;
                const speed = typeof v.speed === 'number' ? Math.round(v.speed) : 0;
                const isSelected = v.id === selectedVehicleId;
                const delay = vehicleDelays?.get(v.id) ?? v.delayMinutes ?? null;
                const isDelayed = typeof delay === 'number' && delay > 5;
                const distanceM =
                  userLocation && v.lat && v.lon
                    ? getDistanceMeters(userLocation.lat, userLocation.lon, v.lat, v.lon)
                    : null;

                return (
                  <button
                    key={v.id}
                    onClick={() => onSelectVehicle(v)}
                    className={`w-full p-3 text-left transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-400/10 border-l-4 border-amber-400'
                        : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-7 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs relative"
                        style={{ backgroundColor: bgColor, color: textColor }}
                      >
                        {v.line_id}
                        {isDelayed && (
                          <span
                            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-600 rounded-full flex items-center justify-center text-[9px] text-white border border-white"
                            title={`Atraso: +${Math.round(delay)} min`}
                          >
                            !
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                          <span className="truncate">{lineInfo?.long_name || `Linha ${v.line_id}`}</span>
                          {isDelayed && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold font-mono shrink-0">
                              +{Math.round(delay)}m
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{formatStatusText(v.current_status)}</span>
                          <span>·</span>
                          <span>{formatTimeAgo(v.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-amber-400 tabular-nums">
                        {speed} <span className="text-[10px] text-slate-400 font-sans font-normal">km/h</span>
                      </div>
                      {distanceM !== null && (
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                          {distanceM < 1000 ? `${distanceM}m` : `${(distanceM / 1000).toFixed(1)}km`}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Bus Lines Directory */}
      {activeTab === 'lines' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-800">
            <input
              type="text"
              value={lineSearch}
              onChange={(e) => setLineSearch(e.target.value)}
              placeholder="Pesquisar número de linha ou destino..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {uniqueLines.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Layers className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>Nenhuma linha encontrada.</p>
              </div>
            ) : (
              uniqueLines.map((line) => {
                const lineId = line.short_name || line.id;
                const activeCount = busesPerLine.get(lineId) || 0;
                const isCurrentFilter = selectedLineFilter === lineId;

                const isLineActiveOnMap = activeLinesSet.has(lineId);

                return (
                  <div
                    key={line.id}
                    className={`w-full p-3 transition-colors flex items-center justify-between gap-3 ${
                      isCurrentFilter
                        ? 'bg-amber-400/10 border-l-4 border-amber-400'
                        : isLineActiveOnMap && !showAllVehicles
                        ? 'bg-amber-400/5'
                        : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <div
                      onClick={() => onSelectLine(lineId)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div
                        className="w-12 h-7 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
                        style={{
                          backgroundColor: line.color || '#FFC600',
                          color: line.text_color || '#18181B',
                        }}
                      >
                        {lineId}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {line.long_name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {activeCount > 0 ? (
                            <span className="text-emerald-400 font-medium">
                              {activeCount} {activeCount === 1 ? 'autocarro ativo' : 'autocarros ativos'}
                            </span>
                          ) : (
                            <span className="text-slate-500">Sem viaturas no mapa agora</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onToggleActiveLine && !showAllVehicles && (
                        <button
                          onClick={() => onToggleActiveLine(lineId)}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            isLineActiveOnMap
                              ? 'bg-amber-400 text-slate-950 shadow-xs'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                          title={isLineActiveOnMap ? 'Ocultar esta linha do mapa' : 'Ativar esta linha no mapa'}
                        >
                          {isLineActiveOnMap ? 'Ativa' : '+ Ativar'}
                        </button>
                      )}
                      <button
                        onClick={() => onSelectLine(lineId)}
                        className="p-1 hover:text-amber-400 text-slate-500 cursor-pointer"
                        title="Ver detalhe da linha"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Paragens & Horários */}
      {activeTab === 'stops' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Stops Search Box */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/60 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={stopSearch}
                onChange={(e) => setStopSearch(e.target.value)}
                placeholder="Pesquisar paragem (ex: Cacilhas, 010001)..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
              />
              {stopSearch && (
                <button
                  onClick={() => setStopSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                {userLocation && !stopSearch ? 'Paragens mais próximas de si' : `Encontradas ${filteredStops.length} paragens`}
              </span>
              <span className="font-mono text-[10px] text-amber-400/90 font-medium">
                {stopsMap?.size || 0} na rede
              </span>
            </div>
          </div>

          {/* Stops List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredStops.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <MapPin className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <span>Nenhuma paragem encontrada para "{stopSearch}".</span>
              </div>
            ) : (
              filteredStops.map((stop) => {
                const dist = 'dist' in stop && typeof (stop as any).dist === 'number' ? (stop as any).dist : null;

                return (
                  <div
                    key={stop.id}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-amber-400/50 hover:bg-slate-800/70 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-sky-500/30 group-hover:bg-amber-400 group-hover:text-slate-950 group-hover:border-amber-400 transition-colors">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate" title={stop.name}>
                          {stop.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-mono text-slate-400">#{stop.id}</span>
                          {dist !== null && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400 font-medium">
                                {dist < 1000 ? `${dist}m a pé` : `${(dist / 1000).toFixed(1)}km`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {onSelectStop && (
                      <button
                        onClick={() => onSelectStop(stop.id)}
                        className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs"
                        title="Ver chegadas em tempo real e horários"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Horários</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Fleet Network Stats */}
      {activeTab === 'stats' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Key Totals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <span className="text-xs text-slate-400">Frota Ativa na AML</span>
              <div className="text-2xl font-extrabold font-mono text-white mt-1 tabular-nums">
                {stats.total}
              </div>
              <span className="text-[10px] text-slate-500">veículos em circulação</span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <span className="text-xs text-slate-400">Velocidade Média</span>
              <div className="text-2xl font-extrabold font-mono text-amber-400 mt-1 tabular-nums">
                {stats.avgSpeed} <span className="text-xs font-normal text-slate-400">km/h</span>
              </div>
              <span className="text-[10px] text-slate-500">em andamento</span>
            </div>
          </div>

          {/* Activity State */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Em Marcha (&gt; 3 km/h)</span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                {stats.moving} ({Math.round((stats.moving / Math.max(1, stats.total)) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-700/40 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full"
                style={{ width: `${(stats.moving / Math.max(1, stats.total)) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-300">Parados / Em Paragem</span>
              <span className="font-mono font-bold text-amber-400 tabular-nums">
                {stats.stopped} ({Math.round((stats.stopped / Math.max(1, stats.total)) * 100)}%)
              </span>
            </div>
          </div>

          {/* Fleet Breakdown by Operational Area */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Distribuição por Área
            </h4>
            {(['1', '2', '3', '4'] as AreaFilter[]).map((areaId) => {
              const area = AREAS[areaId];
              const count = stats.areaCounts[areaId];
              const pct = Math.round((count / Math.max(1, stats.total)) * 100);

              return (
                <div key={areaId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{area.name}</span>
                    <span className="font-mono text-slate-300 font-bold tabular-nums">
                      {count} <span className="text-slate-500 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: area.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Lines */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Linhas com Mais Autocarros no Mapa
            </h4>
            <div className="space-y-2">
              {stats.topLines.map(({ lineId, count, line }) => (
                <button
                  key={lineId}
                  onClick={() => onSelectLine(lineId)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                      style={{
                        backgroundColor: line?.color || '#FFC600',
                        color: line?.text_color || '#18181B',
                      }}
                    >
                      {lineId}
                    </span>
                    <span className="text-xs text-slate-300 truncate">
                      {line?.long_name || `Linha ${lineId}`}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-amber-400 font-bold tabular-nums shrink-0 ml-2">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
