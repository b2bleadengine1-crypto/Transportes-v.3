import React, { useState, useEffect } from 'react';
import { FertagusStation, FertagusDeparture, FertagusAlert, getStationDepartures, getFertagusAlerts } from '../services/fertagus';
import { Train, Clock, AlertTriangle, CheckCircle2, ChevronRight, Accessibility, ArrowRight, ShieldCheck, MapPin, Route } from 'lucide-react';

interface FertagusStationDrawerProps {
  station: FertagusStation | null;
  onClose: () => void;
  onFlyToStation?: (coords: [number, number], zoom: number) => void;
  showRouteLines?: boolean;
  onToggleRouteLines?: () => void;
}

export const FertagusStationDrawer: React.FC<FertagusStationDrawerProps> = ({
  station,
  onClose,
  onFlyToStation,
  showRouteLines,
  onToggleRouteLines,
}) => {
  const [departures, setDepartures] = useState<FertagusDeparture[]>([]);
  const [alerts, setAlerts] = useState<FertagusAlert[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<'all' | 'norte' | 'sul'>('all');

  useEffect(() => {
    if (!station) return;
    setDepartures(getStationDepartures(station.id));
    setAlerts(getFertagusAlerts());

    const interval = setInterval(() => {
      setDepartures(getStationDepartures(station.id));
    }, 15000);

    return () => clearInterval(interval);
  }, [station]);

  if (!station) return null;

  const filteredDepartures = departures.filter((d) => {
    if (selectedDirection === 'norte') return d.destination === 'Roma-Areeiro';
    if (selectedDirection === 'sul') return d.destination === 'Setúbal' || d.destination === 'Coina';
    return true;
  });

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-sky-950/80 via-blue-900/40 to-slate-900/90 border border-sky-500/30 rounded-2xl p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold shadow-lg">
              <Train className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block font-mono">
                Comboios Fertagus · Zona {station.zone}
              </span>
              <h2 className="text-xl font-black text-white">{station.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {station.wheelchair && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <Accessibility className="w-3.5 h-3.5" />
                    Acessível
                  </span>
                )}
                <span className="text-[11px] text-slate-400">· Navegante Metropolitano</span>
              </div>
            </div>
          </div>

          {onFlyToStation && (
            <button
              onClick={() => onFlyToStation([station.lat, station.lon], 16)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-colors cursor-pointer shrink-0"
              title="Centrar no mapa"
            >
              <MapPin className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Connections tags */}
        {station.connections.length > 0 && (
          <div className="mt-3 pt-3 border-t border-sky-500/20 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400">Ligações:</span>
            {station.connections.map((c, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-lg bg-slate-900/70 text-slate-300 font-mono text-[10px] border border-slate-700/60"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Real-time Perturbations / Status Banner */}
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-xs text-emerald-300 block">Circulação Normal</span>
          <span className="text-[11px] text-slate-400 block truncate">
            Comboios a circular nos tempos programados pela Ponte 25 de Abril
          </span>
        </div>
      </div>

      {/* Trajeto Opcional da Linha Férrea da Fertagus */}
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
                <span>Linha Férrea da Fertagus (Ponte 25 de Abril)</span>
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
                  ? 'A desenhar traçado exclusivo dos carris Roma-Areeiro ↔ Setúbal'
                  : 'Clique para mostrar a linha férrea no mapa'}
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

      {/* Direction Filters */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
        <button
          onClick={() => setSelectedDirection('all')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-center ${
            selectedDirection === 'all' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Todas as Partidas
        </button>
        <button
          onClick={() => setSelectedDirection('norte')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-center ${
            selectedDirection === 'norte' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Sentido Lisboa
        </button>
        <button
          onClick={() => setSelectedDirection('sul')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-colors cursor-pointer text-center ${
            selectedDirection === 'sul' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Sentido Sul
        </button>
      </div>

      {/* Departures Timetable List */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
          Próximos Comboios em Tempo Real
        </span>

        {filteredDepartures.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-900/50 rounded-2xl border border-slate-800">
            Nenhuma partida prevista nos próximos minutos.
          </div>
        ) : (
          filteredDepartures.map((dep, idx) => {
            const isImminent = dep.minutesAway <= 3;
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  isImminent
                    ? 'bg-sky-950/30 border-sky-400/50 shadow-lg'
                    : 'bg-slate-800/70 border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 font-mono shadow-md ${
                      isImminent ? 'bg-sky-400 text-slate-950' : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {dep.carsCount}C
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-sm block truncate">{dep.destination}</strong>
                      {dep.platform && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px] font-mono border border-slate-700">
                          Linha {dep.platform}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>Previsto às {dep.scheduledTime}</span>
                      <span>·</span>
                      <span className="text-emerald-400 font-semibold">Horário Cumprido</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <div className="flex items-baseline justify-end gap-1">
                    <span
                      className={`text-2xl font-black font-mono tracking-tight ${
                        isImminent ? 'text-sky-300 animate-pulse' : 'text-white'
                      }`}
                    >
                      {dep.minutesAway}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">min</span>
                  </div>
                  {isImminent && (
                    <span className="text-[10px] font-bold text-amber-400 block uppercase">A Chegar</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Official Fertagus Notices & Disruptions */}
      <div className="pt-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1 mb-2">
          Comunicados e Avisos Fertagus
        </span>
        <div className="space-y-2">
          {alerts.map((al) => (
            <div
              key={al.id}
              className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <strong className="text-white font-semibold">{al.title}</strong>
                <span className="text-[10px] text-slate-400 font-mono">{al.date}</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">{al.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
