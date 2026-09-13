import type { Anime } from '../types';
import { getAnimeWatchedEpisodes } from './achievementService';

export interface HonorTitleDef {
  id: string;
  title: string;
  description: string;
  category: 'starter' | 'episodes' | 'genres' | 'ratings' | 'collection' | 'master';
  icon: string;
  check: (animes: Anime[], totalEpisodes: number) => boolean;
}

export const HONOR_TITLES: HonorTitleDef[] = [
  {
    id: 'starter_otaku',
    title: 'Viajante dos Animes',
    description: 'Começou sua jornada pelo universo das animações.',
    category: 'starter',
    icon: '🧭',
    check: () => true, // Sempre disponível
  },
  {
    id: 'season_devourer',
    title: 'Devorador de Temporadas',
    description: 'Assistiu pelo menos 50 episódios.',
    category: 'episodes',
    icon: '⚡',
    check: (_, totalEps) => totalEps >= 50,
  },
  {
    id: 'night_marathoner',
    title: 'Maratonista da Madrugada',
    description: 'Assistiu pelo menos 200 episódios.',
    category: 'episodes',
    icon: '🌙',
    check: (_, totalEps) => totalEps >= 200,
  },
  {
    id: 'thousand_eps_legend',
    title: 'Lenda dos 1000 Episódios',
    description: 'Ultrapassou a marca lendária de 1.000 episódios assistidos.',
    category: 'episodes',
    icon: '🔥',
    check: (_, totalEps) => totalEps >= 1000,
  },
  {
    id: 'shonen_spirit',
    title: 'Alma Shonen',
    description: 'Possui pelo menos 5 animes do gênero Shonen ou Ação na lista.',
    category: 'genres',
    icon: '⚔️',
    check: (animes) => {
      const count = animes.filter((a) =>
        (a.genres || []).some((g) => ['Shonen', 'Ação'].includes(g))
      ).length;
      return count >= 5;
    },
  },
  {
    id: 'isekai_survivor',
    title: 'Nascido em Outro Mundo',
    description: 'Possui pelo menos 3 animes com temática Isekai ou Fantasia.',
    category: 'genres',
    icon: '🌀',
    check: (animes) => {
      const count = animes.filter((a) =>
        (a.genres || []).some((g) => ['Isekai', 'Fantasia'].includes(g))
      ).length;
      return count >= 3;
    },
  },
  {
    id: 'dimension_explorer',
    title: 'Mestre das Dimensões',
    description: 'Explorou pelo menos 8 gêneros diferentes em sua coleção.',
    category: 'genres',
    icon: '🌌',
    check: (animes) => {
      const allGenres = new Set<string>();
      animes.forEach((a) => (a.genres || []).forEach((g) => allGenres.add(g)));
      return allGenres.size >= 8;
    },
  },
  {
    id: 'implacable_critic',
    title: 'Crítico Cinematográfico',
    description: 'Avaliou com notas pelo menos 10 animes da sua coleção.',
    category: 'ratings',
    icon: '⭐',
    check: (animes) => {
      const rated = animes.filter((a) => typeof a.rating === 'number' && a.rating > 0).length;
      return rated >= 10;
    },
  },
  {
    id: 'story_strategist',
    title: 'Estrategista de Histórias',
    description: 'Tem nota média na coleção igual ou superior a 8.5 (mínimo 5 notas).',
    category: 'ratings',
    icon: '♟️',
    check: (animes) => {
      const rated = animes.filter((a) => typeof a.rating === 'number' && a.rating > 0);
      if (rated.length < 5) return false;
      const avg = rated.reduce((acc, a) => acc + (a.rating || 0), 0) / rated.length;
      return avg >= 8.5;
    },
  },
  {
    id: 'classics_guardian',
    title: 'Guardião dos Clássicos',
    description: 'Concluiu pelo menos 15 animes completos.',
    category: 'collection',
    icon: '📜',
    check: (animes) => {
      const completed = animes.filter((a) => a.status === 'completed').length;
      return completed >= 15;
    },
  },
  {
    id: 'elite_collector',
    title: 'Colecionador de Elite',
    description: 'Possui 30 ou mais animes cadastrados na sua coleção.',
    category: 'collection',
    icon: '🏆',
    check: (animes) => animes.length >= 30,
  },
  {
    id: 'grand_emperor',
    title: 'Imperador dos Animes',
    description: 'Coleção monumental com 100+ animes ou 2500+ episódios.',
    category: 'master',
    icon: '👑',
    check: (animes, totalEps) => animes.length >= 100 || totalEps >= 2500,
  },
];

/**
 * Retorna todos os títulos e o status de desbloqueio para um usuário
 */
export function getUserUnlockedTitles(animes: Anime[]): {
  unlockedTitles: HonorTitleDef[];
  lockedTitles: HonorTitleDef[];
} {
  let totalEps = 0;
  animes.forEach((a) => {
    totalEps += getAnimeWatchedEpisodes(a);
  });

  const unlockedTitles: HonorTitleDef[] = [];
  const lockedTitles: HonorTitleDef[] = [];

  HONOR_TITLES.forEach((t) => {
    if (t.check(animes, totalEps)) {
      unlockedTitles.push(t);
    } else {
      lockedTitles.push(t);
    }
  });

  return { unlockedTitles, lockedTitles };
}
