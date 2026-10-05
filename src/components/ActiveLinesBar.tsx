import React from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import { Line } from '../types';
import { getLineFallbackColor } from '../services/api';

interface ActiveLinesBarProps {
  activeLines: string[];
  linesMap: Map<string, Line>;
  onRemoveLine: (lineId: string) => void;
  currentDirectionLabel?: string | null;
  onOpenDirectionModal: () => void;
}

/**
 * Faixa mínima no topo, visível apenas quando há linhas escolhidas.
 * Sem linhas escolhidas não ocupa ecrã nenhum.
 */
export const ActiveLinesBar: React.FC<ActiveLinesBarProps> = ({
  activeLines,
  linesMap,
  onRemoveLine,
  currentDirectionLabel,
  onOpenDirectionModal,
}) => {
  if (activeLines.length === 0 && !currentDirectionLabel) return null;

  return (
    <div
      className="absolute left-3 right-3 z-30 flex items-center gap-2 overflow-x-auto pointer-events-auto"
      style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))', scrollbarWidth: 'none' }}
    >
      {activeLines.map((lineId) => {
        const lineInfo = linesMap.get(lineId);
        const fallback = getLineFallbackColor(lineId);
        return (
          <div
            key={lineId}
            className="inline-flex items-center rounded-full shadow-lg text-sm font-mono font-black border-2 border-white/60 overflow-hidden shrink-0"
            style={{ backgroundColor: lineInfo?.color || fallback.bg, color: lineInfo?.text_color || fallback.text }}
          >
            <span className="px-3 py-1.5">{lineId}</span>
            <button
              type="button"
              onClick={() => onRemoveLine(lineId)}
              className="px-2 py-1.5 hover:bg-black/30 active:bg-black/50 border-l border-black/20 flex items-center cursor-pointer"
              aria-label={`Remover linha ${lineId}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      {currentDirectionLabel && (
        <button
          type="button"
          onClick={onOpenDirectionModal}
          className="px-3 py-1.5 rounded-full text-sm font-black whitespace-nowrap flex items-center gap-1.5 bg-amber-400 text-slate-950 border-2 border-amber-300 shadow-xl active:scale-95 cursor-pointer shrink-0"
          aria-label="Mudar o sentido"
        >
          <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
          <span className="max-w-[200px] truncate">Sentido: {currentDirectionLabel}</span>
        </button>
      )}
    </div>
  );
};
