import type { Anime } from '../types';
import { getAggregatedStreamingLinks, getAggregatedCharacters } from './multiApiAggregatorService';
import type { AnimeStreamingLink, AnimeCharacterItem } from './jikanService';
import { fetchAnimeThemesMedia, type AnimeThemeMedia } from './animeThemesService';
import { fetchFreshAnimeDetails } from './animeSyncService';
import { updateAnime } from './animeService';

export interface DynamicAnimeRichData {
  streamingLinks: AnimeStreamingLink[];
  characters: AnimeCharacterItem[];
  themes: AnimeThemeMedia[];
  trailerUrl?: string | null;
  bannerUrl?: string | null;
  mal_id?: number | null;
  synopsis?: string | null;
  cachedAt?: number;
}

const STORAGE_PREFIX = 'wanime_rich_meta_';
const RICH_DATA_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias para dados completos
const EMPTY_DATA_TTL = 2 * 60 * 60 * 1000; // 2 horas para dados vazios/incompletos

/**
 * Normaliza chave de identificação do anime para armazenamento local seguro
 */
export function getAnimeStorageKey(animeIdOrTitle: number | string): string {
  const clean = String(animeIdOrTitle).trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${STORAGE_PREFIX}${clean}`;
}

/**
 * Lê metadados ricos salvos no armazenamento persistente local com verificação de validade (TTL)
 */
export function getPersistedAnimeRichData(anime: { mal_id?: number; id?: string; title: string }): DynamicAnimeRichData | null {
  if (typeof window === 'undefined' || !anime) return null;

  try {
    let raw: string | null = null;

    // Tenta primeiro por mal_id (se tiver)
    if (anime.mal_id) {
      raw = localStorage.getItem(getAnimeStorageKey(anime.mal_id));
    }

    // Tenta por título se não encontrou por ID
    if (!raw && anime.title) {
      raw = localStorage.getItem(getAnimeStorageKey(anime.title));
    }

    if (raw) {
      const parsed: DynamicAnimeRichData = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.streamingLinks)) {
        const cachedTime = parsed.cachedAt || 0;
        const age = Date.now() - cachedTime;
        const isEmpty = (!parsed.characters || parsed.characters.length === 0) && (!parsed.streamingLinks || parsed.streamingLinks.length === 0);

        // Se o cache for vazio ou incompleto e já tiver mais de 2 horas, expira para re-tentar na API
        if (isEmpty && age > EMPTY_DATA_TTL) {
          return null;
        }

        // Se o cache tiver mais de 7 dias, expira para buscar novidades (novos streamings, episódios, trailers)
        if (age > RICH_DATA_TTL) {
          return null;
        }

        return parsed;
      }
    }
  } catch (err) {
    console.debug('Erro ao ler cache persistente do anime:', err);
  }

  return null;
}

/**
 * Salva os metadados ricos no armazenamento local persistente
 */
export function savePersistedAnimeRichData(
  anime: { mal_id?: number; id?: string; title: string },
  data: DynamicAnimeRichData
): void {
  if (typeof window === 'undefined' || !anime || !data) return;

  const toSave: DynamicAnimeRichData = {
    ...data,
    cachedAt: Date.now(),
  };

  try {
    const raw = JSON.stringify(toSave);
    if (anime.mal_id) {
      localStorage.setItem(getAnimeStorageKey(anime.mal_id), raw);
    }
    if (anime.title) {
      localStorage.setItem(getAnimeStorageKey(anime.title), raw);
    }
  } catch (err) {
    console.debug('Erro ao persistir metadados do anime:', err);
  }
}

/**
 * Obtém os metadados ricos de um anime da Coleção Completa:
 * 1. Se já existir no armazenamento persistente e for válido, retorna imediatamente (0ms).
 * 2. Se for um anime recém-adicionado ou antigo sem mal_id/trailer, realiza auto-cura em segundo plano,
 *    busca nas APIs oficiais, sincroniza com o Firestore e salva o cache renovado.
 */
export async function getOrFetchAnimeRichData(
  anime: { mal_id?: number; id?: string; title: string; trailerUrl?: string | null; bannerUrl?: string | null },
  forceRefresh = false
): Promise<DynamicAnimeRichData> {
  // 1. Verifica dados persistidos se não for refresh forçado
  if (!forceRefresh) {
    const existing = getPersistedAnimeRichData(anime);
    if (existing) {
      return existing;
    }
  }

  let malId = anime.mal_id || 0;
  const title = anime.title || '';
  let resolvedTrailerUrl: string | null = anime.trailerUrl || null;
  let resolvedBannerUrl: string | null = anime.bannerUrl || null;

  // Auto-cura: para animes antigos que foram cadastrados sem mal_id ou sem trailer
  if (!malId || !resolvedTrailerUrl || !resolvedBannerUrl) {
    try {
      const fresh = await fetchFreshAnimeDetails(title, malId || null);
      if (fresh) {
        if (!malId && fresh.mal_id) {
          malId = fresh.mal_id;
        }
        if (!resolvedTrailerUrl && fresh.trailerUrl) {
          resolvedTrailerUrl = fresh.trailerUrl;
        }
        if (!resolvedBannerUrl && fresh.bannerUrl) {
          resolvedBannerUrl = fresh.bannerUrl;
        }

        // Se o anime possui ID no Firestore e descobrimos dados ausentes, atualiza silenciosamente
        if (anime.id) {
          const updates: Record<string, unknown> = {};
          if (!anime.mal_id && fresh.mal_id) updates.mal_id = fresh.mal_id;
          if (!anime.trailerUrl && fresh.trailerUrl) updates.trailerUrl = fresh.trailerUrl;
          if (!anime.bannerUrl && fresh.bannerUrl) updates.bannerUrl = fresh.bannerUrl;
          if (Object.keys(updates).length > 0) {
            updateAnime(anime.id, updates as any).catch(() => {});
          }
        }
      }
    } catch (healErr) {
      console.debug('Auto-cura de anime antigo finalizada com aviso:', healErr);
    }
  }

  // 2. Busca simultânea nas APIs agregadas (AniList + Jikan + Shikimori + AnimeThemes)
  const [streamRes, charRes, themesRes] = await Promise.allSettled([
    getAggregatedStreamingLinks(malId, title),
    malId ? getAggregatedCharacters(malId, title) : Promise.resolve([]),
    title ? fetchAnimeThemesMedia(title, malId) : Promise.resolve([]),
  ]);

  const rawStreams = streamRes.status === 'fulfilled' ? streamRes.value : [];
  const sanitizedStreams = rawStreams.filter(
    (l) => !l.name.toLowerCase().includes('youtube') && !l.url.toLowerCase().includes('youtube')
  );

  const richData: DynamicAnimeRichData = {
    streamingLinks: sanitizedStreams,
    characters: charRes.status === 'fulfilled' ? charRes.value : [],
    themes: themesRes.status === 'fulfilled' ? themesRes.value : [],
    trailerUrl: resolvedTrailerUrl,
    bannerUrl: resolvedBannerUrl,
    mal_id: malId || null,
  };

  // Salva no armazenamento persistente se tiver informações válidas
  savePersistedAnimeRichData(
    { mal_id: malId || anime.mal_id, id: anime.id, title: anime.title },
    richData
  );

  return richData;
}

// Controle de fila em segundo plano para não sobrecarregar as APIs
let isPrefetching = false;

/**
 * Pré-carregador silencioso em segundo plano:
 * Analisa a coleção do usuário e busca metadados ricos APENAS para os animes que ainda
 * NÃO possuem seus dados persistidos localmente (ex.: animes recém-adicionados).
 * Uma vez gravado, NUNCA mais dispara requisições repetidas ao abrir a Coleção Completa!
 */
export async function prefetchUserCollectionMetadata(animes: Anime[]): Promise<void> {
  if (isPrefetching || !animes || animes.length === 0) return;
  isPrefetching = true;

  try {
    // Filtra estritamente os animes que AINDA NÃO possuem metadados persistidos
    const missingMetadataList = animes.filter((a) => {
      const hasCached = getPersistedAnimeRichData(a);
      return !hasCached;
    });

    if (missingMetadataList.length === 0) {
      // Todos os animes já estão com metadados persistidos, zero requisições!
      return;
    }

    // Processa os que faltam em segundo plano, limitando a lotes de 10 por execução
    const queue = missingMetadataList.slice(0, 10);

    for (const anime of queue) {
      try {
        await getOrFetchAnimeRichData(anime, false);
      } catch (err) {
        console.debug('Prefetch silencioso individual falhou:', err);
      }

      // Intervalo de segurança (350ms) entre requisições para respeitar os limites de taxa
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  } finally {
    isPrefetching = false;
  }
}
