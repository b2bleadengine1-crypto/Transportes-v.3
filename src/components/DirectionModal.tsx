import React from 'react';
import { X, ArrowRight, ArrowLeftRight, Navigation, Check } from 'lucide-react';
import { TransportDirectionInfo } from '../services/directions';

interface DirectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  directionInfo: TransportDirectionInfo | null;
  selectedDirection: number | null; // 0, 1, or null (both)
  onSelectDirection: (direction: number | null, label: string) => void;
}

export const DirectionModal: React.FC<DirectionModalProps> = ({
  isOpen,
  onClose,
  directionInfo,
  selectedDirection,
  onSelectDirection,
}) => {
  if (!isOpen || !directionInfo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-white animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 rounded-xl font-mono font-extrabold text-sm shadow-md"
              style={{
                backgroundColor: directionInfo.color,
                color: directionInfo.textColor,
              }}
            >
              {directionInfo.id}
            </span>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Escolha o Sentido</h2>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">{directionInfo.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-start gap-2.5">
            <Navigation className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Apenas os transportes a circular no trajeto selecionado serão transmitidos pelo servidor:
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Sentido 0: Ida */}
            <button
              onClick={() => {
                onSelectDirection(0, directionInfo.direction0Label);
                onClose();
              }}
              className={`w-full p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex items-center justify-between group ${
                selectedDirection === 0
                  ? 'bg-amber-400/15 border-amber-400 text-white shadow-lg ring-1 ring-amber-400/50'
                  : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
              }`}
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  Trajeto 1 (Ida)
                </span>
                <div className="text-sm font-bold flex items-center gap-2">
                  <span>{directionInfo.origin}</span>
                  <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                  <span className="text-white">{directionInfo.destination}</span>
                </div>
              </div>
              {selectedDirection === 0 && (
                <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </button>

            {/* Sentido 1: Volta */}
            <button
              onClick={() => {
                onSelectDirection(1, directionInfo.direction1Label);
                onClose();
              }}
              className={`w-full p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex items-center justify-between group ${
                selectedDirection === 1
                  ? 'bg-amber-400/15 border-amber-400 text-white shadow-lg ring-1 ring-amber-400/50'
                  : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
              }`}
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  Trajeto 2 (Volta)
                </span>
                <div className="text-sm font-bold flex items-center gap-2">
                  <span>{directionInfo.destination}</span>
                  <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                  <span className="text-white">{directionInfo.origin}</span>
                </div>
              </div>
              {selectedDirection === 1 && (
                <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </button>

            {/* Ambos os Sentidos */}
            <button
              onClick={() => {
                onSelectDirection(null, 'Ambos os Sentidos');
                onClose();
              }}
              className={`w-full p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex items-center justify-between ${
                selectedDirection === null
                  ? 'bg-slate-800 border-slate-500 text-white shadow-sm'
                  : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold">Ambos os Sentidos (Ver toda a circulação)</span>
              </div>
              {selectedDirection === null && (
                <span className="text-xs text-slate-300 font-mono">Ativo</span>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
          <p className="text-[11px] text-slate-500">
            Pode alterar o sentido a qualquer momento tocando na etiqueta do trajeto.
          </p>
        </div>
      </div>
    </div>
  );
};
