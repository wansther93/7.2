import type { Anime } from '../types';
import { updateAnime } from './animeService';
import { syncFranchiseSeasonsForAnime } from './franchiseService';
import { resolveAnimeAggregatedStatus, type AnimeAggregatedStatus } from './aggregatorStatusService';

export interface AnimeSyncUpdateResult {
  animeId: string;
  title: string;
  previousEpisode: number;
  latestAiredEpisode?: number | null;
  hasNewEpisode: boolean;
  newEpisodesCount: number;
  statusChanged: boolean;
  previousStatus: string;
  newStatus?: string;
  totalEpisodesUpdated?: number | null;
  detailsMessage?: string;
}

export interface FreshAnimeDetailsResult {
  mal_id: number;
  totalEpisodes: number | null;
  status: string; // 'RELEASING', 'FINISHED', 'NOT_YET_RELEASED'
  latestAiredEpisode: number | null;
  studio: string | null;
  coverUrl: string | null;
  bannerUrl: string | null;
  synopsis: string | null;
  trailerUrl: string | null;
  nextEpisode: { airingAt: number; episode: number } | null;
  broadcastDay?: string | null;
  broadcastTime?: string | null;
  aggregatedStatus: AnimeAggregatedStatus;
}

/**
 * Consulta a API AniList GraphQL e Jikan para obter metadados frescos e status de episódios lançados
 */
export const fetchFreshAnimeDetails = async (
  title: string,
  malId?: number | null,
  userStatus?: string | null
): Promise<FreshAnimeDetailsResult | null> => {
  // 1. Tentar AniList GraphQL (com relações de franquia completas para agregação)
  try {
    const graphqlQuery = `
      query ($search: String, $idMal: Int) {
        Media(search: $search, idMal: $idMal, type: ANIME) {
          id
          idMal
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          episodes
          status
          description
          genres
          averageScore
          seasonYear
          studios(isMain: true) { nodes { name } }
          nextAiringEpisode {
            airingAt
            episode
          }
          trailer { id site }
          relations {
            edges {
              relationType
              node {
                id
                idMal
                title { romaji english native }
                status
                format
                episodes
                seasonYear
                season
                startDate { year month day }
                nextAiringEpisode {
                  airingAt
                  episode
                }
                bannerImage
              }
            }
          }
        }
      }
    `;

    const variables: any = {};
    if (malId) {
      variables.idMal = malId;
    } else {
      variables.search = title.trim();
    }

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: graphqlQuery, variables }),
    });

    if (res.ok) {
      const json = await res.json();
      const media = json?.data?.Media;
      if (media) {
        let latestAired: number | null = null;
        if (media.nextAiringEpisode?.episode) {
          latestAired = Math.max(1, media.nextAiringEpisode.episode - 1);
        } else if (media.status === 'FINISHED' && media.episodes) {
          latestAired = media.episodes;
        }

        let trailerUrl: string | null = null;
        if (media.trailer?.site === 'youtube' && media.trailer?.id) {
          trailerUrl = `https://www.youtube.com/watch?v=${media.trailer.id}`;
        }

        // Determina o status agregador da obra através de suas relações e sequências
        const aggregated = resolveAnimeAggregatedStatus({
          title,
          rawApiStatus: media.status,
          userTrackerStatus: userStatus,
          nextEpisode: media.nextAiringEpisode || null,
          apiRelations: media.relations?.edges || null,
          totalEpisodes: media.episodes || null,
          bannerUrl: media.bannerImage || null,
        });

        return {
          mal_id: media.idMal || media.id,
          totalEpisodes: media.episodes || null,
          status: media.status,
          latestAiredEpisode: latestAired,
          studio: media.studios?.nodes?.[0]?.name || null,
          coverUrl: media.coverImage?.extraLarge || media.coverImage?.large || null,
          bannerUrl: aggregated.bannerUrl || media.bannerImage || null,
          synopsis: media.description ? media.description.replace(/<[^>]*>/g, '').trim() : null,
          trailerUrl,
          nextEpisode: media.nextAiringEpisode || null,
          broadcastDay: aggregated.broadcastDay || null,
          broadcastTime: aggregated.broadcastTime || null,
          aggregatedStatus: aggregated,
        };
      }
    }
  } catch (err) {
    console.warn('AniList fetch details error, tentando Jikan...', err);
  }

  // 2. Fallback Jikan API
  try {
    const url = malId
      ? `https://api.jikan.moe/v4/anime/${malId}/full`
      : `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title.trim())}&limit=1&sfw=true`;

    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const item = malId ? json.data : json.data?.[0];
      if (item) {
        const aggregated = resolveAnimeAggregatedStatus({
          title,
          rawApiStatus: item.status,
          broadcastDay: item.broadcast?.day || null,
          broadcastTime: item.broadcast?.time || null,
          userTrackerStatus: userStatus,
          totalEpisodes: item.episodes || null,
        });

        return {
          mal_id: item.mal_id,
          totalEpisodes: item.episodes || null,
          status: item.status,
          latestAiredEpisode: item.status === 'Finished Airing' ? item.episodes || null : null,
          studio: item.studios?.[0]?.name || null,
          coverUrl: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || null,
          bannerUrl: aggregated.bannerUrl || null,
          broadcastDay: aggregated.broadcastDay || null,
          broadcastTime: aggregated.broadcastTime || null,
          synopsis: item.synopsis || null,
          trailerUrl: item.trailer?.url || null,
          nextEpisode: null,
          aggregatedStatus: aggregated,
        };
      }
    }
  } catch (err) {
    console.warn('Jikan fetch details error:', err);
  }

  return null;
};

