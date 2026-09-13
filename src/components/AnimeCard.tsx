import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  Tv, 
  ChevronDown, 
  Check, 
  Star, 
  Flame, 
  Search
} from 'lucide-react';
import type { Anime, AnimeStatus } from '../types';
import { STATUS_CONFIG } from '../types';
import { isAiringToday, isAnimeActiveAndAiringToday } from '../lib/dateUtils';

interface AnimeCardProps {
  anime: Anime;
  onOpenDetail: (anime: Anime) => void;
  onIncrement: (anime: Anime) => void;
  onDecrement: (anime: Anime) => void;
  onUpdateStatus: (anime: Anime, newStatus: AnimeStatus) => void;
  onUpdateEpisode?: (anime: Anime, newEpisode: number) => void;
  onSwitchSeason?: (anime: Anime, season: any) => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  onOpenDetail,
  onIncrement,
  onDecrement,
  onUpdateStatus,
  onUpdateEpisode,
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isEditingEp, setIsEditingEp] = useState(false);
  const [epInput, setEpInput] = useState(String(anime.currentEpisode));

  useEffect(() => {
    setEpInput(String(anime.currentEpisode));
  }, [anime.currentEpisode]);

  const handleCommitEp = () => {
    setIsEditingEp(false);
    const val = parseInt(epInput, 10);
    if (!isNaN(val) && val >= 0 && val !== anime.currentEpisode) {
      if (onUpdateEpisode) {
        onUpdateEpisode(anime, val);
      }
    } else {
      setEpInput(String(anime.currentEpisode));
    }
  };
  const statusInfo = STATUS_CONFIG[anime.status] || STATUS_CONFIG.watching;

  const activeSeason = anime.seasons?.find((s) => s.name === anime.currentSeasonName) || anime.seasons?.[0];
  const maxEp = activeSeason?.totalEpisodes || anime.totalEpisodes;
  const airingToday = isAnimeActiveAndAiringToday(anime);
  const progressPct = maxEp && maxEp > 0 ? Math.min(100, Math.round((anime.currentEpisode / maxEp) * 100)) : null;

  // Count uncompleted or future seasons
  const pendingSeasonsCount = anime.seasons && anime.seasons.length > 1
    ? anime.seasons.filter((s) => !s.isWatched && s.name !== anime.currentSeasonName).length
    : 0;

  return (
    <div
      id={`anime-card-${anime.id}`}
      onClick={() => onOpenDetail(anime)}
      className="group relative bg-[#09090d]/95 hover:bg-[#101017] rounded-2xl p-2 sm:p-2.5 transition-all duration-200 shadow-md shadow-black/80 flex items-center justify-between gap-2.5 sm:gap-3.5 select-none cursor-pointer"
    >
      {/* Left: Compact Cover Thumbnail (100% limpa, sem selo em cima da arte) */}
      <div
        onClick={() => onOpenDetail(anime)}
        className="relative w-14 h-18 sm:w-16 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-[#050507] border border-white/10 cursor-pointer shadow-md group-hover:scale-[1.02] transition-transform"
        title="Clique para ver detalhes completos"
      >
        {anime.coverUrl ? (
          <img
            src={anime.coverUrl}
            alt={anime.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-1 text-slate-600 text-center">
            <Tv className="w-4 h-4 mb-0.5 opacity-50" />
            <span className="text-[8px] font-medium leading-none">Sem capa</span>
          </div>
        )}

        {/* Airing Alert */}
        {anime.latestAiredEpisode && anime.latestAiredEpisode > anime.currentEpisode ? (
          <div className="absolute bottom-1 inset-x-0.5 bg-emerald-500 text-slate-950 font-black text-[7.5px] px-0.5 py-0.2 rounded text-center leading-tight shadow-sm animate-pulse">
            Ep. {anime.latestAiredEpisode}!
          </div>
        ) : airingToday ? (
          <div className="absolute bottom-1 inset-x-0.5 bg-amber-500 text-slate-950 font-black text-[7.5px] px-0.5 py-0.2 rounded text-center leading-tight shadow-sm">
            Hoje!
          </div>
        ) : null}
      </div>

      {/* Middle: Content Information (Title, Season, Status, Rating, Progress) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Status Dropdown Pill */}
          <div className="relative shrink-0 flex items-center">
            <button
              id={`btn-card-status-${anime.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusMenu(!showStatusMenu);
              }}
              className={`inline-flex items-center gap-1 px-2 h-[22px] rounded-full text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap ${statusInfo.bgClass}`}
              title="Alterar status"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusInfo.dotColor}`} />
              <span className="truncate max-w-[80px]">{statusInfo.shortLabel}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {showStatusMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStatusMenu(false);
                  }}
                />
                <div className="absolute left-0 top-full mt-1 z-50 w-44 bg-[#09090d] border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden backdrop-blur-2xl">
                  {(Object.keys(STATUS_CONFIG) as AnimeStatus[]).map((key) => {
                    const cfg = STATUS_CONFIG[key];
                    const isCurrent = anime.status === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateStatus(anime, key);
                          setShowStatusMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-[11px] flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                          isCurrent ? 'font-bold text-indigo-400 bg-white/5' : 'text-slate-200'
                        }`}
                      >
                        <span>{cfg.label}</span>
                        {isCurrent && <Check className="w-3 h-3 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Rating Tag ao lado do status (rigorosamente na mesma altura h-[22px]) */}
          {anime.rating !== null && anime.rating !== undefined && (
            <div className="bg-black/60 border border-amber-500/40 text-amber-300 font-black text-[9px] px-1.5 h-[22px] rounded-full flex items-center gap-0.5 shadow-xs shrink-0">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{anime.rating}</span>
            </div>
          )}

          {/* Season Name & Pending Seasons Indicator */}
          <div className="flex items-center gap-1 min-w-0 h-[22px]">
            <span className="text-[10px] text-slate-400 truncate max-w-[110px] sm:max-w-[130px]">
              {anime.currentSeasonName || `Temporada ${anime.season || 1}`}
            </span>
            {pendingSeasonsCount > 0 && (
              <span
                className="px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[8.5px] font-black leading-none shrink-0"
                title={`${pendingSeasonsCount} temporada(s) pendente(s)`}
              >
                +{pendingSeasonsCount}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          onClick={() => onOpenDetail(anime)}
          title={anime.title}
          className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-1 cursor-pointer hover:text-indigo-300 transition-colors mt-0.5"
        >
          {anime.title}
        </h3>

        {/* Progress Bar & Percentage */}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct || 0}%` }}
            />
          </div>
          {progressPct !== null && (
            <span className="font-mono text-[9.5px] text-slate-400 font-semibold shrink-0">
              {progressPct}%
            </span>
          )}
        </div>
      </div>

      {/* Right: Floating Episode Stepper Controls */}
      <div className="shrink-0 flex items-center gap-1.5 p-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDecrement(anime);
          }}
          disabled={anime.currentEpisode <= 0}
          title="Diminuir 1 episódio"
          className="w-7 h-7 rounded-lg border border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {isEditingEp ? (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="flex items-center gap-1"
          >
            <input
              type="number"
              min="0"
              autoFocus
              value={epInput}
              onChange={(e) => setEpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitEp();
                if (e.key === 'Escape') {
                  setEpInput(String(anime.currentEpisode));
                  setIsEditingEp(false);
                }
              }}
              onBlur={handleCommitEp}
              className="w-12 text-center bg-black border border-indigo-500 rounded-md py-0.5 text-xs font-mono font-bold text-white outline-none shadow-sm shadow-indigo-500/30"
            />
            {maxEp ? <span className="text-slate-500 text-[10px] font-normal">/{maxEp}</span> : ''}
          </div>
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingEp(true);
            }}
            className="px-1 text-center font-mono text-xs font-black text-white cursor-pointer hover:text-indigo-300 hover:bg-white/5 rounded-md py-0.5 transition-colors min-w-[48px] group/ep"
            title="Clique para digitar o episódio diretamente"
          >
            <span className="border-b border-dashed border-white/40 group-hover/ep:border-indigo-400">
              {anime.currentEpisode}
            </span>
            {maxEp ? <span className="text-slate-500 text-[10px] font-normal">/{maxEp}</span> : ''}
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIncrement(anime);
          }}
          title="Avançar 1 episódio"
          className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm shadow-indigo-600/30"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
