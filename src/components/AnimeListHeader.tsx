import React from 'react';
import { 
  Tv, 
  Layers, 
  Flame, 
  CheckCircle2, 
  Bookmark, 
  Clock, 
  SlidersHorizontal,
  X
} from 'lucide-react';
import type { AnimeStatus } from '../types';
import type { FilterStatus } from './StatusTabs';

interface AnimeListHeaderProps {
  totalCount: number;
  filteredCount: number;
  currentFilter: FilterStatus;
  selectedGenre: string | null;
  airingTodayOnly: boolean;
  activeAdvancedFilterCount: number;
  onResetFilters?: () => void;
}

const FILTER_LABELS: Record<FilterStatus, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  all: { label: 'Todos os Animes', icon: Layers },
  watching: { label: 'Assistindo Agora', icon: Tv },
  waiting_new_episodes: { label: 'Esperando Novos Episódios', icon: Clock },
  plan_to_watch: { label: 'Quero Assistir', icon: Bookmark },
  completed: { label: 'Terminados', icon: CheckCircle2 },
  paused: { label: 'Pausados', icon: Clock },
  dropped: { label: 'Abandonados', icon: Layers },
  cancelled: { label: 'Cancelados', icon: Layers },
};

export const AnimeListHeader: React.FC<AnimeListHeaderProps> = ({
  totalCount,
  filteredCount,
  currentFilter,
  selectedGenre,
  airingTodayOnly,
  activeAdvancedFilterCount,
  onResetFilters,
}) => {
  const currentStatusInfo = FILTER_LABELS[currentFilter] || FILTER_LABELS.all;
  const StatusIcon = currentStatusInfo.icon;
  const hasActiveFilters = currentFilter !== 'all' || selectedGenre !== null || airingTodayOnly || activeAdvancedFilterCount > 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 mb-3 border-b border-slate-800/80">
      {/* Title & Collection Indicators */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
          <StatusIcon className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
              <span>Minha Lista de Animes</span>
            </h2>

            {/* Counter Badge */}
            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-bold">
              {filteredCount} {filteredCount === 1 ? 'anime' : 'animes'}
              {hasActiveFilters && filteredCount !== totalCount && (
                <span className="text-slate-500 font-normal"> de {totalCount}</span>
              )}
            </span>

            {/* Active Tag Indicators */}
            {currentFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center gap-1">
                {currentStatusInfo.label}
              </span>
            )}

            {airingTodayOnly && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Lançam Hoje
              </span>
            )}

            {selectedGenre && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                Gênero: {selectedGenre}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clear Filter Shortcut when active */}
      {hasActiveFilters && onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="self-start sm:self-center flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
          <span>Limpar filtros</span>
        </button>
      )}
    </div>
  );
};
