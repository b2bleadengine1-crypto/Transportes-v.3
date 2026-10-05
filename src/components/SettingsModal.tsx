import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  CreditCard,
  RefreshCw,
  Zap,
  Battery,
  Leaf,
  Clock,
  Sparkles,
  Sliders,
  Check,
  HardDrive,
  Download,
  Trash2,
  WifiOff,
  BatteryCharging,
} from 'lucide-react';
import { MapTileStyle, CardValidationsData } from '../types';
import { fetchCardValidations } from '../services/api';
import {
  getOfflineMapStatus,
  downloadAmlOfflineMap,
  deleteAmlOfflineMap,
  OfflineMapMeta,
  OfflineMapProgress,
} from '../services/offlineMap';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'refresh' | 'carto' | 'cards' | 'offline';
  smartRefreshEnabled: boolean;
  onToggleSmartRefresh: (enabled: boolean) => void;
  isUserInactive: boolean;
  currentRefreshInterval: number;
  baseRefreshInterval: number;
  onSelectRefreshInterval: (seconds: number) => void;
  inactivitySeconds: number;
  onSimulateInactivity?: () => void;
  onSimulateActivity?: () => void;
  cartoApiKey: string;
  onSaveCartoApiKey: (key: string) => void;
  tileStyle: MapTileStyle;
  setTileStyle: (style: MapTileStyle) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'refresh',
  smartRefreshEnabled,
  onToggleSmartRefresh,
  isUserInactive,
  currentRefreshInterval,
  baseRefreshInterval,
  onSelectRefreshInterval,
  inactivitySeconds,
  onSimulateInactivity,
  onSimulateActivity,
  cartoApiKey,
  onSaveCartoApiKey,
  tileStyle,
  setTileStyle,
}) => {
  const [activeTab, setActiveTab] = useState<'refresh' | 'carto' | 'cards' | 'offline'>(initialTab);
  const [apiKeyInput, setApiKeyInput] = useState(cartoApiKey);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [validationsData, setValidationsData] = useState<CardValidationsData | null>(null);
  const [isLoadingValidations, setIsLoadingValidations] = useState(false);

  // Offline AML Map State
  const [offlineStatus, setOfflineStatus] = useState<OfflineMapMeta | null>(null);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState<OfflineMapProgress | null>(null);
  const [offlineFeedback, setOfflineFeedback] = useState<string | null>(null);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getOfflineMapStatus().then(setOfflineStatus).catch(() => {});
    }
  }, [isOpen]);

  const handleDownloadOffline = async () => {
    setIsDownloadingOffline(true);
    setOfflineFeedback(null);
    setOfflineError(null);
    setOfflineProgress({ total: 720, completed: 0, percent: 0, currentZoom: 10, bytesDownloaded: 0 });

    try {
      const res = await downloadAmlOfflineMap((p) => {
        setOfflineProgress(p);
      });
      if (res.success) {
        setOfflineFeedback(`Mapa da AML instalado (${res.totalTiles} quadrículas)!`);
        const updated = await getOfflineMapStatus();
        setOfflineStatus(updated);
      }
    } catch (err: any) {
      setOfflineError(err.message || 'Erro ao descarregar mapa');
    } finally {
      setIsDownloadingOffline(false);
    }
  };

  const handleDeleteOffline = async () => {
    if (confirm('Tem a certeza que deseja remover o mapa da AML do telemóvel?')) {
      await deleteAmlOfflineMap();
      const updated = await getOfflineMapStatus();
      setOfflineStatus(updated);
      setOfflineFeedback('Mapa offline removido com sucesso.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    setApiKeyInput(cartoApiKey);
  }, [cartoApiKey]);

  useEffect(() => {
    if (isOpen && activeTab === 'cards' && !validationsData) {
      loadValidations();
    }
  }, [isOpen, activeTab]);

  const loadValidations = async () => {
    setIsLoadingValidations(true);
    const data = await fetchCardValidations();
    setValidationsData(data);
    setIsLoadingValidations(false);
  };

  const handleTestKey = async () => {
    setTestStatus('testing');
    const testKey = apiKeyInput.trim() || 'cb1_450g_1_d08c11325e668926f6ab012f';
    const url = `https://basemaps.cartocdn.com/rastertiles/voyager/11/1000/700.png?key=${encodeURIComponent(testKey)}`;

    try {
      const img = new Image();
      img.onload = () => {
        setTestStatus('success');
        setTestMessage('Chave CARTO validada com sucesso! Azulejos operacionais.');
        onSaveCartoApiKey(testKey);
      };
      img.onerror = () => {
        setTestStatus('error');
        setTestMessage('Não foi possível carregar azulejo com esta chave. Verifique se a chave é válida.');
      };
      img.src = url;
    } catch {
      setTestStatus('error');
      setTestMessage('Erro ao testar chave.');
    }
  };

  const handleSaveCarto = () => {
    onSaveCartoApiKey(apiKeyInput.trim());
    setTestStatus('success');
    setTestMessage('Configuração de API guardada no navegador.');
  };

  if (!isOpen) return null;

  const inactivityMinutes = Math.floor(inactivitySeconds / 60);
  const inactivityRemainingSec = inactivitySeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-4 sm:p-6 text-slate-100 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-md">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Definições da Aplicação</h3>
              <p className="text-xs text-slate-400">Desempenho, Atualização Inteligente & APIs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar definições"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch (Slidable track on narrow screens) */}
        <div className="cm-slider-track flex items-center gap-1 mt-3 p-1 bg-slate-800/80 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('refresh')}
            className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'refresh'
                ? 'bg-amber-400 text-slate-950 shadow-xs font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Smart Refresh</span>
            {smartRefreshEnabled && isUserInactive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('carto')}
            className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'carto'
                ? 'bg-amber-400 text-slate-950 shadow-xs font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>CARTO & Mapas</span>
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'cards'
                ? 'bg-amber-400 text-slate-950 shadow-xs font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Validações</span>
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={`flex-1 min-w-[125px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'offline'
                ? 'bg-amber-400 text-slate-950 shadow-xs font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Mapa Offline AML</span>
            {offlineStatus?.isInstalled && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          {/* TAB 1: FREQUÊNCIA DE ATUALIZAÇÃO & SMART REFRESH */}
          {activeTab === 'refresh' && (
            <div className="space-y-4">
              {/* Secção Principal: Escolha da Frequência de Atualizações */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">Frequência dos Trajetos & GPS</h4>
                      <p className="text-[11px] text-slate-400">Escolha entre sinal contínuo ao momento ou mais espaçado</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-400 text-slate-950 shadow-xs">
                    {baseRefreshInterval === 0
                      ? 'Manual'
                      : baseRefreshInterval <= 3
                      ? `Ao momento (${baseRefreshInterval}s)`
                      : baseRefreshInterval <= 6
                      ? `Rápido (${baseRefreshInterval}s)`
                      : baseRefreshInterval <= 15
                      ? `Espaçado (${baseRefreshInterval}s)`
                      : `Eco (${baseRefreshInterval}s)`}
                  </span>
                </div>

                {/* Grelha de Modos de Frequência */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Modo 1: Ao Momento (2s) */}
                  <div
                    onClick={() => onSelectRefreshInterval(2)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      baseRefreshInterval === 2
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md ring-1 ring-amber-400/30'
                        : 'bg-slate-900/60 border-slate-700/70 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${baseRefreshInterval === 2 ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-amber-400'}`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">Ao Momento (2s)</span>
                        {baseRefreshInterval === 2 && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">
                        Trajeto ao segundo com fluidez máxima. Ideal para seguir veículos a chegar à paragem.
                      </span>
                    </div>
                  </div>

                  {/* Modo 2: Rápido (5s) */}
                  <div
                    onClick={() => onSelectRefreshInterval(5)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      baseRefreshInterval === 5
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md ring-1 ring-amber-400/30'
                        : 'bg-slate-900/60 border-slate-700/70 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${baseRefreshInterval === 5 ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-sky-400'}`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">Rápido (5s)</span>
                        {baseRefreshInterval === 5 && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">
                        Equilíbrio recomendado. Trajeto em direto muito responsivo com consumo de rede moderado.
                      </span>
                    </div>
                  </div>

                  {/* Modo 3: Espaçado (15s) */}
                  <div
                    onClick={() => onSelectRefreshInterval(15)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      baseRefreshInterval === 15
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md ring-1 ring-amber-400/30'
                        : 'bg-slate-900/60 border-slate-700/70 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${baseRefreshInterval === 15 ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-emerald-400'}`}>
                      <Battery className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">Espaçado (15s)</span>
                        {baseRefreshInterval === 15 && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">
                        Atualizações mais espaçadas. Reduz o consumo de dados móveis e preserva a bateria.
                      </span>
                    </div>
                  </div>

                  {/* Modo 4: Muito Espaçado / Eco (30s) */}
                  <div
                    onClick={() => onSelectRefreshInterval(30)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      baseRefreshInterval === 30
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md ring-1 ring-amber-400/30'
                        : 'bg-slate-900/60 border-slate-700/70 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${baseRefreshInterval === 30 ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-emerald-500'}`}>
                      <Leaf className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">Muito Espaçado (30s)</span>
                        {baseRefreshInterval === 30 && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">
                        Máxima economia para viagens longas ou ligações lentas. Menos tráfego de dados.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra de Ajuste Personalizado (Slider de 2 a 60 segundos) */}
                <div className="p-3 bg-slate-900/70 border border-slate-700/70 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">Ajuste Livre do Intervalo:</span>
                    <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                      {baseRefreshInterval === 0 ? 'Pausado (Manual)' : `${baseRefreshInterval} segundos`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="60"
                    step="1"
                    value={baseRefreshInterval === 0 ? 30 : baseRefreshInterval}
                    onChange={(e) => onSelectRefreshInterval(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>⚡ 2s (Ao momento)</span>
                    <span>15s (Espaçado)</span>
                    <span>🔋 60s (Eco)</span>
                  </div>
                </div>
              </div>

              {/* Card de Smart Refresh Automático (Inatividade) */}
              <div
                onClick={() => onToggleSmartRefresh(!smartRefreshEnabled)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-4 ${
                  smartRefreshEnabled
                    ? 'bg-amber-400/10 border-amber-400/50 shadow-lg shadow-amber-400/5'
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                      smartRefreshEnabled ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    <Zap className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Smart Refresh em Segundo Plano</span>
                      {smartRefreshEnabled && (
                        <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] font-mono border border-emerald-500/40">
                          ATIVO
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                      Espaça automaticamente as atualizações quando o telemóvel estiver pousado ou sem interação há mais de <strong>5 minutos</strong>, poupando bateria.
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1.5 flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Ao tocar no ecrã ou mover o mapa, volta imediatamente à sua frequência escolhida.
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 mt-1 ${
                    smartRefreshEnabled ? 'bg-amber-400' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                      smartRefreshEnabled ? 'left-6.5' : 'left-0.5'
                    }`}
                  />
                </div>
              </div>

              {/* Real-time Status Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Monitor de Atividade & Polling
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    Intervalo atual: <strong className="text-amber-400 text-xs">{currentRefreshInterval}s</strong>
                  </span>
                </div>

                {/* State Badge */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Estado do Utilizador</span>
                    <div className="flex items-center gap-1.5 mt-1 font-semibold">
                      {isUserInactive ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                          <span className="text-amber-300">Inativo (&gt; 5 min)</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span className="text-emerald-300">Ativo</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      Sem interação há: {inactivityMinutes}m {inactivityRemainingSec}s
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Consumo de Recursos</span>
                    <div className="flex items-center gap-1.5 mt-1 font-semibold">
                      {smartRefreshEnabled && isUserInactive ? (
                        <>
                          <Battery className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 font-bold">Poupança Ativa (30s)</span>
                        </>
                      ) : smartRefreshEnabled ? (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-300">Pronto para poupança</span>
                        </>
                      ) : (
                        <span className="text-slate-400">Fixo a 10s</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      {smartRefreshEnabled && isUserInactive
                        ? '-66% de consumo de rede e CPU'
                        : 'Atualização frequente (10s)'}
                    </span>
                  </div>
                </div>

                {/* Simulation buttons for immediate testing */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Testar comportamento:</span>
                  <div className="flex items-center gap-1.5">
                    {onSimulateInactivity && (
                      <button
                        onClick={onSimulateInactivity}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                        title="Simular 5 minutos de inatividade para ver o Smart Refresh entrar em vigor imediatamente"
                      >
                        Simular Inatividade (&gt;5m)
                      </button>
                    )}
                    {onSimulateActivity && isUserInactive && (
                      <button
                        onClick={onSimulateActivity}
                        className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                        title="Simular movimento do utilizador para reativar intervalo de 10s"
                      >
                        Despertar (10s)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Technical Information & Benefits */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2 text-slate-300 text-[11px]">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Vantagens do Smart Refresh:
                </div>
                <ul className="space-y-1 text-slate-400 list-disc list-inside">
                  <li><strong>Redução de 66%</strong> no volume de pedidos HTTP enviados para a API da Carris Metropolitana enquanto o mapa estiver aberto em segundo plano ou no ambiente de trabalho.</li>
                  <li><strong>Maior duração da bateria</strong> em smartphones e computadores portáteis devido à diminuição do processamento JSON e renderização no mapa.</li>
                  <li><strong>Retoma instantânea</strong>: qualquer interação com o rato, teclado, toque no ecrã ou zoom do mapa restabelece imediatamente o ciclo regular de 10 segundos.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: CARTO MAPS API */}
          {activeTab === 'carto' && (
            <div className="space-y-4">
              <p className="text-slate-300 leading-relaxed">
                Esta aplicação utiliza a tecnologia cartográfica do <strong>CARTO Maps</strong> para
                renderizar azulejos com alto contraste e estética otimizada para visualização de transportes.
              </p>

              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">
                  Chave de API CARTO (Opcional):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="ex: cb1_450g_1_d08c11325e668926f6ab012f"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleTestKey}
                    disabled={testStatus === 'testing'}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {testStatus === 'testing' ? 'A testar...' : 'Validar'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Por defeito é utilizada a chave pública gratuita configurada no sistema.
                </p>
              </div>

              {testStatus === 'success' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span>{testMessage}</span>
                </div>
              )}

              {testStatus === 'error' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{testMessage}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleSaveCarto}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Guardar Chave
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CARDS VALIDATIONS */}
          {activeTab === 'cards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white">Validações de Cartões em Tempo Real</h4>
                  <p className="text-[11px] text-slate-400">
                    Métricas de validação de títulos Navegante na rede Carris Metropolitana.
                  </p>
                </div>
                <button
                  onClick={loadValidations}
                  disabled={isLoadingValidations}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors cursor-pointer"
                  title="Atualizar dados de validações"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingValidations ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isLoadingValidations ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
                  <span>A carregar telemetria de validações...</span>
                </div>
              ) : validationsData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Validações Hoje (AML)</span>
                      <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">
                        {validationsData._cm_today_valid_count.toLocaleString('pt-PT')}
                      </span>
                      <span className="text-[10px] text-slate-500">em toda a rede Carris Metr.</span>
                    </div>
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Semana Anterior</span>
                      <span className="text-xl font-black font-mono text-slate-200 mt-1 block">
                        {validationsData._cm_last_week_valid_count.toLocaleString('pt-PT')}
                      </span>
                      <span className="text-[10px] text-slate-500">mesmo dia semana passada</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Por Área Operacional</span>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div className="p-2 rounded-lg bg-slate-800/60 flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Área 1</span>
                        <span className="font-mono font-bold text-white">{validationsData._41_today_valid_count.toLocaleString('pt-PT')}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/60 flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Área 2</span>
                        <span className="font-mono font-bold text-white">{validationsData._42_today_valid_count.toLocaleString('pt-PT')}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/60 flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Área 3</span>
                        <span className="font-mono font-bold text-white">{validationsData._43_today_valid_count.toLocaleString('pt-PT')}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/60 flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Área 4</span>
                        <span className="font-mono font-bold text-white">{validationsData._44_today_valid_count.toLocaleString('pt-PT')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-800/40 rounded-xl text-center text-slate-400">
                  Sem dados de validações disponíveis de momento.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MAPA OFFLINE DA AML */}
          {activeTab === 'offline' && (
            <div className="space-y-4">
              {/* Status Card */}
              <div className={`p-4 rounded-2xl border ${
                offlineStatus?.isInstalled 
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' 
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      offlineStatus?.isInstalled 
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {offlineStatus?.isInstalled ? <CheckCircle2 className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">
                        {offlineStatus?.isInstalled ? 'Mapa da AML Instalado no Telemóvel' : 'Mapa Não Instalado Localmente'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {offlineStatus?.isInstalled 
                          ? `${offlineStatus.totalTiles} quadrículas guardadas (~${offlineStatus.estimatedMb} MB)`
                          : 'As quadrículas são descarregadas via 4G/5G a cada toque'}
                      </div>
                    </div>
                  </div>
                  {offlineStatus?.isInstalled && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      0 ms
                    </span>
                  )}
                </div>

                {/* Progress bar during download */}
                {isDownloadingOffline && offlineProgress && (
                  <div className="mt-4 pt-3 border-t border-slate-700/60">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-mono mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        A guardar AML (Zoom {offlineProgress.currentZoom})...
                      </span>
                      <span className="font-bold text-amber-400">{offlineProgress.percent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-150"
                        style={{ width: `${offlineProgress.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5">
                      <span>{offlineProgress.completed} de {offlineProgress.total} azulejos</span>
                      <span>~{(offlineProgress.bytesDownloaded / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback messages */}
              {offlineError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{offlineError}</span>
                </div>
              )}
              {offlineFeedback && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{offlineFeedback}</span>
                </div>
              )}

              {/* Vantagens Técnicas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Zap className="w-4 h-4" />
                    <span>Fluidez 60 FPS</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    O mapa move-se com 0 ms de atraso a ler da memória flash local.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <BatteryCharging className="w-4 h-4" />
                    <span>Poupança de Bateria</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    O modem móvel desliga o esforço contínuo e o telemóvel não aquece.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <WifiOff className="w-4 h-4" />
                    <span>Túneis & Metro</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    O mapa e paragens continuam 100% visíveis mesmo sem qualquer rede móvel.
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 pt-1">
                {offlineStatus?.isInstalled ? (
                  <>
                    <button
                      onClick={handleDeleteOffline}
                      className="px-3.5 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-bold text-xs transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remover do Telemóvel</span>
                    </button>
                    <button
                      onClick={handleDownloadOffline}
                      disabled={isDownloadingOffline}
                      className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isDownloadingOffline ? 'animate-spin' : ''}`} />
                      <span>Atualizar Mapa Offline</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleDownloadOffline}
                    disabled={isDownloadingOffline}
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloadingOffline ? 'A descarregar...' : 'Instalar Mapa da AML no Telemóvel (~18 MB)'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Guia de Transportes Públicos</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
