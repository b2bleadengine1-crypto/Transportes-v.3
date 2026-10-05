import React, { useState, useEffect } from 'react';
import { MetroStation, MetroArrival, getMetroStationArrivals, METRO_LINES } from '../services/metroLisboa';
import { Train, Clock, ShieldCheck, Accessibility, ExternalLink, RefreshCw, AlertCircle, ArrowRight, Route } from 'lucide-react';

interface MetroStationDrawerProps {
  station: MetroStation | null;
  onClose: () => void;
  selectedLine?: 'amarela' | 'azul' | 'verde' | 'vermelha' | null;
  onSelectLine?: (line: 'amarela' | 'azul' | 'verde' | 'vermelha') => void;
  showRouteLines?: boolean;
  onToggleRouteLines?: () => void;
}

export const MetroStationDrawer: React.FC<MetroStationDrawerProps> = ({
  station,
  onClose,
  selectedLine,
  onSelectLine,
  showRouteLines,
  onToggleRouteLines,
}) => {
  const [arrivals, setArrivals] = useState<MetroArrival[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (!station) return;

    const updateTimes = () => {
      setArrivals(getMetroStationArrivals(station));
      setLastUpdated(new Date());
    };

    updateTimes();
    const interval = setInterval(updateTimes, 4000);
    return () => clearInterval(interval);
  }, [station]);

  if (!station) return null;

  const activeLineKey = selectedLine || station.lines[0] || 'azul';

  return (
    <div className="space-y-4">
      {/* Station Badges & Transfers */}
      <div className="flex flex-wrap items-center gap-2">
        {station.lines.map((lineId) => {
          const info = METRO_LINES[lineId];
          const isCurrentActive = activeLineKey === lineId;
          return (
            <button
              key={lineId}
              onClick={() => onSelectLine && onSelectLine(lineId as 'amarela' | 'azul' | 'verde' | 'vermelha')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono border shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                isCurrentActive
                  ? 'ring-2 ring-white scale-105 shadow-md'
                  : 'opacity-70 hover:opacity-100 hover:scale-102'
              }`}
              style={{
                backgroundColor: info.color,
                color: info.textColor,
                borderColor: 'rgba(0,0,0,0.15)',
              }}
              title="Clique para alternar traçado exclusivo desta linha"
            >
              <Train className="w-3.5 h-3.5" />
              <span>{info.name}</span>
              {isCurrentActive && <span className="text-[10px]">✓</span>}
            </button>
          );
        })}

        {station.accessible ? (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <Accessibility className="w-3 h-3 text-emerald-400" />
            Acessível
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Sem elevador
          </span>
        )}
      </div>

      {/* Trajeto Opcional de Carris de Metro */}
      {onToggleRouteLines && (
        <div
          onClick={onToggleRouteLines}
          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            showRouteLines !== false
              ? 'bg-sky-500/10 border-sky-400/40 text-sky-200'
              : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Route className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Traçado da Linha de Metro (Carris)</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold ${
                  showRouteLines !== false
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {showRouteLines !== false ? 'Visível' : 'Oculto'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {showRouteLines !== false
                  ? `A desenhar exclusivamente os carris da ${METRO_LINES[activeLineKey]?.name}`
                  : 'Clique para mostrar a linha de metro no mapa'}
              </div>
            </div>
          </div>
          <div
            className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
              showRouteLines !== false ? 'bg-sky-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                showRouteLines !== false ? 'left-4' : 'left-0.5'
              }`}
            />
          </div>
        </div>
      )}

      {/* Transfers Row */}
      {station.transfers.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-300 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2">
          <span className="text-slate-400 text-[11px]">Correspondências:</span>
          {station.transfers.map((t, idx) => (
            <span key={idx} className="font-semibold text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Live Train Arrivals Board */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
          <span className="flex items-center gap-1 font-semibold text-slate-200">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Próximos Comboios em Direto
          </span>
          <span className="text-[10px] font-mono">
            Atualizado {lastUpdated.toLocaleTimeString('pt-PT', { minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {arrivals.map((arr, idx) => {
            const line = METRO_LINES[arr.line];
            const isClosed = arr.status === 'encerrado';

            return (
              <div
                key={idx}
                className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-slate-600 transition-colors"
              >
                {/* Top line accent pill */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: line.color }}
                />

                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: line.color }}
                      />
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase truncate">
                        {line.name}
                      </span>
                    </div>
                    <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5 mt-0.5">
                      <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">{arr.destination}</span>
                    </div>
                  </div>

                  {!isClosed && (
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-1 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-xl">
                        <span className="text-2xl font-black font-mono text-amber-400 tabular-nums">
                          {arr.minutesNext}
                        </span>
                        <span className="text-xs font-bold text-amber-300">min</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
                        ~{arr.secondsRemaining}s
                      </span>
                    </div>
                  )}
                </div>

                {isClosed ? (
                  <div className="py-2 text-xs font-medium text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Rede encerrada (reabre às 06:30)</span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
                    <span className="text-slate-400 text-[11px]">
                      Comboio seguinte:
                    </span>
                    <span className="font-mono font-semibold text-emerald-400">
                      em {arr.minutesSubsequent} min ({arr.trainCars} carruagens)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Frequência oficial Metropolitano de Lisboa</span>
        </div>
        <a
          href="https://www.metrolisboa.pt"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 cursor-pointer"
        >
          <span>metrolisboa.pt</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
