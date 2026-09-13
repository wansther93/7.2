import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Crown,
  Edit3,
  Share2,
  Tv,
  Film,
  Clock,
  Star,
  CheckCircle2,
  BarChart2,
  Award,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  MessageSquare,
  Users,
  Swords,
  Search,
  Camera,
  Heart,
  ExternalLink,
  ShieldCheck,
  Flame,
  UserPlus,
  UserCheck,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { STATUS_CONFIG, type Anime, type AnimeStatus } from '../../types';
import type { UserProfile } from '../../services/profileService';
import {
  calculateUserAchievements,
  getAnimeWatchedEpisodes,
} from '../../services/achievementService';
import {
  followUser,
  unfollowUser,
  getFollowedUsers,
  getFollowedUserProfiles,
  getUserProfileByUsername,
  getUserProfile,
  getCommunityPopularProfiles,
} from '../../services/profileService';
import { getPublicUserAnimes } from '../../services/animeService';
import { HexBadge, type BadgeTone } from './HexBadge';
import { Top5Podium } from './Top5Podium';
import { EditTop5Modal } from './EditTop5Modal';
import { EditProfileModal } from './EditProfileModal';
import { BadgesShowcaseModal } from './BadgesShowcaseModal';
import { WriteReviewModal } from './WriteReviewModal';
import { CollectionVersusModal } from '../social/CollectionVersusModal';
import { ScheduleDetailModal } from '../ScheduleDetailModal';
import type { ScheduleAnimeItem } from '../../services/jikanService';
import type { CommunityReview } from '../../services/communityService';
import { copyToClipboard } from '../../lib/clipboard';
import { translateBroadcastDay } from '../../services/aggregatorStatusService';

function animeToScheduleItem(anime: Anime): ScheduleAnimeItem {
  let numericId = 0;
  if (typeof anime.id === 'number') {
    numericId = anime.id;
  } else if (typeof anime.id === 'string' && !isNaN(Number(anime.id))) {
    numericId = Number(anime.id);
  } else if (anime.mal_id) {
    numericId = Number(anime.mal_id);
  } else {
    let hash = 0;
    const str = anime.id || anime.title || 'anime';
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    numericId = Math.abs(hash) || 1;
  }

  let resolvedStatus = anime.airingStatus || 'Finished Airing';

  if (anime.status === 'watching') {
    resolvedStatus = anime.airingStatus || 'Currently Airing';
  } else if (anime.status === 'waiting_new_episodes') {
    resolvedStatus = 'Not yet aired';
  } else if (anime.status === 'plan_to_watch') {
    resolvedStatus = anime.airingStatus || 'Not yet aired';
  } else if (anime.status === 'completed') {
    resolvedStatus = anime.airingStatus || 'Finished Airing';
  }

  // Apenas animes em exibição que possuam dia de transmissão recebem o dia traduzido
  const isActivelyAiring =
    resolvedStatus === 'Currently Airing' ||
    resolvedStatus === 'releasing' ||
    (anime.status === 'watching' && Boolean(anime.broadcastDay));

  const validBroadcastDay = isActivelyAiring
    ? translateBroadcastDay(anime.broadcastDay) || undefined
    : undefined;

  return {
    id: numericId,
    idMal: anime.mal_id ? Number(anime.mal_id) : undefined,
    idAniList: (anime as any).aniListId ? Number((anime as any).aniListId) : undefined,
    title: anime.title,
    title_english: (anime as any).englishTitle,
    title_japanese: anime.japaneseTitle,
    coverUrl: anime.coverUrl || '',
    bannerUrl: anime.bannerUrl || undefined,
    broadcastDay: validBroadcastDay,
    broadcastTime: validBroadcastDay ? (anime as any).broadcastTime : undefined,
    genres: anime.genres || [],
    score: typeof anime.rating === 'number' && anime.rating > 0 ? anime.rating : ((anime as any).score || null),
    synopsis: anime.synopsis || null,
    episodes: anime.totalEpisodes || null,
    status: resolvedStatus,
    studio: anime.studio || null,
    year: anime.releaseYear || undefined,
    format: anime.format || 'TV',
    trailer: anime.trailerUrl ? { url: anime.trailerUrl } : null,
  };
}

export interface OtakuProfileViewProps {
  profile: UserProfile | null;
  animes: Anime[];
  isOwner: boolean;
  currentUserId?: string;
  myAnimes?: Anime[];
  reviews: CommunityReview[];
  onOpenAnimeDetail?: (anime: Anime) => void;
  onUpdateProfile?: (updated: Partial<UserProfile>) => Promise<void>;
  onReviewCreated?: (review: CommunityReview) => void;
  onOpenStatsDetail?: () => void;
  onOpenPublicProfile?: (usernameOrId: string) => void;
  onAddAnimeFromFriend?: (prefill: Partial<Anime>) => void;
  onOpenEditProfile?: () => void;
}

