import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Crown,
  Star,
  Flame,
  Tv,
  Clock,
  Eye,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Heart,
  UserPlus,
  UserCheck,
  Swords,
  Settings,
  Edit3,
  ExternalLink,
  ChevronRight,
  Zap,
  Play,
  CheckCircle2,
  Shield,
  Layers,
  AtSign,
  Plus,
  Palette,
  Sparkles,
  BarChart2,
  Search,
  Users,
  Compass,
  Bookmark
} from 'lucide-react';
import type { Anime } from '../../types';
import type { UserProfile, HonorPillar } from '../../services/profileService';
import { calculateOtakuLevel } from '../../services/xpService';
import { calculateUserAchievements, getAnimeWatchedEpisodes, type Achievement } from '../../services/achievementService';
import { copyToClipboard } from '../../lib/clipboard';
import { PROFILE_THEMES, ARCHETYPES, HONOR_PILLAR_LABELS } from './socialThemes';

interface OtakuCardViewProps {
  profile: UserProfile | null;
  animes: Anime[];
  userName: string;
  avatarUrl?: string;
  userId?: string;
  isOwner?: boolean;
  isGuest?: boolean;
  followedUsers?: UserProfile[];
  onOpenPersonalizer?: () => void;
  onOpenAvatarSettings?: () => void;
  onOpenVersus?: (targetProfile: UserProfile, targetAnimes?: Anime[]) => void;
  onSelectAnime?: (anime: Anime | string) => void;
  onToggleFollow?: () => void;
  isFollowing?: boolean;
  onSearchUser?: (query: string) => void;
}

