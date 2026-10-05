import React, { useState, useEffect } from 'react';
import {
  X,
  Gauge,
  Navigation2,
  Clock,
  MapPin,
  Eye,
  Filter,
  Share2,
  Check,
  Radio,
  Bus,
  RefreshCw,
  Milestone,
  Sparkles,
  AlertTriangle,
  Bell,
  Route,
} from 'lucide-react';
import { Vehicle, Line, EstimatedStopArrival } from '../types';
import { LineOccupancyChart } from './LineOccupancyChart';
import {
  getLineFallbackColor,
  bearingToCardinal,
  formatStatusText,
  formatTimeAgo,
  getDistanceMeters,
  fetchNextThreeStopsArrivals,
} from '../services/api';

interface BusDrawerProps {
  vehicle: Vehicle | null;
  lineInfo: Line | undefined;
  onClose: () => void;
  followVehicle: boolean;
  setFollowVehicle: (follow: boolean) => void;
  onFilterByLine: (lineId: string) => void;
  userLocation: { lat: number; lon: number } | null;
  delayMinutes?: number | null;
  onSelectStop?: (stopId: string) => void;
  destinationStopId?: string | null;
  onToggleDestinationStop?: (stop: { id: string; name: string; lat: number; lon: number }) => void;
  showRouteLines?: boolean;
  onToggleRouteLines?: () => void;
}

