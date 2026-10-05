import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  MapPin,
  Ship,
  Navigation,
  Compass,
  Sparkles,
  RefreshCw,
  Share2,
  Check,
  Star,
} from 'lucide-react';
import {
  BoatStation,
  BoatDeparture,
  BOAT_LINES,
  getBoatStationDepartures,
} from '../services/transtejoSoflusa';
import { isItemFavorite, toggleStoredFavorite } from './FavoritesModal';

interface BoatStationDrawerProps {
  station: BoatStation | null;
  onClose: () => void;
  onSelectLine?: (lineId: string) => void;
  userLocation: { lat: number; lon: number } | null;
}

export const BoatStationDrawer: React.FC<BoatStationDrawerProps> = ({
  station,
  onClose,
  onSelectLine,
  userLocation,
}) => {
  const [departures, setDepartures] = useState<BoatDeparture[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!station) return;
    setIsLoading(true);
    setIsFav(isItemFavorite(station.id));
    const data = getBoatStationDepartures(station.id);
    setDepartures(data);
    setIsLoading(false);
  }, [station?.id]);

  if (!station) return null;

  const handleToggleFav = () => {
    const next = toggleStoredFavorite({
      id: station.id,
      name: station.name,
      type: 'boat',
      operator: 'Transtejo / Soflusa',
      color: '#0284c7',
      textColor: '#ffffff',
      subtitle: station.locality,
      addedAt: Date.now(),
    });
    setIsFav(next);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${station.name} - Ligações Fluviais Transtejo / Soflusa`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed sm:absolute bottom-0 right-0 sm:top-20 sm:bottom-6 sm:right-6 w-full sm:w-[380px] z-30 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-full overflow-hidden text-slate-100 animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shrink-0">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-sky-400 font-bold flex items-center gap-1.5">
                <span>Terminal Fluvial do Tejo</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300 font-mono">
                  Transtejo / Soflusa
                </span>
              </div>
              <h2 className="text-base font-bold text-white leading-snug mt-0.5">{station.name}</h2>
              <div className="text-xs text-slate-400 mt-0.5">{station.locality}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleFav}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isFav ? 'text-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Star className={`w-5 h-5 ${isFav ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Departures Table */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Próximas Partidas de Barco (Em Direto)</span>
              </div>
              <button
                onClick={() => {
                  const data = getBoatStationDepartures(station.id);
                  setDepartures(data);
                }}
                className="text-slate-400 hover:text-sky-400 p-1 rounded cursor-pointer"
                title="Atualizar"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {departures.map((dep, idx) => {
                const line = BOAT_LINES[dep.lineId];
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/40 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="px-2 py-1 rounded-md text-[11px] font-bold font-mono text-white shrink-0"
                        style={{ backgroundColor: line?.color || '#0284c7' }}
                      >
                        {line?.operator || 'Barco'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{dep.destination}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">Navio: {dep.vesselName}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-sky-400">
                        {dep.minutesAway <= 2 ? (
                          <span className="text-emerald-400 animate-pulse">A embarcar</span>
                        ) : (
                          `~${dep.minutesAway} min`
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{dep.estimatedTime}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connections */}
          {station.connections.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-white block">Correspondências & Intermodalidade</span>
              <div className="flex flex-wrap gap-1.5">
                {station.connections.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-slate-700/60 text-slate-200 text-xs font-medium"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Copiado para a área de transferência!' : 'Partilhar terminal'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
