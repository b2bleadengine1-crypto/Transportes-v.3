import React, { useState, useEffect } from 'react';
import { CPStation, CPDeparture, CP_LINES, getCpStationDepartures } from '../services/cpTrains';
import { Train, Clock, AlertTriangle, CheckCircle2, Accessibility, ShieldCheck, MapPin, Route, Lock, Unlock } from 'lucide-react';

interface CPStationDrawerProps {
  station: CPStation | null;
  onClose: () => void;
  onFlyToStation?: (coords: [number, number], zoom: number) => void;
  onSelectLine?: (lineId: 'cascais' | 'sintra' | 'azambuja' | 'sado') => void;
}

export const CPStationDrawer: React.FC<CPStationDrawerProps> = ({
  station,
  onClose,
  onFlyToStation,
  onSelectLine,
}) => {
  const [departures, setDepartures] = useState<CPDeparture[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<'all' | string>('all');

  useEffect(() => {
    if (!station) return;
    setDepartures(getCpStationDepartures(station.id));

    const interval = setInterval(() => {
      setDepartures(getCpStationDepartures(station.id));
    }, 12000);

    return () => clearInterval(interval);
  }, [station]);

  if (!station) return null;

  const primaryLineId = station.lines[0];
  const primaryLine = CP_LINES[primaryLineId];

  const uniqueDestinations = Array.from(new Set(departures.map((d) => d.destination)));
  const filteredDepartures = departures.filter((d) => {
    if (selectedDirection === 'all') return true;
    return d.destination === selectedDirection;
  });

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 flex items-center justify-center font-bold shadow-lg">
              <Train className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block font-mono">
                  Comboios de Portugal · CP
                </span>
                {station.zone && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    Zona {station.zone}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white">{station.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {station.accessible && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <Accessibility className="w-3.5 h-3.5" />
                    Acessível
                  </span>
                )}
                <span className="flex items-center gap-1 text-[11px] text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Horários em Tempo Real
                </span>
              </div>
            </div>
          </div>

          {onFlyToStation && (
            <button
              onClick={() => onFlyToStation([station.lat, station.lon], 16)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer shrink-0"
              title="Focar estação no mapa"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
            </button>
          )}
        </div>

        {/* Linhas da Estação */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium">Linhas:</span>
          {station.lines.map((lId) => {
            const lInfo = CP_LINES[lId];
            return (
              <button
                key={lId}
                onClick={() => onSelectLine && onSelectLine(lId)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-transform hover:scale-105 cursor-pointer shadow-sm"
                style={{ backgroundColor: lInfo?.color || '#006633', color: lInfo?.textColor || '#ffffff' }}
                title={`Delinear trajeto da ${lInfo?.name || lId}`}
              >
                <Route className="w-3 h-3" />
                <span>{lInfo?.name || lId}</span>
              </button>
            );
          })}
        </div>

        {/* Ligações Intermodais */}
        {station.connections.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] text-slate-300">
            <span className="text-slate-400 font-medium">Correspondências:</span>
            {station.connections.map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700/60 font-medium text-[10px]">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Destination Filter Tabs */}
      {uniqueDestinations.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedDirection('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedDirection === 'all'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todos os Destinos
          </button>
          {uniqueDestinations.map((dest) => (
            <button
              key={dest}
              onClick={() => setSelectedDirection(dest)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedDirection === dest
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Destino {dest}
            </button>
          ))}
        </div>
      )}

      {/* Próximas Partidas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Próximos Comboios CP</h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Em Direto
          </span>
        </div>

        <div className="space-y-2">
          {filteredDepartures.map((dep, idx) => {
            const isDelayed = dep.status === 'DELAYED';
            const isSoon = dep.minutesAway <= 5;

            return (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-mono font-black ${
                      isSoon
                        ? 'bg-emerald-500 text-slate-950 shadow-md animate-pulse'
                        : 'bg-slate-800 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <span className="text-sm leading-none">{dep.minutesAway}</span>
                    <span className="text-[8px] uppercase tracking-tighter">min</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {dep.scheduledTime}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                        {dep.service} {dep.trainNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({dep.carsCount} carruagens)
                      </span>
                    </div>

                    <div className="text-sm font-bold text-white mt-0.5">
                      {dep.destination}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      {isDelayed ? (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          +{dep.delayMinutes} min de atraso
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          No horário
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Linha</div>
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-white text-xs mt-0.5">
                    {dep.platform}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
