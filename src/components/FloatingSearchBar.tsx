import React from 'react';
import { Menu, Search, Bell, Plus, X, Bus, Check, Layers, Train, Star, Ship, ArrowLeftRight } from 'lucide-react';
import { Line } from '../types';
import { getLineFallbackColor } from '../services/api';

interface FloatingSearchBarProps {
  onOpenMenu: () => void;
  onOpenSearch: (query?: string) => void;
  onOpenAlerts: () => void;
  onOpenFavorites?: () => void;
  onOpenBoat?: () => void;
  onOpenMST?: () => void;
  onOpenMetro?: () => void;
  alertsCount: number;
  pinnedAlertsCount: number;
  activeLines: string[];
  linesMap: Map<string, Line>;
  onRemoveLine: (lineId: string) => void;
  onAddLine: () => void;
  onOpenLineSelector?: (tab?: 'mobi' | 'cmet' | 'carris' | 'cp') => void;
  showAllVehicles: boolean;
  onToggleShowAll: () => void;
  totalBusesCount: number;
  filteredBusesCount: number;
  searchQuery?: string;
  onClearSearch?: () => void;
  currentDirectionLabel?: string | null;
  onOpenDirectionModal?: () => void;
}

export const FloatingSearchBar: React.FC<FloatingSearchBarProps> = ({
  onOpenMenu,
  onOpenSearch,
  onOpenAlerts,
  onOpenFavorites,
  onOpenBoat,
  onOpenMST,
  onOpenMetro,
  alertsCount,
  pinnedAlertsCount,
  activeLines,
  linesMap,
  onRemoveLine,
  onAddLine,
  onOpenLineSelector,
  showAllVehicles,
  onToggleShowAll,
  totalBusesCount,
  filteredBusesCount,
  searchQuery = '',
  onClearSearch,
  currentDirectionLabel,
  onOpenDirectionModal,
}) => {
  return (
    <div className="absolute top-3 left-0 right-0 z-30 px-3 sm:px-4 flex flex-col gap-2 max-w-xl mx-auto pointer-events-none">
      {/* Floating Google Maps-Style Search Capsule */}
      <div className="w-full bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full shadow-xl shadow-black/40 flex items-center px-2 py-1.5 gap-2 pointer-events-auto transition-all">
        {/* Hamburger Menu (Left) */}
        <button
          onClick={onOpenMenu}
          className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title="Abrir Menu Principal e Opções"
          aria-label="Abrir Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Central Search Button Trigger */}
        <button
          onClick={() => onOpenSearch()}
          className="flex-1 flex items-center gap-2.5 px-2 py-1.5 text-left text-xs sm:text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer min-w-0"
        >
          <Search className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate font-medium">
            {searchQuery ? (
              <span className="text-white font-semibold flex items-center gap-1.5">
                <span>Pesquisa:</span>
                <span className="text-amber-400">"{searchQuery}"</span>
              </span>
            ) : (
              'Pesquisar linhas ou paragens...'
            )}
          </span>
        </button>

        {/* Clear search icon if query exists */}
        {searchQuery && onClearSearch && (
          <button
            onClick={onClearSearch}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Limpar pesquisa"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Live buses badge indicator */}
        <div
          onClick={() => onOpenSearch()}
          className="hidden xs:flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-mono text-emerald-400 shrink-0 cursor-pointer"
          title={`${filteredBusesCount} de ${totalBusesCount} autocarros visíveis no mapa`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{filteredBusesCount}</span>
        </div>

        {/* Favoritos Button (Star) */}
        {onOpenFavorites && (
          <button
            onClick={onOpenFavorites}
            className="p-2 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 hover:text-white transition-all cursor-pointer shrink-0"
            title="Meus Transportes Favoritos"
            aria-label="Favoritos"
          >
            <Star className="w-4 h-4 fill-amber-400/30" />
          </button>
        )}

        {/* Bell / Service Alerts Icon (Right) */}
        <button
          onClick={onOpenAlerts}
          className={`p-2 rounded-full border transition-all cursor-pointer relative shrink-0 ${
            pinnedAlertsCount > 0
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30 ring-1 ring-rose-400/40'
              : alertsCount > 0
              ? 'bg-amber-400/15 text-amber-300 border-amber-400/30 hover:bg-amber-400/25'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={
            pinnedAlertsCount > 0
              ? `! ${pinnedAlertsCount} alertas a afetar as suas linhas favoritas`
              : alertsCount > 0
              ? `${alertsCount} avisos e alertas em circulação`
              : 'Nenhum alerta de circulação'
          }
          aria-label="Alertas de Serviço"
        >
          <Bell className="w-4 h-4" />
          {alertsCount > 0 && (
            <span
              className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold font-mono flex items-center justify-center leading-none ${
                pinnedAlertsCount > 0
                  ? 'bg-rose-600 text-white animate-bounce'
                  : 'bg-amber-400 text-slate-950'
              }`}
            >
              {pinnedAlertsCount > 0 ? `!${pinnedAlertsCount}` : alertsCount}
            </span>
          )}
        </button>
      </div>

      {/* Barra de Seleção de Empresas & Transportes (Totalmente visível, sólida e de alto contraste) */}
      <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-1.5 px-2 bg-slate-950/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl pointer-events-auto select-none scroll-smooth">
        {/* Toggle Chip: Sinal de Autocarros */}
        <button
          onClick={onToggleShowAll}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 border-2 shadow-md active:scale-95 transition-all cursor-pointer shrink-0 ${
            showAllVehicles
              ? 'bg-emerald-600 text-white border-emerald-300 hover:bg-emerald-500'
              : activeLines.length > 0
              ? 'bg-amber-500 text-slate-950 border-amber-300 hover:bg-amber-400'
              : 'bg-slate-900 text-slate-200 border-slate-600 hover:bg-slate-800 hover:border-slate-400'
          }`}
          title={
            showAllVehicles
              ? 'Sinal de toda a rede ligado'
              : activeLines.length > 0
              ? `Sinal ligado apenas para ${activeLines.length} carreiras selecionadas`
              : 'Sinal de autocarros desligado no servidor. Selecione uma carreira para ativar.'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              showAllVehicles
                ? 'bg-white animate-pulse'
                : activeLines.length > 0
                ? 'bg-slate-950 animate-pulse'
                : 'bg-slate-400'
            }`}
          />
          <span>
            {showAllVehicles
              ? 'Toda a Rede Ativa'
              : activeLines.length > 0
              ? `${activeLines.length} Linhas Ativas`
              : 'Sinal Desligado'}
          </span>
        </button>

        {/* Add Line button chip */}
        <button
          onClick={() => (onOpenLineSelector ? onOpenLineSelector() : onAddLine())}
          className="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 bg-slate-900 text-amber-300 border-2 border-amber-400 hover:bg-slate-800 hover:text-amber-200 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          title="Adicionar carreira aos filtros rápidos"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
          <span>+ Linha</span>
        </button>

        {/* Favoritos Chip */}
        {onOpenFavorites && (
          <button
            onClick={onOpenFavorites}
            className="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 bg-amber-400 text-slate-950 border-2 border-amber-300 hover:bg-amber-300 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
            title="Abrir os meus transportes favoritos"
          >
            <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            <span>Favoritos</span>
          </button>
        )}

        {/* 1. MobiCascais */}
        <button
          onClick={() => onOpenLineSelector?.('mobi')}
          className="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 bg-cyan-600 text-slate-950 border-2 border-cyan-300 hover:bg-cyan-500 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          title="Abrir carreiras MobiCascais (M01-M44)"
        >
          <span className="w-2 h-2 rounded-full bg-slate-950 shrink-0" />
          <span>MobiCascais</span>
        </button>

        {/* 2. Carris Metropolitana */}
        <button
          onClick={() => onOpenLineSelector?.('cmet')}
          className="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 bg-amber-500 text-slate-950 border-2 border-amber-300 hover:bg-amber-400 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          title="Abrir carreiras Carris Metropolitana (Áreas 1 a 4)"
        >
          <span className="w-2 h-2 rounded-full bg-slate-950 shrink-0" />
          <span>C. Metropolitana</span>
        </button>

        {/* 3. Carris Lisboa */}
        <button
          onClick={() => onOpenLineSelector?.('carris')}
          className="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 bg-yellow-500 text-slate-950 border-2 border-yellow-300 hover:bg-yellow-400 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          title="Abrir Carris Lisboa (753 e carreiras urbanas)"
        >
          <span className="w-2 h-2 rounded-full bg-slate-950 shrink-0" />
          <span>Carris Lisboa</span>
        </button>

        {/* 4. Comboios CP */}
        <button
          onClick={() => onOpenLineSelector?.('cp')}
          className="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 bg-emerald-600 text-white border-2 border-emerald-300 hover:bg-emerald-500 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          title="Abrir Comboios CP (Linha de Cascais, Sintra, Azambuja, Sado)"
        >
          <Train className="w-3.5 h-3.5 text-white" />
          <span>Comboios CP</span>
        </button>

        {/* 5. Metro de Lisboa */}
        <button
          onClick={() => (onOpenMetro ? onOpenMetro() : onOpenSearch?.('metro'))}
          className="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 bg-blue-600 text-white border-2 border-blue-300 hover:bg-blue-500 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          title="Abrir Metro de Lisboa (Linhas Azul, Amarela, Verde e Vermelha)"
        >
          <Train className="w-3.5 h-3.5 text-white" />
          <span>Metro Lisboa</span>
        </button>

        {/* 6. Fertagus */}
        <button
          onClick={() => onOpenSearch?.('fertagus')}
          className="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 bg-teal-600 text-white border-2 border-teal-300 hover:bg-teal-500 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          title="Abrir Comboios Fertagus (Roma-Areeiro a Setúbal via Ponte 25 de Abril)"
        >
          <Train className="w-3.5 h-3.5 text-white" />
          <span>Fertagus</span>
        </button>

        {/* 7. Barcos Transtejo / Soflusa */}
        <button
          onClick={() => (onOpenBoat ? onOpenBoat() : onOpenSearch?.('barco'))}
          className="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 bg-sky-600 text-white border-2 border-sky-300 hover:bg-sky-500 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          title="Barcos Transtejo & Soflusa (Cacilhas, Seixal, Barreiro, Montijo, Trafaria, Cais do Sodré)"
        >
          <Ship className="w-3.5 h-3.5 text-white" />
          <span>Barcos Tejo</span>
        </button>

        {/* 8. Metro Sul do Tejo (MST) */}
        <button
          onClick={() => (onOpenMST ? onOpenMST() : onOpenSearch?.('mst'))}
          className="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 bg-emerald-700 text-white border-2 border-emerald-400 hover:bg-emerald-600 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          title="Metro Sul do Tejo (Linhas 1, 2 e 3: Cacilhas, Corroios, Pragal, Universidade)"
        >
          <Train className="w-3.5 h-3.5 text-white" />
          <span>Metro Sul Tejo</span>
        </button>

        {/* Active Line Chips (e.g., "753 ✕") */}
        {activeLines.map((lineId) => {
          const lineInfo = linesMap.get(lineId);
          const fallback = getLineFallbackColor(lineId);
          const bg = lineInfo?.color || fallback.bg;
          const text = lineInfo?.text_color || fallback.text;

          return (
            <div
              key={lineId}
              className="inline-flex items-center rounded-full shadow-lg text-xs font-mono font-black border-2 border-white/60 overflow-hidden shrink-0 group transition-transform hover:scale-105"
              style={{ backgroundColor: bg, color: text }}
            >
              <span className="px-2.5 py-1">{lineId}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveLine(lineId);
                }}
                className="px-1.5 py-1 hover:bg-black/30 active:bg-black/50 transition-colors cursor-pointer border-l border-black/20 flex items-center justify-center"
                title={`Remover linha ${lineId}`}
                aria-label={`Remover ${lineId}`}
              >
                <X className="w-3.5 h-3.5 opacity-90 group-hover:opacity-100" />
              </button>
            </div>
          );
        })}

        {/* Sentido Ativo Pill / Switcher */}
        {currentDirectionLabel && onOpenDirectionModal && (
          <button
            onClick={onOpenDirectionModal}
            className="px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap flex items-center gap-1.5 bg-amber-400 text-slate-950 border-2 border-amber-300 hover:bg-amber-300 shadow-xl active:scale-95 transition-all cursor-pointer shrink-0 animate-pulse-subtle"
            title="Clique para alternar o sentido do trajeto"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="max-w-[200px] truncate">Sentido: {currentDirectionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