/**
 * Sincroniza metadados de um único anime, atualizando status (ex: para Finalizado) e episódios
 */
export const syncSingleAnimeMetadata = async (
  userId: string,
  anime: Anime
): Promise<AnimeSyncUpdateResult> => {
  const freshData = await fetchFreshAnimeDetails(anime.title, anime.mal_id);
  if (!freshData) {
    return {
      animeId: anime.id,
      title: anime.title,
      previousEpisode: anime.currentEpisode,
      hasNewEpisode: false,
      newEpisodesCount: 0,
      statusChanged: false,
      previousStatus: anime.status,
      detailsMessage: 'Não foi possível encontrar metadados atualizados para este anime.',
    };
  }

  const updates: Partial<Anime> = {
    lastSyncTimestamp: new Date().toISOString(),
  };

  let statusChanged = false;
  let newStatus: string | undefined;

  // Atualização dinâmica de airingStatus e broadcastDay com base no status agregado da obra
  if (freshData.aggregatedStatus) {
    if (freshData.aggregatedStatus.state === 'releasing') {
      updates.airingStatus = 'Currently Airing';
      if (freshData.aggregatedStatus.broadcastDay) {
        updates.broadcastDay = freshData.aggregatedStatus.broadcastDay;
      }
    } else if (freshData.aggregatedStatus.state === 'upcoming') {
      updates.airingStatus = 'Not yet aired';
      updates.broadcastDay = null;
    } else if (freshData.aggregatedStatus.state === 'finished') {
      updates.airingStatus = 'Finished Airing';
      updates.broadcastDay = null;
    }
  }

  // Se a obra inteira foi concluída (sem temporadas futuras confirmadas) e o usuário estava aguardando novos episódios
  const isWholeWorkFinished = freshData.aggregatedStatus?.state === 'finished';
  if (isWholeWorkFinished && anime.status === 'waiting_new_episodes') {
    const allSeasonsWatched = anime.seasons && anime.seasons.length > 1
      ? anime.seasons.every((s) => s.isWatched)
      : Boolean(freshData.totalEpisodes && anime.currentEpisode >= freshData.totalEpisodes);

    if (allSeasonsWatched) {
      updates.status = 'completed';
      statusChanged = true;
      newStatus = 'completed';
    }
  }

  if (freshData.mal_id && !anime.mal_id) {
    updates.mal_id = freshData.mal_id;
  }

  // Preserva totalEpisodes da ficha unificada se o usuário possui múltiplas temporadas
  const hasMultipleSeasons = Boolean(anime.seasons && anime.seasons.length > 1);
  if (!hasMultipleSeasons && freshData.totalEpisodes && freshData.totalEpisodes !== anime.totalEpisodes) {
    updates.totalEpisodes = freshData.totalEpisodes;
  }

  if (freshData.latestAiredEpisode) {
    updates.latestAiredEpisode = freshData.latestAiredEpisode;
  }

  if (freshData.studio && !anime.studio) {
    updates.studio = freshData.studio;
  }

  if (freshData.trailerUrl && !anime.trailerUrl) {
    updates.trailerUrl = freshData.trailerUrl;
  }

  // Sincronização automática profunda da árvore da franquia (novas temporadas, filmes e OVAs no mesmo card)
  let franchiseSyncResult: {
    hasNewSeasons: boolean;
    newSeasonsCount: number;
    updatedSeasons: any[];
    newFranchiseIds: number[];
    latestBroadcastDay?: string | null;
  } | null = null;

  try {
    franchiseSyncResult = await syncFranchiseSeasonsForAnime({ ...anime, ...updates } as Anime);
    if (franchiseSyncResult.hasNewSeasons) {
      updates.seasons = franchiseSyncResult.updatedSeasons;
      updates.franchiseIds = franchiseSyncResult.newFranchiseIds;
      if (franchiseSyncResult.latestBroadcastDay && !updates.broadcastDay) {
        updates.broadcastDay = franchiseSyncResult.latestBroadcastDay;
      }
    }
  } catch (fe) {
    console.warn('Erro ao sincronizar árvore de franquia em background:', fe);
  }

  // Persistir no Firestore
  await updateAnime(anime.id, updates as any);

  const latestAired = updates.latestAiredEpisode || anime.latestAiredEpisode || 0;
  const hasNewEp = latestAired > anime.currentEpisode;
  const diff = Math.max(0, latestAired - anime.currentEpisode);
  const newSeasonsCount = franchiseSyncResult?.newSeasonsCount || 0;

  let detailsMessage = 'Metadados sincronizados com sucesso!';
  if (newSeasonsCount > 0) {
    detailsMessage = `${newSeasonsCount} nova(s) temporada(s)/mídia(s) adicionada(s) à sua ficha!`;
  } else if (hasNewEp) {
    detailsMessage = `Novos episódios disponíveis! (Lançado até o ep ${latestAired})`;
  }

  return {
    animeId: anime.id,
    title: anime.title,
    previousEpisode: anime.currentEpisode,
    latestAiredEpisode: latestAired,
    hasNewEpisode: hasNewEp || newSeasonsCount > 0,
    newEpisodesCount: diff,
    statusChanged,
    previousStatus: anime.status,
    newStatus,
    totalEpisodesUpdated: updates.totalEpisodes,
    detailsMessage,
  };
};

/**
 * Verifica novos episódios em lote para todos os animes que o usuário está assistindo
 */
export const checkAllAiringAnimesUpdates = async (
  userId: string,
  animes: Anime[]
): Promise<AnimeSyncUpdateResult[]> => {
  const watchingOrWaiting = animes.filter(
    (a) => a.status === 'watching' || a.status === 'waiting_new_episodes'
  );

  const results: AnimeSyncUpdateResult[] = [];

  // Executa em pequenos blocos para respeitar os limites de requisição
  for (const anime of watchingOrWaiting.slice(0, 8)) {
    try {
      const res = await syncSingleAnimeMetadata(userId, anime);
      results.push(res);
    } catch (e) {
      console.warn(`Erro ao sincronizar anime ${anime.title}:`, e);
    }
  }

  return results;
};
