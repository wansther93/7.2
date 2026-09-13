import React, { useState, useMemo } from 'react';
import { 
  X, 
  Filter, 
  ArrowUpDown, 
  Tag, 
  Building2, 
  Tv, 
  Calendar, 
  BookOpen, 
  Star, 
  RotateCcw, 
  Check, 
  Search,
  CheckCircle2
} from 'lucide-react';
import type { Anime, SortOption } from '../types';
import { ALL_ANIME_GENRES, SORT_OPTIONS } from '../types';
import type { FilterStatus } from './StatusTabs';

const STATUS_ITEMS: { id: FilterStatus; label: string; shortLabel: string; dotColor: string }[] = [
  { id: 'all', label: 'Todos os Animes', shortLabel: 'Todos', dotColor: 'bg-indigo-400' },
  { id: 'watching', label: 'Assistindo', shortLabel: 'Assistindo', dotColor: 'bg-emerald-400' },
  { id: 'waiting_new_episodes', label: 'Esperando Novos Eps', shortLabel: 'Esperando', dotColor: 'bg-cyan-400' },
  { id: 'plan_to_watch', label: 'Quero Assistir', shortLabel: 'Quero Ver', dotColor: 'bg-amber-400' },
  { id: 'completed', label: 'Terminados', shortLabel: 'Terminados', dotColor: 'bg-purple-400' },
  { id: 'paused', label: 'Pausados', shortLabel: 'Pausados', dotColor: 'bg-yellow-400' },
  { id: 'dropped', label: 'Abandonados', shortLabel: 'Abandonados', dotColor: 'bg-slate-400' },
  { id: 'cancelled', label: 'Cancelados', shortLabel: 'Cancelados', dotColor: 'bg-rose-400' },
];

interface UnifiedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  animes: Anime[];

  // Status Filter
  currentFilter: FilterStatus;
  onSelectFilter: (filter: FilterStatus) => void;
  statusCounts: Record<FilterStatus, number>;
  
  // Sort
  sortOption: SortOption;
  onSelectSort: (sort: SortOption) => void;

  // Genre
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
  genreCounts: Record<string, number>;

  // Advanced Filters
  selectedStudio: string | null;
  onSelectStudio: (studio: string | null) => void;
  selectedFormat: string | null;
  onSelectFormat: (format: string | null) => void;
  selectedYear: number | null;
  onSelectYear: (year: number | null) => void;
  selectedSource: string | null;
  onSelectSource: (source: string | null) => void;
  minRating: number | null;
  onSelectMinRating: (rating: number | null) => void;
  
  onResetAll: () => void;
  activeFilterCount: number;
}

