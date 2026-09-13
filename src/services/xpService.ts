/**
 * Motor de Gamificação, Níveis e XP Otaku Unificado
 * Calcula o nível, progresso, insígnias de prestígio e rank do usuário.
 * Integrado diretamente com episódios assistidos, animes catalogados, obras concluídas
 * e o XP Real acumulado de cada Conquista/Insígnia desbloqueada.
 */
import type { Anime } from '../types';

export interface OtakuLevelInfo {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXpRequired: number;
  progressPercent: number;
  rankTitle: string;
  title: string; // Alias for rankTitle for backwards compatibility
  rankCode: 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'S+';
  rankColor: string;
  badgeIconName: string;
  statsBreakdown: {
    episodesXp: number;
    completedXp: number;
    totalAnimesXp: number;
    achievementsXp: number;
  };
}

const RANK_TIERS = [
  { minLevel: 1, maxLevel: 4, rankCode: 'E' as const, title: 'Iniciante Otaku', color: 'text-slate-400 border-slate-500 bg-slate-800/40', badge: 'CircleDot' },
  { minLevel: 5, maxLevel: 9, rankCode: 'D' as const, title: 'Espectador Casual', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40', badge: 'Compass' },
  { minLevel: 10, maxLevel: 19, rankCode: 'C' as const, title: 'Maratonista Noturno', color: 'text-sky-400 border-sky-500/40 bg-sky-950/40', badge: 'Flame' },
  { minLevel: 20, maxLevel: 29, rankCode: 'B' as const, title: 'Especialista em Animes', color: 'text-indigo-400 border-indigo-500/40 bg-indigo-950/40', badge: 'Award' },
  { minLevel: 30, maxLevel: 39, rankCode: 'A' as const, title: 'Mestre das Temporadas', color: 'text-purple-400 border-purple-500/40 bg-purple-950/40', badge: 'ShieldAlert' },
  { minLevel: 40, maxLevel: 49, rankCode: 'S' as const, title: 'Enciclopédia Viva', color: 'text-amber-400 border-amber-500/40 bg-amber-950/40', badge: 'Crown' },
  { minLevel: 50, maxLevel: 999, rankCode: 'S+' as const, title: 'Lenda Suprema dos Animes', color: 'text-rose-400 border-rose-500/40 bg-rose-950/40', badge: 'Zap' },
];

/**
 * Calcula o XP total e nível a partir da lista de animes e conquistas
 * Aceita o número de conquistas desbloqueadas OU o XP real acumulado das conquistas
 */
export function calculateOtakuLevel(
  animes: Anime[] = [],
  achievementsData: number | { totalUnlocked?: number; totalXpEarned?: number } = 0
): OtakuLevelInfo {
  let totalEpisodesWatched = 0;
  let completedCount = 0;
  const safeAnimes = Array.isArray(animes) ? animes : [];
  const totalAnimesCount = safeAnimes.length;

  for (const anime of safeAnimes) {
    let epCount = Number(anime?.currentEpisode) || 0;
    if (Array.isArray(anime?.seasons) && anime.seasons.length > 0) {
      let seasonSum = 0;
      anime.seasons.forEach((s) => {
        if (s.isWatched) {
          seasonSum += typeof s.totalEpisodes === 'number' && s.totalEpisodes > 0 ? s.totalEpisodes : 12;
        } else if (s.name === anime.currentSeasonName && typeof anime.currentEpisode === 'number') {
          seasonSum += anime.currentEpisode;
        }
      });
      if (seasonSum > 0) epCount = seasonSum;
    }
    if (anime?.status === 'completed' && epCount === 0) {
      epCount = typeof anime.totalEpisodes === 'number' && anime.totalEpisodes > 0 ? anime.totalEpisodes : 12;
    }
    totalEpisodesWatched += epCount;
    if (anime?.status === 'completed') {
      completedCount++;
    }
  }

  // Extração unificada do XP de Conquistas
  let achievementsXp = 0;
  if (typeof achievementsData === 'object' && achievementsData !== null) {
    if (typeof achievementsData.totalXpEarned === 'number') {
      achievementsXp = achievementsData.totalXpEarned;
    } else if (typeof achievementsData.totalUnlocked === 'number') {
      achievementsXp = achievementsData.totalUnlocked * 150;
    }
  } else {
    // Se passou número direto, se for menor que 100 considera contagem de conquistas, senão valor direto de XP
    const num = Number(achievementsData) || 0;
    achievementsXp = num > 100 ? num : num * 150;
  }

  const episodesXp = totalEpisodesWatched * 15; // 15 XP por episódio assistido
  const completedXp = completedCount * 150; // 150 XP por anime finalizado
  const totalAnimesXp = totalAnimesCount * 30; // 30 XP por anime catalogado

  // O XP total de todo o app unificado
  const totalXp = Math.max(0, episodesXp + completedXp + totalAnimesXp + achievementsXp);

  // Curva de nível balanceada:
  // Nível 1: 0 XP
  // Nível 2: 120 XP
  // Nível 5: ~1.920 XP
  // Nível 10: ~7.680 XP
  // Nível 25+: Maratonistas experientes
  const calculatedLevel = Math.floor(Math.sqrt(totalXp / 80)) + 1;
  const level = isNaN(calculatedLevel) || calculatedLevel < 1 ? 1 : calculatedLevel;

  // XP base do nível atual e do próximo nível
  const xpCurrentLevelBase = Math.pow(level - 1, 2) * 80;
  const xpNextLevelBase = Math.pow(level, 2) * 80;

  const currentLevelXp = Math.max(0, totalXp - xpCurrentLevelBase);
  const nextLevelXpRequired = Math.max(1, xpNextLevelBase - xpCurrentLevelBase);

  const rawPercent = Math.round((currentLevelXp / nextLevelXpRequired) * 100);
  const progressPercent = isNaN(rawPercent) ? 0 : Math.min(100, Math.max(0, rawPercent));

  const tier =
    RANK_TIERS.find((t) => level >= t.minLevel && level <= t.maxLevel) ||
    RANK_TIERS[RANK_TIERS.length - 1];

  return {
    level,
    totalXp,
    currentLevelXp,
    nextLevelXpRequired,
    progressPercent,
    rankTitle: tier.title,
    title: tier.title,
    rankCode: tier.rankCode,
    rankColor: tier.color,
    badgeIconName: tier.badge,
    statsBreakdown: {
      episodesXp,
      completedXp,
      totalAnimesXp,
      achievementsXp,
    },
  };
}
