import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  BookOpen,
  Users,
  Search,
  ArrowLeft,
  Swords,
  RefreshCw,
  Plus,
  Share2
} from 'lucide-react';
import type { Anime } from '../types';
import type { UserProfile } from '../services/profileService';
import {
  getUserProfile,
  getUserProfileByUsername,
  saveUserProfile,
  getFollowedUsers,
  followUser,
  unfollowUser,
  getCommunityPopularProfiles
} from '../services/profileService';
import {
  CommunityReview,
  getRecentReviews,
  calculateCompatibilityScore
} from '../services/communityService';
import { calculateUserAchievements } from '../services/achievementService';
import { getPublicUserAnimes } from '../services/animeService';
import { OtakuCardView } from './social/OtakuCardView';
import { ReviewsDiaryView } from './social/ReviewsDiaryView';
import { CardPersonalizerModal } from './social/CardPersonalizerModal';
import { CollectionVersusModal } from './social/CollectionVersusModal';

export interface CommunityFeedViewProps {
  myAnimes: Anime[];
  currentUserProfile: UserProfile | null;
  currentUserName: string;
  currentUserAvatar?: string;
  currentUserId?: string;
  isGuest?: boolean;
  onRequireAuth?: (action: string) => void;
  onOpenAnimeDetail?: (anime: Anime | string) => void;
  onAddAnime?: (prefill?: Partial<Anime>) => void;
  onOpenProfileSettings?: () => void;
  onOpenAchievements?: () => void;
  onOpenStats?: () => void;
  onOpenSocialCard?: () => void;
  onUpdateProfile?: (updated: Partial<UserProfile>) => Promise<void>;
  onVisitPublicProfile?: (targetUsernameOrId: string) => void;
}

export type SocialMainView = 'passport' | 'diary';

