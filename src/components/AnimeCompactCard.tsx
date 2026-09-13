import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  Tv, 
  ChevronDown, 
  Check, 
  Star, 
  Search, 
  Flame
} from 'lucide-react';
import type { Anime, AnimeStatus } from '../types';
import { STATUS_CONFIG } from '../types';
import { isAiringToday, isAnimeActiveAndAiringToday } from '../lib/dateUtils';

interface AnimeCompactCardProps {
  anime: Anime;
  onOpenDetail: (anime: Anime) => void;
  onIncrement: (anime: Anime) => void;
  onDecrement: (anime: Anime) => void;
  onUpdateStatus: (anime: Anime, newStatus: AnimeStatus) => void;
  onUpdateEpisode?: (anime: Anime, newEpisode: number) => void;
}

export const AnimeCompactCard: React.FC<AnimeCompactCardProps> = ({
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
      id={`anime-compact-card-${anime.id}`}
      onClick={() => onOpenDetail(anime)}
      className="group relative rounded-2xl overflow-hidden bg-[#0a0a0f] border border-white/10 transition-all duration-300 shadow-xl shadow-black/90 flex flex-col aspect-[1/1.42] select-none hover:-translate-y-0.5 cursor-pointer"
    >
      {/* Background Poster Cover Image com cores naturais */}
      <div 
        onClick={() => onOpenDetail(anime)}
        className="absolute inset-0 w-full h-full cursor-pointer overflow-hidden"
      >
        {anime.coverUrl ? (
          <img
            src={anime.coverUrl}
            alt={anime.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-slate-600 bg-gradient-to-b from-[#0a0a0f] to-[#020204]">
            <Tv className="w-8 h-8 mb-1 opacity-40" />
            <span className="text-[10px] font-semibold text-slate-500">Sem Capa</span>
          </div>
        )}

        {/* Gradiente Superior Suave apenas para contraste dos botões do topo */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

        {/* Gradiente Escuro Concentrado Apenas na Base Inferior (mantendo topo e centro claros e vívidos) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070a] via-black/60 via-30% to-transparent pointer-events-none" />
      </div>

      {/* Gradiente de Borda Dourada Suave (Fade Up) - Parte inferior e laterais que somem na metade */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none border border-amber-400/80 group-hover:border-amber-300 transition-colors z-20"
        style={{
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0) 48%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0) 48%)',
        }}
      />

      {/* Top Controls Bar - Rigorously Aligned Horizontally */}
      <div className="relative z-10 p-2 flex items-center justify-between gap-1 pointer-events-none">
        {/* Status Dropdown Pill */}
        <div className="relative pointer-events-auto flex items-center">
          <button
            id={`btn-compact-status-${anime.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowStatusMenu(!showStatusMenu);
            }}
            className={`inline-flex items-center gap-1 px-2 h-[22px] rounded-full text-[9px] font-bold backdrop-blur-md transition-all cursor-pointer shadow-md ${statusInfo.badgeBg || statusInfo.bgClass}`}
            title="Alterar status"
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusInfo.dotColor}`} />
            <span className="truncate max-w-[65px] sm:max-w-[75px]">{statusInfo.shortLabel}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-70 shrink-0" />
          </button>

          {/* Status Dropdown Menu */}
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

        {/* Top-Right: Rating or Airing Tag (Perfeitamente alinhado na mesma linha horizontal) */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {anime.rating !== null && anime.rating !== undefined ? (
            <div className="bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-300 font-black text-[9px] px-1.5 h-[22px] rounded-full flex items-center gap-0.5 shadow-md">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{anime.rating}</span>
            </div>
          ) : airingToday ? (
            <div className="bg-amber-500 text-slate-950 font-black text-[8px] px-1.5 h-[22px] rounded-full shadow-md flex items-center">
              Hoje!
            </div>
          ) : null}
        </div>
      </div>

      {/* Middle Airing Alert (if new episode aired) */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-1.5 pointer-events-none">
        {anime.latestAiredEpisode && anime.latestAiredEpisode > anime.currentEpisode ? (
          <div className="bg-emerald-500/90 text-slate-950 backdrop-blur-md font-black text-[8.5px] px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 border border-emerald-300 animate-pulse pointer-events-auto">
            <Flame className="w-2.5 h-2.5 fill-slate-950" />
            <span>Ep. {anime.latestAiredEpisode} Saiu!</span>
          </div>
        ) : null}
      </div>

      {/* Bottom Floating Information & Episode Stepper Plate */}
      <div className="relative z-10 p-2 sm:p-2.5 bg-gradient-to-t from-[#07070a] via-[#09090e]/95 to-transparent pt-3 flex flex-col justify-end">
        {/* Title */}
        <h3
          onClick={() => onOpenDetail(anime)}
          title={anime.title}
          className="text-xs sm:text-[13px] font-bold text-white leading-tight line-clamp-2 cursor-pointer hover:text-indigo-300 transition-colors drop-shadow-sm"
        >
          {anime.title}
        </h3>

        {/* Season or Arc subtle tag & Pending indicator */}
        <div className="flex items-center justify-between text-[9.5px] text-slate-400 mt-1">
          <div className="flex items-center gap-1 min-w-0">
            <span className="truncate max-w-[100px] sm:max-w-[120px]">
              {anime.currentSeasonName || `Temp. ${anime.season || 1}`}
            </span>
            {pendingSeasonsCount > 0 && (
              <span
                className="px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[8px] font-black leading-none shrink-0"
                title={`${pendingSeasonsCount} temporada(s) pendente(s)`}
              >
                +{pendingSeasonsCount}
              </span>
            )}
          </div>
          {progressPct !== null && (
            <span className="font-mono text-[9px] text-indigo-300 font-semibold">{progressPct}%</span>
          )}
        </div>

        {/* Progress Bar Line */}
        {progressPct !== null && (
          <div className="w-full h-1 bg-slate-800/90 rounded-full overflow-hidden my-1.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Episode Stepper Controls (Minus | Ep Count | Plus) */}
        <div className="mt-1 flex items-center justify-between gap-1 p-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDecrement(anime);
            }}
            disabled={anime.currentEpisode <= 0}
            title="Diminuir episódio"
            className="w-7 h-6 rounded-lg border border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>

          {isEditingEp ? (
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="flex-1 flex items-center justify-center gap-1"
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
                className="w-10 text-center bg-black border border-indigo-500 rounded-md py-0.2 text-[11px] font-mono font-bold text-white outline-none shadow-sm shadow-indigo-500/30"
              />
              {maxEp ? <span className="text-slate-500 text-[9px] font-normal">/{maxEp}</span> : ''}
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingEp(true);
              }}
              className="flex-1 text-center font-mono text-[11px] font-black text-white cursor-pointer hover:text-indigo-300 hover:bg-white/5 rounded-md py-0.5 transition-colors group/cpep"
              title="Clique para digitar o episódio diretamente"
            >
              Ep. <span className="text-indigo-300 border-b border-dashed border-indigo-400/40 group-hover/cpep:border-indigo-300">{anime.currentEpisode}</span>
              {maxEp ? <span className="text-slate-500 text-[9.5px] font-normal">/{maxEp}</span> : ''}
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIncrement(anime);
            }}
            title="Avançar 1 episódio"
            className="w-7 h-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
