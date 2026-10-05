import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string; // e.g. 'max-h-[75vh]'
  headerAction?: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxHeight = 'max-h-[75vh]',
  headerAction,
}) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
      {/* Dimmed backdrop covering map lightly */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-300 animate-fade-in"
        aria-hidden="true"
      />

      {/* Sliding Sheet Container (50% - 75% height) */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${maxHeight} h-auto min-h-[45vh] bg-slate-900/98 backdrop-blur-xl border-t border-slate-700/80 rounded-t-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-slate-100 transition-transform duration-300 ease-out animate-slide-up`}
      >
        {/* Drag Handle Bar */}
        <div className="w-full flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 rounded-full bg-slate-600/80 hover:bg-slate-500 transition-colors" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate flex items-center gap-2">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-slate-400 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
              title="Fechar gaveta"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sheet Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
};
