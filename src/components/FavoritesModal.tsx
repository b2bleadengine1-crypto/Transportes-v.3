import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Star,
  Bus,
  Train,
  Ship,
  Trash2,
  ExternalLink,
  MapPin,
  Check,
  Plus,
  Sparkles,
  ChevronRight,
  Filter,
  Search,
  CheckSquare,
  Square,
  RotateCcw,
  SlidersHorizontal,
  BookmarkCheck,
  Eye,
} from 'lucide-react';
import { Line } from '../types';
import { getLineFallbackColor } from '../services/api';
import {
  FavoriteItem,
  FavoriteCatalogItem,
  getStoredFavorites,
  saveStoredFavorites,
  isItemFavorite,
  toggleStoredFavorite,
  setStoredFavoriteStatus,
  getAllCatalogItems,
  resetFavoritesToDefault,
  clearAllFavorites,
  selectPopularFavorites,
  useFavorites,
} from '../services/favoritesCatalog';

export {
  getStoredFavorites,
  saveStoredFavorites,
  isItemFavorite,
  toggleStoredFavorite,
  useFavorites,
};
export type { FavoriteItem };

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLine: (lineId: string) => void;
  onSelectBoatLine?: (lineId: string) => void;
  onSelectMSTLine?: (lineId: string) => void;
  onSelectCpLine?: (lineId: 'cascais' | 'sintra' | 'azambuja' | 'sado') => void;
  onSelectMetroLine?: (lineId: 'amarela' | 'azul' | 'verde' | 'vermelha') => void;
  activeLines: string[];
  onToggleActiveLine: (lineId: string) => void;
  linesMap?: Map<string, Line>;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  onSelectLine,
  onSelectBoatLine,
  onSelectMSTLine,
  onSelectCpLine,
  onSelectMetroLine,
  activeLines,
  onToggleActiveLine,
  linesMap,
}) => {
  const { favorites, isFavorite, toggleFavorite, removeFavorite, setFavoriteStatus } = useFavorites();
  
  // Tab principal: Meus Favoritos vs Selecionar / Personalizar Favoritos
  const [activeTab, setActiveTab] = useState<'my_favorites' | 'select_favorites'>('my_favorites');

  // Filtros da aba de seleção
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorCategory, setOperatorCategory] = useState<
    'all' | 'mobi' | 'cmet' | 'carris' | 'metro' | 'cp' | 'fertagus' | 'boat' | 'mst'
  >('all');
  const [selectionFilter, setSelectionFilter] = useState<'all' | 'selected' | 'unselected'>('all');

  // Filtro de categorias na aba "Meus Favoritos"
  const [myCategoryFilter, setMyCategoryFilter] = useState<'all' | 'bus' | 'train' | 'metro' | 'boat' | 'tram'>('all');

  // Feedback toast temporário
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Se não houver favoritos guardados ao abrir, sugere automaticamente a aba de seleção
  useEffect(() => {
    if (isOpen && favorites.length === 0) {
      setActiveTab('select_favorites');
    }
  }, [isOpen, favorites.length]);

  // Catálogo completo de transportes da AML (fundindo MobiCascais, Carris, Metro, CP, Fertagus, Transtejo, MST e Carris Metropolitana)
  const fullCatalog = useMemo(() => {
    return getAllCatalogItems(linesMap);
  }, [linesMap]);

  // Itens filtrados para a tela de Selecionar Favoritos
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return fullCatalog.filter((item) => {
      // 1. Filtro por Operador
      if (operatorCategory !== 'all' && item.operatorCategory !== operatorCategory) {
        return false;
      }

      // 2. Filtro por Estado de Seleção
      const isFav = isFavorite(item.id);
      if (selectionFilter === 'selected' && !isFav) return false;
      if (selectionFilter === 'unselected' && isFav) return false;

      // 3. Pesquisa por texto
      if (q) {
        const matchId = item.id.toLowerCase().includes(q);
        const matchShort = item.shortName.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchSubtitle = item.subtitle?.toLowerCase().includes(q) || false;
        const matchOperator = item.operator.toLowerCase().includes(q);
        if (!matchId && !matchShort && !matchName && !matchSubtitle && !matchOperator) {
          return false;
        }
      }

      return true;
    });
  }, [fullCatalog, operatorCategory, selectionFilter, searchQuery, isFavorite]);

  // Itens filtrados da lista de favoritos guardados
  const filteredFavorites = useMemo(() => {
    if (myCategoryFilter === 'all') return favorites;
    return favorites.filter((f) => f.type === myCategoryFilter);
  }, [favorites, myCategoryFilter]);

  if (!isOpen) return null;

  const handleToggleItemFavorite = (catalogItem: FavoriteCatalogItem) => {
    const currentlyFav = isFavorite(catalogItem.id);
    const itemToSave: FavoriteItem = {
      id: catalogItem.id,
      name: catalogItem.name,
      type: catalogItem.type,
      operator: catalogItem.operator,
      color: catalogItem.color,
      textColor: catalogItem.textColor,
      subtitle: catalogItem.subtitle,
      addedAt: Date.now(),
    };

    setFavoriteStatus(itemToSave, !currentlyFav);

    setToastMessage(
      !currentlyFav
        ? `⭐ "${catalogItem.shortName}" adicionado aos favoritos!`
        : `🗑️ "${catalogItem.shortName}" removido dos favoritos.`
    );
  };

  const handleOpenItem = (item: FavoriteItem) => {
    onClose();
    if (item.type === 'boat' && onSelectBoatLine) {
      onSelectBoatLine(item.id);
    } else if (item.type === 'tram' && onSelectMSTLine) {
      onSelectMSTLine(item.id.replace('MST_', ''));
    } else if (item.type === 'train' && onSelectCpLine) {
      const lineKey = item.id.replace('CP_', '').toLowerCase() as 'cascais' | 'sintra' | 'azambuja' | 'sado';
      onSelectCpLine(lineKey);
    } else if (item.type === 'metro' && onSelectMetroLine) {
      const lineKey = item.id.replace('METRO_', '').toLowerCase() as 'amarela' | 'azul' | 'verde' | 'vermelha';
      onSelectMetroLine(lineKey);
    } else {
      onSelectLine(item.id);
    }
  };

  const handleSelectPopular = () => {
    selectPopularFavorites();
    setToastMessage('⭐ Selecionadas as 11 carreiras e linhas mais populares da AML!');
  };

  const handleClearAll = () => {
    if (window.confirm('Tem a certeza de que pretende remover todos os transportes dos seus favoritos?')) {
      clearAllFavorites();
      setToastMessage('Todos os favoritos foram removidos.');
    }
  };

  const handleResetDefaults = () => {
    resetFavoritesToDefault();
    setToastMessage('Favoritos restaurados para as opções recomendadas.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh] sm:h-[86vh] text-slate-100">
        
        {/* Toast Notificação de Feedback */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-full shadow-2xl shadow-amber-400/30 flex items-center gap-2 border border-amber-300 animate-in slide-in-from-top-2 duration-150">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Principal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30 shadow-inner">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                  Transportes Favoritos
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold font-mono">
                  {favorites.length} {favorites.length === 1 ? 'escolhido' : 'escolhidos'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Selecione o que pretende de favoritos na Área Metropolitana de Lisboa
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Separador de Abas: Meus Favoritos vs Selecionar / Personalizar Favoritos */}
        <div className="p-2 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-1 rounded-2xl border border-slate-800">
            {/* Aba 1: Meus Favoritos */}
            <button
              onClick={() => setActiveTab('my_favorites')}
              className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'my_favorites'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Meus Favoritos</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'my_favorites' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {favorites.length}
              </span>
            </button>

            {/* Aba 2: Selecionar o que pretendo de Favoritos */}
            <button
              onClick={() => setActiveTab('select_favorites')}
              className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'select_favorites'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Selecionar Favoritos</span>
              <span className="hidden xs:inline-block px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider font-extrabold">
                Personalizar
              </span>
            </button>
          </div>
        </div>

        {/* CORPO DA ABA: SELECIONAR / PERSONALIZAR FAVORITOS */}
        {activeTab === 'select_favorites' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-900/60">
            {/* Barra de Pesquisa & Controlo de Filtro */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-950/60 space-y-2.5 shrink-0">
              {/* Campo de Pesquisa Instantânea */}
              <div className="relative">
                <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por linha (ex: 753, M01, 3009), operador ou destino..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Categorias por Operador (MobiCascais, Carris Metropolitana, Carris Lisboa, Metro, CP, Fertagus, Transtejo, MST) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
                {[
                  { id: 'all', label: 'Todos os Operadores', color: 'slate' },
                  { id: 'mobi', label: 'MobiCascais', color: 'cyan' },
                  { id: 'cmet', label: 'Carris Metropolitana', color: 'amber' },
                  { id: 'carris', label: 'Carris Lisboa', color: 'yellow' },
                  { id: 'metro', label: 'Metro de Lisboa', color: 'blue' },
                  { id: 'cp', label: 'Comboios CP', color: 'emerald' },
                  { id: 'fertagus', label: 'Fertagus', color: 'sky' },
                  { id: 'boat', label: 'Barcos (Soflusa)', color: 'indigo' },
                  { id: 'mst', label: 'Metro Sul do Tejo', color: 'teal' },
                ].map((cat) => {
                  const isSelected = operatorCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setOperatorCategory(cat.id as any)}
                      className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Filtro por Estado: Todos / Apenas Selecionados / Não Selecionados + Botões em Lote */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">Mostrar:</span>
                  <button
                    onClick={() => setSelectionFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer ${
                      selectionFilter === 'all'
                        ? 'bg-slate-700 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({fullCatalog.length})
                  </button>
                  <button
                    onClick={() => setSelectionFilter('selected')}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                      selectionFilter === 'selected'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold'
                        : 'text-slate-400 hover:text-amber-300'
                    }`}
                  >
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>Selecionados ({favorites.length})</span>
                  </button>
                  <button
                    onClick={() => setSelectionFilter('unselected')}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer ${
                      selectionFilter === 'unselected'
                        ? 'bg-slate-700 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Não Selecionados
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSelectPopular}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Selecionar as principais linhas da AML"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span className="hidden xs:inline">Linhas Populares</span>
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 font-semibold text-[10px] transition-colors cursor-pointer"
                    title="Remover todos os favoritos"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>

            {/* Lista Interativa de Seleção (Check / Uncheck) */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
              {filteredCatalog.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Filter className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-sm font-bold text-slate-300">Nenhum transporte encontrado</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Tente alterar a pesquisa ou remover os filtros de operador e estado de seleção.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredCatalog.map((catalogItem) => {
                    const isFav = isFavorite(catalogItem.id);

                    return (
                      <div
                        key={catalogItem.id}
                        onClick={() => handleToggleItemFavorite(catalogItem)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isFav
                            ? 'bg-amber-400/10 border-amber-400/80 shadow-md shadow-amber-400/5 ring-1 ring-amber-400/40'
                            : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60 hover:border-slate-600'
                        }`}
                      >
                        {/* Indicador de Seleção (Checkbox & Ícone de Operador) */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Checkbox interativa */}
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isFav
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'border border-slate-600 bg-slate-900/80 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>

                          {/* Badge do Transporte */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black font-mono text-xs shrink-0 shadow-md"
                            style={{
                              backgroundColor: catalogItem.color,
                              color: catalogItem.textColor,
                            }}
                          >
                            {catalogItem.type === 'boat' ? (
                              <Ship className="w-5 h-5" />
                            ) : catalogItem.type === 'train' || catalogItem.type === 'tram' ? (
                              <Train className="w-5 h-5" />
                            ) : (
                              catalogItem.shortName
                            )}
                          </div>

                          {/* Título e Percurso */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white truncate">
                                {catalogItem.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                              {catalogItem.subtitle}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300 font-semibold font-mono border border-slate-700">
                                {catalogItem.operator}
                              </span>
                              {catalogItem.area && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-400/10 text-amber-300 font-semibold font-mono border border-amber-400/20">
                                  {catalogItem.area}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botão de Estrela de Favorito */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleItemFavorite(catalogItem);
                          }}
                          className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                            isFav
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-bold'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-amber-300 hover:bg-slate-700'
                          }`}
                          title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                          aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        >
                          <Star className={`w-4 h-4 ${isFav ? 'fill-slate-950 text-slate-950' : ''}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rodapé da Aba de Seleção */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs shrink-0">
              <div className="text-slate-300 font-medium">
                <span className="text-amber-400 font-bold">{favorites.length}</span> selecionados como favoritos
              </div>
              <button
                onClick={() => setActiveTab('my_favorites')}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Concluir & Ver Meus Favoritos</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* CORPO DA ABA: MEUS FAVORITOS (LISTA ATIVA & ACESSO AO MAPA) */}
        {activeTab === 'my_favorites' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-900/60">
            {/* Banner de Atalho para Selecionar Mais */}
            <div className="p-3 border-b border-slate-800 bg-amber-400/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-200 font-semibold truncate">
                  Pretende selecionar mais transportes ou desmarcar linhas?
                </span>
              </div>
              <button
                onClick={() => setActiveTab('select_favorites')}
                className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                + Selecionar Favoritos
              </button>
            </div>

            {/* Categorias de Filtro rápido */}
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {[
                { id: 'all', label: `Todos (${favorites.length})`, icon: Star },
                { id: 'bus', label: 'Autocarros', icon: Bus },
                { id: 'train', label: 'Comboios (CP/Fertagus)', icon: Train },
                { id: 'metro', label: 'Metro de Lisboa', icon: Train },
                { id: 'boat', label: 'Barcos (Transtejo)', icon: Ship },
                { id: 'tram', label: 'Metro Sul do Tejo', icon: Train },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = myCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setMyCategoryFilter(cat.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-bold'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Lista dos Meus Favoritos */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1">
              {filteredFavorites.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 shadow-inner">
                    <Star className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-200">
                      {favorites.length === 0 ? 'Nenhum favorito selecionado ainda' : 'Nenhum transporte nesta categoria'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                      {favorites.length === 0
                        ? 'Clique no botão abaixo para escolher o que pretende de favoritos na AML.'
                        : 'Experimente selecionar a categoria "Todos" ou adicionar transportes desta categoria.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('select_favorites')}
                    className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Selecionar Meus Favoritos Agora</span>
                  </button>
                </div>
              ) : (
                filteredFavorites.map((item) => {
                  const fallback = getLineFallbackColor(item.id);
                  const bgColor = item.color || fallback.bg;
                  const textColor = item.textColor || fallback.text;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between gap-3 transition-colors shadow-sm"
                    >
                      <div
                        onClick={() => handleOpenItem(item)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono text-sm shrink-0 shadow-md"
                          style={{ backgroundColor: bgColor, color: textColor }}
                        >
                          {item.type === 'boat' ? (
                            <Ship className="w-5 h-5" />
                          ) : item.type === 'train' || item.type === 'tram' ? (
                            <Train className="w-5 h-5" />
                          ) : (
                            item.id.replace('MOBI_', '')
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{item.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-700 text-slate-300 font-mono font-semibold">
                              {item.operator}
                            </span>
                          </div>
                          {item.subtitle && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Botão de Ver e Centrar no Mapa */}
                        <button
                          onClick={() => handleOpenItem(item)}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                          title="Abrir e delinear traçado no mapa"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Ver no mapa</span>
                        </button>

                        {/* Botão Desmarcar / Remover */}
                        <button
                          onClick={() => {
                            removeFavorite(item.id);
                            setToastMessage(`🗑️ Removido dos favoritos: ${item.id}`);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                          title="Remover dos favoritos"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé Meus Favoritos */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Os seus favoritos ficam gravados no telemóvel e computador.</span>
              </div>
              <button
                onClick={() => setActiveTab('select_favorites')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Gerir / Selecionar &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
