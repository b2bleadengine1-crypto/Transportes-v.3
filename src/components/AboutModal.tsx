import React from 'react';
import { X, ExternalLink, Database, MapPin, Radio, ShieldCheck } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-amber-400/20">
            GT
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Guia de transportes Públicos</h3>
            <p className="text-xs text-slate-400">Transportes & Carreiras em Tempo Real · Área Metropolitana de Lisboa</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            Esta aplicação monitoriza a posição geográfica e o estado operacional em tempo real de
            toda a frota de autocarros da <strong>Carris Metropolitana</strong>, servindo os 18
            municípios da Grande Lisboa e Península de Setúbal, além de MobiCascais, CP, Fertagus, Transtejo e Metropolitano.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                <Radio className="w-4 h-4" />
                <span>GTFS-RT & GPS</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Dados oficiais emitidos pelos computadores de bordo e localizadores instalados nas viaturas com atualização a cada 10 segundos.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <div className="flex items-center gap-2 text-sky-400 font-semibold mb-1">
                <MapPin className="w-4 h-4" />
                <span>Cartografia Aberta</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Renderização fluida com Leaflet e camadas OpenStreetMap e CartoDB Positron / Dark Matter.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Áreas Operacionais
            </div>
            <ul className="space-y-1 text-slate-400 text-[11px]">
              <li><strong className="text-slate-200">Área 1 (1xxx):</strong> Amadora, Cascais, Lisboa, Oeiras, Sintra</li>
              <li><strong className="text-slate-200">Área 2 (2xxx):</strong> Loures, Mafra, Odivelas, Vila Franca de Xira</li>
              <li><strong className="text-slate-200">Área 3 (3xxx):</strong> Almada, Seixal, Sesimbra</li>
              <li><strong className="text-slate-200">Área 4 (4xxx):</strong> Alcochete, Barreiro, Moita, Montijo, Palmela, Setúbal</li>
            </ul>
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
            <a
              href="https://api.carrismetropolitana.pt"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>Documentação da API da Carris Metropolitana</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>Versão 2.4 · 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};
