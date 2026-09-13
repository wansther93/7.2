import React, { useState, useMemo } from 'react';
import { 
  X, 
  Trophy, 
  CheckCircle2, 
  Share2, 
  Search, 
  Zap,
  Lock,
  Star
} from 'lucide-react';
import type { Anime } from '../types';
import { calculateUserAchievements, type Achievement } from '../services/achievementService';
import { copyToClipboard } from '../lib/clipboard';
import { AchievementBadge } from './AchievementBadge';
import { AchievementInspectModal } from './AchievementInspectModal';
import { HorizontalScrollContainer } from './HorizontalScrollContainer';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  animes: Anime[];
  userName: string;
  onOpenSocialCard?: (cardType?: 'top5' | 'stats' | 'watching' | 'achievements') => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  animes,
  userName,
  onOpenSocialCard,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [inspectingAchievement, setInspectingAchievement] = useState<Achievement | null>(null);

  const { 
    achievements, 
    totalUnlocked, 
    totalAchievements, 
    unlockedPercentage, 
    totalXpEarned,
    maxPossibleXp 
  } = useMemo(() => {
    return calculateUserAchievements(animes);
  }, [animes]);

  const filteredAchievements = useMemo(() => {
    return achievements.filter((a) => {
      if (selectedFilter === 'unlocked' && !a.isUnlocked) return false;
      if (selectedFilter === 'locked' && a.isUnlocked) return false;
      if (['bronze', 'silver', 'gold', 'platinum', 'diamond'].includes(selectedFilter) && a.tier !== selectedFilter) {
        return false;
      }
      if (['episodes', 'genres', 'collection', 'ratings', 'special'].includes(selectedFilter) && a.category !== selectedFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.animeTag.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [achievements, selectedFilter, searchQuery]);

  if (!isOpen) return null;

  const handleShareAchievements = async () => {
    if (onOpenSocialCard) {
      onClose();
      onOpenSocialCard('achievements');
      return;
    }
    const text = `🏆 Colecionei ${totalUnlocked}/${totalAchievements} conquistas e acumulei ${totalXpEarned} XP Otaku no WAnime List!`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
        <div 
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl shadow-black overflow-hidden text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white">Quadro de Insígnias & Conquistas</h3>
                <p className="text-xs text-slate-400">
                  {totalUnlocked} de {totalAchievements} Desbloqueadas • {unlockedPercentage}% Concluído ({totalXpEarned} XP)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareAchievements}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedShare ? 'Copiado!' : 'Compartilhar'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 space-y-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conquista..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            <HorizontalScrollContainer autoCenterOnClick={true}>
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Todas ({achievements.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('unlocked')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  selectedFilter === 'unlocked'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Desbloqueadas ({totalUnlocked})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('locked')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  selectedFilter === 'locked'
                    ? 'bg-slate-700 text-white font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Em Progresso</span>
              </button>
            </HorizontalScrollContainer>
          </div>

          {/* Grid of Achievements */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            {filteredAchievements.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nenhuma conquista corresponde aos filtros atuais.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {filteredAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    onClick={() => setInspectingAchievement(achievement)}
                    className={`p-3 rounded-2xl flex flex-col items-center text-center space-y-2 border transition-all duration-300 cursor-pointer select-none hover:-translate-y-1 ${
                      achievement.isUnlocked
                        ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-amber-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-850 opacity-75 hover:opacity-100 hover:border-slate-700'
                    }`}
                  >
                    <AchievementBadge
                      achievement={achievement}
                      size="md"
                      showProgressRing={true}
                    />
                    <div className="w-full space-y-0.5">
                      <h4 className="text-[11px] font-bold text-white line-clamp-1">
                        {achievement.title}
                      </h4>
                      <span className="text-[9px] text-slate-400 block line-clamp-1">
                        {achievement.animeTag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AchievementInspectModal
        achievement={inspectingAchievement}
        isOpen={!!inspectingAchievement}
        onClose={() => setInspectingAchievement(null)}
        isEquipped={false}
        onToggleEquip={() => {}}
        onShare={() => handleShareAchievements()}
      />
    </>
  );
};
