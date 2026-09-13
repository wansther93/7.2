import type { Anime } from '../types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'episodes' | 'genres' | 'collection' | 'ratings' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  tierColor: string;
  isUnlocked: boolean;
  progress: number; // 0 to 100
  progressLabel: string;
  xpReward: number;
  rarityPercentage: number;
  rarityLabel: string;
  crestKey?: 'shounen' | 'night' | 'isekai' | 'collector';
  animeTag: string;
}

/**
 * Calcula com precisão a contagem real de episódios assistidos de um anime,
 * considerando temporadas marcadas como assistidas, total de episódios se concluído,
 * episódio atual registrado ou episódios de arcos individuais.
 */
export function getAnimeWatchedEpisodes(anime: Anime): number {
  const rawCurrent = Number(anime.currentEpisode) || 0;
  const rawTotal = Number(anime.totalEpisodes) || 0;
  const rawLatest = Number(anime.latestAiredEpisode) || 0;

  let seasonSum = 0;
  let allSeasonsTotal = 0;

  if (Array.isArray(anime.seasons) && anime.seasons.length > 0) {
    let hasCurrentSeasonMatch = false;

    anime.seasons.forEach((s) => {
      const sTotal = Number(s.totalEpisodes) || 12;
      allSeasonsTotal += sTotal;

      if (s.isWatched) {
        seasonSum += sTotal;
      } else if (
        (anime.currentSeasonName && s.name === anime.currentSeasonName) ||
        (!hasCurrentSeasonMatch && !s.isWatched)
      ) {
        // Temporada em andamento
        const sCurrent = Number((s as any).currentEpisode) || rawCurrent;
        seasonSum += sCurrent;
        hasCurrentSeasonMatch = true;
      }
    });

    // Se o usuário tem temporadas concluídas além de episódios avulsos
    seasonSum = Math.max(seasonSum, rawCurrent);
  } else {
    seasonSum = rawCurrent;
  }

  // Se o anime está marcado como Concluído, o usuário completou toda a obra
  if (anime.status === 'completed') {
    const maxCompleted = Math.max(seasonSum, allSeasonsTotal, rawTotal, rawCurrent, rawLatest);
    return maxCompleted > 0 ? maxCompleted : 12;
  }

  return Math.max(seasonSum, rawCurrent);
}

