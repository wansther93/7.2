import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Flame, 
  Check, 
  Lock, 
  Share2, 
  Star, 
  Award, 
  Crown, 
  Search, 
  CheckCircle2, 
  ShieldCheck,
  Zap,
  LayoutGrid,
  ListFilter,
  Grid3X3,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { HorizontalScrollContainer } from './HorizontalScrollContainer';
import type { Anime } from '../types';
import type { UserProfile } from '../services/profileService';
import { calculateUserAchievements, type Achievement } from '../services/achievementService';
import { copyToClipboard } from '../lib/clipboard';
import { AchievementBadge } from './AchievementBadge';
import { AchievementInspectModal } from './AchievementInspectModal';
import { ACHIEVEMENT_MEDIA } from '../assets/achievementAssets';

interface AchievementsViewProps {
  animes: Anime[];
  userName: string;
  userProfile?: UserProfile | null;
  onToggleEquipBadge?: (badgeId: string) => Promise<void> | void;
  onOpenSocialCard?: (cardType?: 'top5' | 'stats' | 'watching' | 'achievements') => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  animes,
  userName,
  userProfile,
  onToggleEquipBadge,
  onOpenSocialCard,
}) => {
  // Filtros simplificados: 'all' | 'unlocked' | 'locked' | 'equipped'
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unlocked' | 'locked' | 'equipped'>('all');
  const [copiedShare, setCopiedShare] = useState(false);
  const [inspectingAchievement, setInspectingAchievement] = useState<Achievement | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');

  const { 
    achievements, 
    totalUnlocked, 
    totalAchievements, 
    unlockedPercentage, 
    tierCounts,
    totalXpEarned,
    maxPossibleXp 
  } = useMemo(() => {
    return calculateUserAchievements(animes);
  }, [animes]);

  const equippedBadges = useMemo(() => {
    return userProfile?.featuredBadges || [];
  }, [userProfile?.featuredBadges]);

  const filteredAchievements = useMemo(() => {
    return achievements.filter((a) => {
      if (selectedFilter === 'unlocked' && !a.isUnlocked) return false;
      if (selectedFilter === 'locked' && a.isUnlocked) return false;
      if (selectedFilter === 'equipped' && (!a.isUnlocked || !equippedBadges.includes(a.id))) return false;
      return true;
    });
  }, [achievements, selectedFilter, equippedBadges]);

  const handleShare = async () => {
    if (onOpenSocialCard) {
      onOpenSocialCard('achievements');
      return;
    }
    const text = `🏆 Desbloqueei ${totalUnlocked}/${totalAchievements} (${unlockedPercentage}%) conquistas e acumulei ${totalXpEarned} XP Otaku no WAnime List!`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const handleToggleEquip = (achievementId: string) => {
    if (onToggleEquipBadge) {
      onToggleEquipBadge(achievementId);
    }
  };

  return (
    <div className="relative w-full space-y-4 pb-24 animate-fadeIn">
      {/* 1. BACKGROUND ATMOSFÉRICO DO TOPO DA PÁGINA (100% Preto, Imagem Nítida no Topo com Fade Gradual para Preto Puro) */}
      <div className="absolute -top-3 -left-3 -right-3 h-[280px] sm:h-[340px] pointer-events-none overflow-hidden z-0 rounded-2xl">
        <img
          src={ACHIEVEMENT_MEDIA.bannerHall}
          alt=""
          className="w-full h-full object-cover opacity-60 sm:opacity-75 filter brightness-105 contrast-125 saturate-110"
          referrerPolicy="no-referrer"
        />
        {/* Efeito de transição suave: nítido no topo e vai escurecendo gradualmente até o preto puro #000 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/50 via-40% to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
      </div>

      {/* 2. CABEÇALHO ULTRA CLEAN (Sem containers azuis/aninhados, título em linha única cravejado em dourado) */}
      <div className="relative z-10 pt-1 pb-1 space-y-2">
        {/* Linha Única: Título com Troféu à esquerda + Botão Discreto de Gerar Card à direita */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
            <h2 className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_1px_8px_rgba(245,158,11,0.4)] truncate">
              Salão das Conquistas
            </h2>
          </div>

          {/* Botão Gerar Card Minimalista e Discreto */}
          <button
            type="button"
            onClick={handleShare}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-amber-500/20 hover:border-amber-400/50 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-amber-300 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm backdrop-blur-sm"
            title="Gerar e compartilhar card de troféus"
          >
            <Share2 className="w-3 h-3 text-amber-400" />
            <span>{copiedShare ? 'Copiado!' : 'Gerar Card'}</span>
          </button>
        </div>

        {/* Linha Fina de Progresso Geral */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium drop-shadow-sm">Progresso Geral:</span>
            <span className="font-bold text-amber-300 drop-shadow-sm">
              {totalUnlocked} de {totalAchievements} Concluídas ({unlockedPercentage}%)
            </span>
          </div>

          {/* Barra de Progresso Minimalista */}
          <div className="w-full h-1.5 rounded-full bg-black/80 overflow-hidden border border-slate-800/80 backdrop-blur-sm">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-all duration-700"
              style={{ width: `${unlockedPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. BARRA UNIFICADA DE FILTROS (Com Carrossel Horizontal e Indicador Verde Piscando ">") & MODO DE VISUALIZAÇÃO */}
      <div className="relative z-10 flex items-center justify-between gap-2 pt-1">
        {/* Carrossel Horizontal com Indicador de Scroll Verde ">" */}
        <HorizontalScrollContainer className="py-0.5">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-950/60'
                : 'bg-black/70 hover:bg-slate-900 text-slate-300 border border-slate-800 backdrop-blur-sm'
            }`}
          >
            Todos ({achievements.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('unlocked')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === 'unlocked'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-950/60'
                : 'bg-black/70 hover:bg-slate-900 text-slate-300 border border-slate-800 backdrop-blur-sm'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Desbloqueadas ({totalUnlocked})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('locked')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === 'locked'
                ? 'bg-slate-700 text-white shadow-md'
                : 'bg-black/70 hover:bg-slate-900 text-slate-300 border border-slate-800 backdrop-blur-sm'
            }`}
          >
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Em Progresso ({totalAchievements - totalUnlocked})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('equipped')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === 'equipped'
                ? 'bg-yellow-400 text-black shadow-md shadow-yellow-950/60'
                : 'bg-black/70 hover:bg-slate-900 text-slate-300 border border-slate-800 backdrop-blur-sm'
            }`}
          >
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span>Equipadas ({equippedBadges.length}/4)</span>
          </button>
        </HorizontalScrollContainer>

        {/* Alternador Grade / Lista Compacto */}
        <div className="flex items-center p-0.5 rounded-lg bg-black/80 border border-slate-800 shrink-0 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'grid'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Visualização em Grade"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'cards'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Visualização em Lista de Cards"
          >
            <ListFilter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. EXIBIÇÃO DAS CONQUISTAS (Grade Gamificada de Insígnias ou Cards) */}
      {filteredAchievements.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-black/60 border border-slate-800/80 space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">Nenhuma conquista encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tente mudar o filtro selecionado.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* MODO GRADE (INSÍGNIAS DE VIDEOGAME COMPACTAS & COLECIONÁVEIS) */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredAchievements.map((achievement) => {
            const isEquipped = equippedBadges.includes(achievement.id);

            return (
              <div
                key={achievement.id}
                onClick={() => setInspectingAchievement(achievement)}
                className={`group relative p-3 rounded-2xl flex flex-col items-center text-center space-y-2 border transition-all duration-300 cursor-pointer select-none hover:-translate-y-1 ${
                  achievement.isUnlocked
                    ? 'bg-black/75 hover:bg-slate-900 border-slate-800 hover:border-amber-500/50 shadow-lg shadow-black/80 backdrop-blur-sm'
                    : 'bg-black/50 border-slate-900 opacity-70 hover:opacity-100 hover:border-slate-800'
                }`}
              >
                {/* Insígnia Visual */}
                <AchievementBadge
                  achievement={achievement}
                  size="md"
                  showProgressRing={true}
                  isEquipped={isEquipped}
                />

                {/* Título & Tag */}
                <div className="w-full space-y-0.5">
                  <h4 className="text-[11px] sm:text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                    {achievement.title}
                  </h4>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 block line-clamp-1">
                    {achievement.animeTag}
                  </span>
                </div>

                {/* Micro Barra de Progresso */}
                <div className="w-full pt-1">
                  <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        achievement.isUnlocked
                          ? 'bg-emerald-400'
                          : 'bg-amber-500/80'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(achievement.isUnlocked ? 100 : 0, achievement.progress))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO CARDS DETALHADOS COMPACTOS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredAchievements.map((achievement) => {
            const isEquipped = equippedBadges.includes(achievement.id);

            return (
              <div
                key={achievement.id}
                onClick={() => setInspectingAchievement(achievement)}
                className={`group p-4 rounded-2xl border flex items-center gap-4 transition-all duration-300 cursor-pointer select-none hover:border-amber-500/50 ${
                  achievement.isUnlocked
                    ? 'bg-black/80 border-slate-800 shadow-lg shadow-black/80 hover:bg-slate-900/90'
                    : 'bg-black/50 border-slate-900 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Insígnia */}
                <AchievementBadge
                  achievement={achievement}
                  size="md"
                  showProgressRing={true}
                  isEquipped={isEquipped}
                />

                {/* Informações da Conquista */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                      {achievement.title}
                    </h4>
                    <span className="text-[10px] font-black text-amber-400 shrink-0">
                      +{achievement.xpReward} XP
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                    {achievement.description}
                  </p>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{achievement.progressLabel}</span>
                      <span className={achievement.isUnlocked ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {achievement.isUnlocked ? 'Desbloqueada' : `${achievement.progress}%`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          achievement.isUnlocked ? 'bg-emerald-400' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(achievement.isUnlocked ? 100 : 0, achievement.progress))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL DE INSPEÇÃO DA CONQUISTA SELECIONADA */}
      <AchievementInspectModal
        achievement={inspectingAchievement}
        isOpen={!!inspectingAchievement}
        onClose={() => setInspectingAchievement(null)}
        isEquipped={inspectingAchievement ? equippedBadges.includes(inspectingAchievement.id) : false}
        onToggleEquip={(id) => handleToggleEquip(id)}
      />
    </div>
  );
};
