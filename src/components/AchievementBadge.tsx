import React from 'react';
import { Lock, Star, Trophy, Shield, Flame, Moon, Compass, Crown } from 'lucide-react';
import type { Achievement } from '../services/achievementService';
import { ACHIEVEMENT_MEDIA } from '../assets/achievementAssets';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showProgressRing?: boolean;
  onClick?: () => void;
  isEquipped?: boolean;
  className?: string;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  size = 'md',
  showProgressRing = true,
  onClick,
  isEquipped = false,
  className = '',
}) => {
  const { tier, isUnlocked, icon, progress, crestKey } = achievement;

  // Imagem base do tier gerada por IA
  const tierImage = ACHIEVEMENT_MEDIA.tierBadges[tier] || ACHIEVEMENT_MEDIA.tierBadges.bronze;
  
  // Se houver um brasão temático gerado por IA associado à conquista
  const customCrestImage = crestKey ? ACHIEVEMENT_MEDIA.crests[crestKey] : null;

  // Dimensões dinâmicas
  const sizeMap = {
    sm: {
      outer: 'w-12 h-12',
      inner: 'w-9 h-9',
      icon: 'text-base',
      border: 'border-2',
      lock: 'w-3 h-3',
      equippedDot: 'w-2 h-2',
    },
    md: {
      outer: 'w-16 h-16 sm:w-18 sm:h-18',
      inner: 'w-12 h-12 sm:w-14 sm:h-14',
      icon: 'text-xl sm:text-2xl',
      border: 'border-2',
      lock: 'w-4 h-4',
      equippedDot: 'w-2.5 h-2.5',
    },
    lg: {
      outer: 'w-20 h-20 sm:w-24 sm:h-24',
      inner: 'w-15 h-15 sm:w-18 sm:h-18',
      icon: 'text-3xl sm:text-4xl',
      border: 'border-[2.5px]',
      lock: 'w-5 h-5',
      equippedDot: 'w-3 h-3',
    },
    xl: {
      outer: 'w-28 h-28 sm:w-36 sm:h-36',
      inner: 'w-22 h-22 sm:w-28 sm:h-28',
      icon: 'text-4xl sm:text-6xl',
      border: 'border-[3px]',
      lock: 'w-7 h-7',
      equippedDot: 'w-4 h-4',
    },
  };

  const dim = sizeMap[size];

  // Paleta temática por Tier
  const tierStyles = {
    bronze: {
      border: 'border-amber-700/80 group-hover:border-amber-500',
      glow: 'shadow-[0_0_15px_rgba(180,83,9,0.35)]',
      gradient: 'from-amber-950/90 via-amber-900/60 to-black',
      ring: '#d97706',
      textAccent: 'text-amber-400',
      shine: 'from-amber-400/20 via-transparent to-transparent',
    },
    silver: {
      border: 'border-slate-400/80 group-hover:border-cyan-300',
      glow: 'shadow-[0_0_18px_rgba(203,213,225,0.4)]',
      gradient: 'from-slate-800/90 via-slate-700/60 to-black',
      ring: '#94a3b8',
      textAccent: 'text-slate-200',
      shine: 'from-cyan-300/25 via-transparent to-transparent',
    },
    gold: {
      border: 'border-amber-400/90 group-hover:border-yellow-300',
      glow: 'shadow-[0_0_22px_rgba(245,158,11,0.55)]',
      gradient: 'from-amber-900/90 via-yellow-950/70 to-black',
      ring: '#fbbf24',
      textAccent: 'text-yellow-300',
      shine: 'from-yellow-300/35 via-transparent to-transparent',
    },
    platinum: {
      border: 'border-cyan-400/90 group-hover:border-indigo-300',
      glow: 'shadow-[0_0_25px_rgba(34,211,238,0.6)]',
      gradient: 'from-cyan-950/90 via-indigo-950/70 to-black',
      ring: '#22d3ee',
      textAccent: 'text-cyan-300',
      shine: 'from-cyan-300/35 via-indigo-400/20 to-transparent',
    },
    diamond: {
      border: 'border-fuchsia-400/90 group-hover:border-purple-300 animate-pulse',
      glow: 'shadow-[0_0_30px_rgba(217,70,239,0.7)]',
      gradient: 'from-purple-950/90 via-fuchsia-950/70 to-black',
      ring: '#e879f9',
      textAccent: 'text-fuchsia-300',
      shine: 'from-fuchsia-300/40 via-cyan-400/25 to-transparent',
    },
  };

  const currentTierStyle = tierStyles[tier];

  return (
    <div
      onClick={onClick}
      className={`relative group inline-flex items-center justify-center select-none cursor-pointer transition-all duration-300 active:scale-95 ${dim.outer} ${className}`}
    >
      {/* Halo de Brilho Dinâmico quando Desbloqueado */}
      {isUnlocked && (
        <div
          className={`absolute inset-0 rounded-2xl sm:rounded-3xl ${currentTierStyle.glow} opacity-60 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
        />
      )}

      {/* SVG Anel de Progresso quando Bloqueado ou Parcial */}
      {showProgressRing && !isUnlocked && (
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
          <circle
            cx="50%"
            cy="50%"
            r="44%"
            fill="none"
            stroke="rgba(51, 65, 85, 0.4)"
            strokeWidth="3"
          />
          {progress > 0 && (
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              fill="none"
              stroke={currentTierStyle.ring}
              strokeWidth="3.5"
              strokeDasharray="276"
              strokeDashoffset={`${276 - (276 * Math.min(100, progress)) / 100}`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          )}
        </svg>
      )}

      {/* Corpo Central da Insígnia / Medalhão */}
      <div
        className={`relative ${dim.inner} rounded-2xl sm:rounded-[22px] overflow-hidden flex items-center justify-center ${dim.border} ${
          isUnlocked
            ? `${currentTierStyle.border} shadow-lg shadow-black/80`
            : 'border-slate-800 bg-slate-950/90 opacity-70 grayscale-[60%] group-hover:opacity-90 group-hover:grayscale-0'
        } transition-all duration-300`}
      >
        {/* Fundo com Imagem Texturizada Gerada por IA */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={customCrestImage || tierImage}
            alt={achievement.title}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              isUnlocked ? 'opacity-85 mix-blend-screen' : 'opacity-20'
            }`}
            referrerPolicy="no-referrer"
          />
          {/* Overlay de Gradiente com Vinheta */}
          <div
            className={`absolute inset-0 bg-gradient-to-b ${
              isUnlocked ? currentTierStyle.gradient : 'from-slate-950/95 via-slate-900/90 to-black'
            } mix-blend-multiply opacity-90`}
          />
          {/* Linha de Brilho Angular / Reflexo Metálico */}
          {isUnlocked && (
            <div
              className={`absolute inset-0 bg-gradient-to-tr ${currentTierStyle.shine} pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity`}
            />
          )}
        </div>

        {/* Ícone / Glifo Central */}
        <div className="relative z-10 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
          {isUnlocked ? (
            <span className={`${dim.icon} drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] select-none`}>
              {icon}
            </span>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 group-hover:text-slate-300">
              <Lock className={`${dim.lock} mb-0.5 text-slate-400`} />
              <span className={`${dim.icon} opacity-30 select-none`}>{icon}</span>
            </div>
          )}
        </div>

        {/* Destaque visual de Conquista Rara */}
        {isUnlocked && (tier === 'gold' || tier === 'platinum' || tier === 'diamond') && (
          <div className="absolute top-1 right-1 z-20 pointer-events-none">
            <Star className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-200/90 fill-amber-200/50" />
          </div>
        )}
      </div>

      {/* Marcador de Insígnia Equipada no Perfil */}
      {isEquipped && (
        <div className="absolute -top-1 -right-1 z-30 flex items-center justify-center p-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 border border-amber-200 shadow-md shadow-amber-950/80">
          <Star className={`${dim.equippedDot} fill-amber-950 text-amber-950`} />
        </div>
      )}

      {/* Badge de Tier em miniatura na base (para tamanhos md, lg, xl) */}
      {(size === 'lg' || size === 'xl') && (
        <div
          className={`absolute -bottom-2 z-20 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border shadow-md ${
            isUnlocked
              ? `${currentTierStyle.border} bg-slate-950/90 ${currentTierStyle.textAccent}`
              : 'border-slate-800 bg-slate-950/80 text-slate-500'
          }`}
        >
          {tier}
        </div>
      )}
    </div>
  );
};
