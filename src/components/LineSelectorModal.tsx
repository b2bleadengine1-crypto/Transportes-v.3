import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  Trash2,
  CheckSquare,
  Globe2,
  Train,
  Lock,
  Unlock,
  ShieldCheck,
  Layers,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { Line, AreaFilter } from '../types';
import { AREAS, getAreaForLine } from '../services/api';
import { CP_LINES, ALL_CP_STATIONS } from '../services/cpTrains';

interface LineSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  linesMap: Map<string, Line>;
  activeLines: string[];
  setActiveLines: (lines: string[]) => void;
  showAllVehicles: boolean;
  setShowAllVehicles: (showAll: boolean) => void;
  busesPerLine: Map<string, number>;
  totalVehiclesCount: number;
  onSelectExclusiveLine?: (lineId: string) => void;
  isCpUnlocked?: boolean;
  onToggleCpUnlocked?: (unlocked?: boolean) => void;
  onSelectCpLine?: (lineId: 'cascais' | 'sintra' | 'azambuja' | 'sado') => void;
  selectedCpLine?: 'cascais' | 'sintra' | 'azambuja' | 'sado' | null;
  initialTab?: OperatorTab;
}

export type OperatorTab = 'cmet' | 'carris' | 'mobi' | 'cp';

export const LineSelectorModal: React.FC<LineSelectorModalProps> = ({
  isOpen,
  onClose,
  linesMap,
  activeLines,
  setActiveLines,
  showAllVehicles,
  setShowAllVehicles,
  busesPerLine,
  totalVehiclesCount,
  onSelectExclusiveLine,
  isCpUnlocked = false,
  onToggleCpUnlocked,
  onSelectCpLine,
  selectedCpLine,
  initialTab = 'mobi',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorTab, setOperatorTab] = useState<OperatorTab>(initialTab); // Separado conforme pedido do utilizador

  // Atualiza o separador ativo sempre que o utilizador escolhe um operador específico no menu
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setOperatorTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all'); // Sub-áreas Carris Metrop.
  const [onlyWithActiveBuses, setOnlyWithActiveBuses] = useState(false);
  // Regra do utilizador: "com a mesma métrica de 1 selecionado cancela o anterior"
  const [isExclusiveMode, setIsExclusiveMode] = useState(true);

  // Linhas deduplicadas e ordenadas
  const linesList = useMemo(() => {
    const seen = new Set<string>();
    const list: Line[] = [];
    linesMap.forEach((line) => {
      const lineKey = line.short_name || line.id;
      if (lineKey && !seen.has(lineKey)) {
        seen.add(lineKey);
        list.push(line);
      }
    });

    return list.sort((a, b) => {
      const busesA = busesPerLine.get(a.short_name || a.id) || 0;
      const busesB = busesPerLine.get(b.short_name || b.id) || 0;
      if (busesA !== busesB) {
        return busesB - busesA;
      }
      return (a.short_name || a.id).localeCompare(b.short_name || b.id, undefined, { numeric: true });
    });
  }, [linesMap, busesPerLine]);

  // Filtra linhas consoante o operador e sub-área
  const filteredLines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return linesList.filter((line) => {
      const lineId = (line.short_name || line.id).toUpperCase();
      const busCount = busesPerLine.get(lineId) || 0;

      if (onlyWithActiveBuses && busCount === 0 && operatorTab !== 'mobi') return false;

      // 1. Separador MobiCascais
      if (operatorTab === 'mobi') {
        if (!lineId.startsWith('M')) return false;
      }
      // 2. Separador Carris Lisboa
      else if (operatorTab === 'carris') {
        const isCarrisLisboa = lineId === '753' || lineId.startsWith('7') || lineId.startsWith('15E') || lineId.startsWith('28E');
        if (!isCarrisLisboa || lineId.startsWith('M')) return false;
      }
      // 3. Separador Carris Metropolitana
      else if (operatorTab === 'cmet') {
        if (lineId.startsWith('M')) return false;
        if (lineId === '753') return false;
        if (selectedAreaFilter !== 'all') {
          const area = getAreaForLine(lineId);
          if (area !== selectedAreaFilter) return false;
        }
      }

      if (q) {
        const matchId = lineId.toLowerCase().includes(q);
        const matchName = line.long_name?.toLowerCase().includes(q);
        if (!matchId && !matchName) return false;
      }

      return true;
    });
  }, [linesList, searchQuery, operatorTab, selectedAreaFilter, onlyWithActiveBuses, busesPerLine]);

  const activeLinesSet = useMemo(() => new Set(activeLines), [activeLines]);

  const handleLineClick = (lineId: string) => {
    if (isExclusiveMode) {
      // Regra explícita: 1 selecionado cancela o anterior
      if (activeLines.length === 1 && activeLines[0] === lineId) {
        setActiveLines([]);
      } else {
        if (onSelectExclusiveLine) {
          onSelectExclusiveLine(lineId);
        } else {
          setActiveLines([lineId]);
        }
      }
      onClose();
    } else {
      // Modo múltiplo tradicional
      if (activeLinesSet.has(lineId)) {
        setActiveLines(activeLines.filter((id) => id !== lineId));
      } else {
        setActiveLines([...activeLines, lineId]);
      }
    }
  };

  const handleSelectAllFiltered = () => {
    const newIds = new Set(activeLines);
    filteredLines.forEach((l) => {
      newIds.add(l.short_name || l.id);
    });
    setActiveLines(Array.from(newIds));
  };

  const handleClearAll = () => {
    setActiveLines([]);
  };

  const totalBusesForActiveLines = useMemo(() => {
    let sum = 0;
    activeLines.forEach((id) => {
      sum += busesPerLine.get(id) || 0;
    });
    return sum;
  }, [activeLines, busesPerLine]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col h-[90vh] sm:h-[84vh] overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Escolher Carreiras & Operadores</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold font-mono text-xs">
              {showAllVehicles
                ? `Todos (${totalVehiclesCount})`
                : `${activeLines.length} ativa(s)`}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Separador de Operadores (Carris Metrop, Carris Lisboa, MobiCascais, Comboios CP) */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/80 space-y-2.5 shrink-0">
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            {/* 1. MobiCascais */}
            <button
              onClick={() => setOperatorTab('mobi')}
              className={`py-2 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                operatorTab === 'mobi'
                  ? 'bg-cyan-500 text-slate-950 shadow-md border-cyan-300 font-black'
                  : 'bg-slate-800 text-cyan-300 border-slate-700 hover:bg-slate-700/80 hover:border-cyan-400/50'
              }`}
            >
              <span>MobiCascais</span>
              <span className={`text-[9px] font-mono font-bold ${operatorTab === 'mobi' ? 'text-slate-950' : 'text-slate-300'}`}>
                M01-M44
              </span>
            </button>

            {/* 2. Carris Metrop. */}
            <button
              onClick={() => setOperatorTab('cmet')}
              className={`py-2 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                operatorTab === 'cmet'
                  ? 'bg-amber-400 text-slate-950 shadow-md border-amber-300 font-black'
                  : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700/80 hover:border-amber-400/50'
              }`}
            >
              <span>C. Metropolitana</span>
              <span className={`text-[9px] font-mono font-bold ${operatorTab === 'cmet' ? 'text-slate-950' : 'text-slate-300'}`}>
                Áreas 1 a 4
              </span>
            </button>

            {/* 3. Carris Lisboa */}
            <button
              onClick={() => setOperatorTab('carris')}
              className={`py-2 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                operatorTab === 'carris'
                  ? 'bg-yellow-500 text-slate-950 shadow-md border-yellow-300 font-black'
                  : 'bg-slate-800 text-yellow-300 border-slate-700 hover:bg-slate-700/80 hover:border-yellow-400/50'
              }`}
            >
              <span>Carris Lisboa</span>
              <span className={`text-[9px] font-mono font-bold ${operatorTab === 'carris' ? 'text-slate-950' : 'text-slate-300'}`}>
                753 & Urbanos
              </span>
            </button>

            {/* 4. Comboios CP */}
            <button
              onClick={() => setOperatorTab('cp')}
              className={`py-2 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border relative ${
                operatorTab === 'cp'
                  ? 'bg-emerald-500 text-slate-950 shadow-md border-emerald-300 font-black'
                  : 'bg-slate-800 text-emerald-300 border-slate-700 hover:bg-slate-700/80 hover:border-emerald-400/50'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>Comboios CP</span>
                {!isCpUnlocked ? (
                  <Lock className="w-2.5 h-2.5 text-rose-400" />
                ) : (
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-300" />
                )}
              </div>
              <span className={`text-[9px] font-mono font-bold ${operatorTab === 'cp' ? 'text-slate-950' : 'text-slate-300'}`}>
                {isCpUnlocked ? 'Ativo' : 'Bloqueado'}
              </span>
            </button>
          </div>

          {/* Sub-bar: Opção de seleção e pesquisa */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            {/* Interruptor de Métrica: 1 selecionado cancela o anterior (Foco de Trajeto) */}
            <button
              onClick={() => setIsExclusiveMode(!isExclusiveMode)}
              className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isExclusiveMode
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="1 selecionado cancela o anterior para delinear o trajeto e as paragens dessa linha específica no mapa"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isExclusiveMode ? 'Foco Individual (1 cancela anterior)' : 'Seleção Múltipla'}</span>
            </button>

            {/* Sub-filtros para Carris Metropolitana */}
            {operatorTab === 'cmet' && (
              <div className="flex items-center gap-1">
                {[
                  { id: 'all', label: 'Todas Áreas' },
                  { id: '1', label: 'Área 1' },
                  { id: '2', label: 'Área 2' },
                  { id: '3', label: 'Área 3' },
                  { id: '4', label: 'Área 4' },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAreaFilter(a.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                      selectedAreaFilter === a.id
                        ? 'bg-amber-400 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Barra de Pesquisa */}
          {operatorTab !== 'cp' && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  operatorTab === 'mobi'
                    ? 'Pesquisar carreira MobiCascais (ex: M01, M02, Cascais, Guincho)...'
                    : operatorTab === 'carris'
                    ? 'Pesquisar carreira Carris Lisboa (ex: 753, Ponte)...'
                    : 'Pesquisar número de linha ou destino...'
                }
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3">
          {/* TAB 1: COMBOIOS CP */}
          {operatorTab === 'cp' ? (
            <div className="space-y-3">
              {/* Card de Estado do Servidor CP */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  !isCpUnlocked
                    ? 'bg-rose-950/40 border-rose-600/50'
                    : 'bg-emerald-950/40 border-emerald-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      !isCpUnlocked
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {!isCpUnlocked ? <Lock className="w-5 h-5 text-rose-400" /> : <Unlock className="w-5 h-5 text-emerald-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {!isCpUnlocked
                          ? 'API CP Bloqueada no Servidor'
                          : 'API CP Desbloqueada e Ativa'}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          !isCpUnlocked
                            ? 'bg-rose-500/30 text-rose-200'
                            : 'bg-emerald-500/30 text-emerald-200'
                        }`}
                      >
                        {!isCpUnlocked ? 'Servidor Bloqueado' : 'Pronto'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {!isCpUnlocked
                        ? 'Por defeito a API CP fica bloqueada no servidor. Clique no botão ao lado para desbloquear a circulação e horários.'
                        : 'Telemetria, horários e estações das 4 linhas ferroviárias desbloqueadas.'}
                    </p>
                  </div>
                </div>

                {onToggleCpUnlocked && (
                  <button
                    onClick={() => onToggleCpUnlocked(!isCpUnlocked)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 shadow-lg ${
                      !isCpUnlocked
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {!isCpUnlocked ? 'Desbloquear a Pedido' : 'Bloquear no Servidor'}
                  </button>
                )}
              </div>

              {/* Lista das 4 Linhas Ferroviárias CP */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  Linhas Ferroviárias da Área Metropolitana
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(CP_LINES) as ('cascais' | 'sintra' | 'azambuja' | 'sado')[]).map((lineKey) => {
                    const line = CP_LINES[lineKey];
                    const stations = ALL_CP_STATIONS.filter((s) => s.lines.includes(lineKey));
                    const isSelected = selectedCpLine === lineKey;

                    return (
                      <div
                        key={lineKey}
                        onClick={() => {
                          if (onSelectCpLine) {
                            onSelectCpLine(lineKey);
                            onClose();
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-950/60 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                            : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="px-2 py-0.5 rounded font-bold font-mono text-xs"
                                style={{ backgroundColor: line.color, color: line.textColor }}
                              >
                                {line.shortName}
                              </span>
                              <span className="text-xs font-bold text-white">{line.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-300 mt-1 font-medium">
                              {line.terminals.join(' ↔ ')}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                              {stations.length} estações
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-700/60">
                          <span>Material: {line.rollingStock}</span>
                          <span className="text-emerald-400 font-semibold">Delinear traçado &rarr;</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: AUTOCARROS (MobiCascais, Carris Metropolitana, Carris Lisboa) */
            <>
              {filteredLines.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <p className="font-semibold text-slate-300">Nenhuma carreira encontrada.</p>
                  <p className="text-slate-500 mt-1">Tente pesquisar por outro número ou área.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {filteredLines.map((line) => {
                    const lineId = (line.short_name || line.id).toUpperCase();
                    const isChecked = activeLinesSet.has(lineId);
                    const busesCount = busesPerLine.get(lineId) || 0;
                    const isMobi = lineId.startsWith('M');

                    return (
                      <div
                        key={lineId}
                        onClick={() => handleLineClick(lineId)}
                        className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer select-none border text-xs ${
                          isChecked
                            ? isMobi
                              ? 'bg-cyan-500/25 border-cyan-400 shadow-md ring-1 ring-cyan-400/50'
                              : 'bg-amber-400/20 border-amber-400 shadow-xs'
                            : 'bg-slate-800/40 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          {/* Checkbox indicator */}
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                              isChecked
                                ? isMobi
                                  ? 'bg-cyan-400 text-slate-950 font-black'
                                  : 'bg-amber-400 text-slate-950 font-black'
                                : 'border border-slate-600 bg-slate-900'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          {/* Line Number Badge */}
                          <div
                            className="px-1.5 py-0.5 rounded font-black font-mono text-xs shrink-0"
                            style={{
                              backgroundColor: line.color || (isMobi ? '#009FE3' : '#FFC600'),
                              color: line.text_color || (isMobi ? '#FFFFFF' : '#000000'),
                            }}
                          >
                            {lineId}
                          </div>

                          {/* Truncated line destination */}
                          <span className="text-[11px] text-slate-300 truncate font-medium">
                            {line.long_name || `Carreira ${lineId}`}
                          </span>
                        </div>

                        {/* Active Bus Count */}
                        <div className="shrink-0 pl-1">
                          {busesCount > 0 ? (
                            <span
                              className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${
                                isMobi
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {busesCount}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono">0</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-400 text-[11px]">
            {isExclusiveMode ? (
              <span className="text-cyan-300 font-medium">
                Delinear 1 trajeto e paragens na estrada ao selecionar
              </span>
            ) : (
              <span>
                <strong className="text-white">{activeLines.length}</strong> selecionada(s) ·{' '}
                <strong className="text-amber-400">{totalBusesForActiveLines}</strong> autocarros
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow-md transition-colors cursor-pointer"
          >
            Ver no Mapa &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
