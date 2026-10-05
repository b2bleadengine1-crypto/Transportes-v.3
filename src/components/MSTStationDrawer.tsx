import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  MapPin,
  Train,
  Navigation,
  Sparkles,
  RefreshCw,
  Share2,
  Check,
  Star,
} from 'lucide-react';
import {
  MSTStation,
  MSTDeparture,
  MST_LINES,
  getMSTStationDepartures,
} from '../services/metroSulTejo';
import { isItemFavorite, toggleStoredFavorite } from './FavoritesModal';

interface MSTStationDrawerProps {
  station: MSTStation | null;
  onClose: () => void;
  onSelectLine?: (lineId: '1' | '2' | '3') => void;
  userLocation: { lat: number; lon: number } | null;
}

export const MSTStationDrawer: React.FC<MSTStationDrawerProps> = ({
  station,
  onClose,
  onSelectLine,
  userLocation,
}) => {
  const [departures, setDepartures] = useState<MSTDeparture[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!station) return;
    setIsLoading(true);
    setIsFav(isItemFavorite(station.id));
    const data = getMSTStationDepartures(station.id);
    setDepartures(data);
    setIsLoading(false);
  }, [station?.id]);

  if (!station) return null;

  const handleToggleFav = () => {
    const next = toggleStoredFavorite({
      id: station.id,
      name: station.name,
      type: 'tram',
      operator: 'Metro Sul do Tejo',
      color: '#0284c7',
      textColor: '#ffffff',
      subtitle: `Linhas ${station.lines.join(', ')} · ${station.locality}`,
      addedAt: Date.now(),
    });
    setIsFav(next);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${station.name} - Estação Metro Sul do Tejo (MST)`);
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
              <Train className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-sky-400 font-bold flex items-center gap-1.5">
                <span>Metro Sul do Tejo (MST)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300 font-mono">
                  Metro Ligeiro
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

        {/* Lines Badges */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Linhas:</span>
          {station.lines.map((lId) => {
            const line = MST_LINES[lId];
            return (
              <button
                key={lId}
                onClick={() => onSelectLine && onSelectLine(lId)}
                className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono transition-transform hover:scale-105 cursor-pointer shadow-xs"
                style={{ backgroundColor: line.color, color: line.textColor }}
                title={`Ver traçado da Linha ${lId}`}
              >
                Linha {lId}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Departures */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Próximos Trams (Tempo Real)</span>
              </div>
              <button
                onClick={() => {
                  const data = getMSTStationDepartures(station.id);
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
                const line = MST_LINES[dep.lineId];
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/40 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-7 h-7 rounded-lg text-xs font-bold font-mono flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: line.color, color: line.textColor }}
                      >
                        {dep.lineId}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{dep.destination}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{line.name}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-sky-400">
                        {dep.minutesAway <= 1 ? (
                          <span className="text-emerald-400 animate-pulse">A chegar</span>
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
            <span>{copied ? 'Copiado para a área de transferência!' : 'Partilhar estação'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