export const OtakuProfileView: React.FC<OtakuProfileViewProps> = ({
  profile,
  animes,
  isOwner,
  currentUserId,
  myAnimes = [],
  reviews,
  onOpenAnimeDetail,
  onUpdateProfile,
  onReviewCreated,
  onOpenStatsDetail,
  onOpenPublicProfile,
  onAddAnimeFromFriend,
  onOpenEditProfile,
}) => {
  // Aba Superior: 'profile' (Meu Perfil) | 'feed' (Feed da Comunidade) | 'friends' (Amigos & Conexões)
  const [activeMainTab, setActiveMainTab] = useState<'profile' | 'feed' | 'friends'>('profile');

  // Estado de Visita a Perfil de Amigo / Terceiro
  const [visitedProfile, setVisitedProfile] = useState<UserProfile | null>(null);
  const [visitedAnimes, setVisitedAnimes] = useState<Anime[]>([]);
  const [isLoadingVisited, setIsLoadingVisited] = useState(false);
  const [visitedError, setVisitedError] = useState<string | null>(null);

  // Amigos / Seguindo
  const [followingList, setFollowingList] = useState<string[]>(() => {
    return currentUserId ? getFollowedUsers(currentUserId) : [];
  });
  const [followedProfiles, setFollowedProfiles] = useState<UserProfile[]>([]);
  const [isLoadingFollowed, setIsLoadingFollowed] = useState(false);
  const [popularMembers, setPopularMembers] = useState<UserProfile[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isSearchingMember, setIsSearchingMember] = useState(false);

  // Modais
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditTop5Open, setIsEditTop5Open] = useState(false);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [isVersusModalOpen, setIsVersusModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedScheduleAnime, setSelectedScheduleAnime] = useState<ScheduleAnimeItem | null>(null);

  const handleOpenAnimeInfo = useCallback((targetAnime: Anime) => {
    const item = animeToScheduleItem(targetAnime);
    setSelectedScheduleAnime(item);
  }, []);

  // Coleção Completa Expansível (minimizar/maximizar) e Filtro por Nome
  const [isCollectionExpanded, setIsCollectionExpanded] = useState(false);
  const collectionTopRef = useRef<HTMLDivElement>(null);
  const [collectionSearch, setCollectionSearch] = useState('');

  // Carrega lista de perfis seguidos
  const loadFollowedProfiles = useCallback(async () => {
    if (!followingList || followingList.length === 0) {
      setFollowedProfiles([]);
      return;
    }
    setIsLoadingFollowed(true);
    try {
      const data = await getFollowedUserProfiles(followingList);
      setFollowedProfiles(data);
    } catch (e) {
      console.warn('Erro ao carregar perfis seguidos:', e);
    } finally {
      setIsLoadingFollowed(false);
    }
  }, [followingList]);

  // Carrega dados sociais ao abrir aba de amigos ou quando a lista de seguidos mudar
  useEffect(() => {
    getCommunityPopularProfiles().then(setPopularMembers).catch(console.warn);
  }, []);

  useEffect(() => {
    if (activeMainTab === 'friends') {
      loadFollowedProfiles();
    }
  }, [activeMainTab, loadFollowedProfiles]);

  // Perfil e animes atualmente em exibição (Meu perfil ou Perfil Visitado)
  const isVisiting = Boolean(visitedProfile);
  const currentDisplayedProfile = visitedProfile || profile;
  const currentDisplayedAnimes = visitedProfile ? visitedAnimes : animes;
  const effectiveIsOwner = isOwner && !isVisiting;

  // Verificação de Desenvolvedor / Admin restrita estritamente ao e-mail oficial
  const isDevAdmin = useMemo(() => {
    const email = (currentDisplayedProfile?.email || '').trim().toLowerCase();
    return email === 'lanskyy93@gmail.com';
  }, [currentDisplayedProfile]);

  // Abertura unificada do modal de edição
  const handleOpenEdit = () => {
    if (onOpenEditProfile) {
      onOpenEditProfile();
    } else {
      setIsEditProfileOpen(true);
    }
  };

  // Visitar perfil de outro usuário (priorizando userId como chave primária definitiva)
  const handleVisitUser = async (targetUsernameOrId: string) => {
    if (!targetUsernameOrId) return;
    const rawTarget = targetUsernameOrId.trim();
    const clean = rawTarget.toLowerCase().replace(/^@/, '');
    const myNick = (profile?.publicUsername || '').trim().toLowerCase().replace(/^@/, '');

    // Se for o próprio usuário, apenas volta ao perfil próprio
    if (rawTarget === currentUserId || clean === myNick || clean === (currentUserId || '').toLowerCase()) {
      setVisitedProfile(null);
      setVisitedAnimes([]);
      setActiveMainTab('profile');
      return;
    }

    setIsLoadingVisited(true);
    setVisitedError(null);
    try {
      // 1. Chave primária obrigatória: tenta carregar diretamente por userId único
      let targetProf = await getUserProfile(rawTarget);

      // 2. Se não encontrar pelo UID, busca por username como fallback
      if (!targetProf) {
        targetProf = await getUserProfileByUsername(clean);
      }
      if (!targetProf && rawTarget !== clean) {
        targetProf = await getUserProfile(clean);
      }

      if (targetProf) {
        setVisitedProfile(targetProf);
        const animesData = await getPublicUserAnimes(targetProf.userId || rawTarget);
        setVisitedAnimes(animesData);
        setActiveMainTab('profile');
      } else {
        setVisitedError(`Nenhum perfil público encontrado para "${rawTarget}".`);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil do usuário:', err);
      setVisitedError('Não foi possível carregar os dados deste usuário.');
    } finally {
      setIsLoadingVisited(false);
    }
  };

  const handleReturnToMyProfile = () => {
    setVisitedProfile(null);
    setVisitedAnimes([]);
    setVisitedError(null);
    setActiveMainTab('profile');
  };

  // Seguir / Deixar de seguir
  const isFollowingCurrent = useMemo(() => {
    if (!currentDisplayedProfile) return false;
    const target = (currentDisplayedProfile.publicUsername || currentDisplayedProfile.userId || '')
      .toLowerCase()
      .replace(/^@/, '');
    return followingList.includes(target);
  }, [followingList, currentDisplayedProfile]);

  const handleToggleFollow = async () => {
    if (!currentUserId || !currentDisplayedProfile) return;
    const target = (currentDisplayedProfile.publicUsername || currentDisplayedProfile.userId || '')
      .toLowerCase()
      .replace(/^@/, '');
    if (isFollowingCurrent) {
      const updated = await unfollowUser(currentUserId, target);
      setFollowingList(updated);
    } else {
      const updated = await followUser(currentUserId, target);
      setFollowingList(updated);
    }
  };

  // 1. Estatísticas Otaku Reais (Calculadas com precisão matemática absoluta)
  const stats = useMemo(() => {
    const list = currentDisplayedAnimes;
    const totalAnimes = list.length;
    let totalEps = 0;
    let ratedCount = 0;
    let scoreSum = 0;
    let completedCount = 0;
    let watchingCount = 0;

    list.forEach((a) => {
      totalEps += getAnimeWatchedEpisodes(a);
      if (typeof a.rating === 'number' && a.rating > 0) {
        scoreSum += a.rating;
        ratedCount++;
      }
      if (a.status === 'completed') completedCount++;
      if (a.status === 'watching' || a.status === 'waiting_new_episodes') watchingCount++;
    });

    const totalMinutes = Math.round(totalEps * 23.5);
    const days = Math.floor(totalMinutes / (24 * 60));
    const remainingHours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const totalHours = Math.round(totalMinutes / 60);

    const formattedTime = days > 0 
      ? `${days}d ${remainingHours}h`
      : `${totalHours}h`;

    const meanScore = ratedCount > 0 ? (scoreSum / ratedCount).toFixed(1) : '—';
    const completedPercent = totalAnimes > 0 ? ((completedCount / totalAnimes) * 100).toFixed(0) : '0';
    const watchingPercent = totalAnimes > 0 ? ((watchingCount / totalAnimes) * 100).toFixed(0) : '0';

    return {
      totalAnimes,
      totalEps,
      days,
      remainingHours,
      totalHours,
      formattedTime,
      meanScore,
      completedCount,
      completedPercent,
      watchingCount,
      watchingPercent,
    };
  }, [currentDisplayedAnimes]);

  // 2. Animes do Top 5
  const top5Animes = useMemo(() => {
    const ids =
      (currentDisplayedProfile as any)?.top5AnimeIds ||
      currentDisplayedProfile?.favoriteAnimeIds ||
      [];
    const list: (Anime | null)[] = [null, null, null, null, null];

    ids.slice(0, 5).forEach((id: string, index: number) => {
      const found = currentDisplayedAnimes.find((a) => a.id === id);
      if (found) list[index] = found;
    });

    // Se nenhum estiver preenchido, sugere os melhores da coleção
    if (list.every((item) => item === null) && currentDisplayedAnimes.length > 0) {
      const sorted = [...currentDisplayedAnimes]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5);
      sorted.forEach((item, index) => {
        list[index] = item;
      });
    }

    return list;
  }, [currentDisplayedProfile, currentDisplayedAnimes]);

  // 3. Conquistas & Insígnias (Estritamente 5 slots, SEM preenchimento automático)
  const { allAchievements, slotBadges } = useMemo(() => {
    const result = calculateUserAchievements(currentDisplayedAnimes);
    const calculated = result.achievements;
    const featured = currentDisplayedProfile?.featuredBadges || [];

    // Mapeia EXATAMENTE 5 slots (0 a 4). Sem auto-fill!
    const slots = [0, 1, 2, 3, 4].map((index) => {
      const badgeId = featured[index];
      if (!badgeId) return null;
      const ach = calculated.find((a) => a.id === badgeId && a.isUnlocked);
      return ach || null;
    });

    return {
      allAchievements: calculated,
      slotBadges: slots,
    };
  }, [currentDisplayedAnimes, currentDisplayedProfile]);

  // 4. Resenhas Filtradas
  const myReviews = useMemo(() => {
    const nick = (currentDisplayedProfile?.publicUsername || '').toLowerCase().replace(/^@/, '');
    const uid = currentDisplayedProfile?.userId;
    return reviews.filter(
      (r) =>
        (r.userNick && r.userNick.toLowerCase().replace(/^@/, '') === nick) ||
        (uid && r.userId === uid)
    );
  }, [reviews, currentDisplayedProfile]);

  // 5. Coleção Filtrada (Apenas busca pelo nome e filtro 'Todos')
  const filteredCollection = useMemo(() => {
    if (!collectionSearch.trim()) return currentDisplayedAnimes;
    const q = collectionSearch.toLowerCase();
    return currentDisplayedAnimes.filter((a) => a.title.toLowerCase().includes(q));
  }, [currentDisplayedAnimes, collectionSearch]);

  // Função para desequipar uma insígnia dos 5 slots do perfil
  const handleUnequipBadge = async (badgeId: string) => {
    if (!effectiveIsOwner || !onUpdateProfile) return;
    const current = (currentDisplayedProfile?.featuredBadges || []).filter((id) => id !== badgeId);
    await onUpdateProfile({
      ...profile,
      featuredBadges: current,
    });
  };

  // Helper para tag de status padronizada exatamente como na aba de lista
  const getAnimeStatusMeta = (status: AnimeStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.plan_to_watch;
    return {
      label: config.shortLabel || config.label,
      badgeBg: config.badgeBg,
    };
  };

  // Copiar link do perfil
  const handleShareProfile = async () => {
    const nick =
      currentDisplayedProfile?.publicUsername ||
      currentDisplayedProfile?.userId ||
      currentUserId ||
      '';
    const shareUrl = `${window.location.origin}/?share=${encodeURIComponent(nick)}`;
    await copyToClipboard(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getBadgeTone = (tier: string): BadgeTone => {
    switch (tier) {
      case 'diamond':
        return 'cyan';
      case 'platinum':
        return 'purple';
      case 'gold':
        return 'gold';
      case 'silver':
        return 'blue';
      default:
        return 'amber';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-24 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* NAVEGAÇÃO SUPERIOR: SEPARAÇÃO MEU PERFIL vs FEED DA COMUNIDADE vs AMIGOS */}
      {/* ========================================================================= */}
      <div className="relative w-full rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-xl overflow-hidden p-1.5">
        {/* Indicadores de Rolagem com Degradê sutil nas extremidades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black via-black/60 to-transparent z-10 rounded-l-2xl" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black via-black/60 to-transparent z-10 rounded-r-2xl" />

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth px-2 py-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              if (isVisiting) handleReturnToMyProfile();
              setActiveMainTab('profile');
            }}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none shrink-0 ${
              activeMainTab === 'profile' && !isVisiting
                ? 'bg-white/10 text-amber-300 border border-amber-400/40 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Meu Perfil</span>
          </button>

          {isVisiting && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                setActiveMainTab('profile');
              }}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none shrink-0 ${
                activeMainTab === 'profile'
                  ? 'bg-white/10 text-amber-300 border border-amber-400/40 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Perfil de @{currentDisplayedProfile?.publicUsername || 'Visitante'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              setActiveMainTab('feed');
            }}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none shrink-0 ${
              activeMainTab === 'feed'
                ? 'bg-white/10 text-amber-300 border border-amber-400/40 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span>Feed da Comunidade</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              setActiveMainTab('friends');
            }}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none shrink-0 ${
              activeMainTab === 'friends'
                ? 'bg-white/10 text-amber-300 border border-amber-400/40 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Amigos & Conexões</span>
          </button>
        </div>
      </div>

      {/* Alerta / Banner quando está visitando o perfil de outro membro */}
      {isVisiting && (
        <div className="w-full p-3 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <Users className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-200 truncate">
              Visualizando o perfil público de{' '}
              <strong className="text-amber-300">
                @{currentDisplayedProfile?.publicUsername || 'otaku'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleFollow}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                isFollowingCurrent
                  ? 'bg-white/10 text-slate-200 hover:bg-red-500/20 hover:text-red-300'
                  : 'bg-amber-400 text-slate-950 font-black hover:bg-amber-300 shadow-md shadow-amber-400/20'
              }`}
            >
              {isFollowingCurrent ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{isFollowingCurrent ? 'Seguindo' : 'Seguir'}</span>
            </button>

            <button
              type="button"
              onClick={handleReturnToMyProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/90 border border-white/20 text-white text-xs font-bold transition-all cursor-pointer select-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Meu Perfil</span>
            </button>
          </div>
        </div>
      )}

      {/* Erro de busca de perfil */}
      {visitedError && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{visitedError}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: VISUALIZAÇÃO DO PERFIL (MEU PERFIL OU PERFIL VISITADO) */}
      {/* ========================================================================= */}
      {activeMainTab === 'profile' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* ========================================================================= */}
          {/* 1. CABEÇALHO UNIFICADO: BANNER PANORÂMICO NATURAL + IDENTIDADE INTEGRADA */}
          {/* ========================================================================= */}
          <div className="w-full bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Banner com Proporção Natural (Permite ver a arte completa sem cortes forçados) */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-72 sm:max-h-80 overflow-hidden bg-black">
              {currentDisplayedProfile?.customBannerUrl ? (
                <img
                  src={currentDisplayedProfile.customBannerUrl}
                  alt="Banner do Perfil"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover object-center brightness-100"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-neutral-950 via-black to-neutral-950 flex items-center justify-center text-slate-600 text-xs" />
              )}

              {/* Sombra suave com degradê cobrindo os 20% inferiores do banner para fundir no fundo preto sem divisão */}
              <div className="absolute bottom-0 inset-x-0 h-[20%] bg-gradient-to-b from-transparent via-black/50 to-black pointer-events-none z-10" />

              {/* Botão de Compartilhar: Apenas ícone verde neon sutil e chamativo no topo direito do banner */}
              <button
                type="button"
                id="btn-share-profile-banner"
                onClick={handleShareProfile}
                title="Compartilhar Perfil"
                className="absolute top-3.5 right-3.5 z-20 p-1.5 text-emerald-400 hover:text-emerald-300 transition-transform active:scale-90 hover:scale-110 cursor-pointer drop-shadow-[0_2px_10px_rgba(52,211,153,0.85)] select-none"
              >
                <Share2 className="w-5 h-5 stroke-[2.2]" />
              </button>

              {/* Toast de Link Copiado */}
              {copiedLink && (
                <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl animate-in fade-in">
                  Link copiado com sucesso!
                </div>
              )}
            </div>

            {/* Bloco de Informações Compacto e Integrado: Clicável para edição quando dono do perfil */}
            <div
              onClick={effectiveIsOwner ? handleOpenEdit : undefined}
              role={effectiveIsOwner ? 'button' : undefined}
              tabIndex={effectiveIsOwner ? 0 : undefined}
              onKeyDown={(e) => {
                if (effectiveIsOwner && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleOpenEdit();
                }
              }}
              title={effectiveIsOwner ? 'Clique para editar seu perfil' : undefined}
              className={`px-4 sm:px-6 pb-5 pt-1 relative bg-black transition-colors ${
                effectiveIsOwner
                  ? 'cursor-pointer hover:bg-neutral-950/60 group/profileCard select-none'
                  : ''
              }`}
            >
              {/* Estrutura Compacta: Avatar Flutuante à esquerda + Informações imediatamente ao lado */}
              <div className="flex flex-row items-start gap-3.5 sm:gap-5 -mt-10 sm:-mt-12 relative z-20">
                {/* Avatar Circular Flutuante com Glow Dourado (z-20 garante nitidez total e sem corte/sombra) */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-black relative">
                      {currentDisplayedProfile?.customAvatarUrl ? (
                        <img
                          src={currentDisplayedProfile.customAvatarUrl}
                          alt={currentDisplayedProfile.publicUsername || 'Avatar'}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-2xl">
                          {(currentDisplayedProfile?.publicUsername || 'O').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conteúdo ao lado do Avatar: Linha 1 (@Nick + Tag), Linha 2 (Título de Honra), Linha 3 (Bio) */}
                <div className="pt-2 min-w-0 flex-1 flex flex-col justify-center">
                  {/* Linha 1: Apenas @Nick (sem duplicidade) + Slot Padronizado de Tag */}
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <h1 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight truncate">
                      @{currentDisplayedProfile?.publicUsername?.replace(/^@/, '') || 'Otaku'}
                    </h1>

                    {/* Slot de Tag Padronizado (proporção fixa h-6 para simetria com futuras tags de usuários) */}
                    {isDevAdmin && (
                      <div className="h-6 inline-flex items-center gap-1 px-2.5 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-300 text-[10px] font-black tracking-wider uppercase shadow-[0_0_10px_rgba(168,85,247,0.3)] shrink-0 select-none">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span>DEV / ADMIN</span>
                      </div>
                    )}
                  </div>

                  {/* Linha 2: Título de Honra com a Coroa */}
                  <div className="mt-0.5 flex items-center gap-1.5 text-amber-400 text-xs sm:text-sm font-bold truncate">
                    <Crown className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
                    <span className="truncate">{currentDisplayedProfile?.honoraryTitle || 'Viajante dos Animes'}</span>
                  </div>

                  {/* Linha 3: Biografia fluida logo abaixo */}
                  <p className="mt-1.5 text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {currentDisplayedProfile?.publicBio ||
                      'Animes, boas histórias e grandes emoções. Esse é o meu mundo.'}
                  </p>

                  {/* Botões de Ação para Visitantes (Seguir e Comparar Listas) */}
                  {!effectiveIsOwner && (
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFollow();
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 shadow-md ${
                          isFollowingCurrent
                            ? 'bg-white/10 text-slate-300 border border-white/20 hover:border-red-400'
                            : 'bg-amber-400 text-slate-950 shadow-amber-400/20 hover:bg-amber-300'
                        }`}
                      >
                        {isFollowingCurrent ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                        <span>{isFollowingCurrent ? 'Seguindo' : 'Seguir'}</span>
                      </button>

                      <button
                        type="button"
                        id="btn-compare-lists-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsVersusModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-300 text-xs font-black transition-all active:scale-95 shadow-md shadow-amber-400/10"
                      >
                        <Swords className="w-3.5 h-3.5 text-amber-400" />
                        <span>Comparar Listas</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. ESTATÍSTICAS DO PERFIL COMPACTAS (3 INFORMAÇÕES ESSENCIAIS + LINK) */}
          {/* ========================================================================= */}
          <div
            id="container-profile-stats"
            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 sm:px-6 shadow-2xl relative space-y-2.5 transition-all duration-300"
          >
            {/* Cabeçalho da Seção de Estatísticas: Ícone e Título Centralizados no Topo */}
            <div className="w-full flex items-center justify-center gap-2 pb-1.5 border-b border-white/5">
              <div className="w-5 h-5 rounded-md bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0">
                <BarChart2 className="w-3 h-3" />
              </div>
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                Estatísticas
              </h3>
            </div>

            {/* Faixa Horizontal com 3 Métricas Essenciais */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full text-center">
              {/* 1. Tempo Assistido */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 text-slate-400 text-[11px] font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Tempo</span>
                </div>
                <span
                  title={`Total aproximado: ${stats.totalHours.toLocaleString('pt-BR')} horas assistidas`}
                  className="text-sm sm:text-base md:text-lg font-black text-white cursor-help"
                >
                  {stats.formattedTime}
                </span>
              </div>

              {/* 2. Quantidade de Episódios */}
              <div className="flex flex-col items-center gap-0.5 border-x border-white/5">
                <div className="flex items-center gap-1 text-slate-400 text-[11px] font-medium">
                  <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Episódios</span>
                </div>
                <span className="text-sm sm:text-base md:text-lg font-black text-white">
                  {stats.totalEps.toLocaleString('pt-BR')}
                </span>
              </div>

              {/* 3. Nota (Média) */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 text-slate-400 text-[11px] font-medium">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
                  <span>Nota (Média)</span>
                </div>
                <span className="text-sm sm:text-base md:text-lg font-black text-white">
                  {stats.meanScore}
                </span>
              </div>
            </div>

            {/* Link Sutil Centralizado para Estatísticas Completas */}
            {onOpenStatsDetail && (
              <div className="pt-1.5 border-t border-white/5 flex justify-center">
                <button
                  type="button"
                  id="btn-open-full-stats"
                  onClick={onOpenStatsDetail}
                  className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer py-0.5 px-3 rounded-full hover:bg-white/[0.04] group/stats-link"
                >
                  <span>Estatísticas completas</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover/stats-link:text-amber-300 group-hover/stats-link:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. TOP 5 PÓDIO REFORMULADO (Cards em Aspect 2:3, sem espremer no mobile) */}
          {/* ========================================================================= */}
          <Top5Podium
            animes={top5Animes}
            isEditable={effectiveIsOwner}
            onEdit={() => setIsEditTop5Open(true)}
            onSelectAnime={handleOpenAnimeInfo}
          />

          {/* ========================================================================= */}
          {/* 4. SISTEMA DE 5 INSÍGNIAS (SEM PREENCHIMENTO AUTOMÁTICO) */}
          {/* ========================================================================= */}
          <div className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    5 INSÍGNIAS EM DESTAQUE
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Apenas as insígnias escolhidas a dedo por você ocupam estes 5 slots
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-view-all-badges"
                onClick={() => setIsBadgesModalOpen(true)}
                className="text-xs text-slate-400 hover:text-amber-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Ver todas as insígnias</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Grid dos 5 Slots de Insígnias Compacto e Proporcional */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-3 md:gap-4 py-2">
              {slotBadges.map((badge, slotIndex) => {
                if (badge) {
                  return (
                    <div
                      key={`slot-badge-${slotIndex}-${badge.id}`}
                      onClick={() => setIsBadgesModalOpen(true)}
                      title={`${badge.title} - Clique para gerenciar insígnias`}
                      className="flex flex-col items-center justify-start text-center p-1 sm:p-2 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-400/40 transition-all group cursor-pointer"
                    >
                      <HexBadge
                        title={badge.title}
                        icon={badge.icon}
                        tone={getBadgeTone(badge.tier)}
                        isUnlocked={true}
                        size="sm"
                        showSubtitle={false}
                        onClick={() => setIsBadgesModalOpen(true)}
                      />
                      <span className="text-[9px] sm:text-[11px] text-slate-200 font-semibold mt-1.5 leading-tight px-0.5 break-words">
                        {badge.title}
                      </span>
                    </div>
                  );
                }

                // Slot Vazio Compacto
                return (
                  <button
                    key={`slot-empty-${slotIndex}`}
                    type="button"
                    onClick={() => {
                      if (effectiveIsOwner) setIsBadgesModalOpen(true);
                    }}
                    disabled={!effectiveIsOwner}
                    title={effectiveIsOwner ? "Adicionar insígnia" : "Slot vazio"}
                    className={`h-22 sm:h-26 rounded-xl sm:rounded-2xl border-2 border-dashed border-white/10 bg-black/40 hover:bg-white/[0.03] hover:border-amber-400/50 flex flex-col items-center justify-center p-1 sm:p-2 text-center transition-all ${
                      effectiveIsOwner ? 'cursor-pointer' : 'cursor-default opacity-40'
                    }`}
                  >
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/5 flex items-center justify-center mb-1 text-slate-400">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                      {effectiveIsOwner ? '+ Adicionar' : 'Vazio'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. SEÇÃO DE CONTEÚDO: COLEÇÃO COMPLETA MINIMALISTA & EXPANSÍVEL */}
          {/* ========================================================================= */}
          <div ref={collectionTopRef} className="w-full bg-black border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
            {/* Botão Pequeno de Minimizar / Maximizar Coleção (Sem fundo cinza) */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                id="btn-toggle-collection"
                onClick={() => setIsCollectionExpanded((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black hover:bg-neutral-900 border border-white/15 hover:border-amber-400/50 text-slate-200 text-xs font-bold transition-all cursor-pointer select-none active:scale-95 shadow-sm"
              >
                <Tv className="w-4 h-4 text-amber-400" />
                <span>Coleção Completa ({currentDisplayedAnimes.length})</span>
                <span className="text-slate-400 font-normal">
                  — {isCollectionExpanded ? 'Clique para recolher' : 'Clique para expandir'}
                </span>
                {isCollectionExpanded ? (
                  <ChevronUp className="w-4 h-4 text-amber-400 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                )}
              </button>
            </div>

            {/* Conteúdo Expansível da Coleção */}
            {isCollectionExpanded && (
              <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                {/* Busca Apenas pelo Nome e Filtro Todos */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar animes por nome..."
                      value={collectionSearch}
                      onChange={(e) => setCollectionSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setCollectionSearch('')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !collectionSearch.trim()
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : 'bg-black/60 text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      Todos ({currentDisplayedAnimes.length})
                    </button>
                  </div>
                </div>

                {/* Grid dos Cards de Animes */}
                {filteredCollection.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Nenhum anime encontrado com este nome.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
                    {filteredCollection.map((anime) => {
                      const statusMeta = getAnimeStatusMeta(anime.status);

                      return (
                        <div
                          key={anime.id}
                          onClick={() => handleOpenAnimeInfo(anime)}
                          title={`${anime.title} - Ver detalhes`}
                          className="group relative rounded-2xl overflow-hidden bg-black border border-white/10 hover:border-amber-400/60 transition-all cursor-pointer shadow-lg flex flex-col"
                        >
                          <div className="relative aspect-[3/4.2] w-full overflow-hidden bg-slate-950 shrink-0">
                            {anime.coverUrl ? (
                              <img
                                src={anime.coverUrl}
                                alt={anime.title}
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                                Sem Capa
                              </div>
                            )}

                            {/* Gradiente escuro sutil no topo para legibilidade da nota */}
                            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/80 via-transparent to-transparent pointer-events-none" />

                            {/* Gradiente sutil na base exatamente como nos cards da Agenda */}
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />

                            {/* Nota Pessoal no Topo Direito */}
                            {typeof anime.rating === 'number' && anime.rating > 0 && (
                              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-lg bg-black/85 backdrop-blur-md border border-amber-400/50 text-amber-300 text-[10px] font-black flex items-center gap-0.5 shadow-md">
                                <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                                <span>{Number(anime.rating).toFixed(1)}</span>
                              </div>
                            )}

                            {/* Tag Oficial de Status com Cores e Nomes Padronizados da Aba Lista */}
                            <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md backdrop-blur-md text-[9.5px] font-bold ${statusMeta.badgeBg}`}>
                              {statusMeta.label}
                            </div>
                          </div>

                          <div className="p-2.5 flex-1 flex flex-col justify-between">
                            <span className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                              {anime.title}
                            </span>

                            {/* Se estiver visitando e o anime não estiver na minha lista, botão de adicionar */}
                            {!effectiveIsOwner && onAddAnimeFromFriend && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddAnimeFromFriend({
                                    title: anime.title,
                                    coverUrl: anime.coverUrl,
                                    totalEpisodes: anime.totalEpisodes,
                                    rating: anime.rating,
                                  });
                                }}
                                className="mt-2 w-full py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 text-[10px] font-black flex items-center justify-center gap-1 transition-all"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Salvar na Minha Lista</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botão no Final da Coleção para Subir e Recolher */}
                <div className="pt-6 pb-2 flex justify-center border-t border-white/10">
                  <button
                    type="button"
                    id="btn-scroll-top-collapse"
                    onClick={() => {
                      collectionTopRef.current?.scrollIntoView({ behavior: 'smooth' });
                      setIsCollectionExpanded(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.15] border border-white/15 hover:border-amber-400 text-white text-xs font-bold transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                    <span>Subir e Recolher Coleção</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: FEED DA COMUNIDADE (DIÁRIO COLETIVO DE RESENHAS) */}
      {/* ========================================================================= */}
      {activeMainTab === 'feed' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-4 sm:p-5 rounded-3xl bg-black/60 backdrop-blur-md border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Mural Público da Comunidade
              </h3>
              <p className="text-xs text-slate-400">
                Explore análises sinceras, opiniões e notas compartilhadas por outros otakus
              </p>
            </div>

            {isOwner && (
              <button
                type="button"
                id="btn-write-review-feed"
                onClick={() => setIsWriteReviewOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-400/20 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Escrever Resenha</span>
              </button>
            )}
          </div>

          {/* Lista de Resenhas dos Membros */}
          {reviews.length === 0 ? (
            <div className="p-10 rounded-3xl bg-black/60 backdrop-blur-md border border-white/10 text-center space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">
                Ainda não há resenhas compartilhadas no feed
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Seja o pioneiro e publique a primeira crítica da rede!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 sm:p-5 rounded-3xl bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all space-y-3 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    {/* Autor com link para o perfil se não for do AniList */}
                    <div
                      onClick={() => {
                        if (rev.source !== 'anilist' && rev.userNick) {
                          handleVisitUser(rev.userNick);
                        }
                      }}
                      className={`flex items-center gap-3 ${
                        rev.source === 'anilist' ? 'cursor-default' : 'cursor-pointer group'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-900 border border-amber-400/40 shrink-0">
                        {rev.userAvatarUrl ? (
                          <img
                            src={rev.userAvatarUrl}
                            alt={rev.userDisplayName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-400">
                            {rev.userDisplayName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors block">
                            {rev.userDisplayName}
                          </span>
                          {/* Tag Discreta de Origem: AniList ou WAnime */}
                          {rev.source === 'anilist' ? (
                            <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                              AniList
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                              WAnime
                            </span>
                          )}
                        </div>
                        {rev.userNick && rev.source !== 'anilist' && (
                          <span className="text-[11px] text-slate-400 block">
                            @{rev.userNick.replace(/^@/, '')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nota */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs sm:text-sm font-black">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{Number(rev.rating).toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Anime Analisado */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/5">
                    {rev.animeCoverUrl ? (
                      <img
                        src={rev.animeCoverUrl}
                        alt={rev.animeTitle}
                        referrerPolicy="no-referrer"
                        className="w-12 h-16 object-cover rounded-xl shrink-0 border border-white/10"
                      />
                    ) : (
                      <div className="w-12 h-16 rounded-xl bg-neutral-900 shrink-0" />
                    )}
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                        {rev.animeTitle}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rev.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Conteúdo da Resenha */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {rev.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: AMIGOS & CONEXÕES (DESCOBRIR E SEGUIR OTAKUS) */}
      {/* ========================================================================= */}
      {activeMainTab === 'friends' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Barra de Busca de Usuário por @username */}
          <div className="p-4 sm:p-5 rounded-3xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl space-y-3">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Buscar Membro pelo @Nickname</span>
            </h3>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Digite o @nickname do usuário (ex: sousou_hikari)..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVisitUser(memberSearchQuery);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="button"
                onClick={() => handleVisitUser(memberSearchQuery)}
                disabled={!memberSearchQuery.trim() || isLoadingVisited}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs transition-all hover:bg-amber-300 disabled:opacity-50 cursor-pointer"
              >
                {isLoadingVisited ? 'Buscando...' : 'Visitar Perfil'}
              </button>
            </div>
          </div>

          {/* Perfis que Você Segue (Seguindo / Amigos) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Perfis que Você Segue ({followingList.length})</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Amigos e criadores de conteúdo que você acompanha na rede
                </p>
              </div>
            </div>

            {isLoadingFollowed ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Carregando seus amigos...
              </div>
            ) : followedProfiles.length === 0 ? (
              <div className="p-6 rounded-2xl bg-black/30 border border-white/5 text-center text-slate-400 text-xs">
                {followingList.length === 0
                  ? 'Você ainda não segue nenhum perfil. Explore os otakus em destaque abaixo!'
                  : `Você segue ${followingList.length} membro(s).`}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {followedProfiles.map((member) => (
                  <div
                    key={member.userId}
                    className="p-3.5 rounded-2xl bg-black/50 border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-3 shadow-lg"
                  >
                    <div
                      onClick={() => handleVisitUser(member.userId || member.publicUsername)}
                      className="flex items-center gap-3 cursor-pointer group min-w-0"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-900 border border-emerald-400/40 shrink-0">
                        {member.customAvatarUrl ? (
                          <img
                            src={member.customAvatarUrl}
                            alt={member.publicUsername}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                            {(member.publicUsername || 'O').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 truncate block">
                          {member.publicUsername}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          @{member.publicUsername?.toLowerCase().replace(/^@/, '')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleVisitUser(member.userId || member.publicUsername)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                    >
                      Visitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Perfis Sugeridos da Comunidade */}
          <div className="p-4 sm:p-5 rounded-3xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Otakus em Destaque na Rede</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Descubra outros membros com listas inspiradoras
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {popularMembers.map((member) => {
                return (
                  <div
                    key={member.userId}
                    className="p-3.5 rounded-2xl bg-black/50 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3 shadow-lg"
                  >
                    <div
                      onClick={() => handleVisitUser(member.userId || member.publicUsername)}
                      className="flex items-center gap-3 cursor-pointer group min-w-0"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-900 border border-amber-400/30 shrink-0">
                        {member.customAvatarUrl ? (
                          <img
                            src={member.customAvatarUrl}
                            alt={member.publicUsername}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                            {(member.publicUsername || 'O').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 truncate block">
                          {member.publicUsername}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          @{member.publicUsername?.toLowerCase().replace(/^@/, '')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleVisitUser(member.userId || member.publicUsername)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-slate-300 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                    >
                      Visitar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAIS INTEGRADOS (EDITAR PERFIL, TOP 5, RESENHAS, INSÍGNIAS, VERSUS) */}
      {/* ========================================================================= */}
      {effectiveIsOwner && onUpdateProfile && (
        <>
          {/* Modal Editar Perfil (Caso não seja aberto o AvatarModal do header) */}
          <EditProfileModal
            isOpen={isEditProfileOpen}
            onClose={() => setIsEditProfileOpen(false)}
            profile={profile}
            userAnimes={animes}
            onSave={onUpdateProfile}
          />

          {/* Modal Editar Top 5 */}
          <EditTop5Modal
            isOpen={isEditTop5Open}
            onClose={() => setIsEditTop5Open(false)}
            userAnimes={animes}
            currentTop5Ids={
              (profile as any)?.top5AnimeIds || profile?.favoriteAnimeIds || []
            }
            onSave={async (newIds) => {
              await onUpdateProfile({
                ...profile,
                favoriteAnimeIds: newIds,
                ...({ top5AnimeIds: newIds } as any),
              });
            }}
          />

          {/* Modal Escrever Resenha */}
          <WriteReviewModal
            isOpen={isWriteReviewOpen}
            onClose={() => setIsWriteReviewOpen(false)}
            userAnimes={animes}
            userId={profile?.userId || currentUserId || 'anon'}
            userDisplayName={profile?.publicUsername || 'Otaku'}
            userNick={profile?.publicUsername}
            userAvatarUrl={profile?.customAvatarUrl}
            onReviewCreated={(newRev) => {
              if (onReviewCreated) onReviewCreated(newRev);
            }}
          />
        </>
      )}

      {/* Modal Ver Todas as Insígnias (5 slots de capacidade máxima) */}
      <BadgesShowcaseModal
        isOpen={isBadgesModalOpen}
        onClose={() => setIsBadgesModalOpen(false)}
        allAchievements={allAchievements}
        currentEquippedIds={currentDisplayedProfile?.featuredBadges || []}
        isEditable={effectiveIsOwner}
        onSaveEquipped={
          effectiveIsOwner && onUpdateProfile
            ? async (equippedIds) => {
                await onUpdateProfile({
                  featuredBadges: equippedIds,
                });
              }
            : undefined
        }
      />

      {/* Modal de Comparação de Listas (Disparado pelo botão 'Comparar Listas' ao visitar perfil) */}
      {isVersusModalOpen && currentDisplayedProfile && (
        <CollectionVersusModal
          isOpen={isVersusModalOpen}
          onClose={() => setIsVersusModalOpen(false)}
          myProfile={profile}
          myAnimes={animes}
          targetProfile={currentDisplayedProfile}
          targetAnimes={currentDisplayedAnimes}
          onAddAnimeFromFriend={onAddAnimeFromFriend}
        />
      )}

      {/* Ficha Completa de Informações do Anime (idêntica à aba de Lançamentos) */}
      {selectedScheduleAnime && (
        <ScheduleDetailModal
          anime={selectedScheduleAnime}
          isOpen={Boolean(selectedScheduleAnime)}
          onClose={() => setSelectedScheduleAnime(null)}
          userAnimes={animes}
          onAddAnime={onAddAnimeFromFriend}
          onOpenInTracker={(animeId) => {
            setSelectedScheduleAnime(null);
            const found = animes.find((a) => a.id === animeId);
            if (found && onOpenAnimeDetail) {
              onOpenAnimeDetail(found);
            }
          }}
        />
      )}
    </div>
  );
};
