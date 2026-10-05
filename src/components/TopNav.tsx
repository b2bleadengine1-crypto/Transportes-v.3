import React, { useState, useRef, useEffect } from 'react';
import {
  RefreshCw,
  Map as MapIcon,
  Layers,
  BarChart3,
  HelpCircle,
  Navigation,
  Key,
  CheckSquare,
  Plus,
  Menu,
  ChevronDown,
  X,
  Settings,
  Zap,
  MapPin,
  Bell,
  Bus,
  Route,
  Flame,
  Check,
  ToggleLeft,
  ToggleRight,
  Filter,
  Train,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';
import { MapTileStyle, MapLayersConfig } from '../types';
import { ResponsiveOverflowContainer } from './ResponsiveOverflowContainer';

interface TopNavProps {
  totalBuses: number;
  filteredBusesCount: number;
  isRefreshing: boolean;
  secondsUntilRefresh: number;
  onManualRefresh: () => void;
  activeView: 'map' | 'lines' | 'stats' | 'about';
  setActiveView: (view: 'map' | 'lines' | 'stats' | 'about') => void;
  tileStyle: MapTileStyle;
  setTileStyle: (style: MapTileStyle) => void;
  onLocateUser: () => void;
  isLocating: boolean;
  cartoApiKey: string;
  onOpenCartoModal?: () => void;
  onOpenSettingsModal: (tab?: 'refresh' | 'carto' | 'cards' | 'offline') => void;
  onOpenLineSelector: (tab?: 'mobi' | 'cmet' | 'carris' | 'cp') => void;
  onOpenLayerControl?: () => void;
  onOpenStops?: () => void;
  activeLinesCount: number;
  showAllVehicles: boolean;
  setShowAllVehicles?: (showAll: boolean) => void;
  mapLayers?: MapLayersConfig;
  onToggleLayer?: (layerKey: keyof MapLayersConfig) => void;
  stopsCount?: number;
  smartRefreshEnabled?: boolean;
  isUserInactive?: boolean;
  alertsCount?: number;
  pinnedAlertsCount?: number;
  onOpenAlerts?: () => void;
  isCpUnlocked?: boolean;
  onToggleCpUnlocked?: (unlocked?: boolean) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  totalBuses,
  filteredBusesCount,
  isRefreshing,
  secondsUntilRefresh,
  onManualRefresh,
  activeView,
  setActiveView,
  tileStyle,
  setTileStyle,
  onLocateUser,
  isLocating,
  cartoApiKey,
  onOpenCartoModal,
  onOpenSettingsModal,
  onOpenLineSelector,
  onOpenLayerControl,
  onOpenStops,
  activeLinesCount,
  showAllVehicles,
  setShowAllVehicles,
  mapLayers,
  onToggleLayer,
  stopsCount = 0,
  smartRefreshEnabled = true,
  isUserInactive = false,
  alertsCount = 0,
  pinnedAlertsCount = 0,
  onOpenAlerts,
  isCpUnlocked = false,
  onToggleCpUnlocked,
}) => {
  const [isMiddleNavOpen, setIsMiddleNavOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMiddleNavOpen(false);
      }
    }
    if (isMiddleNavOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMiddleNavOpen]);

  const areBusesVisible = mapLayers?.showBuses !== false;
  const areStopsVisible = !!mapLayers?.showStops;
  const areRoutesVisible = !!mapLayers?.showRouteLines;
  const isTrafficVisible = !!mapLayers?.showTrafficHeatmap;

  return (
    <header className="relative z-30 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white select-none">
      <ResponsiveOverflowContainer
        className="w-full"
        contentClassName="flex items-center justify-between px-3 sm:px-6 py-2 gap-2 sm:gap-4 min-w-max sm:min-w-0"
        scrollStep={220}
        dragToScroll
        showArrows
        showIndicator
        forceScrollBelowWidth={820}
        ariaLabel="Barra de navegação e controlos principais"
      >
        {/* Zone 1: Wordmark & Active Filter Pill */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setActiveView('map')}
            className="text-left group cursor-pointer focus:outline-none shrink-0"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-md shadow-amber-400/20 shrink-0">
                GT
              </div>
              <span className="text-sm sm:text-base font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors whitespace-nowrap">
                Guia de transportes <span className="hidden xs:inline">Públicos</span>
              </span>
            </div>
          </button>

          {/* Active Lines Status Button */}
          <button
            onClick={() => onOpenLineSelector()}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium border transition-all cursor-pointer shrink-0 ${
              !showAllVehicles && activeLinesCount > 0
                ? 'bg-amber-400/15 border-amber-400/40 text-amber-300 hover:bg-amber-400/25'
                : !showAllVehicles
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
            }`}
            title="Clique para escolher quais linhas ou autocarros ver no mapa"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="font-mono tabular-nums font-bold text-xs">
              {filteredBusesCount}
            </span>
            <span className="hidden md:inline text-slate-400 whitespace-nowrap">
              {showAllVehicles
                ? 'autocarros (todos)'
                : activeLinesCount === 0
                ? 'autocarros'
                : `autocarros (${activeLinesCount} ${activeLinesCount === 1 ? 'linha' : 'linhas'})`}
            </span>
            <Plus className="w-3 h-3 text-amber-400 shrink-0" />
          </button>
        </div>

        {/* Zone 2: Master Control Hub (Menu Dropdown com Interruptores Ativos) */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setIsMiddleNavOpen(!isMiddleNavOpen)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isMiddleNavOpen
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20 font-bold'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80'
            }`}
            title="Abrir painel de controlo com opções e interruptores do mapa"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Menu & Opções</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-950/40 text-slate-300 font-mono hidden sm:inline">
              {activeView === 'map' ? 'Mapa' : activeView === 'lines' ? 'Linhas' : activeView === 'stats' ? 'Estatísticas' : 'Sobre'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMiddleNavOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Master Control Dropdown Menu */}
          {isMiddleNavOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 sm:w-92 max-h-[85vh] overflow-y-auto bg-slate-900/98 border border-slate-700/90 rounded-2xl shadow-2xl p-3 z-50 text-xs flex flex-col gap-3 animate-fade-in backdrop-blur-xl">
              {/* Header com resumo da rede */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Centro de Controlo & Opções</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {totalBuses} viaturas em direto (Carris & C. Metrop.)
                  </div>
                </div>
                <button
                  onClick={() => setIsMiddleNavOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SEÇÃO 1: INTERRUPTORES DO MAPA (TOGGLES ON / OFF) */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5 flex items-center justify-between">
                  <span>Camadas & Visibilidade</span>
                  <span className="text-[9px] text-amber-400 font-normal">Ligar / Desligar</span>
                </div>

                <div className="space-y-1.5">
                  {/* Toggle 1: Autocarros */}
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/70 flex items-center justify-between gap-2 hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg ${areBusesVisible ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-700 text-slate-400'}`}>
                        <Bus className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white flex items-center gap-1">
                          <span>Autocarros no Mapa</span>
                          <span className="text-[10px] font-mono text-emerald-400 font-normal">({filteredBusesCount})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {areBusesVisible
                            ? showAllVehicles
                              ? 'Toda a frota metropolitana ativa'
                              : `${activeLinesCount} linhas selecionadas`
                            : 'Ocultos no mapa'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {setShowAllVehicles && areBusesVisible && (
                        <button
                          onClick={() => setShowAllVehicles(!showAllVehicles)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer ${
                            showAllVehicles
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                          }`}
                          title="Alternar entre ver todos ou apenas linhas favoritas"
                        >
                          {showAllVehicles ? 'Toda a Rede' : 'Favoritas'}
                        </button>
                      )}
                      {onToggleLayer && (
                        <button
                          onClick={() => onToggleLayer('showBuses')}
                          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                            areBusesVisible ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                          title={areBusesVisible ? 'Desativar autocarros' : 'Ativar autocarros'}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                              areBusesVisible ? 'left-4.5' : 'left-1'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Toggle 2: Paragens de Autocarro */}
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/70 flex items-center justify-between gap-2 hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg ${areStopsVisible ? 'bg-sky-400 text-slate-950 font-bold' : 'bg-slate-700 text-slate-400'}`}>
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white flex items-center gap-1">
                          <span>Paragens & Postes</span>
                          {stopsCount > 0 && (
                            <span className="text-[10px] font-mono text-sky-400 font-normal">({stopsCount})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {areStopsVisible ? 'Agrupamento dinâmico inteligente ativo' : 'Desativadas no mapa'}
                        </div>
                      </div>
                    </div>

                    {onToggleLayer && (
                      <button
                        onClick={() => onToggleLayer('showStops')}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                          areStopsVisible ? 'bg-sky-500' : 'bg-slate-700'
                        }`}
                        title={areStopsVisible ? 'Ocultar paragens' : 'Mostrar paragens'}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                            areStopsVisible ? 'left-4.5' : 'left-1'
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Toggle 3: Traçados das Linhas */}
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/70 flex items-center justify-between gap-2 hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg ${areRoutesVisible ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-700 text-slate-400'}`}>
                        <Route className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white">Traçados de Rota</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {areRoutesVisible ? 'Desenho das vias reservadas e ruas' : 'Desativados'}
                        </div>
                      </div>
                    </div>

                    {onToggleLayer && (
                      <button
                        onClick={() => onToggleLayer('showRouteLines')}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                          areRoutesVisible ? 'bg-amber-400' : 'bg-slate-700'
                        }`}
                        title={areRoutesVisible ? 'Ocultar traçados' : 'Mostrar traçados'}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                            areRoutesVisible ? 'left-4.5' : 'left-1'
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Toggle 4: Mapa de Tráfego / Congestionamento */}
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/70 flex items-center justify-between gap-2 hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg ${isTrafficVisible ? 'bg-rose-500 text-white font-bold' : 'bg-slate-700 text-slate-400'}`}>
                        <Flame className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white">Tráfego & Velocidade</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {isTrafficVisible ? 'Manchas de fluidez e filas em direto' : 'Desativado'}
                        </div>
                      </div>
                    </div>

                    {onToggleLayer && (
                      <button
                        onClick={() => onToggleLayer('showTrafficHeatmap')}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                          isTrafficVisible ? 'bg-rose-500' : 'bg-slate-700'
                        }`}
                        title={isTrafficVisible ? 'Ocultar tráfego' : 'Mostrar tráfego'}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                            isTrafficVisible ? 'left-4.5' : 'left-1'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: OPERADORES DE TRANSPORTE (SEPARAÇÃO DIRETA NO HAMBÚRGUER) */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5 flex items-center justify-between">
                  <span>Operadores & Redes de Transporte</span>
                  <span className="text-[9px] text-cyan-400 font-normal">Separados p/ fácil seleção</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {/* Operador 1: MobiCascais */}
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-cyan-500/40 flex flex-col justify-between gap-1.5 hover:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
                        <span className="font-bold text-white text-[11px]">MobiCascais</span>
                      </div>
                      {onToggleLayer && (
                        <button
                          onClick={() => onToggleLayer('showMobiCascais')}
                          className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                            mapLayers?.showMobiCascais !== false ? 'bg-cyan-500' : 'bg-slate-700'
                          }`}
                          title="Ligar/Desligar MobiCascais"
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                              mapLayers?.showMobiCascais !== false ? 'left-3.5' : 'left-1'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-mono">M01 a M44</span>
                      <button
                        onClick={() => {
                          onOpenLineSelector('mobi');
                          setIsMiddleNavOpen(false);
                        }}
                        className="text-cyan-300 font-bold hover:underline cursor-pointer"
                      >
                        Escolher &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Operador 2: Carris Metropolitana */}
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-amber-400/40 flex flex-col justify-between gap-1.5 hover:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                        <span className="font-bold text-white text-[11px]">C. Metropolitana</span>
                      </div>
                      <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 font-mono">Áreas 1-4</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-mono">Intermunicipal</span>
                      <button
                        onClick={() => {
                          onOpenLineSelector('cmet');
                          setIsMiddleNavOpen(false);
                        }}
                        className="text-amber-300 font-bold hover:underline cursor-pointer"
                      >
                        Escolher &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Operador 3: Carris Lisboa */}
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-amber-500/40 flex flex-col justify-between gap-1.5 hover:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                        <span className="font-bold text-white text-[11px]">Carris Lisboa</span>
                      </div>
                      <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-mono">753</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-mono">Urbano Lisboa</span>
                      <button
                        onClick={() => {
                          onOpenLineSelector('carris');
                          setIsMiddleNavOpen(false);
                        }}
                        className="text-amber-400 font-bold hover:underline cursor-pointer"
                      >
                        Escolher &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Operador 4: Comboios CP */}
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-emerald-500/40 flex flex-col justify-between gap-1.5 hover:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                        <span className="font-bold text-white text-[11px]">Comboios CP</span>
                      </div>
                      {onToggleCpUnlocked && (
                        <button
                          onClick={() => onToggleCpUnlocked(!isCpUnlocked)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-colors cursor-pointer flex items-center gap-0.5 ${
                            isCpUnlocked
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                              : 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                          }`}
                          title={isCpUnlocked ? 'Bloquear no servidor' : 'Desbloquear a pedido'}
                        >
                          {!isCpUnlocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                          <span>{isCpUnlocked ? 'Ativo' : 'Bloqueado'}</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-mono">Cascais · Sintra...</span>
                      <button
                        onClick={() => {
                          onOpenLineSelector('cp');
                          setIsMiddleNavOpen(false);
                        }}
                        className="text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        Linhas &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Operador 5: Metro de Lisboa */}
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between gap-1.5 hover:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <span className="font-bold text-white text-[11px]">Metro Lisboa</span>
                      </div>
                      {onToggleLayer && (
                        <button
                          onClick={() => onToggleLayer('showMetro')}
                          className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                            mapLayers?.showMetro !== false ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                          title="Ligar/Desligar Metro"
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                              mapLayers?.showMetro !== false ? 'left-3.5' : 'left-1'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">56 estações · 4 linhas</div>
                  </div>

                  {/* Operador 6: Fertagus */}
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-sky-500/40 flex flex-col justify-between gap-1.5 hover:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-sky-500"></div>
                        <span className="font-bold text-white text-[11px]">Fertagus</span>
                      </div>
                      {onToggleLayer && (
                        <button
                          onClick={() => onToggleLayer('showFertagus')}
                          className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                            mapLayers?.showFertagus !== false ? 'bg-sky-500' : 'bg-slate-700'
                          }`}
                          title="Ligar/Desligar Fertagus"
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                              mapLayers?.showFertagus !== false ? 'left-3.5' : 'left-1'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">Ponte 25 de Abril</div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: ESTILO DE MAPA (TILES) */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                  Estilo de Mapa
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'carto-dark' as MapTileStyle, label: 'Escuro' },
                    { id: 'carto-light' as MapTileStyle, label: 'Claro' },
                    { id: 'carto-voyager' as MapTileStyle, label: 'Voyager' },
                    { id: 'satellite' as MapTileStyle, label: 'Satélite' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setTileStyle(style.id)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                        tileStyle === style.id
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-400 shadow-xs'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEÇÃO 3: NAVEGAÇÃO & VISTAS */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                  Vistas da Aplicação
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setActiveView('map');
                      setIsMiddleNavOpen(false);
                    }}
                    className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                      activeView === 'map'
                        ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-800/70 border-slate-700/70 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <MapIcon className="w-4 h-4 shrink-0" />
                    <span className="truncate">Mapa ao Vivo</span>
                  </button>

                  {onOpenStops && (
                    <button
                      onClick={() => {
                        onOpenStops();
                        setIsMiddleNavOpen(false);
                      }}
                      className="p-2 rounded-xl border border-slate-700/70 bg-slate-800/70 hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition-all cursor-pointer text-left"
                    >
                      <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="truncate">Paragens & Partidas</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveView('lines');
                      setIsMiddleNavOpen(false);
                    }}
                    className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                      activeView === 'lines'
                        ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-800/70 border-slate-700/70 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Layers className="w-4 h-4 shrink-0" />
                    <span className="truncate">Lista de Linhas</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('stats');
                      setIsMiddleNavOpen(false);
                    }}
                    className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                      activeView === 'stats'
                        ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-800/70 border-slate-700/70 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Estatísticas</span>
                  </button>
                </div>
              </div>

              {/* SEÇÃO 4: AÇÕES RÁPIDAS & DEFINIÇÕES */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1 text-[11px]">
                <button
                  onClick={() => {
                    onLocateUser();
                    setIsMiddleNavOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  title="Centrar mapa na minha localização GPS"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  <span>Onde estou</span>
                </button>

                {onOpenAlerts && (
                  <button
                    onClick={() => {
                      onOpenAlerts();
                      setIsMiddleNavOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <span>Alertas ({alertsCount})</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onOpenSettingsModal('refresh');
                    setIsMiddleNavOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  title="Configurar cadência de atualização e chaves"
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Definições</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Visual Notification System for Service Alerts */}
          <button
            onClick={onOpenAlerts}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              pinnedAlertsCount > 0
                ? 'bg-rose-500/25 border-rose-500/60 text-rose-200 hover:bg-rose-500/35 ring-1 ring-rose-400/50 shadow-md shadow-rose-950/50'
                : alertsCount > 0
                ? 'bg-amber-400/15 border-amber-400/40 text-amber-300 hover:bg-amber-400/25'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={
              pinnedAlertsCount > 0
                ? `${pinnedAlertsCount} alerta(s) nas suas linhas ativas! Clique para abrir.`
                : `${alertsCount} alerta(s) de serviço na rede Carris Metropolitana. Clique para abrir.`
            }
          >
            <div className="relative flex items-center justify-center">
              <Bell className={`w-3.5 h-3.5 ${pinnedAlertsCount > 0 ? 'text-rose-400 animate-bounce' : alertsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
              {pinnedAlertsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900 animate-ping"></span>
              )}
            </div>
            <span className="hidden sm:inline">Alertas</span>
            {alertsCount > 0 && (
              <span
                className={`font-mono font-bold text-[10px] px-1.5 py-0.2 rounded-full leading-tight ${
                  pinnedAlertsCount > 0
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-400 text-slate-950'
                }`}
              >
                {pinnedAlertsCount > 0 ? `! ${pinnedAlertsCount}` : alertsCount}
              </span>
            )}
          </button>

          {/* Settings & Smart Refresh Button */}
          <button
            onClick={() => onOpenSettingsModal('refresh')}
            title={
              smartRefreshEnabled && isUserInactive
                ? 'Definições: Modo Económico Smart Refresh ativo (30s)'
                : 'Definições da Aplicação e Atualização Inteligente'
            }
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 ${
              smartRefreshEnabled && isUserInactive
                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                : 'border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${smartRefreshEnabled && isUserInactive ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">Definições</span>
            {smartRefreshEnabled && isUserInactive ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Poupança ativa"></span>
            ) : cartoApiKey ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            ) : null}
          </button>

          {/* Locate user button */}
          <button
            onClick={onLocateUser}
            disabled={isLocating}
            title="Centrar na minha localização (GPS)"
            className={`p-1.5 sm:p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isLocating
                ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">Onde estou</span>
          </button>

          {/* Map tile switcher */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5 text-xs shrink-0">
            <button
              onClick={() => setTileStyle('carto-dark')}
              title="CARTO Dark Matter (Escuro)"
              className={`px-1.5 sm:px-2 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                tileStyle === 'carto-dark' ? 'bg-slate-700 text-amber-400 font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Escuro
            </button>
            <button
              onClick={() => setTileStyle('carto-light')}
              title="CARTO Positron (Claro)"
              className={`px-1.5 sm:px-2 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                tileStyle === 'carto-light' ? 'bg-slate-700 text-amber-400 font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Claro
            </button>
            <button
              onClick={() => setTileStyle('carto-voyager')}
              title="CARTO Voyager (Detalhado)"
              className={`hidden md:inline-block px-2 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                tileStyle === 'carto-voyager' ? 'bg-slate-700 text-amber-400 font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Voyager
            </button>
            <button
              onClick={() => setTileStyle('osm')}
              title="OpenStreetMap Padrão"
              className={`px-1.5 sm:px-2 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                tileStyle === 'osm' ? 'bg-slate-700 text-amber-400 font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              OSM
            </button>
          </div>

          {/* Refresh button with countdown */}
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className={`px-2 sm:px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              smartRefreshEnabled && isUserInactive
                ? 'bg-slate-900 border-emerald-500/50 text-emerald-300 hover:bg-slate-800'
                : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title={
              smartRefreshEnabled && isUserInactive
                ? `Smart Refresh ativo (Modo Económico 30s por inatividade > 5 min). Próxima atualização em ${secondsUntilRefresh}s.`
                : `Atualizar posições de veículos agora (${secondsUntilRefresh}s restantes)`
            }
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing
                  ? 'animate-spin text-amber-400'
                  : smartRefreshEnabled && isUserInactive
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            />
            {smartRefreshEnabled && isUserInactive ? (
              <span className="font-mono tabular-nums text-emerald-400 flex items-center gap-0.5 font-bold">
                <span className="text-[10px]">🔋</span>
                <span>{secondsUntilRefresh}s</span>
              </span>
            ) : (
              <span className="font-mono tabular-nums text-slate-300">
                {secondsUntilRefresh}s
              </span>
            )}
          </button>
        </div>
      </ResponsiveOverflowContainer>
    </header>
  );
};
