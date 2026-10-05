import React from 'react';
import { Navigation, Layers, RefreshCw } from 'lucide-react';

interface FloatingActionButtonsProps {
  onLocateUser: () => void;
  isLocating: boolean;
  isLiveTracking?: boolean;
  followUser?: boolean;
  onOpenLayers: () => void;
  onManualRefresh: () => void;
  isRefreshing: boolean;
  secondsUntilRefresh: number;
  baseRefreshInterval?: number;
  onCycleRefreshInterval?: () => void;
}

export const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({
  onLocateUser,
  isLocating,
  isLiveTracking = false,
  followUser = false,
  onOpenLayers,
  onManualRefresh,
  isRefreshing,
  secondsUntilRefresh,
  baseRefreshInterval = 3,
  onCycleRefreshInterval,
}) => {
  const isInstant = baseRefreshInterval > 0 && baseRefreshInterval <= 3;
  const isSpaced = baseRefreshInterval >= 15;
  const isManual = baseRefreshInterval === 0;

  return (
    <div className="absolute bottom-20 right-3.5 sm:right-4 z-30 flex flex-col items-center gap-2.5 pointer-events-auto select-none">
      {/* FAB 1: Camadas & Estilo do Mapa */}
      <button
        onClick={onOpenLayers}
        className="w-11 h-11 rounded-full bg-slate-900/95 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-xl shadow-black/50 backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Camadas do Mapa (Paragens, Traçados, Tráfego)"
        aria-label="Camadas do Mapa"
      >
        <Layers className="w-5 h-5 text-amber-400" />
      </button>

      {/* FAB 2: Centrar no GPS / Seguir GPS em Direto */}
      <div className="relative flex flex-col items-center">
        <button
          onClick={onLocateUser}
          disabled={isLocating}
          className={`w-11 h-11 rounded-full border shadow-xl shadow-black/50 backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ${
            isLocating
              ? 'bg-amber-400/25 border-amber-400 text-amber-300'
              : isLiveTracking && followUser
              ? 'bg-sky-500 hover:bg-sky-400 text-white border-sky-300 ring-2 ring-sky-400/50 shadow-sky-500/40'
              : isLiveTracking
              ? 'bg-slate-900/95 hover:bg-slate-800 text-sky-400 border-sky-400/80 shadow-sky-500/20'
              : 'bg-slate-900/95 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-700/80'
          }`}
          title={
            isLiveTracking && followUser
              ? 'Seguir GPS em direto ativo (Clique para pausar)'
              : isLiveTracking
              ? 'GPS em direto (Pausado ao arrastar - clique para centrar e seguir)'
              : 'Centrar GPS e Iniciar Modo Seguir em Direto'
          }
          aria-label="Centrar GPS"
        >
          <Navigation
            className={`w-5 h-5 ${
              isLocating
                ? 'animate-spin text-amber-300'
                : isLiveTracking && followUser
                ? 'text-white'
                : 'text-sky-400'
            }`}
          />
        </button>

        {isLiveTracking && (
          <span
            className={`-mt-1 px-1.5 py-0.2 rounded-full text-[7.5px] font-mono font-bold tracking-tight uppercase border shadow-md transition-transform z-10 ${
              followUser
                ? 'bg-sky-400 text-slate-950 border-sky-300 animate-pulse'
                : 'bg-slate-800 text-sky-300 border-sky-500/50'
            }`}
          >
            {followUser ? 'Seguir' : 'GPS'}
          </span>
        )}
      </div>

      {/* FAB 3: Atualizar Agora com Contador Decrescente & Indicador de Frequência */}
      <div className="relative flex flex-col items-center">
        <button
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className="w-11 h-11 rounded-full bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-xl shadow-black/50 backdrop-blur-md flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer relative"
          title={`Atualizar agora (${isInstant ? 'Ao momento: 2s' : isSpaced ? `Espaçado: ${baseRefreshInterval}s` : `${baseRefreshInterval}s`})`}
          aria-label="Atualizar posições"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-[9px] font-mono text-slate-300 font-bold leading-none mt-0.5">
            {isManual ? '⏸' : `${secondsUntilRefresh}s`}
          </span>
        </button>

        {/* Mini Pill de alternância rápida de frequência: Ao Momento vs Espaçado */}
        {onCycleRefreshInterval && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCycleRefreshInterval();
            }}
            className={`-mt-1 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold tracking-tight uppercase border shadow-md transition-transform hover:scale-105 cursor-pointer z-10 ${
              isInstant
                ? 'bg-amber-400 text-slate-950 border-amber-400'
                : isSpaced
                ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Clique para alternar frequência: Ao momento (2s) / Rápido (5s) / Espaçado (15s)"
          >
            {isInstant ? '⚡ 2s' : isSpaced ? `🔋 ${baseRefreshInterval}s` : `⏱ ${baseRefreshInterval}s`}
          </button>
        )}
      </div>
    </div>
  );
};
