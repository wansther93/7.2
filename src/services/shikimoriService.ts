/**
 * Serviço Shikimori API (100% Gratuito, Sem Chave de API, Espelho do MyAnimeList)
 * 3ª Camada de Resiliência no Triplo Agregador: AniList -> Jikan -> Shikimori
 */
import type { JikanAnimeResult, ScheduleAnimeItem, AnimeCharacterItem, AnimeStreamingLink } from './jikanService';
import { translateGenres } from './translationService';
import { formatAiringAtToBrazil } from './jikanService';

const SHIKIMORI_BASE = 'https://shikimori.one/api';
const DEFAULT_HEADERS = {
  'User-Agent': 'WAnimeList/2.0 (Open Source Anime Tracker; contact: wansther93@gmail.com)',
  Accept: 'application/json',
};

/**
 * Normaliza caminho de imagem do Shikimori (pode vir como "/system/animes/...")
 */
function normalizeShikimoriImage(imgObj?: { original?: string; preview?: string; x96?: string }): string {
  if (!imgObj) return '';
  const url = imgObj.original || imgObj.preview || '';
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `https://shikimori.one${url}`;
  return `https://shikimori.one/${url}`;
}

/**
 * 1. Busca Geral no Shikimori (Fallback para busca de animes)
 */
export async function searchShikimori(query: string): Promise<JikanAnimeResult[]> {
  if (!query || !query.trim()) return [];

  const url = `${SHIKIMORI_BASE}/animes?search=${encodeURIComponent(query.trim())}&limit=10`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: DEFAULT_HEADERS,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Shikimori search HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map((item: any) => {
      const cover = normalizeShikimoriImage(item.image);
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
        synopsis: null,
        imageUrl: cover,
        genres: translateGenres([]),
        studio: null,
        format,
        source: null,
        year,
      };
    });
  } catch (err) {
    console.warn('Shikimori search error:', err);
    return [];
  }
}

/**
 * 2. Calendário de Exibição Semanal no Shikimori (Endpoint /api/calendar)
 */
export async function fetchShikimoriSchedule(): Promise<ScheduleAnimeItem[]> {
  const url = `${SHIKIMORI_BASE}/calendar`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: DEFAULT_HEADERS,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Shikimori calendar HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    const items: ScheduleAnimeItem[] = [];

    for (const entry of data) {
      const anime = entry.anime;
      if (!anime || !anime.id) continue;

      // Converte data de transmissão do próximo episódio para o fuso brasileiro
      let broadcastDay = 'Outros';
      let broadcastTime: string | undefined;

      if (entry.next_episode_at) {
        const nextDate = new Date(entry.next_episode_at);
        const unixTimestamp = Math.floor(nextDate.getTime() / 1000);
        const formatted = formatAiringAtToBrazil(unixTimestamp);
        broadcastDay = formatted.day;
        broadcastTime = formatted.time || undefined;
      }

      const coverUrl = normalizeShikimoriImage(anime.image);
      const year = anime.aired_on ? new Date(anime.aired_on).getFullYear() : undefined;

      items.push({
        id: anime.id,
        idMal: anime.id,
        title: anime.name || anime.russian || 'Sem título',
        title_japanese: anime.japanese || '',
        title_english: anime.name || '',
        coverUrl,
        broadcastDay,
        broadcastTime,
        genres: [],
        score: anime.score ? parseFloat(anime.score) : null,
        synopsis: null,
        episodes: anime.episodes || null,
        status: anime.status === 'ongoing' ? 'Currently Airing' : 'Finished Airing',
        studio: null,
        year,
        format: anime.kind ? anime.kind.toUpperCase() : 'TV',
        nextEpisode: entry.next_episode_at
          ? {
              airingAt: Math.floor(new Date(entry.next_episode_at).getTime() / 1000),
              episode: entry.next_episode || 1,
            }
          : null,
      });
    }

    return items;
  } catch (err) {
    console.warn('Shikimori fetch calendar error:', err);
    return [];
  }
}

/**
 * 3. Próxima Temporada e Futuros Lançamentos no Shikimori (/api/animes?season=upcoming)
 */
