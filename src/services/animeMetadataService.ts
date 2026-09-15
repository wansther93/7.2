import type { Anime } from '../types';
import { getAnimeStreamingLinks, getAnimeCharacters, type AnimeStreamingLink, type AnimeCharacterItem } from './jikanService';
import { fetchAnimeThemesMedia, type AnimeThemeMedia } from './animeThemesService';

export interface DynamicAnimeRichData {
  streamingLinks: AnimeStreamingLink[];
  characters: AnimeCharacterItem[];
  themes: AnimeThemeMedia[];
  trailerUrl?: string | null;
}

// Fila em segundo plano para não sobrecarregar as APIs
let isPrefetching = false;
const prefetchedIds = new Set<string>();

/**
 * Pré-carrega metadados ricos em segundo plano (streaming real, dubladores/personagens e músicas)
 * para os animes presentes na lista do usuário, respeitando rate limits das 3 APIs oficiais.
 */
export async function prefetchUserCollectionMetadata(animes: Anime[]): Promise<void> {
  if (isPrefetching || !animes || animes.length === 0) return;
  isPrefetching = true;

  try {
    const queue = animes.filter((a) => {
      const key = `${a.mal_id || a.title}`;
      if (prefetchedIds.has(key)) return false;
      return Boolean(a.mal_id || a.title);
    });

    // Limita o lote inicial aos primeiros 12 animes mais prioritários (ex: assistindo ou recentes)
    const batch = queue.slice(0, 12);

    for (const item of batch) {
      const key = `${item.mal_id || item.title}`;
      prefetchedIds.add(key);

      const malId = item.mal_id || 0;
      const title = item.title;

      // Executa de forma silenciosa e controlada
      try {
        await Promise.allSettled([
          getAnimeStreamingLinks(malId, title),
          malId ? getAnimeCharacters(malId, title) : Promise.resolve([]),
          title ? fetchAnimeThemesMedia(title, malId) : Promise.resolve([]),
        ]);
      } catch (err) {
        console.debug('Background prefetch silencioso:', err);
      }

      // Pequena pausa (350ms) entre itens para não estourar rate limit da Jikan (3 req/segundo)
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  } finally {
    isPrefetching = false;
  }
}
