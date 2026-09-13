import React from 'react';
import { Tag, Flame, X } from 'lucide-react';
import { HorizontalScrollContainer } from './HorizontalScrollContainer';

interface GenreFilterBarProps {
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
  airingTodayOnly: boolean;
  onToggleAiringToday: () => void;
  airingTodayCount: number;
  availableGenres: string[];
}

export const GenreFilterBar: React.FC<GenreFilterBarProps> = ({
  selectedGenre,
  onSelectGenre,
  airingTodayOnly,
  onToggleAiringToday,
  airingTodayCount,
  availableGenres,
}) => {
  if (availableGenres.length === 0 && airingTodayCount === 0) {
    return null;
  }

  return (
    <div className="w-full pb-1">
      <HorizontalScrollContainer id="genre-filter-bar-container" scrollStep={140} autoCenterOnClick={true}>
        {/* Lançam Hoje Filter Pill */}
        {airingTodayCount > 0 && (
          <button
            type="button"
            id="btn-filter-airing-today"
            onClick={onToggleAiringToday}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border shrink-0 ${
              airingTodayOnly
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/25 scale-105'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${airingTodayOnly ? 'fill-slate-950' : 'fill-amber-400 text-amber-400'}`} />
            <span>Lançam Hoje ({airingTodayCount})</span>
          </button>
        )}

        {/* Todos os gêneros */}
        <button
          type="button"
          id="btn-filter-genre-all"
          onClick={() => onSelectGenre(null)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer select-none border shrink-0 ${
            selectedGenre === null && !airingTodayOnly
              ? 'bg-indigo-600/90 text-white border-indigo-500 shadow-sm'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800/80'
          }`}
        >
          <Tag className="w-3 h-3" />
          <span>Todos os Gêneros</span>
        </button>

        {/* Dynamic / Available Genres */}
        {availableGenres.map((genre) => {
          const isSelected = selectedGenre === genre && !airingTodayOnly;
          return (
            <button
              key={genre}
              type="button"
              id={`btn-filter-genre-${genre}`}
              onClick={() => {
                if (isSelected) {
                  onSelectGenre(null);
                } else {
                  onSelectGenre(genre);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer select-none border shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800/80'
              }`}
            >
              <span>{genre}</span>
              {isSelected && <X className="w-3 h-3 ml-0.5 opacity-80" />}
            </button>
          );
        })}
      </HorizontalScrollContainer>
    </div>
  );
};
