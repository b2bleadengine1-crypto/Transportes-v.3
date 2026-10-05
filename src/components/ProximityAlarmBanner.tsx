import React from 'react';
import { Bell, MapPin, Navigation, X, Volume2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DestinationStop, playProximityChime } from '../services/proximityAlarm';

interface ProximityAlarmBannerProps {
  destination: DestinationStop | null;
  distanceMeters: number | null;
  isWithinProximity: boolean;
  onClearDestination: () => void;
  onFlyToDestination?: () => void;
}

export const ProximityAlarmBanner: React.FC<ProximityAlarmBannerProps> = ({
  destination,
  distanceMeters,
  isWithinProximity,
  onClearDestination,
  onFlyToDestination,
}) => {
  if (!destination) return null;

  // Format distance
  const formattedDistance =
    distanceMeters === null
      ? 'A calcular GPS...'
      : distanceMeters < 1000
      ? `${Math.round(distanceMeters)} m`
      : `${(distanceMeters / 1000).toFixed(1)} km`;

  // 1. Triggered alert modal when user is within 500m
  if (isWithinProximity) {
    return (
      <div className="fixed inset-x-3 bottom-24 sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-md z-50 pointer-events-auto animate-bounce-short">
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 p-0.5 rounded-3xl shadow-2xl shadow-rose-950/80">
          <div className="bg-slate-950/95 backdrop-blur-xl rounded-[22px] p-4 text-white border border-amber-400/40">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-lg animate-pulse shrink-0">
                  <Bell className="w-6 h-6 animate-wiggle" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase font-black tracking-wider text-amber-300 block">
                    Alarme de Proximidade (&lt; 500m)
                  </span>
                  <h3 className="font-black text-base leading-tight text-white">
                    Estás a chegar ao teu destino!
                  </h3>
                </div>
              </div>
              <button
                onClick={onClearDestination}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar e desligar alarme"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Paragem de Destino:</span>
                <strong className="text-amber-400">{destination.name}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Distância Atual:</span>
                <strong className="text-rose-400 font-mono text-sm">{formattedDistance}</strong>
              </div>
              <p className="text-[11px] text-slate-300 pt-1 leading-snug">
                Prepara os teus pertences e toca na campainha para descer na próxima paragem.
              </p>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={playProximityChime}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Ouvir Som</span>
              </button>
              <button
                onClick={onClearDestination}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Cheguei / Desativar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active tracking pill when farther than 500m
  return (
    <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-[92%] max-w-md animate-fade-in">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-400/40 rounded-2xl px-3.5 py-2.5 shadow-2xl flex items-center justify-between gap-3 text-xs">
        <div
          onClick={onFlyToDestination}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          title="Centrar na paragem de destino"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Bell className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block font-mono">
              Alarme Ativo (&lt;500m)
            </span>
            <strong className="text-white text-xs block truncate group-hover:text-amber-300 transition-colors">
              {destination.name}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-mono">Distância</span>
            <span className="font-mono font-bold text-amber-400 text-xs tabular-nums">
              {formattedDistance}
            </span>
          </div>
          <button
            onClick={onClearDestination}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cancelar alarme de proximidade"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