export const BusDrawer: React.FC<BusDrawerProps> = ({
  vehicle,
  lineInfo,
  onClose,
  followVehicle,
  setFollowVehicle,
  onFilterByLine,
  userLocation,
  delayMinutes,
  onSelectStop,
  destinationStopId,
  onToggleDestinationStop,
  showRouteLines,
  onToggleRouteLines,
}) => {
  const [copied, setCopied] = useState(false);
  const [nextArrivals, setNextArrivals] = useState<EstimatedStopArrival[]>([]);
  const [isLoadingArrivals, setIsLoadingArrivals] = useState(false);
  const [arrivalsError, setArrivalsError] = useState<string | null>(null);

  // Fetch next three stops arrival estimations whenever vehicle changes
  useEffect(() => {
    if (!vehicle) {
      setNextArrivals([]);
      return;
    }

    let isMounted = true;
    setIsLoadingArrivals(true);
    setArrivalsError(null);

    fetchNextThreeStopsArrivals(vehicle)
      .then((data) => {
        if (isMounted) {
          setNextArrivals(data);
          setIsLoadingArrivals(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Erro ao carregar previsões das próximas paragens:', err);
          setArrivalsError('Não foi possível obter horários para esta rota');
          setIsLoadingArrivals(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [vehicle?.id, vehicle?.stop_id, vehicle?.trip_id]);

  if (!vehicle) return null;

  const handleManualRefreshArrivals = () => {
    if (!vehicle) return;
    setIsLoadingArrivals(true);
    fetchNextThreeStopsArrivals(vehicle)
      .then((data) => {
        setNextArrivals(data);
        setIsLoadingArrivals(false);
      })
      .catch(() => {
        setIsLoadingArrivals(false);
      });
  };

  const fallback = getLineFallbackColor(vehicle.line_id);
  const bgColor = lineInfo?.color || fallback.bg;
  const textColor = lineInfo?.text_color || fallback.text;
  const speed = typeof vehicle.speed === 'number' ? Math.round(vehicle.speed) : 0;
  const isMoving = speed > 3;

  const distanceMeters =
    userLocation && typeof vehicle.lat === 'number' && typeof vehicle.lon === 'number'
      ? getDistanceMeters(userLocation.lat, userLocation.lon, vehicle.lat, vehicle.lon)
      : null;

  const handleShare = () => {
    const text = `Autocarro Linha ${vehicle.line_id} em tempo real - Carris Metropolitana (${vehicle.lat.toFixed(5)}, ${vehicle.lon.toFixed(5)})`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed sm:absolute bottom-0 right-0 sm:top-20 sm:bottom-6 sm:right-6 w-full sm:w-[380px] z-30 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/80 flex flex-col max-h-[85vh] sm:max-h-full overflow-hidden text-slate-100 animate-in slide-in-from-bottom-6 duration-200">
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-800/80 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="px-3 py-1.5 rounded-xl font-bold font-mono text-base tracking-tight shadow-md flex items-center justify-center min-w-[54px]"
              style={{ backgroundColor: bgColor, color: textColor }}
            >
              {vehicle.line_id}
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                <span>Viatura {vehicle.id.replace(/[^\w]/g, '') || vehicle.id}</span>
                {isMoving && (
                  <span className="flex items-center gap-1 text-emerald-400 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Em andamento
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white leading-snug line-clamp-2 mt-0.5">
                {lineInfo?.long_name || `Linha ${vehicle.line_id}`}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar detalhes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Delay Alert Banner (> 5 minutes delay) */}
          {(() => {
            const firstStopWithDelay = nextArrivals.find((a) => typeof a.delayMinutes === 'number' && a.delayMinutes > 5);
            const effectiveDelay = delayMinutes ?? firstStopWithDelay?.delayMinutes ?? null;
            if (typeof effectiveDelay === 'number' && effectiveDelay > 5) {
              return (
                <div className="flex items-center gap-3 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-200 animate-in fade-in duration-200">
                  <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-rose-600/30">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-xs leading-tight">
                      Atraso Superior a 5 Minutos
                    </div>
                    <div className="text-[11px] text-rose-300 font-medium mt-0.5">
                      Tempo estimado com <span className="font-mono font-bold text-rose-100">+{Math.round(effectiveDelay)} min</span> de atraso face ao horário previsto da API.
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Main Gauges: Speed & Compass */}
          <div className="grid grid-cols-2 gap-3">
            {/* Speedometer */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  Velocidade
                </span>
                <span className="font-mono text-[10px] text-slate-500">GPS</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold font-mono tabular-nums text-white">
                  {speed}
                </span>
                <span className="text-xs font-semibold text-slate-400">km/h</span>
              </div>
              <div className="mt-2 w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (speed / 80) * 100)}%` }}
                />
              </div>
            </div>

            {/* Compass / Heading */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Navigation2 className="w-4 h-4 text-sky-400" />
                  Rumo & Bússola
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center transition-transform"
                  style={{ transform: `rotate(${vehicle.bearing || 0}deg)` }}
                >
                  <Navigation2 className="w-4 h-4 text-sky-400 fill-sky-400" />
                </div>
                <div className="text-sm font-bold text-white font-mono">
                  {bearingToCardinal(vehicle.bearing)}
                </div>
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono">
                Lat: {vehicle.lat.toFixed(4)}, Lon: {vehicle.lon.toFixed(4)}
              </div>
            </div>
          </div>

          {/* Trajeto Opcional pelas Estradas Reais */}
          {onToggleRouteLines && (
            <div
              onClick={onToggleRouteLines}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                showRouteLines !== false
                  ? 'bg-amber-400/10 border-amber-400/40 text-amber-200'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Route className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Trajeto no Mapa (Estradas Reais)</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold ${
                      showRouteLines !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {showRouteLines !== false ? 'Visível' : 'Oculto'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {showRouteLines !== false
                      ? 'Traçado exclusivo deste autocarro pelas ruas e avenidas'
                      : 'Clique para ver o percurso nas estradas'}
                  </div>
                </div>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
                  showRouteLines !== false ? 'bg-amber-400' : 'bg-slate-700'
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

          {/* Operational Status */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                Estado Operacional
              </span>
              <span className="font-semibold text-slate-200">
                {formatStatusText(vehicle.current_status)}
              </span>
            </div>

            {vehicle.stop_id && (
              <div className="flex items-center justify-between border-t border-slate-800/60 pt-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  Paragem Atual / Próxima
                </span>
                <span className="font-mono text-slate-300 font-medium">#{vehicle.stop_id}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-800/60 pt-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Última Transmissão
              </span>
              <span className="text-slate-300">{formatTimeAgo(vehicle.timestamp)}</span>
            </div>

            {distanceMeters !== null && (
              <div className="flex items-center justify-between border-t border-slate-800/60 pt-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Navigation2 className="w-3.5 h-3.5 text-emerald-400" />
                  Distância até a Si
                </span>
                <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                  {distanceMeters < 1000
                    ? `${distanceMeters} m`
                    : `${(distanceMeters / 1000).toFixed(1)} km`}
                </span>
              </div>
            )}
          </div>

          {/* Estimated Arrival Time at the Next 3 Stops (Carris Metropolitana API) */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                <Milestone className="w-4 h-4 text-amber-400" />
                <span>Próximas 3 Paragens · Estimativa</span>
              </div>
              <button
                onClick={handleManualRefreshArrivals}
                disabled={isLoadingArrivals}
                title="Atualizar previsões de chegada"
                className="text-slate-400 hover:text-amber-400 transition-colors p-1 rounded-md cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingArrivals ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>

            {isLoadingArrivals ? (
              <div className="py-4 text-center text-slate-400 space-y-1.5">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400 mx-auto" />
                <p className="text-[11px]">A calcular horários previstos da API...</p>
              </div>
            ) : arrivalsError ? (
              <div className="p-2.5 rounded-lg bg-slate-800/80 text-[11px] text-slate-400">
                {arrivalsError}
              </div>
            ) : nextArrivals.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-slate-800/80 text-[11px] text-slate-400">
                Sem dados de paragens subsequentes para esta viagem no momento.
              </div>
            ) : (
              <div className="space-y-2.5 relative">
                {/* Connecting route line */}
                <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-slate-700 pointer-events-none" />

                {nextArrivals.map((stop, idx) => {
                  const isCurrentNext = idx === 0;
                  const isNow = (stop.minutesAway ?? 99) <= 1;

                  return (
                    <div
                      key={stop.stopId + '-' + idx}
                      className={`relative flex items-start gap-3 p-2.5 rounded-xl border transition-colors ${
                        isCurrentNext
                          ? 'bg-amber-400/5 border-amber-400/30'
                          : 'bg-slate-800/40 border-slate-700/40'
                      }`}
                    >
                      {/* Step circle */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 z-10 ${
                          isCurrentNext
                            ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      {/* Stop Info & Timing */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-white text-xs truncate">
                            {stop.stopName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0">
                            #{stop.stopId}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          {/* Distance or sequence */}
                          <span className="text-slate-400 text-[10px]">
                            {stop.distanceMeters !== undefined
                              ? stop.distanceMeters < 1000
                                ? `${stop.distanceMeters}m de distância`
                                : `${(stop.distanceMeters / 1000).toFixed(1)}km`
                              : stop.stopSequence
                              ? `Paragem ${stop.stopSequence}`
                              : 'Em rota'}
                          </span>

                          {/* Arrival ETA */}
                          <div className="text-right">
                            {isNow ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-400 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                A chegar
                              </span>
                            ) : stop.minutesAway !== null && stop.minutesAway !== undefined ? (
                              <span className="font-mono font-bold text-amber-400 tabular-nums">
                                ~{stop.minutesAway} min
                              </span>
                            ) : null}

                            {stop.estimatedArrival && (
                              <span className="text-slate-300 font-mono text-[10px] ml-1.5">
                                ({stop.estimatedArrival.slice(0, 5)})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Realtime vs Scheduled indicator badge & Stop Action */}
                        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-700/40 text-[10px]">
                          <span className="text-slate-400">
                            {stop.scheduledArrival ? `Tabela: ${stop.scheduledArrival.slice(0, 5)}` : 'Horário regular'}
                          </span>

                          <div className="flex items-center gap-2">
                            {stop.isRealtime ? (
                              <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
                                <Sparkles className="w-2.5 h-2.5" />
                                GTFS-RT
                              </span>
                            ) : (
                              <span className="text-sky-400">Estimado</span>
                            )}

                            {onSelectStop && (
                              <button
                                onClick={() => onSelectStop(stop.stopId)}
                                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                                title="Ver todos os horários e autocarros que chegam a esta paragem"
                              >
                                Ver paragem
                              </button>
                            )}

                            {onToggleDestinationStop && (
                              <button
                                onClick={() => {
                                  onToggleDestinationStop({
                                    id: stop.stopId,
                                    name: stop.stopName,
                                    lat: vehicle.lat,
                                    lon: vehicle.lon,
                                  });
                                }}
                                className={`text-[10px] font-semibold flex items-center gap-1 ml-1.5 transition-colors cursor-pointer ${
                                  destinationStopId === stop.stopId
                                    ? 'text-amber-400 font-bold'
                                    : 'text-slate-400 hover:text-amber-300'
                                }`}
                                title="Receber notificação local a 500m desta paragem"
                              >
                                <Bell className="w-2.5 h-2.5" />
                                <span>{destinationStopId === stop.stopId ? 'Alarme Ativo' : 'Avisar 500m'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historical Occupancy Bar Chart (Recharts) */}
          <LineOccupancyChart lineId={vehicle.line_id} lineColor={lineInfo?.color} />

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => setFollowVehicle(!followVehicle)}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                followVehicle
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{followVehicle ? 'Câmara a seguir este autocarro' : 'Seguir autocarro em direto no mapa'}</span>
            </button>

            <button
              onClick={() => onFilterByLine(vehicle.line_id)}
              className="w-full py-2 px-3 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver apenas autocarros da Linha {vehicle.line_id}</span>
            </button>

            <button
              onClick={handleShare}
              className="w-full py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Coordenadas copiadas!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copiar localização e dados do veículo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
