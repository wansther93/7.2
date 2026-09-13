import React from 'react';

export type BadgeTone = 'gold' | 'purple' | 'amber' | 'blue' | 'emerald' | 'rose' | 'cyan' | 'slate';

interface HexBadgeProps {
  title: string;
  subtitle?: string;
  icon?: string; // Emoji ou nome
  tone?: BadgeTone;
  isUnlocked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  onClick?: () => void;
  className?: string;
}

const TONE_STYLES: Record<
  BadgeTone,
  {
    border: string;
    bg: string;
    glow: string;
    iconColor: string;
    gradient: string;
  }
> = {
  gold: {
    border: '#EAB308',
    bg: 'rgba(234, 179, 8, 0.12)',
    glow: 'rgba(234, 179, 8, 0.35)',
    iconColor: '#FACC15',
    gradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
  },
  purple: {
    border: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.12)',
    glow: 'rgba(168, 85, 247, 0.35)',
    iconColor: '#C084FC',
    gradient: 'from-purple-500/20 via-fuchsia-500/10 to-transparent',
  },
  amber: {
    border: '#F97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    glow: 'rgba(249, 115, 22, 0.35)',
    iconColor: '#FB923C',
    gradient: 'from-orange-500/20 via-amber-500/10 to-transparent',
  },
  blue: {
    border: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.12)',
    glow: 'rgba(59, 130, 246, 0.35)',
    iconColor: '#60A5FA',
    gradient: 'from-blue-500/20 via-indigo-500/10 to-transparent',
  },
  emerald: {
    border: '#22C55E',
    bg: 'rgba(34, 197, 94, 0.12)',
    glow: 'rgba(34, 197, 94, 0.35)',
    iconColor: '#4ADE80',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
  },
  rose: {
    border: '#F43F5E',
    bg: 'rgba(244, 63, 94, 0.12)',
    glow: 'rgba(244, 63, 94, 0.35)',
    iconColor: '#FB7185',
    gradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
  },
  cyan: {
    border: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.12)',
    glow: 'rgba(6, 182, 212, 0.35)',
    iconColor: '#38BDF8',
    gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
  },
  slate: {
    border: '#475569',
    bg: 'rgba(71, 85, 105, 0.12)',
    glow: 'rgba(71, 85, 105, 0.2)',
    iconColor: '#94A3B8',
    gradient: 'from-slate-700/20 via-slate-800/10 to-transparent',
  },
};

export const HexBadge: React.FC<HexBadgeProps> = ({
  title,
  subtitle,
  icon = '🏆',
  tone = 'gold',
  isUnlocked = true,
  size = 'md',
  showSubtitle = false,
  onClick,
  className = '',
}) => {
  const style = isUnlocked ? TONE_STYLES[tone] : TONE_STYLES.slate;

  // Tamanhos de largura e altura do hexágono SVG refinados e proporcionais
  const dimensions = {
    sm: { width: 44, height: 50, iconSize: 'text-lg' },
    md: { width: 56, height: 64, iconSize: 'text-xl' },
    lg: { width: 72, height: 82, iconSize: 'text-2xl' },
  }[size];

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center text-center group select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Hexágono em SVG nativo para corte afiado e glow perfeito */}
      <div
        className="relative flex items-center justify-center transition-all duration-300 group-hover:scale-105"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <svg
          viewBox="0 0 100 115"
          className="absolute inset-0 w-full h-full drop-shadow-md"
          style={{
            filter: isUnlocked
              ? `drop-shadow(0 0 8px ${style.glow})`
              : 'grayscale(100%) opacity(40%)',
          }}
        >
          {/* Fundo do Hexágono */}
          <polygon
            points="50,2 95,28 95,87 50,113 5,87 5,28"
            fill={style.bg}
            stroke={style.border}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Borda interna refinada */}
          <polygon
            points="50,10 87,32 87,83 50,105 13,83 13,32"
            fill="none"
            stroke={style.border}
            strokeWidth="1.2"
            strokeOpacity="0.45"
            strokeLinejoin="round"
          />
        </svg>

        {/* Ícone no Centro */}
        <div
          className={`relative z-10 flex items-center justify-center ${dimensions.iconSize} transition-transform duration-300 group-hover:scale-110`}
          style={{ filter: isUnlocked ? undefined : 'grayscale(100%)' }}
        >
          <span>{icon}</span>
        </div>
      </div>

      {/* Rótulo do Nome da Insígnia - Quebra em até 2 linhas sem truncar ou cortar palavras */}
      <span
        className={`mt-1.5 font-bold text-white leading-tight max-w-[105px] sm:max-w-[115px] line-clamp-2 break-words text-center transition-colors ${
          size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[10.5px] sm:text-xs' : 'text-xs'
        } ${isUnlocked ? 'group-hover:text-amber-300' : 'text-slate-500'}`}
        title={title}
      >
        {title}
      </span>

      {/* Subtítulo / Critério (Apenas se explicitamente solicitado, caso contrário fica no modal) */}
      {showSubtitle && subtitle && (
        <span
          className={`text-slate-400 mt-0.5 leading-tight max-w-[105px] line-clamp-2 text-[9px] text-center`}
          title={subtitle}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
};
