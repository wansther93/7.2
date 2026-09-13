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
  HeartHandshake,
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
  Plus
} from 'lucide-react';
import type { Anime } from '../types';
import type { UserProfile } from '../services/profileService';
import { calculateOtakuLevel } from '../services/xpService';
import { calculateUserAchievements, getAnimeWatchedEpisodes, ACHIEVEMENTS_DEF, type Achievement } from '../services/achievementService';
import { copyToClipboard } from '../lib/clipboard';
import { AchievementBadge } from './AchievementBadge';

export interface OtakuPassportProps {
  userProfile: UserProfile | null;
  animes: Anime[];
  userName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  userId?: string;
  isOwner?: boolean;
  isGuest?: boolean;
  onOpenAvatarSettings?: () => void;
  onOpenSocialCard?: () => void;
  onOpenBadgeManager?: () => void;
  onOpenFavoritesManager?: () => void;
  onToggleFollow?: () => void;
  isFollowing?: boolean;
  onOpenComparison?: () => void;
  onSelectAnime?: (anime: Anime) => void;
  onQuickChangeTitle?: (newTitle: string) => void;
}

export const PRESET_HONORARY_TITLES = [
  'Veterano Shounen',
  'Explorador de Isekai',
  'Crítico de Romance',
  'Maratonista Noturno',
  'Mestre das Temporadas',
  'Colecionador de Mangás',
  'Guardião de Seinen',
  'Especialista em Animação',
  'Otaku Raiz',
  'Lenda Suprema dos Animes',
] as const;

