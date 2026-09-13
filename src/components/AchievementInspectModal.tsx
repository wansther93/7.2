import React from 'react';
import { X, Star, CheckCircle2, Trophy, Zap } from 'lucide-react';
import type { Achievement } from '../services/achievementService';
import { AchievementBadge } from './AchievementBadge';

interface AchievementInspectModalProps {
  achievement: Achievement | null;
  isOpen: boolean;
  onClose: () => void;
  isEquipped: boolean;
  onToggleEquip: (achievementId: string) => void;
}

export const AchievementInspectModal: React.FC<AchievementInspectModalProps> = ({
  achievement,
  isOpen,
  onClose,
  isEquipped,
  onToggleEquip,
}) => {
  if (!isOpen || !achievement) return null;

  const {
    id,
    title,
    description,
    tier,
    isUnlocked,
    progress,
    progressLabel,
    xpReward,
    rarityPercentage,
    rarityLabel,
    animeTag,
    category,
  } = achievement;

  const tierNameMap = {
    bronze: 'Bronze Rústico',
    silver: 'Prata Nobre',
    gold: 'Ouro Imperial',
    platinum: 'Platina Celestial',
    diamond: 'Diamante Mítico',
  };

  const categoryNameMap = {
    episodes: 'Maratona & Episódios',
    genres: 'Exploração de Gêneros',
    collection: 'Coleção & Biblioteca',
    ratings: 'Crítica & Avaliações',
    special: 'Desafios Especiais',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-slate-700/60 shadow-2xl shadow-black/90 overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de Fundo por Tier */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none ${
            tier === 'diamond'
              ? 'bg-fuchsia-600'
              : tier === 'platinum'
              ? 'bg-cyan-500'
              : tier === 'gold'
              ? 'bg-amber-500'
              : tier === 'silver'
              ? 'bg-slate-400'
              : 'bg-amber-800'
          }`}
        />

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Conteúdo Principal */}
        <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
          {/* Tag de Categoria e Tier */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-slate-800/90 text-slate-300 border border-slate-700">
              {animeTag}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border ${
                tier === 'diamond'
                  ? 'bg-fuchsia-950/80 border-fuchsia-500/60 text-fuchsia-300'
                  : tier === 'platinum'
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300'
                  : tier === 'gold'
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                  : tier === 'silver'
                  ? 'bg-slate-800 border-slate-500/60 text-slate-200'
                  : 'bg-amber-950/60 border-amber-700/60 text-amber-400'
              }`}
            >
              {tierNameMap[tier]}
            </span>
          </div>

          {/* Insígnia Épica em Destaque */}
          <div className="relative py-2">
            <AchievementBadge
              achievement={achievement}
              size="xl"
              showProgressRing={true}
              isEquipped={isEquipped}
            />
          </div>

          {/* Título & Descrição */}
          <div className="space-y-2 max-w-sm">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>{title}</span>
              {isUnlocked && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Painel de Estatísticas da Conquista (XP, Raridade, Categoria) */}
          <div className="w-full grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-left">
            <div className="p-2 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>XP Ganho</span>
              </span>
              <p className="text-xs sm:text-sm font-black text-amber-300">+{xpReward} XP</p>
            </div>
            <div className="p-2 space-y-0.5 border-x border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <Star className="w-3 h-3 text-cyan-400" />
                <span>Raridade</span>
              </span>
              <p className="text-xs sm:text-sm font-black text-cyan-300">{rarityPercentage}%</p>
              <p className="text-[9px] text-slate-500">{rarityLabel}</p>
            </div>
            <div className="p-2 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <Trophy className="w-3 h-3 text-purple-400" />
                <span>Status</span>
              </span>
              <p className={`text-xs sm:text-sm font-black ${isUnlocked ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isUnlocked ? 'Desbloqueado' : 'Em Progresso'}
              </p>
            </div>
          </div>

          {/* Barra de Progresso Real */}
          <div className="w-full space-y-1.5 text-left">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Progresso da Missão:</span>
              <span className={isUnlocked ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {progressLabel}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isUnlocked
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(isUnlocked ? 100 : 0, progress))}%` }}
              />
            </div>
          </div>

          {/* Botão de Fixar/Equipar no Perfil */}
          {isUnlocked && (
            <div className="w-full pt-2">
              <button
                type="button"
                onClick={() => onToggleEquip(id)}
                className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                  isEquipped
                    ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300 hover:bg-amber-500/30 shadow-amber-950/40'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-950/60'
                }`}
              >
                <Star className={`w-4 h-4 ${isEquipped ? 'fill-amber-300 text-amber-300' : 'fill-slate-950 text-slate-950'}`} />
                <span>{isEquipped ? 'Desafixar do Perfil' : '⭐ Equipar no Perfil'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
