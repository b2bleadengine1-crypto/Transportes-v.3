import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Bell,
  ExternalLink,
  Filter,
  CheckCircle,
  Clock,
  ShieldAlert,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { ServiceAlert, Line } from '../types';
import { getLineFallbackColor } from '../services/api';

interface ServiceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: ServiceAlert[];
  pinnedLines: string[];
  linesMap: Map<string, Line>;
  onSelectLine?: (lineId: string) => void;
}

export const ServiceAlertsModal: React.FC<ServiceAlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  pinnedLines,
  linesMap,
  onSelectLine,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'pinned'>('all');

  if (!isOpen) return null;

  // Calculate alerts affecting pinned lines
  const pinnedAlerts = alerts.filter((alert) =>
    alert.lines.some((lineId) => pinnedLines.includes(lineId))
  );

  const displayedAlerts = filterMode === 'pinned' ? pinnedAlerts : alerts;

  const getCauseBadge = (cause: string, effect: string, severity: string) => {
    if (cause === 'STRIKE' || effect === 'NO_SERVICE') {
      return {
        label: 'Greve / Supressão',
        icon: <Flame className="w-3.5 h-3.5 text-rose-400" />,
        bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
      };
    }
    if (effect === 'DETOUR' || cause === 'DETOUR') {
      return {
        label: 'Desvio de Trânsito',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
      };
    }
    if (severity === 'critical') {
      return {
        label: 'Perturbação Grave',
        icon: <ShieldAlert className="w-3.5 h-3.5 text-red-400" />,
        bg: 'bg-red-500/15 border-red-500/40 text-red-300',
      };
    }
    return {
      label: 'Condicionamento',
      icon: <Clock className="w-3.5 h-3.5 text-sky-400" />,
      bg: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 flex flex-col max-h-[85vh] overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-400/10">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Alertas de Serviço</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30">
                  Carris Metropolitana
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Avisos oficiais de circulação, desvios e condicionamentos em tempo real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'all'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Todos os Alertas</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
                {alerts.length}
              </span>
            </button>

            <button
              onClick={() => setFilterMode('pinned')}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'pinned'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>Minhas Linhas Ativas</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  pinnedAlerts.length > 0 ? 'bg-rose-500 text-white font-bold' : 'bg-slate-900/40'
                }`}
              >
                {pinnedAlerts.length}
              </span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Linhas ativas: <b className="text-amber-400 font-mono">{pinnedLines.join(', ') || 'Nenhuma'}</b>
          </span>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {displayedAlerts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-white">Nenhum alerta ativo no momento</p>
              <p className="text-xs text-slate-400 mt-1">
                {filterMode === 'pinned'
                  ? 'As suas linhas ativas não têm condicionamentos ou greves reportadas.'
                  : 'A rede da Carris Metropolitana opera sem incidentes graves registados.'}
              </p>
            </div>
          ) : (
            displayedAlerts.map((alert) => {
              const badge = getCauseBadge(alert.cause, alert.effect, alert.severity);
              const isPinnedAffected = alert.lines.some((l) => pinnedLines.includes(l));

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isPinnedAffected
                      ? 'bg-slate-800/90 border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-400/20'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      {isPinnedAffected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider animate-pulse">
                          Afeta a sua linha
                        </span>
                      )}

                      {alert.activePeriod?.start && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{alert.activePeriod.start}</span>
                          {alert.activePeriod.end && <span> &rarr; {alert.activePeriod.end}</span>}
                        </span>
                      )}
                    </div>

                    {alert.url && (
                      <a
                        href={alert.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 shrink-0 transition-colors"
                        title="Abrir comunicado oficial da Carris Metropolitana"
                      >
                        <span>Oficial</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 leading-snug">
                    {alert.title}
                  </h3>

                  {alert.description && (
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                      {alert.description}
                    </p>
                  )}

                  {/* Impacted Lines Badges */}
                  {alert.lines.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/50 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 mr-1 font-medium">
                        Linhas afetadas:
                      </span>
                      {alert.lines.map((lineId) => {
                        const lineInfo = linesMap.get(lineId);
                        const fallback = getLineFallbackColor(lineId);
                        const bg = lineInfo?.color || fallback.bg;
                        const text = lineInfo?.text_color || fallback.text;
                        const isThisPinned = pinnedLines.includes(lineId);

                        return (
                          <button
                            key={lineId}
                            onClick={() => {
                              if (onSelectLine) {
                                onSelectLine(lineId);
                                onClose();
                              }
                            }}
                            className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-transform hover:scale-105 cursor-pointer flex items-center gap-1 ${
                              isThisPinned ? 'ring-2 ring-amber-400 shadow-xs' : ''
                            }`}
                            style={{ backgroundColor: bg, color: text }}
                            title={`Linha ${lineId} ${isThisPinned ? '(Linha ativa)' : ''}. Clique para ver no mapa.`}
                          >
                            <span>{lineId}</span>
                            {isThisPinned && <span className="text-[10px]">★</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Feed sincronizado em tempo real</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