export const OtakuPassport: React.FC<OtakuPassportProps> = ({
  userProfile,
  animes,
  userName,
  avatarUrl,
  bannerUrl,
  userId,
  isOwner = false,
  isGuest = false,
  onOpenAvatarSettings,
  onOpenSocialCard,
  onOpenBadgeManager,
  onOpenFavoritesManager,
  onToggleFollow,
  isFollowing = false,
  onOpenComparison,
  onSelectAnime,
  onQuickChangeTitle,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showTitleSelector, setShowTitleSelector] = useState(false);

  // 1. Gamificação & Nível Otaku
  const achievementsResult = useMemo(() => {
    return calculateUserAchievements(animes);
  }, [animes]);

  const otakuLevel = useMemo(() => {
    return calculateOtakuLevel(animes, achievementsResult.totalUnlocked);
  }, [animes, achievementsResult.totalUnlocked]);

  // 2. Cálculos das 4 Métricas Essenciais de Alto Impacto
  const { totalTimeFormatted, totalHours, totalEpisodes, completionRate, averageRating } = useMemo(() => {
    let totalEps = 0;
    let completedCount = 0;
    let ratingSum = 0;
    let ratedCount = 0;

    animes.forEach((anime) => {
      const eps = getAnimeWatchedEpisodes(anime);
      totalEps += eps;
      if (anime.status === 'completed') {
        completedCount++;
      }
      if (typeof anime.rating === 'number' && anime.rating > 0) {
        ratingSum += anime.rating;
        ratedCount++;
      }
    });

    // Média de ~23.5 minutos por episódio
    const totalMinutes = totalEps * 23.5;
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const mins = Math.floor(totalMinutes % 60);

    let timeStr = '';
    if (days > 0) {
      timeStr = `${days}d ${hours}h`;
    } else if (hours > 0) {
      timeStr = `${hours}h ${mins}m`;
    } else {
      timeStr = `${mins} min`;
    }

    const compRate = animes.length > 0 ? Math.round((completedCount / animes.length) * 100) : 0;
    const avgScore = ratedCount > 0 ? (ratingSum / ratedCount).toFixed(1) : '-';

    return {
      totalTimeFormatted: timeStr,
      totalHours: Math.round(totalMinutes / 60),
      totalEpisodes: totalEps,
      completionRate: compRate,
      averageRating: avgScore,
    };
  }, [animes]);

  // 3. Moldura Dinâmica baseada no Rank/Tier
  const rankTheme = useMemo(() => {
    const code = otakuLevel.rankCode;
    switch (code) {
      case 'S+':
        return {
          ringClass: 'ring-4 ring-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.45)]',
          badgeBg: 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 text-white',
          accentColor: 'text-rose-400',
          borderHighlight: 'border-rose-500/40',
          gradientBg: 'from-rose-950/40 via-slate-900/90 to-slate-950',
          glowClass: 'shadow-[0_0_40px_rgba(244,63,94,0.15)]',
          tierName: 'Tier Mítico (S+)',
        };
      case 'S':
        return {
          ringClass: 'ring-4 ring-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.4)]',
          badgeBg: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black',
          accentColor: 'text-amber-400',
          borderHighlight: 'border-amber-500/40',
          gradientBg: 'from-amber-950/30 via-slate-900/90 to-slate-950',
          glowClass: 'shadow-[0_0_35px_rgba(245,158,11,0.15)]',
          tierName: 'Tier Diamante (S)',
        };
      case 'A':
        return {
          ringClass: 'ring-4 ring-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.35)]',
          badgeBg: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
          accentColor: 'text-purple-400',
          borderHighlight: 'border-purple-500/40',
          gradientBg: 'from-purple-950/30 via-slate-900/90 to-slate-950',
          glowClass: 'shadow-[0_0_30px_rgba(168,85,247,0.15)]',
          tierName: 'Tier Platina (A)',
        };
      case 'B':
        return {
          ringClass: 'ring-4 ring-indigo-500/70 shadow-[0_0_20px_rgba(99,102,241,0.3)]',
          badgeBg: 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white',
          accentColor: 'text-indigo-400',
          borderHighlight: 'border-indigo-500/40',
          gradientBg: 'from-indigo-950/30 via-slate-900/90 to-slate-950',
          glowClass: 'shadow-[0_0_25px_rgba(99,102,241,0.12)]',
          tierName: 'Tier Ouro (B)',
        };
      case 'C':
        return {
          ringClass: 'ring-3 ring-sky-400/60 shadow-[0_0_15px_rgba(56,189,248,0.25)]',
          badgeBg: 'bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 font-black',
          accentColor: 'text-sky-400',
          borderHighlight: 'border-sky-500/30',
          gradientBg: 'from-sky-950/20 via-slate-900/90 to-slate-950',
          glowClass: 'shadow-[0_0_20px_rgba(56,189,248,0.1)]',
          tierName: 'Tier Prata (C)',
        };
      case 'D':
        return {
          ringClass: 'ring-3 ring-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.2)]',
          badgeBg: 'bg-emerald-500 text-slate-950 font-black',
          accentColor: 'text-emerald-400',
          borderHighlight: 'border-emerald-500/30',
          gradientBg: 'from-emerald-950/20 via-slate-900/90 to-slate-950',
          glowClass: 'shadow-[0_0_20px_rgba(16,185,129,0.08)]',
          tierName: 'Tier Bronze (D)',
        };
      default:
        return {
          ringClass: 'ring-2 ring-slate-600/50',
          badgeBg: 'bg-slate-700 text-slate-200',
          accentColor: 'text-slate-400',
          borderHighlight: 'border-slate-800',
          gradientBg: 'from-slate-900/90 via-slate-900 to-slate-950',
          glowClass: 'shadow-none',
          tierName: 'Iniciante (E)',
        };
    }
  }, [otakuLevel.rankCode]);

  // 4. Animes Favoritos em Destaque (Top 3 a 5)
  const featuredAnimes = useMemo(() => {
    const idsOrTitles = userProfile?.favoriteAnimeIds || [];
    const result: Anime[] = [];

    // Tentar localizar animes cadastrados
    idsOrTitles.forEach((idOrTitle) => {
      const match = animes.find(
        (a) =>
          a.id === idOrTitle ||
          a.title.toLowerCase() === idOrTitle.toLowerCase() ||
          String(a.mal_id) === idOrTitle
      );
      if (match && !result.some((r) => r.id === match.id)) {
        result.push(match);
      }
    });

    // Se o usuário não configurou favoritos ainda, puxar automaticamente os animes com nota 10/9 mais assistidos
    if (result.length === 0 && animes.length > 0) {
      const topPicks = [...animes]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.currentEpisode || 0) - (a.currentEpisode || 0))
        .slice(0, 4);
      return topPicks;
    }

    return result.slice(0, 5);
  }, [userProfile?.favoriteAnimeIds, animes]);

  // 5. Insígnias Equipadas (Top 4)
  const equippedBadges = useMemo(() => {
    const badgeIds = userProfile?.featuredBadges || [];
    const list: Achievement[] = [];

    badgeIds.forEach((id) => {
      const found = achievementsResult.achievements.find((a) => a.id === id);
      if (found) {
        list.push(found);
      }
    });

    // Se tiver menos de 4 equipadas, preenche com as conquistas desbloqueadas de maior raridade
    if (list.length < 4) {
      const unlocked = achievementsResult.achievements
        .filter((a) => a.isUnlocked && !list.some((item) => item.id === a.id))
        .sort((a, b) => {
          const tierRank = { diamond: 5, platinum: 4, gold: 3, silver: 2, bronze: 1 };
          return (tierRank[b.tier] || 0) - (tierRank[a.tier] || 0);
        });

      list.push(...unlocked.slice(0, 4 - list.length));
    }

    return list.slice(0, 4);
  }, [userProfile?.featuredBadges, achievementsResult]);

  // Handler para cópia de link curto
  const handleCopyProfileLink = async () => {
    const cleanNick = (userProfile?.publicUsername || userId || '').replace(/^@/, '').trim();
    if (!cleanNick) return;
    const origin = window.location.origin;
    const shareUrl = `${origin}/?u=${encodeURIComponent(cleanNick)}`;

    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const currentAvatar = avatarUrl || userProfile?.customAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const currentBanner = bannerUrl || userProfile?.customBannerUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80';

  const rawUsername = userProfile?.publicUsername || userName || 'Otaku';
  const displayNick = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'perfil'}`;
  const activeHonoraryTitle = userProfile?.honoraryTitle || otakuLevel.rankTitle || 'Membro da Comunidade';

  return (
    <div
      id="otaku-passport-card"
      className={`relative w-full rounded-3xl overflow-hidden border ${rankTheme.borderHighlight} bg-gradient-to-b ${rankTheme.gradientBg} ${rankTheme.glowClass} transition-all duration-300 text-slate-100`}
    >
      {/* 1. Capa Cinematográfica com Overlay Profundo */}
      <div className="relative h-44 sm:h-56 md:h-64 w-full overflow-hidden bg-slate-950">
        <img
          src={currentBanner}
          alt="Capa do Passaporte"
          className="w-full h-full object-cover object-center filter brightness-90 hover:scale-105 transition-transform duration-700 ease-out"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80';
          }}
        />
        {/* Vinheta gradiente de iluminação cinematográfica */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#000000]/50 via-transparent to-[#000000]/50" />

        {/* Badge Flutuante "Passaporte Otaku Oficial" */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-white tracking-wide shadow-lg">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent font-black tracking-wider uppercase text-[10px]">
            Passaporte Otaku
          </span>
          <span className="w-1 h-1 rounded-full bg-amber-400/80" />
          <span className="text-[10px] text-slate-300 font-mono">{otakuLevel.rankCode}</span>
        </div>

        {/* Ações Rápidas no Topo Direito da Capa */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2">
          {/* Botão de Compartilhar / Copiar Link */}
          <button
            type="button"
            id="passport-copy-link-btn"
            onClick={handleCopyProfileLink}
            title="Copiar link público do seu passaporte"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-slate-200 hover:text-white backdrop-blur-md border border-white/15 text-xs font-semibold shadow-lg transition-all cursor-pointer active:scale-95"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">Link Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Compartilhar</span>
              </>
            )}
          </button>

          {/* Gerador de Stories / Card Social */}
          {onOpenSocialCard && (
            <button
              type="button"
              id="passport-social-card-btn"
              onClick={onOpenSocialCard}
              title="Gerar card visual para Instagram Stories e Discord"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600/80 hover:bg-indigo-600 text-white backdrop-blur-md border border-indigo-400/40 text-xs font-semibold shadow-lg shadow-indigo-950/50 transition-all cursor-pointer active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Gerar Story</span>
            </button>
          )}

          {/* Botão de Seguir / Afinidade (Se for perfil de outro usuário) */}
          {!isOwner && onToggleFollow && (
            <button
              type="button"
              id="passport-follow-btn"
              onClick={onToggleFollow}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg cursor-pointer active:scale-95 ${
                isFollowing
                  ? 'bg-slate-800/90 hover:bg-rose-950/90 text-slate-200 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 shadow-emerald-950/50'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Seguindo</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Seguir</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. Área do Avatar, Identidade e Título */}
      <div className="relative px-4 sm:px-6 md:px-8 -mt-16 sm:-mt-20 md:-mt-22 pb-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
          
          {/* Avatar + Moldura Evolutiva */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-5 text-center sm:text-left">
            <div className="relative group shrink-0">
              <div className={`w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden bg-slate-900 ${rankTheme.ringClass} transition-all duration-300 relative shadow-2xl`}>
                <img
                  src={currentAvatar}
                  alt={rawUsername}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                  }}
                />
              </div>

              {/* Tag de Rank / Nível no Canto do Avatar */}
              <div
                className={`absolute -bottom-1.5 sm:bottom-0 right-1 sm:right-2 px-2.5 py-0.5 rounded-full ${rankTheme.badgeBg} border-2 border-black text-[11px] font-black shadow-lg flex items-center gap-1`}
              >
                <span>Nv. {otakuLevel.level}</span>
                <span className="text-[10px] opacity-80 uppercase">({otakuLevel.rankCode})</span>
              </div>

              {/* Botão de Editar Avatar Rápido (Apenas Dono) */}
              {isOwner && onOpenAvatarSettings && (
                <button
                  type="button"
                  id="passport-edit-avatar-btn"
                  onClick={onOpenAvatarSettings}
                  title="Alterar foto de perfil e capa"
                  className="absolute inset-0 bg-black/60 backdrop-blur-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold cursor-pointer"
                >
                  <Edit3 className="w-5 h-5 mb-0.5 text-indigo-300" />
                  <span>Editar</span>
                </button>
              )}
            </div>

            {/* Informações Nominais & Título Honorário */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>{userProfile?.publicUsername ? `@${userProfile.publicUsername.replace(/^@/, '')}` : rawUsername}</span>
                </h1>

                {/* Badge de Desenvolvedor / VIP */}
                {userProfile?.isDeveloperAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold tracking-wider uppercase shadow-sm">
                    <Crown className="w-3 h-3 text-amber-400" />
                    Dev Creator
                  </span>
                )}
              </div>

              {/* Título Honorário (Com Seletor Rápido se for o Dono) */}
              <div className="relative inline-block">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <div
                    onClick={() => isOwner && setShowTitleSelector(!showTitleSelector)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-white/10 text-xs font-semibold ${
                      rankTheme.accentColor
                    } shadow-sm backdrop-blur-md ${isOwner ? 'cursor-pointer hover:border-white/20' : ''}`}
                    title={isOwner ? 'Clique para trocar seu título honorário' : undefined}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>{activeHonoraryTitle}</span>
                    {isOwner && <Edit3 className="w-3 h-3 text-slate-400 ml-1 hover:text-white" />}
                  </div>

                  <span className="text-xs text-slate-400 font-medium">
                    • {rankTheme.tierName}
                  </span>
                </div>

                {/* Dropdown de Títulos Honorários (Dono) */}
                {isOwner && showTitleSelector && (
                  <div className="absolute left-0 top-full mt-2 z-50 w-64 p-2 rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl backdrop-blur-xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                      Escolha seu Título de Destaque:
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
                      {PRESET_HONORARY_TITLES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            if (onQuickChangeTitle) onQuickChangeTitle(t);
                            setShowTitleSelector(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                            activeHonoraryTitle === t
                              ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40'
                              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                          }`}
                        >
                          <span>{t}</span>
                          {activeHonoraryTitle === t && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bio do Usuário */}
              {userProfile?.publicBio ? (
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl line-clamp-2 leading-relaxed">
                  "{userProfile.publicBio}"
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  {isOwner ? 'Adicione uma bio estilosa personalizando seu perfil...' : 'Nenhuma bio cadastrada.'}
                </p>
              )}
            </div>
          </div>

          {/* Ações Adicionais do Perfil (Comparar Afinidade / Customizar) */}
          <div className="flex items-center gap-2 self-center sm:self-end">
            {!isOwner && onOpenComparison && (
              <button
                type="button"
                id="passport-compare-affinity-btn"
                onClick={onOpenComparison}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 border border-purple-400/40 cursor-pointer active:scale-95 transition-all"
              >
                <HeartHandshake className="w-4 h-4 text-pink-300" />
                <span>Comparar Afinidade</span>
              </button>
            )}

            {isOwner && onOpenAvatarSettings && (
              <button
                type="button"
                id="passport-open-settings-btn"
                onClick={onOpenAvatarSettings}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/10 hover:border-white/20 text-xs font-semibold shadow-md backdrop-blur-md cursor-pointer transition-all active:scale-95"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                <span>Editar Passaporte</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. As 4 Métricas Essenciais de Alto Impacto (Cards Limpos e Matemáticos) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: Tempo de Vida em Animes */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/60 border border-white/8 backdrop-blur-md flex items-center gap-3 shadow-sm hover:border-white/15 transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400 shadow-inner">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tempo em Anime</div>
              <div className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                {totalTimeFormatted}
              </div>
              <div className="text-[10px] text-slate-400 truncate">≈ {totalHours} horas totais</div>
            </div>
          </div>

          {/* Card 2: Episódios Assistidos */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/60 border border-white/8 backdrop-blur-md flex items-center gap-3 shadow-sm hover:border-white/15 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 shadow-inner">
              <Tv className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Episódios Vistos</div>
              <div className="text-base sm:text-lg font-black text-white tracking-tight">
                {totalEpisodes.toLocaleString('pt-BR')}
              </div>
              <div className="text-[10px] text-slate-400 truncate">{animes.length} animes na lista</div>
            </div>
          </div>

          {/* Card 3: Nível e Barra de XP */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/60 border border-white/8 backdrop-blur-md flex flex-col justify-center gap-1.5 shadow-sm hover:border-white/15 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className={`w-4 h-4 ${rankTheme.accentColor}`} />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nível Otaku</span>
              </div>
              <span className={`text-xs font-black ${rankTheme.accentColor}`}>Nv. {otakuLevel.level}</span>
            </div>
            {/* Barra de Progresso de XP */}
            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full ${rankTheme.badgeBg} transition-all duration-500`}
                style={{ width: `${otakuLevel.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{otakuLevel.currentLevelXp} XP</span>
              <span>{otakuLevel.nextLevelXpRequired} XP ({otakuLevel.progressPercent}%)</span>
            </div>
          </div>

          {/* Card 4: Taxa de Conclusão / Média de Notas */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/60 border border-white/8 backdrop-blur-md flex items-center gap-3 shadow-sm hover:border-white/15 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
              <Star className="w-5 h-5 fill-amber-400/20" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Média / Conclusão</div>
              <div className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1">
                <span>⭐ {averageRating}</span>
                <span className="text-slate-400 text-xs font-normal">/ 10</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">{completionRate}% animes concluídos</div>
            </div>
          </div>
        </div>

        {/* 4. Vitrine de Honra dos Favoritos Sagrados */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/8 backdrop-blur-md space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                Vitrine de Honra • Animes Favoritos
              </h3>
            </div>
            {isOwner && onOpenFavoritesManager && (
              <button
                type="button"
                onClick={onOpenFavoritesManager}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Editar Favoritos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {featuredAnimes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {featuredAnimes.map((anime, index) => (
                <div
                  key={anime.id || index}
                  onClick={() => onSelectAnime && onSelectAnime(anime)}
                  className={`group relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-amber-400/50 transition-all duration-300 cursor-pointer shadow-md hover:shadow-amber-500/10 hover:-translate-y-1`}
                >
                  {/* Pôster Vertical */}
                  <div className="aspect-[3/4] w-full overflow-hidden relative">
                    <img
                      src={anime.coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80'}
                      alt={anime.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    
                    {/* Badge de Posição (#1, #2, etc) */}
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs border border-white/10 text-[10px] font-black text-amber-300">
                      #{index + 1}
                    </div>

                    {/* Nota do Usuário se houver */}
                    {typeof anime.rating === 'number' && anime.rating > 0 && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-black text-[10px] flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>{anime.rating}</span>
                      </div>
                    )}

                    {/* Título Sobreposto */}
                    <div className="absolute bottom-2 inset-x-2">
                      <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                        {anime.title}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {anime.studio || `${anime.currentEpisode || 0} eps`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
              <p className="text-xs text-slate-400">
                {isOwner
                  ? 'Você ainda não definiu seus animes favoritos. Clique em Editar Favoritos para destacar suas obras favoritas!'
                  : 'Nenhum anime favorito cadastrado.'}
              </p>
            </div>
          )}
        </div>

        {/* 5. Faixa de Insígnias & Medalhas de Conquistas */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/8 backdrop-blur-md space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                Insígnias Equipadas ({equippedBadges.length}/4)
              </h3>
            </div>
            {isOwner && onOpenBadgeManager && (
              <button
                type="button"
                onClick={onOpenBadgeManager}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Gerenciar Insígnias</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {equippedBadges.map((badge, idx) => (
              <div
                key={badge.id || idx}
                className={`p-2.5 rounded-2xl bg-slate-900/90 border ${
                  badge.tier === 'diamond'
                    ? 'border-fuchsia-500/50 bg-fuchsia-950/30'
                    : badge.tier === 'platinum'
                    ? 'border-cyan-500/50 bg-cyan-950/30'
                    : badge.tier === 'gold'
                    ? 'border-amber-500/50 bg-amber-950/30'
                    : badge.tier === 'silver'
                    ? 'border-slate-400/40 bg-slate-800/40'
                    : 'border-amber-700/40 bg-amber-950/20'
                } flex items-center gap-3 hover:border-white/30 transition-all shadow-md`}
              >
                <AchievementBadge
                  achievement={badge}
                  size="sm"
                  showProgressRing={false}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{badge.title}</p>
                  <p className="text-[10px] text-slate-400 capitalize truncate">{badge.animeTag || badge.tier}</p>
                </div>
              </div>
            ))}

            {/* Slots vazios se houver menos de 4 */}
            {Array.from({ length: Math.max(0, 4 - equippedBadges.length) }).map((_, emptyIdx) => (
              <div
                key={`empty-${emptyIdx}`}
                onClick={() => isOwner && onOpenBadgeManager && onOpenBadgeManager()}
                className={`p-3 rounded-xl border border-dashed border-white/10 bg-white/2 flex items-center justify-center text-center gap-2 ${
                  isOwner ? 'cursor-pointer hover:border-indigo-400/40 hover:bg-indigo-950/10' : ''
                }`}
              >
                <Plus className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] text-slate-400 font-medium">Slot Livre</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
