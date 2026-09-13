import React from 'react';
import { 
  Search, 
  X, 
  LayoutList, 
  LayoutGrid, 
  SlidersHorizontal
} from 'lucide-react';
import type { FilterStatus } from './StatusTabs';

interface FilterControlsBarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // View Mode
  viewMode: 'detailed' | 'grid';
  onViewModeChange: (mode: 'detailed' | 'grid') => void;

  // Status
  currentFilter: FilterStatus;
  onSelectFilter: (filter: FilterStatus) => void;
  statusCounts: Record<FilterStatus, number>;

  // Open Full Filters Modal
  onOpenFiltersModal: () => void;
  activeFilterCount: number;

  // Active Individual Filters for Micro-Chips
  selectedGenre?: string | null;
  onClearGenre?: () => void;
  selectedStudio?: string | null;
  onClearStudio?: () => void;
  selectedFormat?: string | null;
  onClearFormat?: () => void;
  selectedYear?: number | null;
  onClearYear?: () => void;
  minRating?: number | null;
  onClearRating?: () => void;
  onResetAllFilters?: () => void;
  totalFilteredCount: number;
}

export const FilterControlsBar: React.FC<FilterControlsBarProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  currentFilter,
  onSelectFilter,
  statusCounts,
  onOpenFiltersModal,
  activeFilterCount,
  selectedGenre,
  onClearGenre,
  selectedStudio,
  onClearStudio,
  selectedFormat,
  onClearFormat,
  selectedYear,
  onClearYear,
  minRating,
  onClearRating,
  onResetAllFilters,
  totalFilteredCount,
}) => {
  const isStatusFiltered = currentFilter !== 'all';
  const hasExtraFilters = Boolean(
    isStatusFiltered ||
    selectedGenre ||
    selectedStudio ||
    selectedFormat ||
    selectedYear !== null ||
    minRating !== null
  );

  return (
    <div className="w-full space-y-2 select-none">
      {/* Linha de Busca e Controles Flutuantes (Sem container/fundo cinza pesado ao redor) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        
        {/* 1. Busca por Nome / Estúdio (Com bordinha própria e foco) */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar animes por título, nome japonês ou estúdio..."
            className="w-full bg-[#0a0a0f] hover:bg-[#101017] focus:bg-[#14141d] border border-white/15 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-md"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. Botão "Filtros" Flutuante (Modal Unificado de Status, Gêneros, Ordenação e Avançados) */}
        <button
          type="button"
          onClick={onOpenFiltersModal}
          title="Abrir filtros de status, gêneros, ordenação e estúdios"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 shadow-md ${
            activeFilterCount > 0
              ? 'bg-indigo-600/30 border-indigo-500/70 text-indigo-200 shadow-indigo-500/20'
              : 'bg-[#0a0a0f] hover:bg-white/10 border-white/15 hover:border-white/25 text-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Filtros</span>
          {activeFilterCount > 0 && (
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-500 text-white leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* 3. Alternador de Modo de Exibição Flutuante (Grade 2x2 vs Lista Horizontal) */}
        <div className="flex items-center p-0.5 rounded-xl bg-[#0a0a0f] border border-white/15 shrink-0 shadow-md">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            title="Grade de Animes"
            className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('detailed')}
            title="Lista de Animes"
            className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
              viewMode === 'detailed'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Micro-Chips de Filtros Ativos */}
      {hasExtraFilters && (
        <div className="flex items-center gap-1.5 flex-wrap px-1">
          <span className="text-[10px] text-slate-400 font-medium">Filtros:</span>

          {isStatusFiltered && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
              <span>Status: {STATUS_ITEMS_MAP[currentFilter] || currentFilter}</span>
              <button type="button" onClick={() => onSelectFilter('all')} className="hover:text-white cursor-pointer">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {selectedGenre && onClearGenre && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
              <span>{selectedGenre}</span>
              <button type="button" onClick={onClearGenre} className="hover:text-white cursor-pointer">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {selectedStudio && onClearStudio && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-semibold">
              <span>{selectedStudio}</span>
              <button type="button" onClick={onClearStudio} className="hover:text-white cursor-pointer">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {selectedFormat && onClearFormat && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold">
              <span>{selectedFormat}</span>
              <button type="button" onClick={onClearFormat} className="hover:text-white cursor-pointer">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {selectedYear !== null && selectedYear !== undefined && onClearYear && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
              <span>Ano: {selectedYear}</span>
              <button type="button" onClick={onClearYear} className="hover:text-white cursor-pointer">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {minRating !== null && minRating !== undefined && onClearRating && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-semibold">
              <span>★ {minRating}+</span>
              <button type="button" onClick={onClearRating} className="hover:text-white cursor-pointer">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {onResetAllFilters && (
            <button
              type="button"
              onClick={onResetAllFilters}
              className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer ml-1"
            >
              Limpar tudo
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const STATUS_ITEMS_MAP: Record<FilterStatus, string> = {
  all: 'Todos',
  watching: 'Assistindo',
  waiting_new_episodes: 'Esperando eps',
  plan_to_watch: 'Quero assistir',
  completed: 'Terminado',
  paused: 'Pausado',
  dropped: 'Abandonado',
  cancelled: 'Cancelado',
};
