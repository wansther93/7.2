import React, { useMemo } from 'react';
import { 
  BarChart3, 
  Tv, 
  CheckCircle2, 
  Play, 
  Clock, 
  Bookmark, 
  Share2,
  Tag, 
  Star, 
  Calendar, 
  Flame, 
  PieChart as PieIcon, 
  Layers, 
  Film,
  TrendingUp,
  ArrowLeft
} from 'lucide-react';
import type { Anime } from '../types';
import { STATUS_CONFIG } from '../types';
import { calculateViewingStats } from '../lib/dateUtils';

interface StatsViewProps {
  animes: Anime[];
  onOpenSocialCard?: (cardType?: 'top5' | 'stats' | 'watching' | 'achievements') => void;
  onBackToProfile?: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ animes, onOpenSocialCard, onBackToProfile }) => {
  const stats = useMemo(() => calculateViewingStats(animes), [animes]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const counts = {
      watching: 0,
      completed: 0,
      waiting_new_episodes: 0,
      plan_to_watch: 0,
      paused: 0,
      dropped: 0,
      cancelled: 0,
    };
    animes.forEach((a) => {
      if (counts[a.status] !== undefined) {
        counts[a.status]++;
      }
    });
    return counts;
  }, [animes]);

  // Top genres calculation
  const topGenres = useMemo(() => {
    const map: Record<string, number> = {};
    animes.forEach((a) => {
      (a.genres || []).forEach((g) => {
        if (!g.trim()) return;
        map[g] = (map[g] || 0) + 1;
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [animes]);

  // Average Rating
  const ratedAnimes = useMemo(() => animes.filter((a) => typeof a.rating === 'number' && a.rating > 0), [animes]);
  const avgRating = useMemo(() => {
    if (ratedAnimes.length === 0) return 0;
    const sum = ratedAnimes.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    return (sum / ratedAnimes.length).toFixed(1);
  }, [ratedAnimes]);

  return (
    <div className="w-full space-y-3 animate-in fade-in duration-150">
      {/* Botão Sutil de Retorno ao Perfil */}
      {onBackToProfile && (
        <div className="flex items-center justify-start pb-1">
          <button
            type="button"
            id="btn-back-to-profile"
            onClick={onBackToProfile}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-amber-300 bg-black/60 hover:bg-neutral-900 border border-white/10 px-3 py-1.5 rounded-xl transition-all cursor-pointer group active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-amber-400" />
            <span className="font-semibold">Voltar ao Perfil</span>
          </button>
        </div>
      )}

      {/* Título Centralizado Limpo e Compacto (Sem container pesado) */}
      <div className="w-full relative py-1 flex flex-col items-center justify-center text-center">
        <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center justify-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-purple-400 inline-block" />
          <span>Estatísticas & Métricas</span>
        </h2>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
          {animes.length} animes • {stats.days}d {stats.hours}h assistidos
        </p>

        {onOpenSocialCard && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={() => onOpenSocialCard('stats')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Share2 className="w-3 h-3 text-purple-300" />
              <span>Gerar Card</span>
            </button>
          </div>
        )}
      </div>

      {/* Main KPI Highlight Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Dias & Horas assistidas */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">Tempo Assistido</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {stats.days}d {stats.hours}h
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              ~{Math.round(stats.totalMinutes / 60).toLocaleString('pt-BR')} horas totais assistidas
            </div>
          </div>
        </div>

        {/* 2. Episódios assistidos */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">Episódios Vistos</span>
            <Play className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {stats.totalEpisodesWatched.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              em todas as temporadas
            </div>
          </div>
        </div>

        {/* 3. Animes Terminados */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">Terminados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300">
              {statusBreakdown.completed}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              {animes.length > 0 ? Math.round((statusBreakdown.completed / animes.length) * 100) : 0}% da sua lista
            </div>
          </div>
        </div>

        {/* 4. Média de Nota */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">Média de Notas</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-300">
              {avgRating} <span className="text-xs text-slate-400 font-normal">/ 10</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              {ratedAnimes.length} animes avaliados
            </div>
          </div>
        </div>
      </div>

      {/* Distribution by Status & Top Genres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-md space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Distribuição por Status
          </h3>

          <div className="space-y-2.5">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = statusBreakdown[key as keyof typeof statusBreakdown] || 0;
              const pct = animes.length > 0 ? Math.round((count / animes.length) * 100) : 0;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                      <span>{cfg.label}</span>
                    </div>
                    <span className="font-bold text-white">
                      {count} <span className="text-slate-500 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full ${cfg.dotColor.replace('bg-', 'bg-')}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Genres */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-md space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-400" />
            Gêneros Mais Frequentes
          </h3>

          {topGenres.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Nenhum gênero cadastrado ainda.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topGenres.map(([genre, count]) => {
                const maxCount = topGenres[0][1] || 1;
                const pct = Math.round((count / maxCount) * 100);

                return (
                  <div key={genre} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{genre}</span>
                      <span className="font-bold text-amber-300">{count} animes</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
