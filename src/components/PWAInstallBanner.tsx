import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X, Smartphone, Check } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-400/40 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-md">
            <Download className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-white text-xs block truncate">Instalar Aplicação</span>
            <span className="text-[10px] text-slate-300 block truncate">Acesso instantâneo e mais fluido</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={install}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-transform hover:scale-105 cursor-pointer"
          >
            Instalar
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-400 hover:text-white"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs text-slate-200 truncate font-medium">Instalar no iPhone / iPad</span>
          </div>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-500/40 hover:bg-sky-500/30 text-sky-300 font-bold text-[11px] cursor-pointer"
          >
            Como Instalar
          </button>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-3.5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center mx-auto">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Instalar no iPhone / iPad</h3>
              <div className="text-xs text-slate-300 text-left space-y-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px] text-amber-400">1</span>
                  <span>Toque no botão <strong>Partilhar</strong> no Safari</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px] text-amber-400">2</span>
                  <span>Escolha <strong>Ecrã Principal</strong></span>
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer"
              >
                Compreendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