export const OtakuCardView: React.FC<OtakuCardViewProps> = ({
  profile,
  animes,
  userName,
  avatarUrl,
  userId,
  isOwner = false,
  isGuest = false,
  followedUsers = [],
  onOpenPersonalizer,
  onOpenAvatarSettings,
  onOpenVersus,
  onSelectAnime,
  onToggleFollow,
  isFollowing = false,
  onSearchUser,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [showAllBadges, setShowAllBadges] = useState(false);

  // Tema e Arquétipo selecionados
  const theme = PROFILE_THEMES[profile?.cardTheme || 'cyberpunk'];
  const archetype = ARCHETYPES[profile?.archetype || 'noble_heart'];
  const ArchetypeIcon = archetype.icon;

  // Conquistas e Nível
  const achievementsData = useMemo(() => calculateUserAchievements(animes), [animes]);
  const achievements = useMemo(() => achievementsData.achievements || [], [achievementsData]);
  const unlockedBadges = useMemo(() => achievements.filter((a) => a.isUnlocked), [achievements]);
  
  const levelInfo = useMemo(() => {
    return calculateOtakuLevel(animes, achievementsData);
  }, [animes, achievementsData]);

  // Estatísticas Vivas (Linha de Pulso)
  const stats = useMemo(() => {
    let totalWatchedMinutes = 0;
    let totalEpisodesWatched = 0;
    let completedCount = 0;
    let watchingCount = 0;
    let totalRatingSum = 0;
    let ratedCount = 0;

    const genreCounts: Record<string, number> = {};

    animes.forEach((anime) => {
      const watchedEps = getAnimeWatchedEpisodes(anime);
      totalEpisodesWatched += watchedEps;
      const duration = anime.durationMinutes && anime.durationMinutes > 0 ? anime.durationMinutes : 24;
      totalWatchedMinutes += watchedEps * duration;

      if (anime.status === 'completed') completedCount++;
      if (anime.status === 'watching') watchingCount++;

      if (anime.rating && anime.rating > 0) {
        totalRatingSum += anime.rating;
        ratedCount++;
      }

      if (Array.isArray(anime.genres)) {
        anime.genres.forEach((g) => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      }
    });

    const days = Math.floor(totalWatchedMinutes / (24 * 60));
    const hours = Math.floor((totalWatchedMinutes % (24 * 60)) / 60);

    const averageRating = ratedCount > 0 ? (totalRatingSum / ratedCount).toFixed(1) : '—';

    // Top 4 gêneros
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / Math.max(1, animes.length)) * 100),
      }));

    return {
      days,
      hours,
      totalEpisodesWatched,
      completedCount,
      watchingCount,
      averageRating,
      ratedCount,
      sortedGenres,
    };
  }, [animes]);

  // Quinteto de Honra
  const honorPillars: HonorPillar[] = useMemo(() => {
    if (profile?.honorPillars && profile.honorPillars.length > 0) {
      return profile.honorPillars;
    }
    // Fallback: animes com maior nota
    const sorted = [...animes].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
    return sorted.map((a, idx) => ({
      animeId: String(a.id || a.title),
      animeTitle: a.title,
      coverUrl: a.coverUrl,
      label: HONOR_PILLAR_LABELS[idx] || 'Favorito de Honra',
      rating: a.rating,
    }));
  }, [profile?.honorPillars, animes]);

  // Insígnias em destaque (até 3)
  const featuredBadgesList = useMemo(() => {
    const featuredIds = profile?.featuredBadges || [];
    if (featuredIds.length > 0) {
      const matched = achievements.filter((a) => featuredIds.includes(a.id));
      if (matched.length > 0) return matched.slice(0, 3);
    }
    // Fallback: primeiras 3 desbloqueadas ou especiais
    return unlockedBadges.slice(0, 3);
  }, [profile?.featuredBadges, achievements, unlockedBadges]);

  const handleCopyProfileLink = () => {
    const nick = profile?.publicUsername || userName.toLowerCase().replace(/\s+/g, '');
    const url = `${window.location.origin}/?user=${encodeURIComponent(nick)}`;
    copyToClipboard(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const bannerImage = profile?.customBannerUrl || theme.bannerPlaceholder;
  const honoraryTitle = profile?.honoraryTitle || 'Veterano dos Animes';

  return (
    <div className="space-y-7 animate-fade-in">
      {/* 🎴 O CARD DE COLECIONADOR PRINCIPAL (CRÔNICA OTAKU) */}
      <div
        id="otaku-collector-passport-card"
        className={`relative rounded-3xl border ${theme.cardBorder} bg-gradient-to-b ${theme.bgGradient} overflow-hidden shadow-2xl transition-all duration-300 ${theme.glowClass}`}
      >
        {/* BANNER DE CABEÇALHO COM AURA E MÁSCARA */}
        <div className="relative h-44 sm:h-56 md:h-64 w-full overflow-hidden">
          <img
            src={bannerImage}
            alt="Banner Otaku"
            className="w-full h-full object-cover object-center filter brightness-75 scale-105"
          />
          {/* Gradiente de fusão suave com o corpo do card */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Selo Flutuante de Arquétipo no Topo Direito */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border ${theme.cardBorder} text-xs font-bold text-slate-100 shadow-xl`}>
              <div className={`w-5 h-5 rounded-lg bg-gradient-to-br ${archetype.badgeGradient} flex items-center justify-center text-white flex-shrink-0`}>
                <ArchetypeIcon className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline font-black tracking-wide">
                {archetype.title}
              </span>
            </div>

            {/* Ações de Dono ou Compartilhar */}
            {isOwner && onOpenPersonalizer && (
              <button
                id="btn-personalize-passport"
                onClick={onOpenPersonalizer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Personalizar Card</span>
              </button>
            )}

            <button
              onClick={handleCopyProfileLink}
              className="p-2 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-slate-200 hover:text-white transition-all shadow-xl"
              title="Copiar link do passaporte"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* IDENTIDADE DO COLECIONADOR & AVATAR COM AURA */}
        <div className="relative px-5 sm:px-8 pb-7 -mt-16 sm:-mt-20 z-20 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            {/* Avatar + Info Principal */}
            <div className="flex items-end gap-4 sm:gap-5">
              <div className="relative group flex-shrink-0">
                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden ring-4 ${theme.auraRings} bg-slate-900 shadow-2xl transition-transform group-hover:scale-105 duration-300`}>
                  <img
                    src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isOwner && onOpenAvatarSettings && (
                  <button
                    onClick={onOpenAvatarSettings}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-400 transition-colors shadow-lg"
                    title="Editar foto do avatar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                    {userName}
                  </h2>
                  {profile?.publicUsername && (
                    <span className="text-xs sm:text-sm text-slate-400 font-mono">
                      @{profile.publicUsername}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} border`}>
                    Nv. {levelInfo.level} ({levelInfo.rankCode})
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {honoraryTitle}
                </p>
              </div>
            </div>

            {/* Ações para Perfil de Terceiros */}
            {!isOwner && onOpenVersus && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  id="btn-trigger-versus-mode"
                  onClick={() => onOpenVersus(profile || ({} as any), animes)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs transition-all shadow-xl shadow-amber-500/20 active:scale-95"
                >
                  <Swords className="w-4 h-4" />
                  Confronto de Coleções (Versus)
                </button>
                {onToggleFollow && (
                  <button
                    onClick={onToggleFollow}
                    className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                      isFollowing
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                    }`}
                  >
                    {isFollowing ? 'Seguindo' : '+ Seguir'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* BIO / FILOSOFIA DO COLECIONADOR */}
          {(profile?.publicBio || profile?.quote || archetype.mantra) && (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              {profile?.publicBio && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {profile.publicBio}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs italic text-amber-300/90">
                <span className="text-amber-500 font-serif text-base">“</span>
                {profile?.quote || archetype.mantra}
                <span className="text-amber-500 font-serif text-base">”</span>
              </div>
            </div>
          )}

          {/* 🌟 O QUINTETO DE HONRA (PILAR EMOCIONAL) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  O Quinteto de Honra • Pilares do Colecionador
                </h3>
              </div>
              {isOwner && onOpenPersonalizer && (
                <button
                  onClick={onOpenPersonalizer}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Editar Pilares
                </button>
              )}
            </div>

            {honorPillars.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
                Nenhum anime destacado no Quinteto de Honra. Personalize o seu card para adicionar!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {honorPillars.map((pillar, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectAnime && onSelectAnime(pillar.animeTitle)}
                    className="group relative flex flex-col rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden shadow-lg"
                  >
                    {/* Rótulo Emocional Superior */}
                    <div className="p-2 bg-slate-950/80 border-b border-slate-800/80 text-center">
                      <span className="text-[10px] font-black uppercase tracking-tight text-amber-400 block truncate">
                        {pillar.label}
                      </span>
                    </div>

                    {/* Poster */}
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={pillar.coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80'}
                        alt={pillar.animeTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {pillar.rating ? (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-amber-400 text-[10px] font-black border border-amber-500/30 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />
                          {pillar.rating}
                        </span>
                      ) : null}
                    </div>

                    {/* Título do Anime */}
                    <div className="p-2.5 mt-auto">
                      <h4 className="font-bold text-xs text-slate-200 truncate group-hover:text-amber-300 transition-colors">
                        {pillar.animeTitle}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ⚡ LINHA DE PULSO: ESTATÍSTICAS VIVAS INTEGRADAS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                Linha de Pulso • Estatísticas Integradas
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Relógio da Vida */}
              <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Tempo em Anime
                </span>
                <p className="text-base sm:text-lg font-black text-slate-100 mt-1">
                  {stats.days}d {stats.hours}h
                </p>
                <span className="text-[10px] text-slate-500">
                  {stats.totalEpisodesWatched} episódios
                </span>
              </div>

              {/* Obras Completas */}
              <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Obras Concluídas
                </span>
                <p className="text-base sm:text-lg font-black text-slate-100 mt-1">
                  {stats.completedCount}
                </p>
                <span className="text-[10px] text-slate-500">
                  de {animes.length} na lista
                </span>
              </div>

              {/* Rigor Crítico (Nota Média) */}
              <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  Rigor Crítico
                </span>
                <p className="text-base sm:text-lg font-black text-amber-400 mt-1">
                  ★ {stats.averageRating}
                </p>
                <span className="text-[10px] text-slate-500">
                  {stats.ratedCount} animes avaliados
                </span>
              </div>

              {/* Nível & Prestígio */}
              <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-400" />
                  Nível Otaku
                </span>
                <p className="text-base sm:text-lg font-black text-purple-300 mt-1">
                  Nv. {levelInfo.level}
                </p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{ width: `${levelInfo.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Teia de Afinidade de Gêneros */}
            {stats.sortedGenres.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/70 space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Afinidade de Gêneros Dominantes
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {stats.sortedGenres.map((g, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-300">{g.name}</span>
                        <span className="text-slate-500 font-mono">{g.count} animes ({g.percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            i === 0 ? 'bg-cyan-400' : i === 1 ? 'bg-pink-400' : i === 2 ? 'bg-amber-400' : 'bg-purple-400'
                          }`}
                          style={{ width: `${Math.min(100, g.percent * 1.5)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 🏆 MURAL DE INSÍGNIAS INCRUSTADO */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Vitrine de Conquistas de Honra ({unlockedBadges.length}/{achievements.length})
                </h3>
              </div>
              <button
                onClick={() => setShowAllBadges(!showAllBadges)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
              >
                {showAllBadges ? 'Recolher' : 'Ver Todas as 30'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {featuredBadgesList.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-amber-500/30 flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
                    {badge.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-slate-200 truncate">
                      {badge.title}
                    </h5>
                    <p className="text-[10px] text-slate-400 truncate">
                      {badge.description}
                    </p>
                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
                      Tier {badge.tier}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Expansão das 30 conquistas completas no próprio card */}
            {showAllBadges && (
              <div className="mt-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 animate-fade-in">
                <h4 className="text-xs font-bold text-slate-300">
                  Todas as Insígnias Disponíveis
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
                  {achievements.map((b) => (
                    <div
                      key={b.id}
                      className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 ${
                        b.isUnlocked
                          ? 'bg-slate-900/80 border-amber-500/30 text-slate-200'
                          : 'bg-slate-950/40 border-slate-800/50 text-slate-600 opacity-60'
                      }`}
                    >
                      <span className="text-lg">{b.icon}</span>
                      <span className="font-bold text-[10px] truncate max-w-full">
                        {b.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 👥 CÍRCULO DE AMIGOS & DESCOBERTA DE PERFIS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                Círculo de Amigos & Descoberta
              </h3>
              <p className="text-xs text-slate-400">
                Explore perfis, acompanhe o que seus amigos estão assistindo e duele listas
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={friendSearch}
              onChange={(e) => {
                setFriendSearch(e.target.value);
                if (onSearchUser) onSearchUser(e.target.value);
              }}
              placeholder="Buscar amigo por @nick..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {followedUsers.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="font-bold text-slate-300 text-xs">
              Seu Círculo de Amigos ainda está vazio
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Compartilhe o link do seu passaporte com amigos para que eles acessem seu perfil e você possa comparar coleções com eles!
            </p>
            <button
              onClick={handleCopyProfileLink}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
            >
              <Share2 className="w-3.5 h-3.5" />
              Copiar Meu Link do Passaporte
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {followedUsers
              .filter((f) => {
                if (!friendSearch) return true;
                const q = friendSearch.toLowerCase();
                return (
                  (f.publicUsername || '').toLowerCase().includes(q) ||
                  (f.honoraryTitle || '').toLowerCase().includes(q)
                );
              })
              .map((friend) => (
                <div
                  key={friend.userId}
                  className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={friend.customAvatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                      alt={friend.publicUsername || 'Amigo'}
                      className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-800 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h5 className="font-bold text-xs text-slate-100 truncate">
                        {friend.publicUsername ? `@${friend.publicUsername}` : 'Otaku'}
                      </h5>
                      <span className="text-[11px] text-amber-400 block truncate">
                        {friend.honoraryTitle || 'Veterano'}
                      </span>
                    </div>
                  </div>

                  {onOpenVersus && (
                    <button
                      onClick={() => onOpenVersus(friend)}
                      className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 transition-all border border-amber-500/20"
                      title="Confrontar Coleções (Versus)"
                    >
                      <Swords className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