export const UnifiedFilterModal: React.FC<UnifiedFilterModalProps> = ({
  isOpen,
  onClose,
  animes,
  currentFilter,
  onSelectFilter,
  statusCounts,
  sortOption,
  onSelectSort,
  selectedGenre,
  onSelectGenre,
  genreCounts,
  selectedStudio,
  onSelectStudio,
  selectedFormat,
  onSelectFormat,
  selectedYear,
  onSelectYear,
  selectedSource,
  onSelectSource,
  minRating,
  onSelectMinRating,
  onResetAll,
  activeFilterCount,
}) => {
  const [studioSearch, setStudioSearch] = useState('');
  const [genreSearch, setGenreSearch] = useState('');

  // Collect available options with counts
  const { availableStudios, availableFormats, availableYears, availableSources } = useMemo(() => {
    const studioMap: Record<string, number> = {};
    const formatMap: Record<string, number> = {};
    const yearMap: Record<number, number> = {};
    const sourceMap: Record<string, number> = {};

    animes.forEach((a) => {
      if (a.studio && a.studio.trim()) {
        const s = a.studio.trim();
        studioMap[s] = (studioMap[s] || 0) + 1;
      }
      if (a.format && a.format.trim()) {
        const f = a.format.trim();
        formatMap[f] = (formatMap[f] || 0) + 1;
      }
      if (a.releaseYear && a.releaseYear > 1960) {
        yearMap[a.releaseYear] = (yearMap[a.releaseYear] || 0) + 1;
      }
      if (a.source && a.source.trim()) {
        const src = a.source.trim();
        sourceMap[src] = (sourceMap[src] || 0) + 1;
      }
    });

    const studios = Object.entries(studioMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .map(([name, count]) => ({ name, count }));

    const formats = Object.entries(formatMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .map(([name, count]) => ({ name, count }));

    const years = Object.entries(yearMap)
      .map(([yearStr, count]) => ({ year: Number(yearStr), count }))
      .sort((a, b) => b.year - a.year);

    const sources = Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .map(([name, count]) => ({ name, count }));

    return {
      availableStudios: studios,
      availableFormats: formats,
      availableYears: years,
      availableSources: sources,
    };
  }, [animes]);

  const filteredStudios = useMemo(() => {
    if (!studioSearch.trim()) return availableStudios;
    const q = studioSearch.toLowerCase().trim();
    return availableStudios.filter((s) => s.name.toLowerCase().includes(q));
  }, [availableStudios, studioSearch]);

  const filteredGenres = useMemo(() => {
    const list = ALL_ANIME_GENRES;
    if (!genreSearch.trim()) return list;
    const q = genreSearch.toLowerCase().trim();
    return list.filter((g) => g.toLowerCase().includes(q));
  }, [genreSearch]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#09090d] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-black/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                Filtros & Ordenação
              </h3>
              <p className="text-[11px] text-slate-400 truncate">Personalize a exibição da sua lista</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeFilterCount > 0 && (
              <>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold leading-none whitespace-nowrap shadow-xs">
                  <span>{activeFilterCount}</span>
                  <span className="text-[11px] font-medium opacity-90">{activeFilterCount === 1 ? 'ativo' : 'ativos'}</span>
                </span>

                <button
                  type="button"
                  onClick={onResetAll}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                  title="Limpar todos os filtros selecionados"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar filtros"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs no-scrollbar">
          
          {/* 1. Status do Anime */}
          <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Status do Anime</span>
              </label>
              {currentFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => onSelectFilter('all')}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                >
                  Ver Todos
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_ITEMS.map((item) => {
                const count = statusCounts[item.id] ?? 0;
                const isSelected = currentFilter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectFilter(item.id)}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold text-left transition-all flex items-center justify-between border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 shadow-sm font-bold'
                        : 'bg-black/40 text-slate-300 hover:text-white hover:bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.dotColor}`} />
                      <span className="truncate">{item.shortLabel}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-normal shrink-0 ${
                      isSelected ? 'bg-indigo-500/30 text-white' : 'bg-white/5 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Ordenação */}
          <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-3 space-y-2">
            <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ordem de Exibição</span>
            </label>

            <div className="grid grid-cols-2 gap-1.5">
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sortOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectSort(opt.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-left transition-all flex items-center justify-between border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50 shadow-sm'
                        : 'bg-black/30 text-slate-300 hover:text-white hover:bg-white/5 border-white/5'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Gêneros */}
          <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gênero</span>
              </label>
              {selectedGenre && (
                <button
                  type="button"
                  onClick={() => onSelectGenre(null)}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                >
                  Remover Gênero ({selectedGenre})
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
                placeholder="Filtrar gêneros..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-7 pr-3 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto no-scrollbar pt-0.5">
              <button
                type="button"
                onClick={() => onSelectGenre(null)}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold border transition-all cursor-pointer ${
                  selectedGenre === null
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-black/30 text-slate-400 hover:text-white border-white/5'
                }`}
              >
                Todos os Gêneros
              </button>
              {filteredGenres.map((g) => {
                const count = genreCounts[g] || 0;
                const isSelected = selectedGenre === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onSelectGenre(isSelected ? null : g)}
                    className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : count > 0
                        ? 'bg-black/40 text-slate-200 hover:text-white border-white/10'
                        : 'bg-black/20 text-slate-500 hover:text-slate-300 border-transparent'
                    }`}
                  >
                    <span>{g}</span>
                    {count > 0 && (
                      <span className={`text-[9px] px-1 py-0.1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Estúdios de Animação */}
          {availableStudios.length > 0 && (
            <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Estúdio de Animação</span>
                </label>
                {selectedStudio && (
                  <button
                    type="button"
                    onClick={() => onSelectStudio(null)}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    Remover Estúdio
                  </button>
                )}
              </div>

              {availableStudios.length > 6 && (
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={studioSearch}
                    onChange={(e) => setStudioSearch(e.target.value)}
                    placeholder="Buscar estúdio..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-7 pr-3 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto no-scrollbar">
                {filteredStudios.map((item) => {
                  const isSelected = selectedStudio?.toLowerCase() === item.name.toLowerCase();
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => onSelectStudio(isSelected ? null : item.name)}
                      className={`px-2 py-0.5 rounded-lg text-[10.5px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-black/30 text-slate-300 hover:text-white border-white/5'
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="text-[9px] text-slate-500">({item.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Formato & Ano & Nota */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Formato */}
            {availableFormats.length > 0 && (
              <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Formato</span>
                  </label>
                  {selectedFormat && (
                    <button
                      type="button"
                      onClick={() => onSelectFormat(null)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {availableFormats.map((item) => {
                    const isSelected = selectedFormat?.toLowerCase() === item.name.toLowerCase();
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => onSelectFormat(isSelected ? null : item.name)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-black/30 text-slate-300 hover:text-white border-white/5'
                        }`}
                      >
                        {item.name} ({item.count})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nota Mínima */}
            <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nota Mínima</span>
                </label>
                {minRating !== null && (
                  <button
                    type="button"
                    onClick={() => onSelectMinRating(null)}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                {[6, 7, 8, 9].map((rating) => {
                  const isSelected = minRating === rating;
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => onSelectMinRating(isSelected ? null : rating)}
                      className={`flex-1 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-black/30 text-slate-300 hover:text-white border-white/5'
                      }`}
                    >
                      ★ {rating}+
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-black/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {activeFilterCount > 0 ? `${activeFilterCount} filtro(s) aplicado(s)` : 'Sem filtros ativos'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
          >
            Aplicar & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
