import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  CheckSquare,
  Globe2,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  List,
  MapPin,
  Clock,
} from 'lucide-react';
import { AreaFilter, MotionFilter, Line } from '../types';
import { AREAS, getLineFallbackColor } from '../services/api';

interface ControlOverlayProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedArea: AreaFilter;
  setSelectedArea: (area: AreaFilter) => void;
  selectedMotion: MotionFilter;
  setSelectedMotion: (motion: MotionFilter) => void;
  totalFilteredCount: number;
  totalCount: number;
  selectedLineFilter: string | null;
  setSelectedLineFilter: (line: string | null) => void;
  onResetFilters: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onQuickJump: (coords: [number, number], zoom: number) => void;
  activeLines: string[];
  onRemoveActiveLine: (lineId: string) => void;
  onOpenLineSelector: () => void;
  showAllVehicles: boolean;
  setShowAllVehicles: (show: boolean) => void;
  linesMap: Map<string, Line>;
  stopsMap?: Map<string, { id: string; name: string; lat: number; lon: number }>;
  onSelectStop?: (stopId: string) => void;
}

export const ControlOverlay: React.FC<ControlOverlayProps> = ({
  searchQuery,
  setSearchQuery,
  selectedArea,
  setSelectedArea,
  selectedMotion,
  setSelectedMotion,
  totalFilteredCount,
  totalCount,
  selectedLineFilter,
  setSelectedLineFilter,
  onResetFilters,
  isSidebarOpen,
  setIsSidebarOpen,
  activeLines,
  onRemoveActiveLine,
  onOpenLineSelector,
  showAllVehicles,
  setShowAllVehicles,
  linesMap,
  stopsMap,
  onSelectStop,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cm_control_expanded');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cm_control_expanded', String(next));
      } catch {}
      return next;
    });
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedArea !== 'all' ||
    selectedMotion !== 'all' ||
    selectedLineFilter !== null;

  // Search matching stops by name or ID
  const matchingStops = useMemo(() => {
    if (!stopsMap || searchQuery.trim().length < 2) return [];
    const query = searchQuery.trim().toLowerCase();
    const results: { id: string; name: string; lat: number; lon: number }[] = [];
    for (const stop of stopsMap.values()) {
      if (stop.id.toLowerCase().includes(query) || stop.name.toLowerCase().includes(query)) {
        results.push(stop);
        if (results.length >= 3) break;
      }
    }
    return results;
  }, [stopsMap, searchQuery]);

  return (
    <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-96 z-20 pointer-events-none flex flex-col gap-2">
      {/* Compact Main Control Card */}
      <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl shadow-black/50 overflow-hidden transition-all duration-200">
        {/* Compact Search & Action Bar */}
        <div className="p-2 sm:p-2.5 flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar carreira ou paragem..."
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-0.5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Line Picker Button */}
          <button
            onClick={onOpenLineSelector}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border ${
              !showAllVehicles && activeLines.length > 0
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Escolher carreiras ativas"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Linhas</span>
            {!showAllVehicles && activeLines.length > 0 && (
              <span className="px-1 py-0.2 rounded-md bg-slate-950/30 text-[10px] font-mono">
                {activeLines.length}
              </span>
            )}
          </button>

          {/* Filters Toggle Button */}
          <button
            onClick={toggleExpanded}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 border ${
              isExpanded || hasActiveFilters
                ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title={isExpanded ? 'Recolher filtros' : 'Mais filtros'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>

          {/* Sidebar List Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
              isSidebarOpen
                ? 'bg-amber-400 text-slate-950 border-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title={isSidebarOpen ? 'Ocultar lista' : 'Ver lista de autocarros'}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Matching Stops Autocomplete Dropdown */}
        {matchingStops.length > 0 && onSelectStop && (
          <div className="px-2.5 pb-2.5 pt-1.5 border-t border-slate-800/80 space-y-1.5 bg-slate-900/90">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block px-1">
              Paragens Encontradas ({matchingStops.length})
            </span>
            <div className="space-y-1">
              {matchingStops.map((stop) => (
                <button
                  key={stop.id}
                  onClick={() => {
                    onSelectStop(stop.id);
                    setSearchQuery('');
                  }}
                  className="w-full p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-left flex items-center justify-between text-xs transition-colors cursor-pointer group border border-slate-700/50 hover:border-amber-400/40"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 group-hover:text-amber-400 transition-colors" />
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{stop.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Paragem #{stop.id}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                    Ver Horários &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode & Network Filter Chip Bar */}
        {!searchQuery && !selectedLineFilter && (
          <div className="px-2.5 pb-2 cm-slider-track flex items-center justify-between gap-1.5 text-xs">
            <span className="text-[10px] text-slate-400 font-medium shrink-0">
              {showAllVehicles ? 'Toda a Rede Metropolitana' : 'Apenas Linhas Selecionadas'}
            </span>
            <button
              onClick={() => setShowAllVehicles(!showAllVehicles)}
              className={`px-2 py-0.5 rounded-lg text-xs font-medium border flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                showAllVehicles
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-400/20 border-amber-400/50 text-amber-300'
              }`}
              title="Alternar entre ver todos os autocarros ou apenas linhas escolhidas"
            >
              <span>{showAllVehicles ? '✓ Toda a Frota' : 'Personalizado'}</span>
            </button>
          </div>
        )}

        {/* Selected Line Filter Tag (if active) */}
        {selectedLineFilter && (
          <div className="mx-2 mb-2 flex items-center justify-between bg-amber-400/15 border border-amber-400/30 rounded-xl px-2.5 py-1 text-xs text-amber-300">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3 h-3" />
              Linha: <strong className="font-mono text-white">{selectedLineFilter}</strong>
            </span>
            <button
              onClick={() => setSelectedLineFilter(null)}
              className="text-amber-400 hover:text-white p-0.5 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Active Lines Chip Bar (Horizontal Scroll / Slider, compact) */}
        {!showAllVehicles && activeLines.length > 0 && !isExpanded && (
          <div className="px-2.5 pb-2 cm-slider-track flex items-center gap-1.5 text-xs">
            <span className="text-[10px] text-slate-400 font-medium shrink-0">Ativas:</span>
            {activeLines.map((lineId) => {
              const lineMeta = linesMap.get(lineId);
              const fallback = getLineFallbackColor(lineId);
              const bgColor = lineMeta?.color || fallback.bg;
              const textColor = lineMeta?.text_color || fallback.text;

              return (
                <span
                  key={lineId}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold font-mono shrink-0 shadow-xs"
                  style={{ backgroundColor: bgColor, color: textColor }}
                >
                  <span>{lineId}</span>
                  <button
                    onClick={() => onRemoveActiveLine(lineId)}
                    className="hover:opacity-75 cursor-pointer ml-0.5"
                    title={`Remover ${lineId}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Compact Expandable Filters Drawer */}
        {isExpanded && (
          <div className="p-3 border-t border-slate-800 space-y-3 bg-slate-950/60 max-h-[48vh] overflow-y-auto">
            {/* Mode: Minhas Linhas vs Todos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-medium">Modo de Exibição</span>
                <span className="font-mono text-amber-400">
                  {totalFilteredCount} {totalFilteredCount === 1 ? 'autocarro' : 'autocarros'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setShowAllVehicles(false)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !showAllVehicles
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Personalizado ({activeLines.length})</span>
                </button>
                <button
                  onClick={() => setShowAllVehicles(true)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    showAllVehicles
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe2 className="w-3.5 h-3.5" />
                  <span>Ver Todos ({totalCount})</span>
                </button>
              </div>
            </div>

            {/* Active Lines Chips (if customized mode) */}
            {!showAllVehicles && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Carreiras Ativas</span>
                  <button
                    onClick={onOpenLineSelector}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Gerir Linhas</span>
                  </button>
                </div>
                {activeLines.length === 0 ? (
                  <button
                    onClick={onOpenLineSelector}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-amber-400/40 bg-amber-400/5 hover:bg-amber-400/10 text-amber-300 text-xs font-medium text-center transition-colors cursor-pointer"
                  >
                    + Toque para escolher as linhas que pretende ver
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                    {activeLines.map((lineId) => {
                      const lineMeta = linesMap.get(lineId);
                      const fallback = getLineFallbackColor(lineId);
                      const bgColor = lineMeta?.color || fallback.bg;
                      const textColor = lineMeta?.text_color || fallback.text;

                      return (
                        <span
                          key={lineId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold font-mono shadow-xs"
                          style={{ backgroundColor: bgColor, color: textColor }}
                        >
                          <span>{lineId}</span>
                          <button
                            onClick={() => onRemoveActiveLine(lineId)}
                            className="hover:opacity-70 cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Area Filter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Área Operacional</span>
                {selectedArea !== 'all' && (
                  <button
                    onClick={() => setSelectedArea('all')}
                    className="text-amber-400 hover:underline text-[10px] cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="cm-slider-track sm:grid sm:grid-cols-5 gap-1 p-0.5 bg-slate-800/80 rounded-xl">
                {(['all', '1', '2', '3', '4'] as AreaFilter[]).map((areaId) => {
                  const isActive = selectedArea === areaId;
                  const area = AREAS[areaId];
                  return (
                    <button
                      key={areaId}
                      onClick={() => setSelectedArea(areaId)}
                      title={area.name}
                      className={`py-1 px-2.5 sm:px-1 text-xs font-medium rounded-lg transition-colors cursor-pointer text-center shrink-0 sm:shrink ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                      }`}
                    >
                      {areaId === 'all' ? 'Todas' : `Área ${areaId}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Motion Filter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Estado de Movimento</span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-800/80 rounded-xl text-xs">
                <button
                  onClick={() => setSelectedMotion('all')}
                  className={`py-1 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                    selectedMotion === 'all'
                      ? 'bg-slate-700 text-white shadow-xs font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setSelectedMotion('moving')}
                  className={`py-1 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                    selectedMotion === 'moving'
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Em marcha
                </button>
                <button
                  onClick={() => setSelectedMotion('stopped')}
                  className={`py-1 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                    selectedMotion === 'stopped'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Parados
                </button>
              </div>
            </div>

            {/* Footer with Reset & Done */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              {hasActiveFilters ? (
                <button
                  onClick={onResetFilters}
                  className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer font-medium text-[11px]"
                >
                  Limpar todos os filtros
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">Sem filtros adicionais</span>
              )}
              <button
                onClick={toggleExpanded}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Concluir ⌃
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
