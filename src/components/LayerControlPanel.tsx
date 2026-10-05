import React from 'react';
import {
  Layers,
  MapPin,
  Route,
  Flame,
  X,
  Check,
  Train,
  Bus,
  Ship,
  HardDrive,
} from 'lucide-react';
import { MapLayersConfig, MapTileStyle } from '../types';

interface LayerControlPanelProps {
  layers: MapLayersConfig;
  onToggleLayer: (layerKey: keyof MapLayersConfig) => void;
  tileStyle: MapTileStyle;
  setTileStyle: (style: MapTileStyle) => void;
  stopsCount: number;
  activeLinesCount: number;
  trafficMetrics?: {
    slowCount: number;
    moderateCount: number;
    fluidCount: number;
    avgSpeed: number;
  };
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenOfflineMap?: () => void;
}

export const LayerControlPanel: React.FC<LayerControlPanelProps> = ({
  layers,
  onToggleLayer,
  tileStyle,
  setTileStyle,
  stopsCount,
  activeLinesCount,
  isOpen,
  setIsOpen,
  onOpenOfflineMap,
}) => {
  const activeLayersCount =
    (layers.showStops ? 1 : 0) +
    (layers.showRouteLines ? 1 : 0) +
    (layers.showTrafficHeatmap ? 1 : 0) +
    (layers.showMetro !== false ? 1 : 0);

  const TILE_STYLES: { id: MapTileStyle; label: string }[] = [
    { id: 'osm', label: 'OpenStreetMap' },
    { id: 'carto-voyager', label: 'Voyager' },
    { id: 'carto-dark', label: 'Escuro' },
    { id: 'satellite', label: 'Satélite' },
  ];

  return (
    <>
      {/* Sleek, Compact Layer Control Popover */}
      {isOpen && (
        <div className="w-full flex flex-col gap-3 text-xs text-white">
          {/* Layer Toggles */}
          <div className="space-y-2">
            {/* Metro de Lisboa */}
            <div
              onClick={() => onToggleLayer('showMetro')}
              className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                layers.showMetro !== false
                  ? 'bg-sky-500/15 border-sky-400/50 text-white'
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Train className={`w-4 h-4 ${layers.showMetro !== false ? 'text-sky-400' : 'text-slate-400'}`} />
                <div>
                  <span className="font-semibold text-xs block">Metro de Lisboa</span>
                  <span className="text-[10px] text-slate-400">56 Estações em direto (traçado ao selecionar)</span>
                </div>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
                  layers.showMetro !== false ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                    layers.showMetro !== false ? 'left-4' : 'left-0.5'
                  }`}
                />
              </div>
            </div>

            {/* Paragens de Autocarro */}
            <div
              onClick={() => onToggleLayer('showStops')}
              className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                layers.showStops
                  ? 'bg-amber-400/15 border-amber-400/50 text-white'
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MapPin className={`w-4 h-4 ${layers.showStops ? 'text-amber-400' : 'text-slate-400'}`} />
                <div>
                  <span className="font-semibold text-xs block">Paragens de Autocarro</span>
                  <span className="text-[10px] text-slate-400">Paragens individuais e horários</span>
                </div>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
                  layers.showStops ? 'bg-amber-400' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                    layers.showStops ? 'left-4' : 'left-0.5'
                  }`}
                />
              </div>
            </div>

            {/* Percursos das Linhas */}
            <div
              onClick={() => onToggleLayer('showRouteLines')}
              className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                layers.showRouteLines
                  ? 'bg-amber-400/15 border-amber-400/50 text-white'
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Route className={`w-4 h-4 ${layers.showRouteLines ? 'text-amber-400' : 'text-slate-400'}`} />
                <div>
                  <span className="font-semibold text-xs block">Trajetos no Mapa (Opcional)</span>
                  <span className="text-[10px] text-slate-400">Estradas ou carris do selecionado (1 de cada vez)</span>
                </div>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
                  layers.showRouteLines ? 'bg-amber-400' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                    layers.showRouteLines ? 'left-4' : 'left-0.5'
                  }`}
                />
              </div>
            </div>

            {/* Tráfego / Atrasos */}
            <div
              onClick={() => onToggleLayer('showTrafficHeatmap')}
              className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                layers.showTrafficHeatmap
                  ? 'bg-rose-500/15 border-rose-500/50 text-white'
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame className={`w-4 h-4 ${layers.showTrafficHeatmap ? 'text-rose-400' : 'text-slate-400'}`} />
                <div>
                  <span className="font-semibold text-xs block">Tráfego & Atrasos em Direto</span>
                  <span className="text-[10px] text-slate-400">Fluidez e velocidades reais</span>
                </div>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
                  layers.showTrafficHeatmap ? 'bg-rose-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                    layers.showTrafficHeatmap ? 'left-4' : 'left-0.5'
                  }`}
                />
              </div>
            </div>

            {/* Comboios Fertagus */}
            <div
              onClick={() => onToggleLayer('showFertagus')}
              className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                layers.showFertagus !== false
                  ? 'bg-sky-500/15 border-sky-500/50 text-white'
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Train className={`w-4 h-4 ${layers.showFertagus !== false ? 'text-sky-400' : 'text-slate-400'}`} />
                <div>
                  <span className="font-semibold text-xs block">Comboios Fertagus</span>
                  <span className="text-[10px] text-slate-400">Ponte 25 de Abril, 14 estações e GPS</span>
                </div>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
                  layers.showFertagus !== false ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                    layers.showFertagus !== false ? 'left-4' : 'left-0.5'
                  }`}
                />
              </div>
            </div>

            {/* Comboios CP (Comboios de Portugal) */}
            <div
              onClick={() => onToggleLayer('showCp')}
              className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                layers.showCp
                  ? 'bg-emerald-600/15 border-emerald-500/50 text-white'
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Train className={`w-4 h-4 ${layers.showCp ? 'text-emerald-400' : 'text-slate-400'}`} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs block">Comboios CP</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                      layers.showCp
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {layers.showCp ? '⚡ Desbloqueado' : '🔒 Bloqueado'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Linhas de Cascais, Sintra, Azambuja e Sado</span>
                </div>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
                  layers.showCp ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                    layers.showCp ? 'left-4' : 'left-0.5'
                  }`}
                />
              </div>
            </div>

            {/* MobiCascais - Autocarros de Cascais */}
            <div
              onClick={() => onToggleLayer('showMobiCascais')}
              className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                layers.showMobiCascais
                  ? 'bg-cyan-500/15 border-cyan-400/50 text-white'
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bus className={`w-4 h-4 ${layers.showMobiCascais ? 'text-cyan-400' : 'text-slate-400'}`} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs block">MobiCascais</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Sob Pedido
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Linhas municipais M01 a M44 (Cascais)</span>
                </div>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
                  layers.showMobiCascais ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                    layers.showMobiCascais ? 'left-4' : 'left-0.5'
                  }`}
                />
              </div>
            </div>

            {/* Barcos Transtejo & Soflusa (Rio Tejo) */}
            <div
              onClick={() => onToggleLayer('showBoats')}
              className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                layers.showBoats !== false
                  ? 'bg-sky-600/15 border-sky-500/50 text-white'
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Ship className={`w-4 h-4 ${layers.showBoats !== false ? 'text-sky-400' : 'text-slate-400'}`} />
                <div>
                  <span className="font-semibold text-xs block">Barcos Transtejo & Soflusa</span>
                  <span className="text-[10px] text-slate-400">Cacilheiros, catamarãs, 9 terminais e travessias do Tejo</span>
                </div>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
                  layers.showBoats !== false ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                    layers.showBoats !== false ? 'left-4' : 'left-0.5'
                  }`}
                />
              </div>
            </div>

            {/* Metro Sul do Tejo (MST / Trams) */}
            <div
              onClick={() => onToggleLayer('showMST')}
              className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                layers.showMST !== false
                  ? 'bg-teal-500/15 border-teal-400/50 text-white'
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Train className={`w-4 h-4 ${layers.showMST !== false ? 'text-teal-400' : 'text-slate-400'}`} />
                <div>
                  <span className="font-semibold text-xs block">Metro Sul do Tejo (MST)</span>
                  <span className="text-[10px] text-slate-400">Linhas 1, 2 e 3 (Cacilhas, Corroios, Pragal, Caparica)</span>
                </div>
              </div>
              <div
                className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
                  layers.showMST !== false ? 'bg-teal-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                    layers.showMST !== false ? 'left-4' : 'left-0.5'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Basemap Selector (OpenStreetMap Padrão) */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-0.5">
              Fornecedor do Mapa Base
            </span>
            <div className="grid grid-cols-2 gap-2">
              {TILE_STYLES.map((style) => {
                const isSelected = tileStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => setTileStyle(style.id)}
                    className={`py-2 px-2.5 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    <span>{style.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mapa Offline AML */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                if (onOpenOfflineMap) {
                  onOpenOfflineMap();
                }
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 hover:from-amber-500/25 hover:to-emerald-500/25 border border-amber-500/30 text-white font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">Mapa Offline da AML</span>
                  <span className="text-[10px] text-slate-400 font-normal block">Guardar no telemóvel para 0ms e sem rede</span>
                </div>
              </div>
              <span className="text-xs text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
