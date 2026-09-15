import type { Anime } from '../types';
import { getAggregatedStreamingLinks, getAggregatedCharacters } from './multiApiAggregatorService';
import type { AnimeStreamingLink, AnimeCharacterItem } from './jikanService';
import { fetchAnimeThemesMedia, type AnimeThemeMedia } from './animeThemesService';

export interface DynamicAnimeRichData {
  streamingLinks: AnimeStreamingLink[];
  characters: AnimeCharacterItem[];
  themes: AnimeThemeMedia[];
  trailerUrl?: string | null;
  synopsis?: string | null;
  cachedAt?: number;
}

const STORAGE_PREFIX = 'wanime_rich_meta_';

/**
 * Normaliza chave de identificação do anime para armazenamento local seguro
 */
export function getAnimeStorageKey(animeIdOrTitle: number | string): string {
  const clean = String(animeIdOrTitle).trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${STORAGE_PREFIX}${clean}`;
}

/**
 * Lê metadados ricos salvos no armazenamento persistente local (0ms de latência, 0 requisições de rede)
 */
export function getPersistedAnimeRichData(anime: { mal_id?: number; id?: string; title: string }): DynamicAnimeRichData | null {
  if (typeof window === 'undefined' || !anime) return null;

  try {
    // Tenta primeiro por mal_id (se tiver)
    if (anime.mal_id) {
      const byId = localStorage.getItem(getAnimeStorageKey(anime.mal_id));
      if (byId) {
        const parsed = JSON.parse(byId);
        if (parsed && Array.isArray(parsed.streamingLinks)) return parsed;
      }
    }

    // Tenta por título
    if (anime.title) {
      const byTitle = localStorage.getItem(getAnimeStorageKey(anime.title));
      if (byTitle) {
        const parsed = JSON.parse(byTitle);
        if (parsed && Array.isArray(parsed.streamingLinks)) return parsed;
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
 * 1. Se já existir no armazenamento persistente, retorna imediatamente (0ms).
 * 2. Se for um anime recém-adicionado que ainda não possui dados salvos, busca nas 3 APIs oficiais,
 *    salva no armazenamento persistente e retorna.
 */
export async function getOrFetchAnimeRichData(
  anime: { mal_id?: number; id?: string; title: string },
  forceRefresh = false
): Promise<DynamicAnimeRichData> {
  // 1. Verifica dados persistidos se não for refresh forçado
  if (!forceRefresh) {
    const existing = getPersistedAnimeRichData(anime);
    if (existing) {
      return existing;
    }
  }

  const malId = anime.mal_id || 0;
  const title = anime.title || '';

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
  };

  // Salva no armazenamento persistente para que futuros acessos sejam instantâneos
  savePersistedAnimeRichData(anime, richData);

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
