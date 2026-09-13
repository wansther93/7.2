/**
 * Serviço Shikimori API (100% Gratuito & Backup Imediato do MyAnimeList / Jikan)
 * Espelho de altíssima velocidade para busca de metadados, títulos alternativos e capas em alta resolução.
 */
import type { JikanAnimeResult } from './jikanService';
import { translateGenres } from './translationService';

export async function searchShikimori(query: string): Promise<JikanAnimeResult[]> {
  if (!query || !query.trim()) return [];

  const url = `https://shikimori.one/api/animes?search=${encodeURIComponent(query.trim())}&limit=8`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WAnimeList/2.0 (Open Source Anime Tracker)',
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Shikimori HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map((item: any) => {
      let cover = item.image?.original || item.image?.preview || '';
      if (cover && cover.startsWith('/')) {
        cover = `https://shikimori.one${cover}`;
      }

      const rawKind = item.kind ? item.kind.toUpperCase() : 'TV';
      let format = 'TV (Série)';
      if (rawKind === 'MOVIE') format = 'Filme';
      else if (rawKind === 'OVA') format = 'OVA';
      else if (rawKind === 'ONA') format = 'ONA (Web)';
      else if (rawKind === 'SPECIAL') format = 'Especial';

      const year = item.aired_on ? new Date(item.aired_on).getFullYear() : undefined;

      return {
        mal_id: item.id,
        title: item.name || item.russian || query,
        title_japanese: item.japanese || '',
        title_english: item.name || '',
        episodes: item.episodes && item.episodes > 0 ? item.episodes : null,
        status: item.status || 'released',
        synopsis: null, // Shikimori na listagem não envia sinopse longa; Jikan ou AniList enriquecem
        imageUrl: cover,
        genres: translateGenres([]),
        studio: null,
        format,
        source: null,
        year,
      };
    });
  } catch (err) {
    console.warn('Shikimori API fallback erro:', err);
    return [];
  }
}
