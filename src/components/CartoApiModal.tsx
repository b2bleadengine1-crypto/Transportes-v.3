import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  CreditCard,
  Sparkles,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { MapTileStyle, CardValidationsData } from '../types';
import { fetchCardValidations } from '../services/api';

interface CartoApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartoApiKey: string;
  onSaveCartoApiKey: (key: string) => void;
  tileStyle: MapTileStyle;
  setTileStyle: (style: MapTileStyle) => void;
}

export const CartoApiModal: React.FC<CartoApiModalProps> = ({
  isOpen,
  onClose,
  cartoApiKey,
  onSaveCartoApiKey,
  tileStyle,
  setTileStyle,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(cartoApiKey);
  const [activeTab, setActiveTab] = useState<'carto' | 'cards'>('carto');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [validationsData, setValidationsData] = useState<CardValidationsData | null>(null);
  const [isLoadingValidations, setIsLoadingValidations] = useState(false);

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
        setTestMessage('Chave CARTO validada com sucesso! Azulejos Voyager e Dark operacionais.');
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

  const handleSave = () => {
    onSaveCartoApiKey(apiKeyInput.trim());
    setTestStatus('success');
    setTestMessage('Configuração de API guardada no navegador.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 text-slate-100 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-md">
              API
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Integração de APIs</h3>
              <p className="text-xs text-slate-400">CARTO Maps Basemaps & Validações de Cartões</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 mt-3 p-1 bg-slate-800/80 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('carto')}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'carto'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>CARTO Maps API (Cartografia)</span>
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'cards'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>API Validações de Cartões</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          {activeTab === 'carto' && (
            <>
              {/* Status info box */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-400/10 text-amber-400 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span>Camada de Azulejos CARTO Basemaps</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                      Chave CARTO Ativa
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    A aplicação está configurada com a sua chave CARTO dedicada para azulejos <strong>Raster</strong> e estilo <strong>Vector</strong>.
                  </p>
                  <div className="font-mono text-[10px] bg-slate-900/80 p-2 rounded border border-slate-800 text-slate-400 space-y-1">
                    <div><span className="text-amber-400 font-bold">Raster:</span> basemaps.cartocdn.com/rastertiles/voyager/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png?key=cb1_450g...</div>
                    <div><span className="text-sky-400 font-bold">Vector:</span> basemaps.cartocdn.com/gl/voyager-gl-style/style.json?key=cb1_450g...</div>
                  </div>
                </div>
              </div>

              {/* API Key Input */}
              <div className="space-y-2 bg-slate-800/30 border border-slate-800 rounded-xl p-3.5">
                <label className="block text-xs font-semibold text-slate-200">
                  Chave de API CARTO (?key=)
                </label>
                <div className="relative flex items-center">
                  <Key className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="cb1_450g_1_d08c11325e668926f6ab012f"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    A chave fica armazenada no seu navegador (localStorage).
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTestKey}
                      disabled={testStatus === 'testing'}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      {testStatus === 'testing' ? 'A testar...' : 'Testar Ligação'}
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                {testMessage && (
                  <div
                    className={`mt-2 p-2.5 rounded-lg flex items-center gap-2 text-xs ${
                      testStatus === 'success'
                        ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                        : testStatus === 'error'
                        ? 'bg-rose-950/60 border border-rose-800 text-rose-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {testStatus === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testMessage}</span>
                  </div>
                )}
              </div>

              {/* Map Tile Style Selector */}
              <div className="space-y-2 bg-slate-800/30 border border-slate-800 rounded-xl p-3.5">
                <span className="block text-xs font-semibold text-slate-200">
                  Estilo de Cartografia Selecionado
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTileStyle('carto-dark')}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      tileStyle === 'carto-dark'
                        ? 'border-amber-400 bg-amber-400/10 text-white'
                        : 'border-slate-800 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>CARTO Dark Matter</span>
                      {tileStyle === 'carto-dark' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Fundo escuro de alto contraste
                    </span>
                  </button>

                  <button
                    onClick={() => setTileStyle('carto-light')}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      tileStyle === 'carto-light'
                        ? 'border-amber-400 bg-amber-400/10 text-white'
                        : 'border-slate-800 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>CARTO Positron</span>
                      {tileStyle === 'carto-light' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Fundo claro minimalista
                    </span>
                  </button>

                  <button
                    onClick={() => setTileStyle('carto-voyager')}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      tileStyle === 'carto-voyager'
                        ? 'border-amber-400 bg-amber-400/10 text-white'
                        : 'border-slate-800 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>CARTO Voyager</span>
                      {tileStyle === 'carto-voyager' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Ruas detalhadas com pontos de interesse
                    </span>
                  </button>

                  <button
                    onClick={() => setTileStyle('osm')}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      tileStyle === 'osm'
                        ? 'border-amber-400 bg-amber-400/10 text-white'
                        : 'border-slate-800 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>OpenStreetMap Padrão</span>
                      {tileStyle === 'osm' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Cartografia OSM standard
                    </span>
                  </button>
                </div>
              </div>

              {/* Documentation Link */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
                <a
                  href="https://carto.com/basemaps/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <span>Portal Oficial CARTO Basemaps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>CARTO CDN v2.4</span>
              </div>
            </>
          )}

          {activeTab === 'cards' && (
            <>
              {/* Card Validations API info */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-400/10 text-emerald-400 mt-0.5">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-white flex items-center justify-between">
                    <span>API de Validações de Cartões Navegante</span>
                    <button
                      onClick={loadValidations}
                      disabled={isLoadingValidations}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingValidations ? 'animate-spin' : ''}`} />
                      Atualizar
                    </button>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Dados em direto fornecidos pelo endpoint <code>/metrics/videowall/validations</code> da Carris Metropolitana, registando todas as validações de passes e bilhetes Navegante nos validadores de bordo.
                  </p>
                </div>
              </div>

              {isLoadingValidations ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
                  <span>A carregar métricas de validação de cartões...</span>
                </div>
              ) : validationsData ? (
                <div className="space-y-3">
                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                        Validações Hoje (AML)
                      </span>
                      <div className="text-2xl font-black font-mono text-emerald-400 mt-1 tabular-nums">
                        {validationsData._cm_today_valid_count.toLocaleString('pt-PT')}
                      </div>
                      <span className="text-[10px] text-slate-500">em toda a rede da Carris Metr.</span>
                    </div>

                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                        Mesmo Dia Semana Passada
                      </span>
                      <div className="text-2xl font-black font-mono text-slate-200 mt-1 tabular-nums">
                        {validationsData._cm_last_week_valid_count.toLocaleString('pt-PT')}
                      </div>
                      <span className="text-[10px] text-slate-500">comparativo semanal</span>
                    </div>
                  </div>

                  {/* Per Area Breakdown */}
                  <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      Validações de Cartão por Área Operacional
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
                        <span className="font-semibold text-rose-400">Área 1 (Viação Alvorada)</span>
                        <div className="text-right font-mono">
                          <span className="font-bold text-white tabular-nums">
                            {validationsData._41_today_valid_count.toLocaleString('pt-PT')}
                          </span>
                          <span className="text-slate-400 text-[10px] block">
                            sem. anterior: {validationsData._41_last_week_valid_count.toLocaleString('pt-PT')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
                        <span className="font-semibold text-orange-400">Área 2 (Rodoviária de Lisboa)</span>
                        <div className="text-right font-mono">
                          <span className="font-bold text-white tabular-nums">
                            {validationsData._42_today_valid_count.toLocaleString('pt-PT')}
                          </span>
                          <span className="text-slate-400 text-[10px] block">
                            sem. anterior: {validationsData._42_last_week_valid_count.toLocaleString('pt-PT')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
                        <span className="font-semibold text-blue-400">Área 3 (Transportes Sul do Tejo)</span>
                        <div className="text-right font-mono">
                          <span className="font-bold text-white tabular-nums">
                            {validationsData._43_today_valid_count.toLocaleString('pt-PT')}
                          </span>
                          <span className="text-slate-400 text-[10px] block">
                            sem. anterior: {validationsData._43_last_week_valid_count.toLocaleString('pt-PT')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60">
                        <span className="font-semibold text-emerald-400">Área 4 (Alsa Todi)</span>
                        <div className="text-right font-mono">
                          <span className="font-bold text-white tabular-nums">
                            {validationsData._44_today_valid_count.toLocaleString('pt-PT')}
                          </span>
                          <span className="text-slate-400 text-[10px] block">
                            sem. anterior: {validationsData._44_last_week_valid_count.toLocaleString('pt-PT')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400">
                  <AlertCircle className="w-6 h-6 mx-auto text-amber-400 mb-2" />
                  <span>Métricas de cartão temporariamente indisponíveis na API.</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