export const ACHIEVEMENTS_DEF: {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: Achievement['category'];
  tier: Achievement['tier'];
  xpReward: number;
  rarityPercentage: number;
  rarityLabel: string;
  crestKey?: Achievement['crestKey'];
  animeTag: string;
  check: (animes: Anime[], totalEps: number, maxSingleAnimeEps: number) => { unlocked: boolean; progress: number; label: string };
}[] = [
  // ==========================================
  // --- BRONZE (Primeiros Passos & Descobertas)
  // ==========================================
  {
    id: 'intro_catalog',
    title: 'Primeiro Pergaminho',
    description: 'Cadastre seu 1º anime no WAnime e comece sua jornada otaku.',
    icon: '📜',
    category: 'collection',
    tier: 'bronze',
    xpReward: 30,
    rarityPercentage: 92.5,
    rarityLabel: 'Comum',
    crestKey: 'collector',
    animeTag: 'Catálogo',
    check: (animes) => {
      const count = animes.length;
      return { unlocked: count >= 1, progress: count >= 1 ? 100 : 0, label: `${Math.min(1, count)}/1 anime` };
    },
  },
  {
    id: 'intro_first_ep',
    title: 'O Chamado da Aventura',
    description: 'Dê o play no seu primeiro episódio assistido.',
    icon: '⚔️',
    category: 'episodes',
    tier: 'bronze',
    xpReward: 30,
    rarityPercentage: 88.0,
    rarityLabel: 'Comum',
    crestKey: 'shounen',
    animeTag: 'Início',
    check: (_, totalEps) => {
      const p = totalEps >= 1 ? 100 : 0;
      return { unlocked: totalEps >= 1, progress: p, label: `${Math.min(1, totalEps)}/1 ep` };
    },
  },
  {
    id: 'intro_watching',
    title: 'Em Transmissão Ativa',
    description: 'Tenha pelo menos uma obra marcada no status "Assistindo".',
    icon: '📡',
    category: 'collection',
    tier: 'bronze',
    xpReward: 35,
    rarityPercentage: 84.2,
    rarityLabel: 'Comum',
    animeTag: 'Status',
    check: (animes) => {
      const count = animes.filter((a) => a.status === 'watching').length;
      return { unlocked: count >= 1, progress: count >= 1 ? 100 : 0, label: `${Math.min(1, count)}/1 assistindo` };
    },
  },
  {
    id: 'intro_plan_to_watch',
    title: 'Lista de Desejos Otaku',
    description: 'Adicione pelo menos 1 anime na sua lista de "Planejo Assistir".',
    icon: '📌',
    category: 'collection',
    tier: 'bronze',
    xpReward: 35,
    rarityPercentage: 86.0,
    rarityLabel: 'Comum',
    animeTag: 'Planejamento',
    check: (animes) => {
      const count = animes.filter((a) => a.status === 'plan_to_watch').length;
      return { unlocked: count >= 1, progress: count >= 1 ? 100 : 0, label: `${Math.min(1, count)}/1 planejado` };
    },
  },
  {
    id: 'intro_first_rating',
    title: 'Voz da Aldeia (Primeira Crítica)',
    description: 'Avalie com nota (1 a 10) sua primeira obra assistida.',
    icon: '⭐',
    category: 'ratings',
    tier: 'bronze',
    xpReward: 40,
    rarityPercentage: 79.1,
    rarityLabel: 'Comum',
    animeTag: 'Crítica',
    check: (animes) => {
      const count = animes.filter((a) => typeof a.rating === 'number' && a.rating > 0).length;
      return { unlocked: count >= 1, progress: count >= 1 ? 100 : 0, label: `${Math.min(1, count)}/1 avaliado` };
    },
  },
  {
    id: 'intro_completed',
    title: 'Arco Final Concluído',
    description: 'Assista até o último episódio e finalize seu 1º anime.',
    icon: '🏁',
    category: 'collection',
    tier: 'bronze',
    xpReward: 50,
    rarityPercentage: 74.0,
    rarityLabel: 'Comum',
    animeTag: 'Conclusão',
    check: (animes) => {
      const count = animes.filter((a) => a.status === 'completed').length;
      return { unlocked: count >= 1, progress: count >= 1 ? 100 : 0, label: `${Math.min(1, count)}/1 concluído` };
    },
  },
  {
    id: 'intro_short_anime',
    title: 'Pílula de Uma Noite (Anime Curto)',
    description: 'Finalize um anime conciso de até 12 ou 13 episódios (formato cour único).',
    icon: '⚡',
    category: 'collection',
    tier: 'bronze',
    xpReward: 45,
    rarityPercentage: 76.5,
    rarityLabel: 'Comum',
    animeTag: 'Compacto',
    check: (animes) => {
      const count = animes.filter((a) => a.status === 'completed' && ((a.totalEpisodes && a.totalEpisodes <= 13) || a.currentEpisode <= 13)).length;
      return { unlocked: count >= 1, progress: count >= 1 ? 100 : 0, label: `${Math.min(1, count)}/1 anime curto` };
    },
  },
  {
    id: 'intro_movie_fan',
    title: 'Noite de Cinema Anime',
    description: 'Adicione ou conclua um Longa-Metragem / Filme de Anime na sua lista.',
    icon: '🍿',
    category: 'collection',
    tier: 'bronze',
    xpReward: 45,
    rarityPercentage: 72.0,
    rarityLabel: 'Comum',
    animeTag: 'Filme',
    check: (animes) => {
      const count = animes.filter((a) => (a.format && a.format.toLowerCase() === 'movie') || (a.title && (a.title.toLowerCase().includes('movie') || a.title.toLowerCase().includes('filme')))).length;
      return { unlocked: count >= 1, progress: count >= 1 ? 100 : 0, label: `${Math.min(1, count)}/1 filme` };
    },
  },
  {
    id: 'eps_10',
    title: 'Despertar do Novato',
    description: 'Conclua seus primeiros 10 episódios no total.',
    icon: '🌱',
    category: 'episodes',
    tier: 'bronze',
    xpReward: 40,
    rarityPercentage: 71.3,
    rarityLabel: 'Comum',
    animeTag: 'Episódios',
    check: (_, totalEps) => {
      const p = Math.min(100, Math.round((totalEps / 10) * 100));
      return { unlocked: totalEps >= 10, progress: p, label: `${Math.min(10, totalEps)}/10 eps` };
    },
  },
  {
    id: 'eps_50',
    title: 'Maratonista Aprendiz',
    description: 'Atinja a marca de 50 episódios assistidos.',
    icon: '👟',
    category: 'episodes',
    tier: 'bronze',
    xpReward: 60,
    rarityPercentage: 62.8,
    rarityLabel: 'Comum',
    crestKey: 'night',
    animeTag: 'Maratona',
    check: (_, totalEps) => {
      const p = Math.min(100, Math.round((totalEps / 50) * 100));
      return { unlocked: totalEps >= 50, progress: p, label: `${Math.min(50, totalEps)}/50 eps` };
    },
  },
  {
    id: 'genre_comedy',
    title: 'Gargalhada Otaku (Comédia)',
    description: 'Tenha na lista pelo menos 2 animes com foco em Comédia ou Paródia.',
    icon: '😂',
    category: 'genres',
    tier: 'bronze',
    xpReward: 50,
    rarityPercentage: 65.0,
    rarityLabel: 'Comum',
    animeTag: 'Comédia',
    check: (animes) => {
      const count = animes.filter((a) =>
        (a.genres || []).some((g) => ['Comédia', 'Comedy', 'Paródia', 'Parody'].includes(g))
      ).length;
      const p = Math.min(100, Math.round((count / 2) * 100));
      return { unlocked: count >= 2, progress: p, label: `${Math.min(2, count)}/2 comédias` };
    },
  },
  {
    id: 'genre_multi',
    title: 'Explorador de Gêneros',
    description: 'Explore animes com pelo menos 3 gêneros distintos.',
    icon: '🧭',
    category: 'genres',
    tier: 'bronze',
    xpReward: 50,
    rarityPercentage: 68.0,
    rarityLabel: 'Comum',
    animeTag: 'Exploração',
    check: (animes) => {
      const allGenres = new Set<string>();
      animes.forEach((a) => (a.genres || []).forEach((g) => allGenres.add(g)));
      const count = allGenres.size;
      const p = Math.min(100, Math.round((count / 3) * 100));
      return { unlocked: count >= 3, progress: p, label: `${Math.min(3, count)}/3 gêneros` };
    },
  },
  {
    id: 'genre_romance',
    title: 'Pétalas de Sakura (Romance)',
    description: 'Adicione pelo menos 2 animes de Romance ou Slice of Life à lista.',
    icon: '🌸',
    category: 'genres',
    tier: 'bronze',
    xpReward: 50,
    rarityPercentage: 55.4,
    rarityLabel: 'Comum',
    animeTag: 'Romance',
    check: (animes) => {
      const count = animes.filter((a) =>
        (a.genres || []).some((g) => ['Romance', 'Drama', 'Slice of Life'].includes(g))
      ).length;
      const p = Math.min(100, Math.round((count / 2) * 100));
      return { unlocked: count >= 2, progress: p, label: `${Math.min(2, count)}/2 romances` };
    },
  },

  // ==========================================
  // --- SILVER (Intermediário & Explorador)
  // ==========================================
  {
    id: 'eps_150',
    title: 'Devorador de Temporadas',
    description: 'Chegue a 150 episódios registrados na sua conta.',
    icon: '⚡',
    category: 'episodes',
    tier: 'silver',
    xpReward: 100,
    rarityPercentage: 45.2,
    rarityLabel: 'Incomum',
    crestKey: 'night',
    animeTag: 'Maratona',
    check: (_, totalEps) => {
      const p = Math.min(100, Math.round((totalEps / 150) * 100));
      return { unlocked: totalEps >= 150, progress: p, label: `${Math.min(150, totalEps)}/150 eps` };
    },
  },
  {
    id: 'eps_300',
    title: 'Chama Sem Fim (300 Eps)',
    description: 'Alcance a marca sólida de 300 episódios assistidos.',
    icon: '🔥',
    category: 'episodes',
    tier: 'silver',
    xpReward: 140,
    rarityPercentage: 35.8,
    rarityLabel: 'Incomum',
    crestKey: 'shounen',
    animeTag: 'Maratona',
    check: (_, totalEps) => {
      const p = Math.min(100, Math.round((totalEps / 300) * 100));
      return { unlocked: totalEps >= 300, progress: p, label: `${Math.min(300, totalEps)}/300 eps` };
    },
  },
  {
    id: 'col_finished_5',
    title: 'Trilha do Aventureiro',
    description: 'Complete 5 animes inteiros na sua biblioteca.',
    icon: '🗡️',
    category: 'collection',
    tier: 'silver',
    xpReward: 110,
    rarityPercentage: 41.5,
    rarityLabel: 'Incomum',
    animeTag: 'Coleção',
    check: (animes) => {
      const completed = animes.filter((a) => a.status === 'completed').length;
      const p = Math.min(100, Math.round((completed / 5) * 100));
      return { unlocked: completed >= 5, progress: p, label: `${Math.min(5, completed)}/5 concluídos` };
    },
  },
  {
    id: 'col_finished_15',
    title: 'Estante dos Campeões',
    description: 'Complete 15 animes completos no catálogo.',
    icon: '📚',
    category: 'collection',
    tier: 'silver',
    xpReward: 160,
    rarityPercentage: 28.4,
    rarityLabel: 'Incomum',
    crestKey: 'collector',
    animeTag: 'Coleção',
    check: (animes) => {
      const completed = animes.filter((a) => a.status === 'completed').length;
      const p = Math.min(100, Math.round((completed / 15) * 100));
      return { unlocked: completed >= 15, progress: p, label: `${Math.min(15, completed)}/15 concluídos` };
    },
  },
  {
    id: 'genre_shonen',
    title: 'Guerreiro de Shounen',
    description: 'Cadastre pelo menos 3 animes de Ação, Aventura ou Shounen.',
    icon: '⚔️',
    category: 'genres',
    tier: 'silver',
    xpReward: 120,
    rarityPercentage: 38.0,
    rarityLabel: 'Incomum',
    crestKey: 'shounen',
    animeTag: 'Shounen',
    check: (animes) => {
      const count = animes.filter((a) =>
        (a.genres || []).some((g) => ['Ação', 'Shonen', 'Action', 'Aventura', 'Adventure'].includes(g))
      ).length;
      const p = Math.min(100, Math.round((count / 3) * 100));
      return { unlocked: count >= 3, progress: p, label: `${Math.min(3, count)}/3 animes ação/shonen` };
    },
  },
  {
    id: 'genre_isekai',
    title: 'Invocado em Outro Mundo',
    description: 'Tenha na coleção pelo menos 3 animes Isekai ou Fantasia.',
    icon: '🌀',
    category: 'genres',
    tier: 'silver',
    xpReward: 120,
    rarityPercentage: 32.7,
    rarityLabel: 'Incomum',
    crestKey: 'isekai',
    animeTag: 'Isekai',
    check: (animes) => {
      const count = animes.filter((a) =>
        (a.genres || []).some((g) => ['Fantasia', 'Fantasy', 'Isekai', 'Sobrenatural', 'Supernatural'].includes(g))
      ).length;
      const p = Math.min(100, Math.round((count / 3) * 100));
      return { unlocked: count >= 3, progress: p, label: `${Math.min(3, count)}/3 fantasia/isekai` };
    },
  },
  {
    id: 'genre_scifi',
    title: 'Piloto de Mecha & Cyber',
    description: 'Tenha pelo menos 2 animes de Ficção Científica, Mecha ou Cyberpunk.',
    icon: '🤖',
    category: 'genres',
    tier: 'silver',
    xpReward: 110,
    rarityPercentage: 24.1,
    rarityLabel: 'Incomum',
    animeTag: 'Sci-Fi',
    check: (animes) => {
      const count = animes.filter((a) =>
        (a.genres || []).some((g) => ['Ficção Científica', 'Sci-Fi', 'Mecha', 'Cyberpunk'].includes(g))
      ).length;
      const p = Math.min(100, Math.round((count / 2) * 100));
      return { unlocked: count >= 2, progress: p, label: `${Math.min(2, count)}/2 sci-fi/mecha` };
    },
  },
  {
    id: 'genre_suspense',
    title: 'Detetive Psicológico',
    description: 'Adicione 2 animes de Mistério, Suspense ou Terror.',
    icon: '🔍',
    category: 'genres',
    tier: 'silver',
    xpReward: 110,
    rarityPercentage: 26.5,
    rarityLabel: 'Incomum',
    animeTag: 'Suspense',
    check: (animes) => {
      const count = animes.filter((a) =>
        (a.genres || []).some((g) => ['Mistério', 'Mystery', 'Psicológico', 'Psychological', 'Suspense', 'Terror', 'Horror'].includes(g))
      ).length;
      const p = Math.min(100, Math.round((count / 2) * 100));
      return { unlocked: count >= 2, progress: p, label: `${Math.min(2, count)}/2 mistérios` };
    },
  },
  {
    id: 'genre_sports',
    title: 'Espírito Esportivo (Spokon)',
    description: 'Adicione pelo menos 2 animes de Esportes, Competição ou Jogos.',
    icon: '⚽',
    category: 'genres',
    tier: 'silver',
    xpReward: 110,
    rarityPercentage: 25.0,
    rarityLabel: 'Incomum',
    animeTag: 'Esportes',
    check: (animes) => {
      const count = animes.filter((a) =>
        (a.genres || []).some((g) => ['Esportes', 'Sports', 'Jogo', 'Game', 'Competição'].includes(g))
      ).length;
      const p = Math.min(100, Math.round((count / 2) * 100));
      return { unlocked: count >= 2, progress: p, label: `${Math.min(2, count)}/2 esportes` };
    },
  },
  {
    id: 'genre_supernatural',
    title: 'Pacto Sobrenatural',
    description: 'Tenha 2 animes com demônios, magia, shinigamis ou poderes místicos.',
    icon: '🔮',
    category: 'genres',
    tier: 'silver',
    xpReward: 115,
    rarityPercentage: 30.0,
    rarityLabel: 'Incomum',
    animeTag: 'Sobrenatural',
    check: (animes) => {
      const count = animes.filter((a) =>
        (a.genres || []).some((g) => ['Sobrenatural', 'Supernatural', 'Magia', 'Magic', 'Demônios', 'Demons', 'Mitologia'].includes(g))
      ).length;
      const p = Math.min(100, Math.round((count / 2) * 100));
      return { unlocked: count >= 2, progress: p, label: `${Math.min(2, count)}/2 sobrenaturais` };
    },
  },
  {
    id: 'spec_retro_classic',
    title: 'Nostalgia dos Clássicos',
    description: 'Adicione à lista uma obra lançada antes de 2015.',
    icon: '📼',
    category: 'special',
    tier: 'silver',
    xpReward: 120,
    rarityPercentage: 28.0,
    rarityLabel: 'Incomum',
    animeTag: 'Clássico',
    check: (animes) => {
      const count = animes.filter((a) => typeof a.releaseYear === 'number' && a.releaseYear < 2015).length;
      return { unlocked: count >= 1, progress: count >= 1 ? 100 : 0, label: `${Math.min(1, count)}/1 clássico pré-2015` };
    },
  },
  {
    id: 'spec_ongoing_tracker',
    title: 'Antena da Temporada',
    description: 'Acompanhe pelo menos 2 animes atualmente em exibição / lançamento.',
    icon: '📡',
    category: 'special',
    tier: 'silver',
    xpReward: 125,
    rarityPercentage: 33.0,
    rarityLabel: 'Incomum',
    animeTag: 'Lançamentos',
    check: (animes) => {
      const count = animes.filter((a) => a.status === 'watching' || a.status === 'waiting_new_episodes').length;
      const p = Math.min(100, Math.round((count / 2) * 100));
      return { unlocked: count >= 2, progress: p, label: `${Math.min(2, count)}/2 em exibição` };
    },
  },
  {
    id: 'rating_critic',
    title: 'Crítico das Temporadas',
    description: 'Avalie com nota (1 a 10) pelo menos 5 animes da sua lista.',
    icon: '✍️',
    category: 'ratings',
    tier: 'silver',
    xpReward: 130,
    rarityPercentage: 31.0,
    rarityLabel: 'Incomum',
    animeTag: 'Crítica',
    check: (animes) => {
      const rated = animes.filter((a) => typeof a.rating === 'number' && a.rating > 0).length;
      const p = Math.min(100, Math.round((rated / 5) * 100));
      return { unlocked: rated >= 5, progress: p, label: `${Math.min(5, rated)}/5 avaliados` };
    },
  },
  {
    id: 'spec_arcs',
    title: 'Estrategista de Temporadas',
    description: 'Crie ou organize temporadas/arcos personalizados.',
    icon: '🗺️',
    category: 'special',
    tier: 'silver',
    xpReward: 100,
    rarityPercentage: 22.3,
    rarityLabel: 'Incomum',
    animeTag: 'Estratégia',
    check: (animes) => {
      const hasCustomArcs = animes.some((a) => Array.isArray(a.seasons) && a.seasons.length > 0);
      return { unlocked: hasCustomArcs, progress: hasCustomArcs ? 100 : 0, label: hasCustomArcs ? '1/1 configurado' : '0/1 configurado' };
    },
  },

  // ==========================================
  // --- GOLD (Avançado & Veterano)
  // ==========================================
  {
    id: 'eps_750',
    title: 'Coruja da Meia-Noite (750 Eps)',
    description: 'Ultrapasse a marca de 750 episódios assistidos!',
    icon: '🌙',
    category: 'episodes',
    tier: 'gold',
    xpReward: 250,
    rarityPercentage: 18.2,
    rarityLabel: 'Raro',
    crestKey: 'night',
    animeTag: 'Maratona',
    check: (_, totalEps) => {
      const p = Math.min(100, Math.round((totalEps / 750) * 100));
      return { unlocked: totalEps >= 750, progress: p, label: `${Math.min(750, totalEps)}/750 eps` };
    },
  },
  {
    id: 'eps_1500',
    title: 'Trem Bala Otaku (1.500 Eps)',
    description: 'Atinja impressionantes 1.500 episódios registrados.',
    icon: '⚡',
    category: 'episodes',
    tier: 'gold',
    xpReward: 350,
    rarityPercentage: 11.4,
    rarityLabel: 'Raro',
    crestKey: 'shounen',
    animeTag: 'Maratona',
    check: (_, totalEps) => {
      const p = Math.min(100, Math.round((totalEps / 1500) * 100));
      return { unlocked: totalEps >= 1500, progress: p, label: `${Math.min(1500, totalEps)}/1500 eps` };
    },
  },
  {
    id: 'col_finished_30',
    title: 'Guardião dos Finais',
    description: 'Complete 30 animes inteiros do início ao fim.',
    icon: '🎖️',
    category: 'collection',
    tier: 'gold',
    xpReward: 280,
    rarityPercentage: 16.0,
    rarityLabel: 'Raro',
    crestKey: 'collector',
    animeTag: 'Coleção',
    check: (animes) => {
      const completed = animes.filter((a) => a.status === 'completed').length;
      const p = Math.min(100, Math.round((completed / 30) * 100));
      return { unlocked: completed >= 30, progress: p, label: `${Math.min(30, completed)}/30 concluídos` };
    },
  },
  {
    id: 'col_finished_60',
    title: 'Veterano das Eras',
    description: 'Complete 60 animes completos no seu repertório.',
    icon: '🏅',
    category: 'collection',
    tier: 'gold',
    xpReward: 400,
    rarityPercentage: 8.7,
    rarityLabel: 'Raro',
    crestKey: 'collector',
    animeTag: 'Coleção',
    check: (animes) => {
      const completed = animes.filter((a) => a.status === 'completed').length;
      const p = Math.min(100, Math.round((completed / 60) * 100));
      return { unlocked: completed >= 60, progress: p, label: `${Math.min(60, completed)}/60 concluídos` };
    },
  },
  {
    id: 'rating_masterpiece',
    title: 'Selo de Obra-Prima',
    description: 'Dê nota máxima (10/10) para pelo menos 2 animes inesquecíveis.',
    icon: '💎',
    category: 'ratings',
    tier: 'gold',
    xpReward: 250,
    rarityPercentage: 19.5,
    rarityLabel: 'Raro',
    animeTag: 'Obra-Prima',
    check: (animes) => {
      const count10 = animes.filter((a) => a.rating === 10).length;
      const p = Math.min(100, Math.round((count10 / 2) * 100));
      return { unlocked: count10 >= 2, progress: p, label: `${Math.min(2, count10)}/2 nota 10` };
    },
  },
  {
    id: 'genre_eclectic_gold',
    title: 'Paladar Eclético',
    description: 'Assista animes abrangendo pelo menos 6 gêneros totalmente distintos.',
    icon: '🎭',
    category: 'genres',
    tier: 'gold',
    xpReward: 260,
    rarityPercentage: 17.5,
    rarityLabel: 'Raro',
    animeTag: 'Ecletismo',
    check: (animes) => {
      const allGenres = new Set<string>();
      animes.forEach((a) => (a.genres || []).forEach((g) => allGenres.add(g)));
      const count = allGenres.size;
      const p = Math.min(100, Math.round((count / 6) * 100));
      return { unlocked: count >= 6, progress: p, label: `${Math.min(6, count)}/6 gêneros` };
    },
  },
  {
    id: 'col_finished_short_series',
    title: 'Mestre das Minisséries',
    description: 'Complete 10 animes fechados/minisséries de até 26 episódios.',
    icon: '⚡',
    category: 'collection',
    tier: 'gold',
    xpReward: 280,
    rarityPercentage: 14.8,
    rarityLabel: 'Raro',
    animeTag: 'Minisséries',
    check: (animes) => {
      const count = animes.filter((a) => a.status === 'completed' && ((a.totalEpisodes && a.totalEpisodes <= 26) || a.currentEpisode <= 26)).length;
      const p = Math.min(100, Math.round((count / 10) * 100));
      return { unlocked: count >= 10, progress: p, label: `${Math.min(10, count)}/10 concluídos` };
    },
  },
  {
    id: 'spec_studio_ufotable',
    title: 'Cinéfilo da Animação Divina',
    description: 'Tenha animes de estúdios renomados (Ufotable, MAPPA, Wit, Bones, Madhouse, Toei, Kyoto ou CloverWorks).',
    icon: '🎬',
    category: 'special',
    tier: 'gold',
    xpReward: 260,
    rarityPercentage: 15.3,
    rarityLabel: 'Raro',
    animeTag: 'Estúdios',
    check: (animes) => {
      const count = animes.filter((a) => {
        const s = (a.studio || '').toLowerCase();
        return s.includes('ufotable') || s.includes('mappa') || s.includes('wit') || s.includes('madhouse') || s.includes('bones') || s.includes('toei') || s.includes('cloverworks') || s.includes('kyoto');
      }).length;
      const p = Math.min(100, Math.round((count / 3) * 100));
      return { unlocked: count >= 3, progress: p, label: `${Math.min(3, count)}/3 grandes estúdios` };
    },
  },
  {
    id: 'spec_grand_line',
    title: 'Navegante da Grand Line',
    description: 'Assista mais de 250 episódios de uma mesma obra (ex: One Piece, Naruto, Bleach).',
    icon: '🏴‍☠️',
    category: 'special',
    tier: 'gold',
    xpReward: 300,
    rarityPercentage: 12.1,
    rarityLabel: 'Raro',
    crestKey: 'shounen',
    animeTag: 'Saga Épica',
    check: (_, __, maxSingleAnimeEps) => {
      const p = Math.min(100, Math.round((maxSingleAnimeEps / 250) * 100));
      return { unlocked: maxSingleAnimeEps >= 250, progress: p, label: `${Math.min(250, maxSingleAnimeEps)}/250 eps em 1 anime` };
    },
  },

  // ==========================================
  // --- PLATINUM (Especialista & Lenda Otaku)
  // ==========================================
  {
    id: 'eps_3000',
    title: 'Lenda Imortal dos Animes',
    description: 'Atinja mais de 3.000 episódios catalogados no total.',
    icon: '👑',
    category: 'episodes',
    tier: 'platinum',
    xpReward: 600,
    rarityPercentage: 5.2,
    rarityLabel: 'Épico',
    crestKey: 'collector',
    animeTag: 'Lenda',
    check: (_, totalEps) => {
      const p = Math.min(100, Math.round((totalEps / 3000) * 100));
      return { unlocked: totalEps >= 3000, progress: p, label: `${Math.min(3000, totalEps)}/3000 eps` };
    },
  },
  {
    id: 'col_finished_100',
    title: 'Centurião do Panteão',
    description: 'Complete 100 animes ou filmes com louvor.',
    icon: '🏛️',
    category: 'collection',
    tier: 'platinum',
    xpReward: 700,
    rarityPercentage: 4.1,
    rarityLabel: 'Épico',
    crestKey: 'collector',
    animeTag: 'Centurião',
    check: (animes) => {
      const completed = animes.filter((a) => a.status === 'completed').length;
      const p = Math.min(100, Math.round((completed / 100) * 100));
      return { unlocked: completed >= 100, progress: p, label: `${Math.min(100, completed)}/100 concluídos` };
    },
  },
  {
    id: 'spec_single_500',
    title: 'Odisseia Sem Fim',
    description: 'Assista mais de 500 episódios de uma única obra épica.',
    icon: '⚔️',
    category: 'special',
    tier: 'platinum',
    xpReward: 550,
    rarityPercentage: 4.8,
    rarityLabel: 'Épico',
    crestKey: 'shounen',
    animeTag: 'Saga Épica',
    check: (_, __, maxSingleAnimeEps) => {
      const p = Math.min(100, Math.round((maxSingleAnimeEps / 500) * 100));
      return { unlocked: maxSingleAnimeEps >= 500, progress: p, label: `${Math.min(500, maxSingleAnimeEps)}/500 eps em 1 anime` };
    },
  },
  {
    id: 'rating_supreme_critic',
    title: 'Crítico Supremo da Crônica',
    description: 'Avalie com nota pessoal pelo menos 25 animes.',
    icon: '🎯',
    category: 'ratings',
    tier: 'platinum',
    xpReward: 500,
    rarityPercentage: 6.3,
    rarityLabel: 'Épico',
    animeTag: 'Crítica',
    check: (animes) => {
      const rated = animes.filter((a) => typeof a.rating === 'number' && a.rating > 0).length;
      const p = Math.min(100, Math.round((rated / 25) * 100));
      return { unlocked: rated >= 25, progress: p, label: `${Math.min(25, rated)}/25 avaliados` };
    },
  },
  {
    id: 'genre_master',
    title: 'Mestre do Multiverso',
    description: 'Tenha animes com pelo menos 8 gêneros distintos no catálogo.',
    icon: '🌐',
    category: 'genres',
    tier: 'platinum',
    xpReward: 550,
    rarityPercentage: 5.7,
    rarityLabel: 'Épico',
    crestKey: 'isekai',
    animeTag: 'Multiverso',
    check: (animes) => {
      const allGenres = new Set<string>();
      animes.forEach((a) => (a.genres || []).forEach((g) => allGenres.add(g)));
      const count = allGenres.size;
      const p = Math.min(100, Math.round((count / 8) * 100));
      return { unlocked: count >= 8, progress: p, label: `${Math.min(8, count)}/8 gêneros` };
    },
  },

  // ==========================================
  // --- DIAMOND (Mítico & Divindade dos Animes)
  // ==========================================
  {
    id: 'eps_5000',
    title: 'Deus Supremo do Multiverso',
    description: 'Mais de 5.000 episódios assistidos. Você vive no Japão dos animes.',
    icon: '🌌',
    category: 'episodes',
    tier: 'diamond',
    xpReward: 1200,
    rarityPercentage: 1.1,
    rarityLabel: 'Lendário',
    crestKey: 'night',
    animeTag: 'Divindade',
    check: (_, totalEps) => {
      const p = Math.min(100, Math.round((totalEps / 5000) * 100));
      return { unlocked: totalEps >= 5000, progress: p, label: `${Math.min(5000, totalEps)}/5000 eps` };
    },
  },
  {
    id: 'spec_king_shonen',
    title: 'Imperador de Wano (1000 Eps)',
    description: 'Assista mais de 1.000 episódios em uma única saga lendária (ex: One Piece).',
    icon: '👒',
    category: 'special',
    tier: 'diamond',
    xpReward: 1500,
    rarityPercentage: 0.8,
    rarityLabel: 'Lendário',
    crestKey: 'shounen',
    animeTag: 'Rei dos Shounens',
    check: (_, __, maxSingleAnimeEps) => {
      const p = Math.min(100, Math.round((maxSingleAnimeEps / 1000) * 100));
      return { unlocked: maxSingleAnimeEps >= 1000, progress: p, label: `${Math.min(1000, maxSingleAnimeEps)}/1000 eps em 1 anime` };
    },
  },
  {
    id: 'col_finished_200',
    title: 'Cofre Secreto do Dragão',
    description: 'Complete mais de 200 animes no seu repertório.',
    icon: '🐲',
    category: 'collection',
    tier: 'diamond',
    xpReward: 1400,
    rarityPercentage: 1.4,
    rarityLabel: 'Lendário',
    crestKey: 'collector',
    animeTag: 'Cofre Sagrado',
    check: (animes) => {
      const completed = animes.filter((a) => a.status === 'completed').length;
      const p = Math.min(100, Math.round((completed / 200) * 100));
      return { unlocked: completed >= 200, progress: p, label: `${Math.min(200, completed)}/200 concluídos` };
    },
  },
  {
    id: 'col_archivist',
    title: 'Arquivista Lendário do WAnime',
    description: 'Mantenha uma coleção com mais de 50 animes cadastrados.',
    icon: '🔮',
    category: 'collection',
    tier: 'diamond',
    xpReward: 1000,
    rarityPercentage: 2.3,
    rarityLabel: 'Lendário',
    crestKey: 'collector',
    animeTag: 'Arquivista',
    check: (animes) => {
      const count = animes.length;
      const p = Math.min(100, Math.round((count / 50) * 100));
      return { unlocked: count >= 50, progress: p, label: `${Math.min(50, count)}/50 animes` };
    },
  },
];