export const CommunityFeedView: React.FC<CommunityFeedViewProps> = ({
  myAnimes,
  currentUserProfile,
  currentUserName,
  currentUserAvatar,
  currentUserId,
  isGuest = false,
  onRequireAuth,
  onOpenAnimeDetail,
  onAddAnime,
  onOpenProfileSettings,
  onOpenAchievements,
  onOpenStats,
  onOpenSocialCard,
  onUpdateProfile,
  onVisitPublicProfile,
}) => {
  // Modo de visualização principal: 2 visões limpas e objetivas
  const [activeView, setActiveView] = useState<SocialMainView>('passport');

  // Estado das Resenhas do Diário
  const [reviews, setReviews] = useState<CommunityReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Perfis Seguidos e Amigos
  const [followedProfiles, setFollowedProfiles] = useState<UserProfile[]>([]);
  const [popularProfiles, setPopularProfiles] = useState<UserProfile[]>([]);

  // Inspeção de perfil de outro usuário
  const [inspectingUser, setInspectingUser] = useState<{
    profile: UserProfile;
    animes: Anime[];
  } | null>(null);
  const [isLoadingInspect, setIsLoadingInspect] = useState(false);

  // Modais
  const [isPersonalizerOpen, setIsPersonalizerOpen] = useState(false);
  const [versusData, setVersusData] = useState<{
    targetProfile: UserProfile;
    targetAnimes: Anime[];
  } | null>(null);

  // Carrega reviews do Diário
  const loadReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    try {
      const data = await getRecentReviews();
      setReviews(data);
    } catch (err) {
      console.error('Erro ao carregar resenhas do mural:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  // Carrega lista de amigos seguidos e destaques
  const loadSocialConnections = useCallback(async () => {
    try {
      if (currentUserProfile?.following && currentUserProfile.following.length > 0) {
        const users = await getFollowedUsers(currentUserProfile.following);
        setFollowedProfiles(users);
      } else {
        setFollowedProfiles([]);
      }
      // Destaques da comunidade
      const pop = await getCommunityPopularProfiles();
      setPopularProfiles(pop);
    } catch (e) {
      console.error('Erro ao carregar conexões do círculo de amigos:', e);
    }
  }, [currentUserProfile?.following]);

  useEffect(() => {
    loadReviews();
    loadSocialConnections();
  }, [loadReviews, loadSocialConnections]);

  // Manipulação de Salvar no Passaporte
  const handleSaveProfile = async (updated: Partial<UserProfile>) => {
    if (onUpdateProfile) {
      await onUpdateProfile(updated);
    } else if (currentUserId) {
      await saveUserProfile(currentUserId, updated);
    }
  };

  // Abrir Duelo de Coleções (Versus Mode)
  const handleOpenVersus = async (targetProfile: UserProfile, targetAnimes?: Anime[]) => {
    if (targetAnimes && targetAnimes.length > 0) {
      setVersusData({ targetProfile, targetAnimes });
      return;
    }
    // Busca animes do amigo se ainda não carregados
    try {
      const friendAnimes = await getPublicUserAnimes(targetProfile.userId);
      setVersusData({ targetProfile, targetAnimes: friendAnimes });
    } catch (e) {
      console.error('Erro ao buscar lista para duelo:', e);
      setVersusData({ targetProfile, targetAnimes: [] });
    }
  };

  // Inspecionar perfil de um usuário (ao clicar em amigo ou buscar)
  const handleInspectUserProfile = async (userIdOrNick: string) => {
    setIsLoadingInspect(true);
    try {
      let targetProfile = await getUserProfile(userIdOrNick);
      if (!targetProfile) {
        targetProfile = await getUserProfileByUsername(userIdOrNick);
      }
      if (targetProfile) {
        const targetAnimes = await getPublicUserAnimes(targetProfile.userId);
        setInspectingUser({ profile: targetProfile, animes: targetAnimes });
        setActiveView('passport');
      }
    } catch (e) {
      console.error('Erro ao inspecionar usuário:', e);
    } finally {
      setIsLoadingInspect(false);
    }
  };

  // Seguir / Deixar de Seguir
  const handleToggleFollow = async (targetUserId: string) => {
    if (isGuest && onRequireAuth) {
      onRequireAuth('Seguir amigos e colecionadores');
      return;
    }
    if (!currentUserId) return;

    const isAlreadyFollowing = currentUserProfile?.following?.includes(targetUserId);
    try {
      if (isAlreadyFollowing) {
        await unfollowUser(currentUserId, targetUserId);
      } else {
        await followUser(currentUserId, targetUserId);
      }
      await loadSocialConnections();
    } catch (e) {
      console.error('Erro ao alternar seguidor:', e);
    }
  };

  // Adicionar Anime à Minha Lista (usado na Roleta de Recomendações do Versus)
  const handleAddAnimeToMyList = (animeData: Partial<Anime>) => {
    if (onAddAnime) {
      onAddAnime(animeData);
    }
  };

  const isInspectingFollowing = inspectingUser
    ? Boolean(currentUserProfile?.following?.includes(inspectingUser.profile.userId))
    : false;

  const currentAchievements = useMemo(
    () => calculateUserAchievements(myAnimes).achievements || [],
    [myAnimes]
  );

  return (
    <div id="social-community-tab-root" className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* 🧭 BARRA DE NAVEGAÇÃO DE TOPO LIMPA (2 VISÕES PRINCIPAIS) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 sm:p-2.5 rounded-3xl bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 shadow-2xl">
        {/* Toggle de 2 Abas Principais */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800 w-full sm:w-auto">
          <button
            id="btn-social-tab-passport"
            onClick={() => {
              setInspectingUser(null);
              setActiveView('passport');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeView === 'passport' && !inspectingUser
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Meu Passaporte Otaku
          </button>

          <button
            id="btn-social-tab-diary"
            onClick={() => {
              setInspectingUser(null);
              setActiveView('diary');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeView === 'diary'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Diário de Resenhas
            {reviews.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-amber-300 font-mono">
                {reviews.length}
              </span>
            )}
          </button>
        </div>

        {/* Informação contextual ou Botão de Ação Rápida */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {activeView === 'passport' && !inspectingUser && (
            <button
              id="btn-quick-personalize-top"
              onClick={() => setIsPersonalizerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-amber-400 transition-all shadow-md active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Personalizar Meu Card
            </button>
          )}

          {activeView === 'diary' && (
            <button
              onClick={() => loadReviews()}
              disabled={isLoadingReviews}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Atualizar resenhas"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingReviews ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* BANNER DE RETORNO CASO ESTEJA INSPECIONANDO UM AMIGO */}
      {inspectingUser && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-slate-950 border border-cyan-500/40 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setInspectingUser(null)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Voltar ao meu perfil"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                Card de Colecionador Visitado
              </span>
              <h4 className="font-black text-sm text-white">
                @{inspectingUser.profile.publicUsername || 'otaku'} ({inspectingUser.animes.length} animes na coleção)
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenVersus(inspectingUser.profile, inspectingUser.animes)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Swords className="w-3.5 h-3.5" />
              Confrontar Coleções
            </button>
            <button
              onClick={() => setInspectingUser(null)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              Voltar ao Meu Passaporte
            </button>
          </div>
        </div>
      )}

      {/* 🎴 VISÃO 1: PASSAPORTE / CARD DE COLECIONADOR */}
      {activeView === 'passport' && (
        <OtakuCardView
          profile={inspectingUser ? inspectingUser.profile : currentUserProfile}
          animes={inspectingUser ? inspectingUser.animes : myAnimes}
          userName={inspectingUser ? (inspectingUser.profile.publicUsername || 'Otaku') : currentUserName}
          avatarUrl={inspectingUser ? inspectingUser.profile.customAvatarUrl : currentUserAvatar}
          userId={inspectingUser ? inspectingUser.profile.userId : currentUserId}
          isOwner={!inspectingUser}
          isGuest={isGuest}
          followedUsers={followedProfiles.length > 0 ? followedProfiles : popularProfiles}
          onOpenPersonalizer={() => setIsPersonalizerOpen(true)}
          onOpenAvatarSettings={onOpenProfileSettings}
          onOpenVersus={(targetProf, targetAns) => handleOpenVersus(targetProf, targetAns)}
          onSelectAnime={(titleOrAnime) => onOpenAnimeDetail && onOpenAnimeDetail(titleOrAnime)}
          onToggleFollow={inspectingUser ? () => handleToggleFollow(inspectingUser.profile.userId) : undefined}
          isFollowing={isInspectingFollowing}
          onSearchUser={(query) => {
            if (query.trim()) {
              handleInspectUserProfile(query.trim());
            }
          }}
        />
      )}

      {/* 📜 VISÃO 2: DIÁRIO DE RESENHAS */}
      {activeView === 'diary' && (
        <ReviewsDiaryView
          myAnimes={myAnimes}
          currentUserProfile={currentUserProfile}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          currentUserId={currentUserId}
          isGuest={isGuest}
          reviews={reviews}
          onRefreshReviews={loadReviews}
          onRequireAuth={onRequireAuth}
          onOpenAnimeDetail={onOpenAnimeDetail}
          onVisitUserProfile={(target) => handleInspectUserProfile(target)}
        />
      )}

      {/* MODAL DE PERSONALIZAÇÃO DO PASSAPORTE */}
      <CardPersonalizerModal
        isOpen={isPersonalizerOpen}
        onClose={() => setIsPersonalizerOpen(false)}
        profile={currentUserProfile}
        animes={myAnimes}
        achievements={currentAchievements}
        onSave={handleSaveProfile}
      />

      {/* MODAL DO DUELO DE COLEÇÕES (VERSUS MODE) */}
      {versusData && (
        <CollectionVersusModal
          isOpen={Boolean(versusData)}
          onClose={() => setVersusData(null)}
          myAnimes={myAnimes}
          myProfile={currentUserProfile}
          myUserName={currentUserName}
          myAvatar={currentUserAvatar}
          friendAnimes={versusData.targetAnimes}
          friendProfile={versusData.targetProfile}
          friendUserName={versusData.targetProfile.publicUsername || 'Amigo Otaku'}
          friendAvatar={versusData.targetProfile.customAvatarUrl}
          onAddAnimeToMyList={handleAddAnimeToMyList}
          onOpenAnimeDetail={(anime) => onOpenAnimeDetail && onOpenAnimeDetail(anime)}
        />
      )}
    </div>
  );
};
