import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  BatteryCharging,
  WifiOff,
  Map as MapIcon,
  RefreshCw,
  Cpu,
  Check,
  Layers,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import {
  getOfflineMapStatus,
  downloadSelectedAreas,
  deleteAmlOfflineMap,
  deleteAreaFromOffline,
  getServiceWorkerStatus,
  AML_SUB_AREAS,
  AmlOfflineArea,
  OfflineMapMeta,
  OfflineMapProgress,
  ServiceWorkerInfo,
  getInstalledAreaIds,
} from '../services/offlineMap';

interface OfflineMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineMapModal: React.FC<OfflineMapModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<OfflineMapMeta | null>(null);
  const [swInfo, setSwInfo] = useState<ServiceWorkerInfo | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(['lisboa_central', 'cascais_oeiras']);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<OfflineMapProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<'areas' | 'full' | 'info'>('areas');

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      loadSwStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      const s = await getOfflineMapStatus();
      setStatus(s);
      if (s.installedAreas && s.installedAreas.length > 0) {
        // Inicializa com as áreas já instaladas se existirem
        setSelectedAreaIds(s.installedAreas);
      }
    } catch {
      // safe fallback
    }
  };

  const loadSwStatus = async () => {
    try {
      const info = await getServiceWorkerStatus();
      setSwInfo(info);
    } catch {
      // safe fallback
    }
  };

  const handleToggleArea = (areaId: string) => {
    setSelectedAreaIds((prev) => {
      if (prev.includes(areaId)) {
        return prev.filter((id) => id !== areaId);
      } else {
        return [...prev, areaId];
      }
    });
  };

  const handleSelectAllAreas = () => {
    setSelectedAreaIds(AML_SUB_AREAS.map((a) => a.id));
  };

  const handleClearSelection = () => {
    setSelectedAreaIds([]);
  };

  const calculateSelectionStats = () => {
    let tiles = 0;
    let mb = 0;
    for (const id of selectedAreaIds) {
      const area = AML_SUB_AREAS.find((a) => a.id === id);
      if (area) {
        tiles += area.estimatedTiles;
        mb += area.estimatedMb;
      }
    }
    return {
      tiles,
      mb: Math.round(mb * 10) / 10,
    };
  };

  const handleDownloadSelected = async () => {
    if (selectedAreaIds.length === 0) {
      setErrorMsg('Selecione pelo menos uma área da Área Metropolitana de Lisboa.');
      return;
    }

    setIsDownloading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const stats = calculateSelectionStats();
    setProgress({
      total: stats.tiles,
      completed: 0,
      percent: 0,
      currentZoom: 10,
      bytesDownloaded: 0,
    });

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const res = await downloadSelectedAreas(
        selectedAreaIds,
        (p) => {
          setProgress(p);
        },
        controller.signal
      );

      if (res.success) {
        setSuccessMsg(
          `Áreas selecionadas da AML armazenadas com sucesso (${res.totalTiles} quadrículas)!`
        );
        await loadStatus();
        await loadSwStatus();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('cancelado')) {
        setErrorMsg('Download cancelado pelo utilizador.');
      } else {
        setErrorMsg(err.message || 'Erro ao descarregar azulejos via Service Worker.');
      }
    } finally {
      setIsDownloading(false);
      setAbortController(null);
    }
  };

  const handleDownloadFullAml = async () => {
    setIsDownloading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setProgress({
      total: 720,
      completed: 0,
      percent: 0,
      currentZoom: 10,
      bytesDownloaded: 0,
    });

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const allIds = AML_SUB_AREAS.map((a) => a.id);
      const res = await downloadSelectedAreas(
        ['all', ...allIds],
        (p) => {
          setProgress(p);
        },
        controller.signal
      );

      if (res.success) {
        setSuccessMsg(
          `Toda a Área Metropolitana de Lisboa guardada com sucesso (${res.totalTiles} quadrículas)!`
        );
        setSelectedAreaIds(allIds);
        await loadStatus();
        await loadSwStatus();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('cancelado')) {
        setErrorMsg('Download cancelado pelo utilizador.');
      } else {
        setErrorMsg(err.message || 'Erro ao descarregar mapa da AML.');
      }
    } finally {
      setIsDownloading(false);
      setAbortController(null);
    }
  };

  const handleCancelDownload = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('Tem a certeza que deseja remover todo o mapa offline da AML do telemóvel?')) {
      await deleteAmlOfflineMap();
      setSuccessMsg(null);
      setSelectedAreaIds([]);
      await loadStatus();
    }
  };

  const handleDeleteSingleArea = async (areaId: string, areaName: string) => {
    if (confirm(`Remover os dados offline de "${areaName}" do telemóvel?`)) {
      await deleteAreaFromOffline(areaId);
      setSelectedAreaIds((prev) => prev.filter((id) => id !== areaId));
      await loadStatus();
    }
  };

  if (!isOpen) return null;

  const currentStats = calculateSelectionStats();
  const installedAreaList = status?.installedAreas || [];

  return (
    <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Identificador PWA & Service Worker */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <MapIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">Mapa Offline da AML</h2>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  PWA Cache
                </span>
              </div>
              <p className="text-xs text-slate-400">Armazenamento local seletivo via Service Worker API</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Estado da Service Worker API */}
        <div className="px-5 py-2.5 bg-slate-950/90 border-b border-slate-800/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium text-[11px] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Service Worker API:
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-400">
              {swInfo?.isActive ? 'Ativo & Controlado' : swInfo?.isRegistered ? 'Registado' : 'Pronto'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
              Cache: Workbox
            </span>
            {status?.isInstalled && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                0 ms
              </span>
            )}
          </div>
        </div>

        {/* Seletor de Modo / Separadores */}
        <div className="flex items-center gap-1 px-5 pt-3 bg-slate-900 border-b border-slate-800/50">
          <button
            onClick={() => setActiveTab('areas')}
            className={`py-2 px-3 border-b-2 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'areas'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Áreas Selecionadas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {selectedAreaIds.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('full')}
            className={`py-2 px-3 border-b-2 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'full'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Toda a AML (~18 MB)</span>
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`py-2 px-3 border-b-2 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Vantagens & 0ms</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Progress Bar during download */}
          {isDownloading && progress && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-slate-200 font-mono">
                <span className="flex items-center gap-1.5 font-bold text-amber-300">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  Service Worker: A guardar azulejos (Zoom {progress.currentZoom})...
                </span>
                <span className="font-black text-amber-400 text-sm">{progress.percent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-400 rounded-full transition-all duration-150 shadow-md"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                <span>{progress.completed} de {progress.total} quadrículas processadas</span>
                <span>~{(progress.bytesDownloaded / (1024 * 1024)).toFixed(1)} MB gravados em Cache</span>
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: SELETOR DE ÁREAS DA AML (Service Worker API) */}
          {activeTab === 'areas' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Escolha as Áreas que Mais Utiliza
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Poupe espaço no telemóvel guardando apenas os seus corredores habituais
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllAreas}
                    className="text-[11px] text-amber-400 hover:underline font-semibold cursor-pointer"
                  >
                    Todas
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    onClick={handleClearSelection}
                    className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {/* Lista de Áreas Estratégicas */}
              <div className="space-y-2">
                {AML_SUB_AREAS.map((area) => {
                  const isSelected = selectedAreaIds.includes(area.id);
                  const isInstalled = installedAreaList.includes(area.id) || installedAreaList.includes('all');

                  return (
                    <div
                      key={area.id}
                      onClick={() => handleToggleArea(area.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-400/10 border-amber-400/50 shadow-md ring-1 ring-amber-400/20'
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-amber-400 border-amber-400 text-slate-950 font-bold'
                              : 'border-slate-600 bg-slate-800 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-white leading-tight">
                              {area.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {area.badge}
                            </span>
                            {isInstalled && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Guardado
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                            {area.subtitle}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-1.5">
                            <span>~{area.estimatedTiles} quadrículas</span>
                            <span>·</span>
                            <span>~{area.estimatedMb} MB</span>
                            <span>·</span>
                            <span className="text-amber-400/80">{area.operators.join(' · ')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Botão de remoção se já estiver instalado */}
                      {isInstalled && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSingleArea(area.id, area.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                          title="Remover apenas esta área"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Resumo da Seleção */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300 font-medium">
                    {selectedAreaIds.length} área(s) selecionada(s)
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-amber-400 font-bold">~{currentStats.tiles} quadrículas</span>
                  <span className="text-slate-500 text-[10px] ml-1.5">(~{currentStats.mb} MB)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TODA A ÁREA METROPOLITANA DE LISBOA COMPLETA */}
          {activeTab === 'full' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                      <MapIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Cobertura Total da AML</h4>
                      <p className="text-xs text-slate-400">18 Concelhos de Mafra a Setúbal</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-400 text-slate-950">
                    ~18 MB
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Descarrega toda a grelha de ruas, avenidas, ferrovias, cais e interfaces da Grande Lisboa
                  (zoom 10 a 14) através do Service Worker, garantindo funcionamento ininterrupto em qualquer concelho.
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <div>
                    <strong className="text-slate-200 block font-semibold">Norte e Oeste:</strong>
                    <span>Mafra, Sintra, Cascais, Loures, Odivelas, Vila Franca</span>
                  </div>
                  <div>
                    <strong className="text-slate-200 block font-semibold">Centro e Sul:</strong>
                    <span>Lisboa, Oeiras, Almada, Seixal, Barreiro, Montijo, Setúbal</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VANTAGENS TÉCNICAS & 0MS */}
          {activeTab === 'info' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <Zap className="w-4 h-4" />
                    <span>Velocidade 60 FPS</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    O mapa lê diretamente da memória flash interna do telemóvel a 0ms, eliminando qualquer atraso de rede.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <BatteryCharging className="w-4 h-4" />
                    <span>Poupança de Bateria</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    O modem 4G/5G não precisa de descarregar dezenas de imagens por segundo, mantendo o telemóvel fresco.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <WifiOff className="w-4 h-4" />
                    <span>Metro & Subterrâneo</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    As estações, linhas e ruas permanecem visíveis mesmo no fundo do túnel ou sem qualquer ligação de rede.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Estratégia de Cache do Service Worker:</span>
                <span className="font-mono text-emerald-400 font-bold">CacheFirst (Validade 60 dias)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Ações */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          {status?.isInstalled ? (
            <>
              <button
                onClick={handleDeleteAll}
                disabled={isDownloading}
                className="px-3.5 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar Cache</span>
              </button>

              {activeTab === 'areas' ? (
                <button
                  onClick={handleDownloadSelected}
                  disabled={isDownloading || selectedAreaIds.length === 0}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Guardar {selectedAreaIds.length} Área(s) Selecionada(s) (~{currentStats.mb} MB)</span>
                </button>
              ) : (
                <button
                  onClick={handleDownloadFullAml}
                  disabled={isDownloading}
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isDownloading ? 'animate-spin' : ''}`} />
                  <span>Reinstalar Toda a AML (~18 MB)</span>
                </button>
              )}
            </>
          ) : (
            <>
              {isDownloading ? (
                <button
                  onClick={handleCancelDownload}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar Armazenamento</span>
                </button>
              ) : activeTab === 'areas' ? (
                <button
                  onClick={handleDownloadSelected}
                  disabled={selectedAreaIds.length === 0}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 hover:opacity-95 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Armazenar {selectedAreaIds.length} Área(s) Selecionada(s) (~{currentStats.mb} MB)</span>
                </button>
              ) : (
                <button
                  onClick={handleDownloadFullAml}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Instalar Toda a AML no Telemóvel (~18 MB)</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