export function calculateUserAchievements(animes: Anime[]): {
  achievements: Achievement[];
  totalUnlocked: number;
  totalAchievements: number;
  unlockedPercentage: number;
  tierCounts: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
    diamond: number;
  };
  totalXpEarned: number;
  maxPossibleXp: number;
} {
  // Cálculo preciso de episódios
  const totalEpisodesWatched = animes.reduce((acc, a) => acc + getAnimeWatchedEpisodes(a), 0);

  // Maior quantidade de episódios em um único anime
  const maxSingleAnimeEps = Math.max(0, ...animes.map(getAnimeWatchedEpisodes));

  const tierColors: Record<Achievement['tier'], string> = {
    bronze: 'from-amber-700 via-amber-800 to-amber-950 border-amber-600/50 text-amber-300',
    silver: 'from-slate-400 via-slate-500 to-slate-800 border-slate-300/50 text-slate-100',
    gold: 'from-amber-400 via-yellow-500 to-amber-700 border-amber-300/70 text-amber-200',
    platinum: 'from-cyan-400 via-indigo-500 to-purple-800 border-cyan-300/70 text-cyan-100',
    diamond: 'from-fuchsia-400 via-purple-600 to-cyan-500 border-fuchsia-300/80 text-fuchsia-100',
  };

  const computed: Achievement[] = ACHIEVEMENTS_DEF.map((def) => {
    const res = def.check(animes, totalEpisodesWatched, maxSingleAnimeEps);
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      tier: def.tier,
      tierColor: tierColors[def.tier],
      isUnlocked: res.unlocked,
      progress: res.progress,
      progressLabel: res.label,
      xpReward: def.xpReward,
      rarityPercentage: def.rarityPercentage,
      rarityLabel: def.rarityLabel,
      crestKey: def.crestKey,
      animeTag: def.animeTag,
    };
  });

  const totalUnlocked = computed.filter((a) => a.isUnlocked).length;
  const totalAchievements = computed.length;
  const unlockedPercentage = Math.round((totalUnlocked / totalAchievements) * 100);

  const tierCounts = {
    bronze: computed.filter((a) => a.tier === 'bronze' && a.isUnlocked).length,
    silver: computed.filter((a) => a.tier === 'silver' && a.isUnlocked).length,
    gold: computed.filter((a) => a.tier === 'gold' && a.isUnlocked).length,
    platinum: computed.filter((a) => a.tier === 'platinum' && a.isUnlocked).length,
    diamond: computed.filter((a) => a.tier === 'diamond' && a.isUnlocked).length,
  };

  const totalXpEarned = computed
    .filter((a) => a.isUnlocked)
    .reduce((acc, a) => acc + (a.xpReward || 0), 0);

  const maxPossibleXp = computed.reduce((acc, a) => acc + (a.xpReward || 0), 0);

  return {
    achievements: computed,
    totalUnlocked,
    totalAchievements,
    unlockedPercentage,
    tierCounts,
    totalXpEarned,
    maxPossibleXp,
  };
}
