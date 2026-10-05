import React, { useEffect, useState } from 'react';
import { Menu, X, Search, Star, Bell, Navigation, RefreshCw, Layers, SlidersHorizontal } from 'lucide-react';

interface BubbleMenuProps {
  onSearch: () => void;
  onFavorites: () => void;
  onAlerts: () => void;
  alertsCount: number;
  onLocate: () => void;
  isLocating: boolean;
  isLiveTracking: boolean;
  followUser: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onLayers: () => void;
  onMore: () => void;
}

interface BubbleAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  circleClass: string;
  onSelect: () => void;
  badge?: number;
}

/**
 * Menu flutuante (speed dial) no canto inferior direito.
 * Substitui a barra de pesquisa do topo e os botões flutuantes antigos:
 * com o menu fechado, o ecrã mostra apenas o mapa.
 */
export const BubbleMenu: React.FC<BubbleMenuProps> = ({
  onSearch,
  onFavorites,
  onAlerts,
  alertsCount,
  onLocate,
  isLocating,
  isLiveTracking,
  followUser,
  onRefresh,
  isRefreshing,
  onLayers,
  onMore,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const gpsLabel = isLocating
    ? 'A procurar a sua posição…'
    : isLiveTracking && followUser
    ? 'Parar de seguir'
    : isLiveTracking
    ? 'Voltar à minha posição'
    : 'Onde estou';

  const gpsCircle =
    isLiveTracking && followUser
      ? 'bg-sky-500 text-white border-sky-300'
      : 'bg-emerald-500 text-slate-950 border-emerald-300';

  // Ordem de cima para baixo: o mais usado fica junto ao polegar (em baixo).
  const actions: BubbleAction[] = [
    {
      key: 'more',
      label: 'Escolher linhas e definições',
      icon: <SlidersHorizontal className="w-6 h-6 stroke-[2.5]" />,
      circleClass: 'bg-slate-800 text-white border-slate-500',
      onSelect: onMore,
    },
    {
      key: 'layers',
      label: 'Camadas do mapa',
      icon: <Layers className="w-6 h-6 stroke-[2.5]" />,
      circleClass: 'bg-slate-800 text-amber-400 border-slate-500',
      onSelect: onLayers,
    },
    {
      key: 'alerts',
      label: 'Alertas de serviço',
      icon: <Bell className="w-6 h-6 stroke-[2.5]" />,
      circleClass: 'bg-slate-800 text-white border-slate-500',
      onSelect: onAlerts,
      badge: alertsCount,
    },
    {
      key: 'favorites',
      label: 'Favoritos',
      icon: <Star className="w-6 h-6 fill-slate-950 stroke-[2.5]" />,
      circleClass: 'bg-amber-400 text-slate-950 border-amber-300',
      onSelect: onFavorites,
    },
    {
      key: 'refresh',
      label: isRefreshing ? 'A atualizar…' : 'Atualizar agora',
      icon: <RefreshCw className={`w-6 h-6 stroke-[2.5] ${isRefreshing ? 'motion-safe:animate-spin' : ''}`} />,
      circleClass: 'bg-slate-800 text-amber-400 border-slate-500',
      onSelect: onRefresh,
    },
    {
      key: 'gps',
      label: gpsLabel,
      icon: <Navigation className="w-6 h-6 stroke-[2.5]" />,
      circleClass: gpsCircle,
      onSelect: onLocate,
    },
    {
      key: 'search',
      label: 'Pesquisar linha ou paragem',
      icon: <Search className="w-6 h-6 stroke-[2.5]" />,
      circleClass: 'bg-amber-400 text-slate-950 border-amber-300',
      onSelect: onSearch,
    },
  ];

  const select = (action: BubbleAction) => {
    setIsOpen(false);
    action.onSelect();
  };

  return (
    <>
      {/* Fundo escurecido: toque fora para fechar */}
      <div
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] motion-safe:transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <div
        className="fixed right-4 z-40 flex flex-col items-end select-none"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <ul
          id="bubble-menu-actions"
          aria-label="Ações do mapa"
          className={`flex flex-col items-end gap-3 mb-4 motion-safe:transition-all duration-200 ease-out ${
            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        >
          {actions.map((action) => (
            <li key={action.key}>
              <button
                type="button"
                tabIndex={isOpen ? 0 : -1}
                onClick={() => select(action)}
                disabled={action.key === 'gps' && isLocating}
                className="group flex items-center gap-3 cursor-pointer rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/60 disabled:opacity-70"
              >
                <span className="px-4 py-2 bg-slate-900 border-2 border-slate-600 text-white font-bold text-base rounded-2xl shadow-2xl whitespace-nowrap group-hover:border-amber-400 group-active:border-amber-400">
                  {action.label}
                </span>
                <span
                  className={`relative w-14 h-14 rounded-full border-2 shadow-2xl flex items-center justify-center group-active:scale-90 motion-safe:transition-transform ${action.circleClass}`}
                >
                  {action.icon}
                  {action.badge ? (
                    <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center border-2 border-slate-950">
                      {action.badge > 99 ? '99+' : action.badge}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Botão principal (64px) */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-controls="bubble-menu-actions"
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
          className="relative w-16 h-16 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 border-4 border-amber-300 shadow-[0_12px_40px_rgba(0,0,0,0.9)] flex items-center justify-center cursor-pointer motion-safe:transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/50"
          style={{ touchAction: 'manipulation' }}
        >
          {isOpen ? <X className="w-8 h-8 stroke-[3]" /> : <Menu className="w-8 h-8 stroke-[3]" />}
          {!isOpen && alertsCount > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-rose-600 border-2 border-slate-950" aria-hidden="true" />
          )}
        </button>
      </div>
    </>
  );
};