export async function fetchShikimoriUpcoming(): Promise<ScheduleAnimeItem[]> {
  const url = `${SHIKIMORI_BASE}/animes?season=upcoming&limit=50&order=popularity`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: DEFAULT_HEADERS,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Shikimori upcoming HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map((item: any) => {
      const coverUrl = normalizeShikimoriImage(item.image);
      let startDateObj: { year?: number; month?: number; day?: number } | null = null;
      let year: number | undefined;

      if (item.aired_on) {
        const d = new Date(item.aired_on);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear();
          startDateObj = {
            year,
            month: d.getMonth() + 1,
            day: d.getDate(),
          };
        }
      }

      return {
        id: item.id,
        idMal: item.id,
        title: item.name || item.russian || 'Sem título',
        title_japanese: item.japanese || '',
        title_english: item.name || '',
        coverUrl,
        broadcastDay: 'Em breve',
        genres: [],
        score: item.score ? parseFloat(item.score) : null,
        synopsis: null,
        episodes: item.episodes || null,
        status: 'Not yet aired',
        studio: null,
        year,
        startDate: startDateObj,
        format: item.kind ? item.kind.toUpperCase() : 'TV',
      };
    });
  } catch (err) {
    console.warn('Shikimori upcoming error:', err);
    return [];
  }
}

/**
 * 4. Temporada Atual no Shikimori (/api/animes?status=ongoing)
 */
export async function fetchShikimoriSeasonNow(): Promise<ScheduleAnimeItem[]> {
  const url = `${SHIKIMORI_BASE}/animes?status=ongoing&limit=50&order=popularity`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: DEFAULT_HEADERS,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Shikimori season now HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map((item: any) => {
      const coverUrl = normalizeShikimoriImage(item.image);
      const year = item.aired_on ? new Date(item.aired_on).getFullYear() : undefined;

      return {
        id: item.id,
        idMal: item.id,
        title: item.name || item.russian || 'Sem título',
        title_japanese: item.japanese || '',
        title_english: item.name || '',
        coverUrl,
        broadcastDay: 'Outros',
        genres: [],
        score: item.score ? parseFloat(item.score) : null,
        synopsis: null,
        episodes: item.episodes || null,
        status: 'Currently Airing',
        studio: null,
        year,
        format: item.kind ? item.kind.toUpperCase() : 'TV',
      };
    });
  } catch (err) {
    console.warn('Shikimori season now error:', err);
    return [];
  }
}

/**
 * 5. Detalhes Ricos do Anime no Shikimori (/api/animes/:id)
 */
export async function fetchShikimoriDetails(id: number): Promise<any | null> {
  if (!id) return null;
  const url = `${SHIKIMORI_BASE}/animes/${id}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: DEFAULT_HEADERS,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Shikimori details error for id ${id}:`, err);
    return null;
  }
}

/**
 * 6. Personagens e Dubladores no Shikimori (/api/animes/:id/roles)
 */
export async function fetchShikimoriCharacters(id: number): Promise<AnimeCharacterItem[]> {
  if (!id) return [];
  const url = `${SHIKIMORI_BASE}/animes/${id}/roles`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: DEFAULT_HEADERS,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    const characters: AnimeCharacterItem[] = [];

    for (const role of data) {
      if (!role.character) continue;
      const char = role.character;
      const person = role.person;

      const isMain = Array.isArray(role.roles) && role.roles.includes('Main');

      characters.push({
        id: char.id || Math.random(),
        name: char.name || char.russian || 'Personagem',
        role: isMain ? 'Main' : 'Supporting',
        imageUrl: normalizeShikimoriImage(char.image),
        voiceActor: person
          ? {
              name: person.name || person.russian || '',
              language: 'Japanese',
              imageUrl: normalizeShikimoriImage(person.image) || undefined,
            }
          : undefined,
      });

      if (characters.length >= 20) break;
    }

    return characters;
  } catch (err) {
    console.warn(`Shikimori characters error for id ${id}:`, err);
    return [];
  }
}

/**
 * 7. Links Externos e Streaming Oficial no Shikimori (/api/animes/:id/external_links)
 */
export async function fetchShikimoriExternalLinks(id: number): Promise<Array<{ site: string; url: string }>> {
  if (!id) return [];
  const url = `${SHIKIMORI_BASE}/animes/${id}/external_links`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: DEFAULT_HEADERS,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((l: any) => ({
      site: l.kind || 'Official',
      url: l.url,
    })).filter((l: any) => Boolean(l.url));
  } catch (err) {
    return [];
  }
}
