import React from 'react';
import { Search, X, ArrowUpDown, LayoutGrid, LayoutList } from 'lucide-react';
import { SORT_OPTIONS, type SortOption } from '../types';

export type ViewMode = 'detailed' | 'grid';

interface QuickSearchProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalFiltered: number;
}

export const QuickSearch: React.FC<QuickSearchProps> = ({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
      {/* Search Input */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="input-quick-search"
          type="text"
          placeholder="Buscar anime pelo nome, arco ou anotação..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 transition-all outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Controls Area: Sort Selector + View Mode Switcher */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Sort Filter Selector */}
        <div className="relative flex-1 sm:flex-none">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
          </div>
          <select
            id="select-sort-order"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full sm:w-auto bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl pl-8 pr-8 py-2.5 text-xs font-medium text-slate-200 cursor-pointer outline-none appearance-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-500">
            <span className="text-[10px]">▼</span>
          </div>
        </div>

        {/* View Mode Toggle (Grade 4x4 vs Detalhado) */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
          <button
            type="button"
            id="btn-view-detailed"
            onClick={() => onViewModeChange('detailed')}
            title="Visualização em Cartões Detalhados"
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'detailed'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <LayoutList className="w-4 h-4" />
          </button>

          <button
            type="button"
            id="btn-view-grid"
            onClick={() => onViewModeChange('grid')}
            title="Visualização em Grade Compacta (4 por linha)"
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
