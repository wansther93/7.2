import React, { useMemo, useState } from 'react';
import { 
  X, 
  BarChart3, 
  Clock, 
  Film, 
  Star, 
  CheckCircle2, 
  Play, 
  Bookmark, 
  Layers, 
  Building2, 
  Tag, 
  Share2, 
  Check, 
  Image,
  Calendar,
  Tv,
  Crown,
  Shield,
  Zap,
  Flame,
  Award,
  CreditCard
} from 'lucide-react';
import type { Anime } from '../types';
import { STATUS_CONFIG } from '../types';
import { copyToClipboard } from '../lib/clipboard';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  animes: Anime[];
  userName?: string;
  userAvatar?: string;
  onOpenAchievements?: () => void;
  onOpenSocialCard?: (cardType?: 'top5' | 'stats' | 'watching' | 'achievements') => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  animes,
  userName = 'Otaku',
  userAvatar,
  onOpenAchievements,
  onOpenSocialCard,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'passport'>('dashboard');

  const stats = useMemo(() => {
    const totalAnimes = animes.length;
    let totalEpisodesWatched = 0;
    let totalPlannedEpisodes = 0;
    let ratedCount = 0;
    let totalRatingSum = 0;

    const statusCounts: Record<string, number> = {
      watching: 0,
      waiting_new_episodes: 0,
      plan_to_watch: 0,
      completed: 0,
      paused: 0,
      dropped: 0,
      cancelled: 0,
    };

    const ratingDistribution: Record<number, number> = {
      10: 0,
      9: 0,
      8: 0,
      7: 0,
      6: 0,
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    const genreCounts: Record<string, number> = {};
    const studioCounts: Record<string, number> = {};
    const formatCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const decadeCounts: Record<string, number> = {};

    animes.forEach((anime) => {
      // Status count
      if (statusCounts[anime.status] !== undefined) {
        statusCounts[anime.status]++;
      }

      // Episodes count
      const epWatched = Number(anime.currentEpisode) || 0;
      totalEpisodesWatched += epWatched;
      const totalEp = Number(anime.totalEpisodes) || 0;
      totalPlannedEpisodes += totalEp;

      // Rating (1 a 10)
      if (typeof anime.rating === 'number' && anime.rating > 0) {
        ratedCount++;
        totalRatingSum += anime.rating;
        const roundedScore = Math.min(10, Math.max(1, Math.round(anime.rating)));
        ratingDistribution[roundedScore] = (ratingDistribution[roundedScore] || 0) + 1;
      }

      // Genres
      if (Array.isArray(anime.genres)) {
        anime.genres.forEach((g) => {
          const trim = g.trim();
          if (trim) {
            genreCounts[trim] = (genreCounts[trim] || 0) + 1;
          }
        });
      }

      // Studio
      if (anime.studio && anime.studio.trim()) {
        const s = anime.studio.trim();
        studioCounts[s] = (studioCounts[s] || 0) + 1;
      }

      // Format
      if (anime.format && anime.format.trim()) {
        const f = anime.format.trim();
        formatCounts[f] = (formatCounts[f] || 0) + 1;
      }

      // Source
      if (anime.source && anime.source.trim()) {
        const src = anime.source.trim();
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      }

      // Decade / Year
      if (anime.releaseYear && anime.releaseYear > 1960) {
        const decade = Math.floor(anime.releaseYear / 10) * 10;
        const decadeKey = `${decade}s`;
        decadeCounts[decadeKey] = (decadeCounts[decadeKey] || 0) + 1;
      }
    });

    // Time calculations (~23.5 minutes per anime episode)
    const totalMinutes = Math.round(totalEpisodesWatched * 23.5);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const averageRating = ratedCount > 0 ? (totalRatingSum / ratedCount).toFixed(1) : '—';

    // Top arrays sorted
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const topStudios = Object.entries(studioCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topFormats = Object.entries(formatCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const topSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const decadesSorted = Object.entries(decadeCounts).sort((a, b) => b[0].localeCompare(a[0]));

    // Gamification: Nível Otaku baseado em episódios
    let otakuTier = 'Iniciante dos Animes';
    let tierColor = 'from-emerald-500 to-teal-600';
    let tierIcon = '🌱';
    let nextTierEps = 50;
    let tierProgress = Math.min(100, Math.round((totalEpisodesWatched / 50) * 100));

    if (totalEpisodesWatched >= 1500) {
      otakuTier = 'Lenda Otaku Imortal';
      tierColor = 'from-amber-400 via-rose-500 to-purple-600';
      tierIcon = '👑';
      nextTierEps = 2000;
      tierProgress = 100;
    } else if (totalEpisodesWatched >= 500) {
      otakuTier = 'Mestre dos Animes';
      tierColor = 'from-purple-500 to-indigo-600';
      tierIcon = '🏆';
      nextTierEps = 1500;
      tierProgress = Math.min(100, Math.round(((totalEpisodesWatched - 500) / 1000) * 100));
    } else if (totalEpisodesWatched >= 200) {
      otakuTier = 'Veterano das Temporadas';
      tierColor = 'from-indigo-500 to-blue-600';
      tierIcon = '⚡';
      nextTierEps = 500;
      tierProgress = Math.min(100, Math.round(((totalEpisodesWatched - 200) / 300) * 100));
    } else if (totalEpisodesWatched >= 50) {
      otakuTier = 'Aventureiro Otaku';
      tierColor = 'from-blue-500 to-cyan-600';
      tierIcon = '⚔️';
      nextTierEps = 200;
      tierProgress = Math.min(100, Math.round(((totalEpisodesWatched - 50) / 150) * 100));
    }

    return {
      totalAnimes,
      totalEpisodesWatched,
      totalPlannedEpisodes,
      days,
      hours,
      minutes,
      totalMinutes,
      averageRating,
      ratedCount,
      statusCounts,
      ratingDistribution,
      topGenres,
      topStudios,
      topFormats,
      topSources,
      decadesSorted,
      otakuTier,
      tierColor,
      tierIcon,
      nextTierEps,
      tierProgress,
    };
  }, [animes]);

  if (!isOpen) return null;

  const handleCopyStats = async () => {
    const text = `📊 *Passaporte Otaku de ${userName}* no WAnime List:
🏷️ Rank: ${stats.tierIcon} ${stats.otakuTier}
🎬 Total de Animes: ${stats.totalAnimes}
📺 Episódios Assistidos: ${stats.totalEpisodesWatched} eps
⏱️ Tempo Assistido: ${stats.days}d ${stats.hours}h ${stats.minutes}m (~${stats.totalMinutes} min)
⭐ Média Geral: ${stats.averageRating}/10 (${stats.ratedCount} avaliados)
🏆 Concluídos: ${stats.statusCounts.completed || 0} animes
🔥 Assistindo: ${stats.statusCounts.watching || 0} animes
🏷️ Top Gêneros: ${stats.topGenres.map(([g, c]) => `${g} (${c})`).join(', ') || 'Nenhum'}
🏢 Top Estúdios: ${stats.topStudios.map(([s, c]) => `${s} (${c})`).join(', ') || 'Nenhum'}
✨ Acompanhe seus animes em: ${window.location.origin}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Passaporte Otaku - ${userName}`,
          text,
        });
        return;
      }
    } catch {
      // Se cancelar ou falhar, copia para área de transferência
    }

    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Estatísticas & Gamificação</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  {stats.totalAnimes} {stats.totalAnimes === 1 ? 'anime' : 'animes'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Análise de tempo assistido, insígnias e seu Passaporte Otaku</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'dashboard'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setActiveView('passport')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeView === 'passport'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Passaporte</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {activeView === 'passport' ? (
            /* PASSAPORTE OTAKU / CARD VISUAL DE COMPARTILHAMENTO */
            <div className="space-y-4">
              <div className="relative rounded-3xl p-6 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 border-2 border-indigo-500/40 shadow-2xl shadow-indigo-500/10">
                {/* Background watermark */}
                <div className="absolute -right-6 -bottom-6 text-indigo-500/10 pointer-events-none font-black text-9xl select-none">
                  W
                </div>

                {/* Top Badge Card */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-lg">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={userName}
                          className="w-full h-full rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-xl font-black text-indigo-400">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base sm:text-lg font-black text-white">{userName}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          Passaporte Oficial
                        </span>
                      </div>
                      <p className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5 mt-0.5">
                        <span>{stats.tierIcon}</span>
                        <span>{stats.otakuTier}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      WAnime Portal
                    </span>
                    <span className="text-xs font-black text-indigo-400">#OTAKU-ID</span>
                  </div>
                </div>

                {/* Metrics Grid on Passport */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-5">
                  <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Episódios</span>
                    <span className="text-lg sm:text-xl font-black text-white">{stats.totalEpisodesWatched}</span>
                  </div>

                  <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Tempo Total</span>
                    <span className="text-lg sm:text-xl font-black text-indigo-300">{stats.days}d {stats.hours}h</span>
                  </div>

                  <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Animes Salvos</span>
                    <span className="text-lg sm:text-xl font-black text-white">{stats.totalAnimes}</span>
                  </div>

                  <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Média Notas</span>
                    <span className="text-lg sm:text-xl font-black text-amber-400">{stats.averageRating}★</span>
                  </div>
                </div>

                {/* Favorite Genre & Studio Tags on Passport */}
                <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Gêneros Dominantes:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {stats.topGenres.slice(0, 3).map(([genre]) => (
                        <span key={genre} className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/30 text-[11px] font-semibold">
                          {genre}
                        </span>
                      ))}
                      {stats.topGenres.length === 0 && <span className="text-slate-500">Nenhum</span>}
                    </div>
                  </div>

                  {stats.topStudios[0] && (
                    <div className="space-y-1 sm:text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Estúdio Favorito:
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-[11px] font-semibold">
                        {stats.topStudios[0][0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleCopyStats}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
                  <span>{copied ? 'Copiado para Área de Transferência!' : 'Compartilhar Meu Passaporte Otaku'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* DASHBOARD NORMAL DE ESTATÍSTICAS */
            <>
              {/* Gamification Level Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-600/30 shrink-0">
                    {stats.tierIcon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <span className="text-xs uppercase font-bold text-indigo-400">Nível Otaku</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                        {stats.totalEpisodesWatched} eps assistidos
                      </span>
                    </div>
                    <h4 className="text-base font-black text-white">{stats.otakuTier}</h4>
                  </div>
                </div>

                <div className="w-full sm:w-56 space-y-1.5 text-center sm:text-right">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Progresso de Nível</span>
                    <span className="font-bold text-indigo-300">{stats.tierProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${stats.tierProgress}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    />
                  </div>
                  {onOpenAchievements && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAchievements();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-black cursor-pointer transition-all active:scale-95"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Ver Quadro de Conquistas</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Highlights Cards (Tempo Assistido, Total Eps, Média) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Card 1: Tempo Assistido */}
                <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-500/30 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-indigo-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Tempo Assistido
                    </span>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {stats.days > 0 && <span>{stats.days}d </span>}
                      <span>{stats.hours}h </span>
                      <span className="text-indigo-400 text-lg">{stats.minutes}m</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      ~{Math.round(stats.totalMinutes / 60).toLocaleString('pt-BR')} horas totais assistidas
                    </span>
                  </div>
                </div>

                {/* Card 2: Episódios Assistidos */}
                <div className="bg-gradient-to-br from-purple-950/40 via-slate-950 to-slate-950 border border-purple-500/30 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-purple-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-purple-400" />
                      Episódios Vistos
                    </span>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {stats.totalEpisodesWatched}
                      <span className="text-xs font-normal text-slate-400 ml-1.5">episódios</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      em {stats.totalAnimes} animes cadastrados
                    </span>
                  </div>
                </div>

                {/* Card 3: Média Geral */}
                <div className="bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-amber-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      Nota Média (1 a 10)
                    </span>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight flex items-center gap-1">
                      <span>{stats.averageRating}</span>
                      {stats.averageRating !== '—' && <span className="text-xs font-semibold text-slate-400">/ 10</span>}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {stats.ratedCount} animes avaliados com nota
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Distribuição por Categoria</span>
                </h4>

                {/* Visual Color Bar */}
                {stats.totalAnimes > 0 && (
                  <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden flex gap-0.5">
                    {stats.statusCounts.completed > 0 && (
                      <div
                        style={{ width: `${(stats.statusCounts.completed / stats.totalAnimes) * 100}%` }}
                        className="bg-emerald-500 transition-all"
                        title={`Terminados: ${stats.statusCounts.completed}`}
                      />
                    )}
                    {stats.statusCounts.watching > 0 && (
                      <div
                        style={{ width: `${(stats.statusCounts.watching / stats.totalAnimes) * 100}%` }}
                        className="bg-indigo-500 transition-all"
                        title={`Assistindo: ${stats.statusCounts.watching}`}
                      />
                    )}
                    {stats.statusCounts.waiting_new_episodes > 0 && (
                      <div
                        style={{ width: `${(stats.statusCounts.waiting_new_episodes / stats.totalAnimes) * 100}%` }}
                        className="bg-cyan-500 transition-all"
                        title={`Esperando Novos Eps: ${stats.statusCounts.waiting_new_episodes}`}
                      />
                    )}
                    {stats.statusCounts.plan_to_watch > 0 && (
                      <div
                        style={{ width: `${(stats.statusCounts.plan_to_watch / stats.totalAnimes) * 100}%` }}
                        className="bg-amber-500 transition-all"
                        title={`Quero Assistir: ${stats.statusCounts.plan_to_watch}`}
                      />
                    )}
                    {stats.statusCounts.paused > 0 && (
                      <div
                        style={{ width: `${(stats.statusCounts.paused / stats.totalAnimes) * 100}%` }}
                        className="bg-yellow-600 transition-all"
                        title={`Pausados: ${stats.statusCounts.paused}`}
                      />
                    )}
                    {stats.statusCounts.dropped > 0 && (
                      <div
                        style={{ width: `${(stats.statusCounts.dropped / stats.totalAnimes) * 100}%` }}
                        className="bg-rose-500 transition-all"
                        title={`Abandonados: ${stats.statusCounts.dropped}`}
                      />
                    )}
                  </div>
                )}

                {/* Status Pills Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-slate-300 font-medium">Terminados</span>
                    </div>
                    <span className="text-xs font-bold text-white">{stats.statusCounts.completed || 0}</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span className="text-xs text-slate-300 font-medium">Assistindo</span>
                    </div>
                    <span className="text-xs font-bold text-white">{stats.statusCounts.watching || 0}</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="text-xs text-slate-300 font-medium">Novos Eps</span>
                    </div>
                    <span className="text-xs font-bold text-white">{stats.statusCounts.waiting_new_episodes || 0}</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-xs text-slate-300 font-medium">Quero Ver</span>
                    </div>
                    <span className="text-xs font-bold text-white">{stats.statusCounts.plan_to_watch || 0}</span>
                  </div>
                </div>
              </div>

              {/* Two-Column Analytics: Top Gêneros & Top Estúdios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Gêneros */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-400" />
                      <span>Top Gêneros Favoritos</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Mais frequentes</span>
                  </h4>

                  <div className="space-y-2">
                    {stats.topGenres.map(([genre, count]) => {
                      const percent = stats.totalAnimes > 0 ? Math.round((count / stats.totalAnimes) * 100) : 0;
                      return (
                        <div key={genre} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-200 font-medium">{genre}</span>
                            <span className="text-purple-300 font-bold text-[11px]">
                              {count} {count === 1 ? 'anime' : 'animes'} ({percent}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${percent}%` }}
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {stats.topGenres.length === 0 && (
                      <p className="text-xs text-slate-500 py-3 text-center">Nenhum gênero catalogado ainda.</p>
                    )}
                  </div>
                </div>

                {/* Top Estúdios */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Top Estúdios de Animação</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Mais assistidos</span>
                  </h4>

                  <div className="space-y-2">
                    {stats.topStudios.map(([studio, count]) => {
                      const percent = stats.totalAnimes > 0 ? Math.round((count / stats.totalAnimes) * 100) : 0;
                      return (
                        <div key={studio} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-200 font-medium truncate max-w-[170px]">{studio}</span>
                            <span className="text-indigo-300 font-bold text-[11px]">
                              {count} {count === 1 ? 'obra' : 'obras'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${percent}%` }}
                              className="h-full bg-indigo-500 rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {stats.topStudios.length === 0 && (
                      <p className="text-xs text-slate-500 py-3 text-center">
                        Busque animes pela capa para preencher o estúdio automaticamente!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Formatos e Distribuição de Avaliações */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Formatos de Mídia */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Formatos & Mídias</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {stats.topFormats.map(([format, count]) => (
                      <div
                        key={format}
                        className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs"
                      >
                        <span className="text-slate-300">{format}</span>
                        <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                          {count}
                        </span>
                      </div>
                    ))}
                    {stats.topFormats.length === 0 && (
                      <p className="text-xs text-slate-500 py-1">Nenhum formato registrado ainda.</p>
                    )}
                  </div>
                </div>

                {/* Distribuição de Notas (1 a 10) */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>Distribuição de Notas (1 a 10)</span>
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => {
                      const count = stats.ratingDistribution[score] || 0;
                      const percent = stats.ratedCount > 0 ? (count / stats.ratedCount) * 100 : 0;
                      return (
                        <div key={score} className="flex items-center gap-2 text-xs">
                          <span className="w-14 text-slate-400 text-[11px] flex items-center gap-1 shrink-0 font-medium">
                            <span className="font-bold text-amber-300">{score}</span>
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          </span>
                          <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${percent}%` }}
                              className="h-full bg-amber-500 rounded-full transition-all"
                            />
                          </div>
                          <span className="w-6 text-right text-slate-300 font-bold text-[11px]">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with Share and Close Buttons */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onOpenSocialCard && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSocialCard('stats');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Image className="w-4 h-4 text-indigo-200" />
                <span>Gerar Card (Stories/Post)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyStats}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Estatísticas Copiadas!' : 'Copiar Texto'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
