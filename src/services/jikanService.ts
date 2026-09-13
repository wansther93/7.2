/**
 * Serviço de busca gratuita e resiliente de animes com Múltiplos Provedores:
 * 1. AniList GraphQL API (Altíssima velocidade, sem bloqueios CORS, capas HD)
 * 2. Jikan API (MyAnimeList open API)
 * 3. Kitsu API (Fallback)
 */
import { translateGenres } from './translationService';
import { searchShikimori } from './shikimoriService';

export interface JikanAnimeResult {
  mal_id: number;
  title: string;
  title_japanese?: string;
  title_english?: string;
  episodes: number | null;
  status: string;
  synopsis: string | null;
  imageUrl: string;
  bannerUrl?: string | null;
  genres: string[]; // Lista traduzida para PT-BR
  broadcastDay?: string | null;
  studio?: string | null;
  format?: string | null;
  source?: string | null;
  year?: number;
  trailerUrl?: string | null;
}

// Dias da semana mapeados (broadcast.day / nextAiringEpisode)
const DAY_MAP_PT: Record<string, string> = {
  Sundays: 'Domingo',
  Mondays: 'Segunda-feira',
  Tuesdays: 'Terça-feira',
  Wednesdays: 'Quarta-feira',
  Thursdays: 'Quinta-feira',
  Fridays: 'Sexta-feira',
  Saturdays: 'Sábado',
  Sunday: 'Domingo',
  Monday: 'Segunda-feira',
  Tuesday: 'Terça-feira',
  Wednesday: 'Quarta-feira',
  Thursday: 'Quinta-feira',
  Friday: 'Sexta-feira',
  Saturday: 'Sábado',
};

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const ENGLISH_DAY_INDEX: Record<string, number> = {
  sunday: 0,
  sundays: 0,
  monday: 1,
  mondays: 1,
  tuesday: 2,
  tuesdays: 2,
  wednesday: 3,
  wednesdays: 3,
  thursday: 4,
  thursdays: 4,
  friday: 5,
  fridays: 5,
  saturday: 6,
  saturdays: 6,
};

/**
 * Converte o dia e horário de transmissão no Japão (JST / UTC+9)
 * para o dia da semana correspondente no fuso horário do Brasil (America/Sao_Paulo / UTC-3).
 * A diferença de horário de Tóquio para Brasília é de -12 horas.
 */
export function calculateBrazilBroadcastDay(
  rawDay?: string | null,
  rawTime?: string | null,
  _rawTimezone: string = 'Asia/Tokyo'
): string | null {
  if (!rawDay) return null;
  const dayKey = rawDay.trim().toLowerCase();
  const dayIndex = ENGLISH_DAY_INDEX[dayKey];
  if (dayIndex === undefined) {
    return DAY_MAP_PT[rawDay] || null;
  }

  // Se houver hora de exibição (ex: "00:30" ou "23:00")
  if (rawTime && rawTime.includes(':')) {
    const [hStr] = rawTime.split(':');
    const jstHour = parseInt(hStr, 10);
    if (!isNaN(jstHour)) {
      // Se passar antes do meio-dia no Japão (ex: madrugada ou manhã),
      // no Brasil ainda é o DIA ANTERIOR devido ao atraso de 12 horas.
      if (jstHour < 12) {
        const prevDayIndex = (dayIndex + 6) % 7;
        return DAY_NAMES[prevDayIndex];
      }
      return DAY_NAMES[dayIndex];
    }
  }

  return DAY_MAP_PT[rawDay] || DAY_NAMES[dayIndex] || null;
}

/**
 * Converte a hora de transmissão no Japão (JST) para o horário do Brasil (BRT - UTC-3)
 */
export function calculateBrazilBroadcastTime(rawTime?: string | null): string | null {
  if (!rawTime || !rawTime.includes(':')) return null;
  const [hStr, mStr] = rawTime.split(':');
  const jstHour = parseInt(hStr, 10);
  const min = parseInt(mStr, 10);
  if (isNaN(jstHour) || isNaN(min)) return null;

  // JST (UTC+9) para BRT (UTC-3) é exatamente -12 horas
  const brtHour = (jstHour - 12 + 24) % 24;
  return `${String(brtHour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Converte timestamp UNIX de exibição (segundos) com timezone estrito do Brasil (America/Sao_Paulo)
 */
export function formatAiringAtToBrazil(airingAtSeconds: number): { day: string; time: string } {
  try {
    const airingDate = new Date(airingAtSeconds * 1000);
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(airingDate);
    const weekdayPart = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase();
    const hourPart = parts.find((p) => p.type === 'hour')?.value;
    const minutePart = parts.find((p) => p.type === 'minute')?.value;

    let day = 'Outros';
    if (weekdayPart) {
      if (weekdayPart.includes('domingo')) day = 'Domingo';
      else if (weekdayPart.includes('segunda')) day = 'Segunda-feira';
      else if (weekdayPart.includes('terça') || weekdayPart.includes('terca')) day = 'Terça-feira';
      else if (weekdayPart.includes('quarta')) day = 'Quarta-feira';
      else if (weekdayPart.includes('quinta')) day = 'Quinta-feira';
      else if (weekdayPart.includes('sexta')) day = 'Sexta-feira';
      else if (weekdayPart.includes('sábado') || weekdayPart.includes('sabado')) day = 'Sábado';
    }
    const time = hourPart && minutePart ? `${hourPart}:${minutePart}` : '';
    return { day, time };
  } catch {
    const fallbackDate = new Date(airingAtSeconds * 1000);
    return {
      day: DAY_NAMES[fallbackDate.getDay()] || 'Outros',
      time: `${String(fallbackDate.getHours()).padStart(2, '0')}:${String(fallbackDate.getMinutes()).padStart(2, '0')}`,
    };
  }
}

const FORMAT_MAP_PT: Record<string, string> = {
  TV: 'TV (Série)',
  TV_SHORT: 'TV (Curta)',
  MOVIE: 'Filme',
  SPECIAL: 'Especial',
  OVA: 'OVA',
  ONA: 'ONA (Web)',
  MUSIC: 'Música',
};

const SOURCE_MAP_PT: Record<string, string> = {
  ORIGINAL: 'Original',
  MANGA: 'Mangá',
  LIGHT_NOVEL: 'Light Novel',
  VISUAL_NOVEL: 'Visual Novel',
  VIDEO_GAME: 'Jogo / Game',
  OTHER: 'Outros',
  NOVEL: 'Livro / Romance',
  DOUJINSHI: 'Doujinshi',
  ANIME: 'Anime',
  WEB_NOVEL: 'Web Novel',
  LIVE_ACTION: 'Live Action',
  GAME: 'Jogo / Game',
  COMIC: 'Quadrinho / Comic',
};

/**
 * 1. Provedor Primário: AniList GraphQL (Extremamente confiável e com CORS livre)
 */
async function searchAniList(query: string): Promise<JikanAnimeResult[]> {
  const graphqlQuery = `
    query ($search: String) {
      Page(page: 1, perPage: 8) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id
          idMal
          bannerImage
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
            medium
          }
          episodes
          status
          format
          source
          description
          genres
          seasonYear
          startDate {
            year
          }
          studios(isMain: true) {
            nodes {
              name
            }
          }
          trailer {
            id
            site
          }
          nextAiringEpisode {
            airingAt
          }
        }
      }
    }
  `;

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: graphqlQuery,
      variables: { search: query.trim() },
    }),
  });

  if (!res.ok) {
    throw new Error(`AniList returned status ${res.status}`);
  }

  const json = await res.json();
  const list = json?.data?.Page?.media;
  if (!Array.isArray(list) || list.length === 0) return [];

  return list.map((item: any) => {
    // Calcular dia de exibição a partir do nextAiringEpisode estritamente se for anime em exibição ativa (RELEASING)
    let broadcastDay: string | null = null;
    const isOngoingAniList = item.status === 'RELEASING';
    if (isOngoingAniList && item.nextAiringEpisode?.airingAt) {
      const date = new Date(item.nextAiringEpisode.airingAt * 1000);
      try {
        const formatter = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          weekday: 'long',
        });
        const weekdayRaw = formatter.format(date).toLowerCase();
        const found = DAY_NAMES.find(
          (d) => d.toLowerCase() === weekdayRaw || weekdayRaw.includes(d.toLowerCase())
        );
        broadcastDay = found || DAY_NAMES[date.getDay()];
      } catch {
        broadcastDay = DAY_NAMES[date.getDay()];
      }
    }

    // Limpar tags HTML da sinopse do AniList (ex: <br>, <i>)
    let cleanedSynopsis = item.description || null;
    if (cleanedSynopsis) {
      cleanedSynopsis = cleanedSynopsis.replace(/<[^>]*>/g, '').trim();
    }

    const translatedGenres = translateGenres(item.genres || []);
    const bestTitle = item.title?.romaji || item.title?.english || item.title?.native || query;
    const cover = item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || '';

    const studio = item.studios?.nodes?.[0]?.name || null;
    const format = item.format ? FORMAT_MAP_PT[item.format] || item.format : null;
    const source = item.source ? SOURCE_MAP_PT[item.source] || item.source : null;
    const year = item.seasonYear || item.startDate?.year || undefined;

    let trailerUrl: string | null = null;
    if (item.trailer?.site === 'youtube' && item.trailer?.id) {
      trailerUrl = `https://www.youtube.com/watch?v=${item.trailer.id}`;
    }

    return {
      mal_id: item.idMal || item.id,
      title: bestTitle,
      title_japanese: item.title?.native || '',
      title_english: item.title?.english || '',
      episodes: item.episodes || null,
      status: item.status || '',
      synopsis: cleanedSynopsis,
      imageUrl: cover,
      bannerUrl: item.bannerImage || null,
      genres: translatedGenres,
      broadcastDay,
      studio,
      format,
      source,
      year,
      trailerUrl,
    };
  });
}

/**
 * 2. Provedor Secundário: Jikan (MyAnimeList API)
 */
async function searchJikan(query: string): Promise<JikanAnimeResult[]> {
  const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query.trim())}&limit=6&sfw=true`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Jikan returned status ${response.status}`);
  }

  const json = await response.json();
  if (!json.data || !Array.isArray(json.data) || json.data.length === 0) return [];

  return json.data.map((item: any) => {
    const rawGenres: string[] = [
      ...(item.genres || []).map((g: any) => g.name),
      ...(item.themes || []).map((t: any) => t.name),
      ...(item.demographics || []).map((d: any) => d.name),
    ].filter(Boolean);

    const translatedGenres = translateGenres(rawGenres);
    // Extrai o dia de exibição ESTRITAMENTE se o anime estiver em exibição ativa no momento
    const isCurrentlyAiring = item.status === 'Currently Airing' || item.airing === true;
    const broadcastDay = isCurrentlyAiring && item.broadcast?.day
      ? calculateBrazilBroadcastDay(item.broadcast?.day, item.broadcast?.time, item.broadcast?.timezone)
      : null;
    const studio = item.studios?.[0]?.name || null;
    const format = item.type ? FORMAT_MAP_PT[item.type.toUpperCase()] || item.type : null;
    const source = item.source ? SOURCE_MAP_PT[item.source.toUpperCase()] || item.source : null;
    const year = item.year || item.aired?.prop?.from?.year || undefined;
    const trailerUrl = item.trailer?.url || (item.trailer?.youtube_id ? `https://www.youtube.com/watch?v=${item.trailer.youtube_id}` : null);

    return {
      mal_id: item.mal_id,
      title: item.title || item.title_english || 'Sem título',
      title_japanese: item.title_japanese || '',
      title_english: item.title_english || '',
      episodes: item.episodes || null,
      status: item.status || '',
      synopsis: item.synopsis || null,
      imageUrl:
        item.images?.webp?.large_image_url ||
        item.images?.jpg?.large_image_url ||
        item.images?.jpg?.image_url ||
        '',
      genres: translatedGenres,
      broadcastDay,
      studio,
      format,
      source,
      year,
      trailerUrl,
    };
  });
}

/**
 * 3. Provedor Terciário: Kitsu Anime API
 */
async function searchKitsu(query: string): Promise<JikanAnimeResult[]> {
  const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query.trim())}&page[limit]=6`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Kitsu returned status ${response.status}`);

  const json = await response.json();
  if (!json.data || !Array.isArray(json.data) || json.data.length === 0) return [];

  return json.data.map((item: any) => {
    const attrs = item.attributes || {};
    const bestTitle =
      attrs.canonicalTitle ||
      attrs.titles?.en_jp ||
      attrs.titles?.en ||
      attrs.titles?.ja_jp ||
      query;
    const cover =
      attrs.posterImage?.large ||
      attrs.posterImage?.original ||
      attrs.posterImage?.medium ||
      '';

    return {
      mal_id: parseInt(item.id, 10) || Date.now(),
      title: bestTitle,
      title_japanese: attrs.titles?.ja_jp || '',
      title_english: attrs.titles?.en || '',
      episodes: attrs.episodeCount || null,
      status: attrs.status || '',
      synopsis: attrs.synopsis || null,
      imageUrl: cover,
      genres: [],
      broadcastDay: null,
      year: attrs.startDate ? new Date(attrs.startDate).getFullYear() : undefined,
    };
  });
}

/**
 * Função principal de busca com fallback em cascata multi-provedores:
 * 1. AniList (GraphQL) -> 2. Jikan (MyAnimeList) -> 3. Shikimori API (Mirror) -> 4. Kitsu API
 */
export const searchAnimeMetadata = async (query: string): Promise<JikanAnimeResult[]> => {
  if (!query || query.trim().length < 2) return [];

  // 1. Tenta AniList primeiro (CORS livre e muito veloz)
  try {
    const results = await searchAniList(query);
    if (results.length > 0) return results;
  } catch (err) {
    console.warn('AniList search failed, trying Jikan fallback...', err);
  }

  // 2. Tenta Jikan (MyAnimeList)
  try {
    const results = await searchJikan(query);
    if (results.length > 0) return results;
  } catch (err) {
    console.warn('Jikan search failed, trying Shikimori fallback...', err);
  }

  // 3. Tenta Shikimori (Mirror de alta disponibilidade)
  try {
    const results = await searchShikimori(query);
    if (results.length > 0) return results;
  } catch (err) {
    console.warn('Shikimori search failed, trying Kitsu fallback...', err);
  }

  // 4. Tenta Kitsu (Fallback final)
  try {
    const results = await searchKitsu(query);
    if (results.length > 0) return results;
  } catch (err) {
    console.warn('Kitsu search failed...', err);
  }

  return [];
};

export type DayOfWeek =
  | 'Segunda'
  | 'Terça'
  | 'Quarta'
  | 'Quinta'
  | 'Sexta'
  | 'Sábado'
  | 'Domingo'
  | 'Segunda-feira'
  | 'Terça-feira'
  | 'Quarta-feira'
  | 'Quinta-feira'
  | 'Sexta-feira';

export interface ScheduleAnimeItem {
  id: number;
  idMal?: number;
  idAniList?: number;
  title: string;
  title_japanese?: string;
  title_english?: string;
  coverUrl: string;
  bannerUrl?: string;
  broadcastDay: string; // 'Segunda-feira', 'Terça-feira', etc.
  broadcastTime?: string;
  genres: string[];
  score?: number | null;
  synopsis?: string | null;
  episodes?: number | null;
  status?: string;
  studio?: string | null;
  year?: number;
  season?: string | null;
  source?: string | null;
  format?: string | null;
  startDate?: {
    year?: number | null;
    month?: number | null;
    day?: number | null;
  } | null;
  nextEpisode?: {
    airingAt: number;
    episode: number;
    timeUntilAiring?: number;
  } | null;
  trailer?: {
    id?: string | null;
    site?: string | null;
    thumbnail?: string | null;
    url?: string | null;
  } | null;
  externalLinks?: Array<{
    site: string;
    url: string;
    icon?: string | null;
  }>;
}

// In-memory cache para evitar requisições excessivas e rate limit (3 req/s)
const scheduleCache = new Map<string, { data: ScheduleAnimeItem[]; timestamp: number }>();
const seasonCache = new Map<string, { data: ScheduleAnimeItem[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutos de cache

const LOCAL_SEASON_NOW_KEY = 'wanime_season_now_v4';
const LOCAL_SEASON_UPCOMING_KEY = 'wanime_season_upcoming_v4';
const LOCAL_SCHEDULE_KEY_PREFIX = 'wanime_schedule_v4_';

/**
 * Validação estrita para barrar 100% de títulos Hentai, eróticos ou adultos (SFW estrito)
 */
export function isSfwAnime(item: any): boolean {
  if (!item) return false;
  if (item.isAdult) return false;
  const genres = (item.genres || []).map((g: any) => {
    if (typeof g === 'string') return g.toLowerCase();
    if (g && typeof g.name === 'string') return g.name.toLowerCase();
    return '';
  });
  if (genres.includes('hentai') || genres.includes('erotica') || genres.includes('ecchi 18+')) return false;
  return true;
}

export function getCachedSeasonNow(): ScheduleAnimeItem[] | null {
  const mem = seasonCache.get('season_now');
  if (mem && mem.data.length > 0) return mem.data;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_SEASON_NOW_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
        seasonCache.set('season_now', parsed);
        return parsed.data;
      }
    }
  } catch {}
  return null;
}

export function getCachedSeasonUpcoming(): ScheduleAnimeItem[] | null {
  const mem = seasonCache.get('season_upcoming');
  if (mem && mem.data.length > 0) return mem.data;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_SEASON_UPCOMING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
        seasonCache.set('season_upcoming', parsed);
        return parsed.data;
      }
    }
  } catch {}
  return null;
}

export function getCachedWeeklySchedule(dayPt?: string): ScheduleAnimeItem[] | null {
  const cacheKey = dayPt || 'all';
  const mem = scheduleCache.get(cacheKey);
  if (mem && mem.data.length > 0) return mem.data;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_SCHEDULE_KEY_PREFIX}${cacheKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
        scheduleCache.set(cacheKey, parsed);
        return parsed.data;
      }
    }
  } catch {}
  return null;
}

const DAY_FILTER_MAP: Record<string, string> = {
  'Segunda-feira': 'monday',
  'Terça-feira': 'tuesday',
  'Quarta-feira': 'wednesday',
  'Quinta-feira': 'thursday',
  'Sexta-feira': 'friday',
  'Sábado': 'saturday',
  'Domingo': 'sunday',
  'Segunda': 'monday',
  'Terça': 'tuesday',
  'Quarta': 'wednesday',
  'Quinta': 'thursday',
  'Sexta': 'friday',
};

/**
 * Busca o calendário semanal de lançamentos de animes (AniList GraphQL -> Jikan API -> Kitsu)
 */
export const getWeeklySchedule = async (dayPt?: string): Promise<ScheduleAnimeItem[]> => {
  const cacheKey = dayPt || 'all';
  const cached = scheduleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Tenta ler do localStorage primeiro para resposta instantânea
  const localCached = getCachedWeeklySchedule(dayPt);
  if (localCached && localCached.length > 0) {
    // Retorna do cache se válido e atualiza em segundo plano se necessário
    const timestampKey = `${LOCAL_SCHEDULE_KEY_PREFIX}${cacheKey}_ts`;
    const savedTs = typeof window !== 'undefined' ? Number(localStorage.getItem(timestampKey) || '0') : 0;
    if (Date.now() - savedTs < CACHE_TTL) {
      return localCached;
    }
  }

  // 1. Tenta AniList GraphQL primeiro (2 páginas paralelas = 100 obras, 100% SFW com isAdult: false)
  try {
    const buildScheduleQuery = (page: number) => `
      query {
        Page(page: ${page}, perPage: 50) {
          media(status: RELEASING, type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
            id
            idMal
            title {
              romaji
              english
              native
            }
            coverImage {
              extraLarge
              large
            }
            bannerImage
            format
            episodes
            status
            description
            genres
            averageScore
            season
            seasonYear
            startDate {
              year
              month
              day
            }
            studios(isMain: true) {
              nodes {
                name
              }
            }
            nextAiringEpisode {
              airingAt
              timeUntilAiring
              episode
            }
            trailer {
              id
              site
              thumbnail
            }
            externalLinks {
              site
              url
              icon
            }
          }
        }
      }
    `;

    const [res1, res2] = await Promise.all([
      fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: buildScheduleQuery(1) }),
      }),
      fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: buildScheduleQuery(2) }),
      }),
    ]);

    let list: any[] = [];
    if (res1.ok) {
      const json1 = await res1.json();
      const p1 = json1?.data?.Page?.media || [];
      if (Array.isArray(p1)) list.push(...p1);
    }
    if (res2.ok) {
      const json2 = await res2.json();
      const p2 = json2?.data?.Page?.media || [];
      if (Array.isArray(p2)) list.push(...p2);
    }

    // Filtro secundário anti-adulto
    list = list.filter(isSfwAnime);

    if (list.length > 0) {
      const mapped: ScheduleAnimeItem[] = list.map((item: any) => {
        let broadcastDay = 'Outros';
        let broadcastTime: string | undefined;

        if (item.nextAiringEpisode?.airingAt) {
          const formatted = formatAiringAtToBrazil(item.nextAiringEpisode.airingAt);
          broadcastDay = formatted.day;
          broadcastTime = formatted.time || undefined;
        }

        const cleanSynopsis = item.description ? item.description.replace(/<[^>]*>/g, '').trim() : null;

        return {
          id: item.idMal || item.id,
          idMal: item.idMal || item.id,
          idAniList: item.id,
          title: item.title?.romaji || item.title?.english || item.title?.native || 'Sem título',
          title_japanese: item.title?.native || '',
          title_english: item.title?.english || '',
          coverUrl: item.coverImage?.extraLarge || item.coverImage?.large || '',
          bannerUrl: item.bannerImage || undefined,
          broadcastDay,
          broadcastTime,
          genres: translateGenres(item.genres || []),
          score: item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : null,
          synopsis: cleanSynopsis,
          episodes: item.episodes || null,
          status: item.status || 'Currently Airing',
          studio: item.studios?.nodes?.[0]?.name || null,
          year: item.seasonYear || item.startDate?.year || undefined,
          season: item.season || null,
          format: item.format || null,
          startDate: item.startDate || null,
          nextEpisode: item.nextAiringEpisode || null,
          trailer: item.trailer
            ? {
                id: item.trailer.id,
                site: item.trailer.site,
                thumbnail: item.trailer.thumbnail,
                url:
                  item.trailer.site?.toLowerCase() === 'youtube' && item.trailer.id
                    ? `https://www.youtube.com/watch?v=${item.trailer.id}`
                    : null,
              }
            : null,
          externalLinks: Array.isArray(item.externalLinks) ? item.externalLinks : [],
        };
      });

      const filtered = dayPt
        ? mapped.filter((a) => a.broadcastDay === dayPt || a.broadcastDay.startsWith(dayPt) || dayPt.startsWith(a.broadcastDay))
        : mapped;
      const uniqueMap = new Map<number, ScheduleAnimeItem>();
      for (const it of filtered) {
        if (!uniqueMap.has(it.id)) {
          uniqueMap.set(it.id, it);
        }
      }
      const deduplicated = Array.from(uniqueMap.values());
      if (deduplicated.length > 0) {
        scheduleCache.set(cacheKey, { data: deduplicated, timestamp: Date.now() });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`${LOCAL_SCHEDULE_KEY_PREFIX}${cacheKey}`, JSON.stringify({ data: deduplicated, timestamp: Date.now() }));
            localStorage.setItem(`${LOCAL_SCHEDULE_KEY_PREFIX}${cacheKey}_ts`, String(Date.now()));
          } catch {}
        }
        return deduplicated;
      }
    }
  } catch (err) {
    console.warn('AniList schedule error, trying Jikan fallback...', err);
  }

  // 2. Fallback via Jikan API v4 schedules
  try {
    const filterParam = dayPt && DAY_FILTER_MAP[dayPt] ? `?filter=${DAY_FILTER_MAP[dayPt]}&sfw=true&limit=25` : '?sfw=true&limit=25';
    const response = await fetch(`https://api.jikan.moe/v4/schedules${filterParam}`);
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        const mapped: ScheduleAnimeItem[] = json.data.map((item: any) => {
          const rawGenres: string[] = [
            ...(item.genres || []).map((g: any) => g.name),
            ...(item.themes || []).map((t: any) => t.name),
            ...(item.demographics || []).map((d: any) => d.name),
          ].filter(Boolean);

          const dayEn = item.broadcast?.day;
          const mappedDay = dayEn ? DAY_MAP_PT[dayEn] || dayPt || 'Outros' : dayPt || 'Outros';

          return {
            id: item.mal_id,
            title: item.title || item.title_english || 'Sem título',
            title_japanese: item.title_japanese || '',
            title_english: item.title_english || '',
            coverUrl:
              item.images?.webp?.large_image_url ||
              item.images?.jpg?.large_image_url ||
              item.images?.jpg?.image_url ||
              '',
            broadcastDay: mappedDay,
            broadcastTime: item.broadcast?.time ? `${item.broadcast.time} (JST)` : undefined,
            genres: translateGenres(rawGenres),
            score: item.score || null,
            synopsis: item.synopsis || null,
            episodes: item.episodes || null,
            status: item.status || 'Currently Airing',
            studio: item.studios?.[0]?.name || null,
            year: item.year || item.aired?.prop?.from?.year || undefined,
            source: item.source || null,
          };
        });

        const uniqueMap = new Map<number, ScheduleAnimeItem>();
        for (const it of mapped) {
          if (!uniqueMap.has(it.id)) {
            uniqueMap.set(it.id, it);
          }
        }
        const deduplicated = Array.from(uniqueMap.values());
        scheduleCache.set(cacheKey, { data: deduplicated, timestamp: Date.now() });
        return deduplicated;
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar schedules do Jikan:', err);
  }

  // 3. Fallback via Kitsu API
  try {
    const res = await fetch('https://kitsu.io/api/edge/trending/anime?limit=20');
    if (res.ok) {
      const json = await res.json();
      const list = json.data || [];
      const mapped: ScheduleAnimeItem[] = list.map((item: any) => {
        const attr = item.attributes || {};
        return {
          id: Number(item.id),
          title: attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || 'Sem título',
          title_japanese: attr.titles?.ja_jp || '',
          title_english: attr.titles?.en || '',
          coverUrl: attr.posterImage?.large || attr.posterImage?.original || '',
          broadcastDay: dayPt || 'Outros',
          genres: [],
          score: attr.averageRating ? Number((Number(attr.averageRating) / 10).toFixed(1)) : null,
          synopsis: attr.synopsis || null,
          episodes: attr.episodeCount || null,
          status: 'Currently Airing',
          studio: null,
          year: attr.startDate ? new Date(attr.startDate).getFullYear() : undefined,
        };
      });

      const uniqueMap = new Map<number, ScheduleAnimeItem>();
      for (const it of mapped) {
        if (!uniqueMap.has(it.id)) {
          uniqueMap.set(it.id, it);
        }
      }
      const deduplicated = Array.from(uniqueMap.values());
      scheduleCache.set(cacheKey, { data: deduplicated, timestamp: Date.now() });
      return deduplicated;
    }
  } catch (err) {
    console.error('Fallback Kitsu schedules falhou:', err);
  }

  return [];
};

/**
 * Busca animes populares da temporada atual (AniList GraphQL -> Jikan API -> Kitsu)
 * Escopo expandido para até 150 produções ativas (mainstream + nicho + shorts), 100% SFW e sem travamento
 */
export const getSeasonNowAnimes = async (): Promise<ScheduleAnimeItem[]> => {
  const cacheKey = 'season_now';
  const cached = seasonCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Tenta carregar do cache local persistente para 0ms de espera
  const localCached = getCachedSeasonNow();
  if (localCached && localCached.length > 0) {
    const savedTs = typeof window !== 'undefined' ? Number(localStorage.getItem(`${LOCAL_SEASON_NOW_KEY}_ts`) || '0') : 0;
    if (Date.now() - savedTs < CACHE_TTL) {
      return localCached;
    }
  }

  // 1. Tenta AniList GraphQL primeiro (3 páginas paralelas de 50 = até 150 produções, isAdult: false obrigatório)
  try {
    const buildQuery = (page: number, perPage: number = 50) => `
      query {
        Page(page: ${page}, perPage: ${perPage}) {
          media(status: RELEASING, type: ANIME, isAdult: false, format_in: [TV, TV_SHORT, MOVIE, ONA, OVA, SPECIAL], sort: POPULARITY_DESC) {
            id
            idMal
            title { romaji english native }
            coverImage { extraLarge large }
            bannerImage
            relations {
              edges {
                relationType
                node {
                  bannerImage
                }
              }
            }
            format
            episodes
            status
            description
            genres
            averageScore
            season
            seasonYear
            startDate { year month day }
            studios(isMain: true) { nodes { name } }
            nextAiringEpisode { airingAt timeUntilAiring episode }
            trailer { id site thumbnail }
            externalLinks { site url icon }
          }
        }
      }
    `;

    const [res1, res2, res3] = await Promise.all([
      fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: buildQuery(1, 50) }),
      }),
      fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: buildQuery(2, 50) }),
      }),
      fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: buildQuery(3, 50) }),
      }),
    ]);

    let list: any[] = [];
    if (res1.ok) {
      const json1 = await res1.json();
      const p1 = json1?.data?.Page?.media || [];
      if (Array.isArray(p1)) list.push(...p1);
    }
    if (res2.ok) {
      const json2 = await res2.json();
      const p2 = json2?.data?.Page?.media || [];
      if (Array.isArray(p2)) list.push(...p2);
    }
    if (res3.ok) {
      const json3 = await res3.json();
      const p3 = json3?.data?.Page?.media || [];
      if (Array.isArray(p3)) list.push(...p3);
    }

    // Filtro secundário rigoroso contra qualquer conteúdo adulto/hentai
    list = list.filter(isSfwAnime);

    if (list.length > 0) {
      const mapped: ScheduleAnimeItem[] = list.map((item: any) => {
          let broadcastDay = 'Outros';
          let broadcastTime: string | undefined;

          if (item.nextAiringEpisode?.airingAt) {
            const formatted = formatAiringAtToBrazil(item.nextAiringEpisode.airingAt);
            broadcastDay = formatted.day;
            broadcastTime = formatted.time || undefined;
          }

          // Fallback de banner da franquia/temporada passada se a atual não tiver
          let bannerUrl = item.bannerImage || undefined;
          if (!bannerUrl && item.relations?.edges) {
            for (const edge of item.relations.edges) {
              if (edge?.node?.bannerImage) {
                bannerUrl = edge.node.bannerImage;
                break;
              }
            }
          }

          let format = item.format || null;
          if (format === 'TV_SHORT') format = 'TV Short';
          if (format === 'MOVIE') format = 'Movie';
          if (format === 'SPECIAL') format = 'Special';

          return {
            id: item.idMal || item.id,
            idMal: item.idMal || item.id,
            idAniList: item.id,
            title: item.title?.romaji || item.title?.english || item.title?.native || 'Sem título',
            title_japanese: item.title?.native || '',
            title_english: item.title?.english || '',
            coverUrl: item.coverImage?.extraLarge || item.coverImage?.large || '',
            bannerUrl,
            broadcastDay,
            broadcastTime,
            genres: translateGenres(item.genres || []),
            score: item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : null,
            synopsis: item.description ? item.description.replace(/<[^>]*>/g, '').trim() : null,
            episodes: item.episodes || null,
            status: item.status || 'Currently Airing',
            studio: item.studios?.nodes?.[0]?.name || null,
            year: item.seasonYear || item.startDate?.year || undefined,
            season: item.season || null,
            format,
            startDate: item.startDate || null,
            nextEpisode: item.nextAiringEpisode || null,
            trailer: item.trailer
              ? {
                  id: item.trailer.id,
                  site: item.trailer.site,
                  thumbnail: item.trailer.thumbnail,
                  url:
                    item.trailer.site?.toLowerCase() === 'youtube' && item.trailer.id
                      ? `https://www.youtube.com/watch?v=${item.trailer.id}`
                      : null,
                }
              : null,
            externalLinks: Array.isArray(item.externalLinks) ? item.externalLinks : [],
          };
        });
        
        const uniqueMap = new Map<number, ScheduleAnimeItem>();
        for (const it of mapped) {
          if (!uniqueMap.has(it.id)) {
            uniqueMap.set(it.id, it);
          }
        }
        const deduplicated = Array.from(uniqueMap.values());
        seasonCache.set(cacheKey, { data: deduplicated, timestamp: Date.now() });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_SEASON_NOW_KEY, JSON.stringify({ data: deduplicated, timestamp: Date.now() }));
            localStorage.setItem(`${LOCAL_SEASON_NOW_KEY}_ts`, String(Date.now()));
          } catch {}
        }
        return deduplicated;
      }
  } catch (e) {
    console.warn('AniList season now error, trying Jikan...', e);
  }

  // 2. Fallback Jikan API
  try {
    const response = await fetch('https://api.jikan.moe/v4/seasons/now?sfw=true&limit=25');
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        const mapped: ScheduleAnimeItem[] = json.data.map((item: any) => {
          const rawGenres: string[] = [
            ...(item.genres || []).map((g: any) => g.name),
            ...(item.themes || []).map((t: any) => t.name),
            ...(item.demographics || []).map((d: any) => d.name),
          ].filter(Boolean);

          const dayEn = item.broadcast?.day;
          const broadcastDay = dayEn ? DAY_MAP_PT[dayEn] || 'Outros' : 'Outros';

          return {
            id: item.mal_id,
            title: item.title || item.title_english || 'Sem título',
            title_japanese: item.title_japanese || '',
            title_english: item.title_english || '',
            coverUrl:
              item.images?.webp?.large_image_url ||
              item.images?.jpg?.large_image_url ||
              item.images?.jpg?.image_url ||
              '',
            broadcastDay,
            broadcastTime: item.broadcast?.time ? `${item.broadcast.time} (JST)` : undefined,
            genres: translateGenres(rawGenres),
            score: item.score || null,
            synopsis: item.synopsis || null,
            episodes: item.episodes || null,
            status: item.status || 'Currently Airing',
            studio: item.studios?.[0]?.name || null,
            year: item.year || item.aired?.prop?.from?.year || undefined,
            source: item.source || null,
          };
        });

        const uniqueMap = new Map<number, ScheduleAnimeItem>();
        for (const it of mapped) {
          if (!uniqueMap.has(it.id)) {
            uniqueMap.set(it.id, it);
          }
        }
        const deduplicated = Array.from(uniqueMap.values());
        seasonCache.set(cacheKey, { data: deduplicated, timestamp: Date.now() });
        return deduplicated;
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar season now do Jikan:', err);
  }

  return [];
};

/**
 * Busca animes confirmados para a próxima temporada e produções futuras (AniList GraphQL -> Jikan Seasons Upcoming)
 * Escopo de até 150 obras confirmadas (englobando filmes de One Piece e lançamentos até anos futuros), 100% SFW e com cache instantâneo
 */
export const getSeasonUpcomingAnimes = async (): Promise<ScheduleAnimeItem[]> => {
  const cacheKey = 'season_upcoming';
  const cached = seasonCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Tenta carregar do cache local persistente para 0ms de espera
  const localCached = getCachedSeasonUpcoming();
  if (localCached && localCached.length > 0) {
    const savedTs = typeof window !== 'undefined' ? Number(localStorage.getItem(`${LOCAL_SEASON_UPCOMING_KEY}_ts`) || '0') : 0;
    if (Date.now() - savedTs < CACHE_TTL) {
      return localCached;
    }
  }

  // 1. Tenta AniList GraphQL primeiro (Upcoming - 3 páginas paralelas de 50 = até 150 obras, isAdult: false obrigatório)
  try {
    const buildQuery = (page: number, perPage: number = 50) => `
      query {
        Page(page: ${page}, perPage: ${perPage}) {
          media(status: NOT_YET_RELEASED, type: ANIME, isAdult: false, format_in: [TV, TV_SHORT, MOVIE, ONA, OVA, SPECIAL], sort: POPULARITY_DESC) {
            id
            idMal
            title { romaji english native }
            coverImage { extraLarge large }
            bannerImage
            relations {
              edges {
                relationType
                node {
                  bannerImage
                }
              }
            }
            format
            episodes
            status
            description
            genres
            averageScore
            season
            seasonYear
            startDate { year month day }
            studios(isMain: true) { nodes { name } }
            nextAiringEpisode { airingAt timeUntilAiring episode }
            trailer { id site thumbnail }
            externalLinks { site url icon }
          }
        }
      }
    `;

    const [res1, res2, res3] = await Promise.all([
      fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: buildQuery(1, 50) }),
      }),
      fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: buildQuery(2, 50) }),
      }),
      fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: buildQuery(3, 50) }),
      }),
    ]);

    let list: any[] = [];
    if (res1.ok) {
      const json1 = await res1.json();
      const p1 = json1?.data?.Page?.media || [];
      if (Array.isArray(p1)) list.push(...p1);
    }
    if (res2.ok) {
      const json2 = await res2.json();
      const p2 = json2?.data?.Page?.media || [];
      if (Array.isArray(p2)) list.push(...p2);
    }
    if (res3.ok) {
      const json3 = await res3.json();
      const p3 = json3?.data?.Page?.media || [];
      if (Array.isArray(p3)) list.push(...p3);
    }

    // Filtro secundário rigoroso contra qualquer conteúdo adulto/hentai
    list = list.filter(isSfwAnime);

    if (list.length > 0) {
        const mapped: ScheduleAnimeItem[] = list.map((item: any) => {
          // Banner da própria temporada ou herdado da franquia/temporada anterior
          let bannerUrl = item.bannerImage || undefined;
          if (!bannerUrl && item.relations?.edges) {
            for (const edge of item.relations.edges) {
              if (edge?.node?.bannerImage) {
                bannerUrl = edge.node.bannerImage;
                break;
              }
            }
          }

          let format = item.format || null;
          if (format === 'TV_SHORT') format = 'TV Short';
          if (format === 'MOVIE') format = 'Movie';
          if (format === 'SPECIAL') format = 'Special';

          return {
            id: item.idMal || item.id,
            idMal: item.idMal || item.id,
            idAniList: item.id,
            title: item.title?.romaji || item.title?.english || item.title?.native || 'Sem título',
            title_japanese: item.title?.native || '',
            title_english: item.title?.english || '',
            coverUrl: item.coverImage?.extraLarge || item.coverImage?.large || '',
            bannerUrl,
            broadcastDay: 'Em breve',
            genres: translateGenres(item.genres || []),
            score: item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : null,
            synopsis: item.description ? item.description.replace(/<[^>]*>/g, '').trim() : null,
            episodes: item.episodes || null,
            status: 'Not yet aired',
            studio: item.studios?.nodes?.[0]?.name || null,
            year: item.seasonYear || item.startDate?.year || undefined,
            season: item.season || null,
            format,
            startDate: item.startDate || null,
            nextEpisode: item.nextAiringEpisode || null,
            trailer: item.trailer
              ? {
                  id: item.trailer.id,
                  site: item.trailer.site,
                  thumbnail: item.trailer.thumbnail,
                  url:
                    item.trailer.site?.toLowerCase() === 'youtube' && item.trailer.id
                      ? `https://www.youtube.com/watch?v=${item.trailer.id}`
                      : null,
                }
              : null,
            externalLinks: Array.isArray(item.externalLinks) ? item.externalLinks : [],
          };
        });

        const uniqueMap = new Map<number, ScheduleAnimeItem>();
        for (const it of mapped) {
          if (!uniqueMap.has(it.id)) {
            uniqueMap.set(it.id, it);
          }
        }
        const deduplicated = Array.from(uniqueMap.values());
        seasonCache.set(cacheKey, { data: deduplicated, timestamp: Date.now() });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_SEASON_UPCOMING_KEY, JSON.stringify({ data: deduplicated, timestamp: Date.now() }));
            localStorage.setItem(`${LOCAL_SEASON_UPCOMING_KEY}_ts`, String(Date.now()));
          } catch {}
        }
        return deduplicated;
      }
    } catch (e) {
      console.warn('AniList upcoming error, trying Jikan...', e);
  }

  // 2. Fallback Jikan Upcoming
  try {
    const response = await fetch('https://api.jikan.moe/v4/seasons/upcoming?sfw=true&limit=35');
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        const mapped: ScheduleAnimeItem[] = json.data.map((item: any) => {
          const rawGenres: string[] = [
            ...(item.genres || []).map((g: any) => g.name),
            ...(item.themes || []).map((t: any) => t.name),
            ...(item.demographics || []).map((d: any) => d.name),
          ].filter(Boolean);

          let format = item.type || 'TV';
          if (format === 'Movie') format = 'Movie';
          if (format === 'ONA') format = 'ONA';
          if (format === 'OVA') format = 'OVA';

          return {
            id: item.mal_id,
            title: item.title || item.title_english || 'Sem título',
            title_japanese: item.title_japanese || '',
            title_english: item.title_english || '',
            coverUrl:
              item.images?.webp?.large_image_url ||
              item.images?.jpg?.large_image_url ||
              item.images?.jpg?.image_url ||
              '',
            broadcastDay: 'Em breve',
            genres: translateGenres(rawGenres),
            score: item.score || null,
            synopsis: item.synopsis || null,
            episodes: item.episodes || null,
            status: 'Not yet aired',
            studio: item.studios?.[0]?.name || null,
            year: item.year || item.aired?.prop?.from?.year || undefined,
            format,
            source: item.source || null,
          };
        });

        const uniqueMap = new Map<number, ScheduleAnimeItem>();
        for (const it of mapped) {
          if (!uniqueMap.has(it.id)) {
            uniqueMap.set(it.id, it);
          }
        }
        const deduplicated = Array.from(uniqueMap.values());
        seasonCache.set(cacheKey, { data: deduplicated, timestamp: Date.now() });
        return deduplicated;
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar season upcoming do Jikan:', err);
  }

  return [];
};

export interface AnimeCharacterItem {
  id: number;
  name: string;
  role: 'Main' | 'Supporting' | string;
  imageUrl: string;
  voiceActor?: {
    name: string;
    language: string;
    imageUrl?: string;
  };
}

export interface AnimeThemesResult {
  openings: string[];
  endings: string[];
}

export interface AnimeRecommendationItem {
  id: number;
  title: string;
  imageUrl: string;
  votesCount?: number;
}

export interface AnimeCharacterItem {
  id: number;
  name: string;
  role: 'Main' | 'Supporting' | string;
  imageUrl: string;
  voiceActor?: {
    name: string;
    language: string;
    imageUrl?: string;
  };
}

export interface AnimeThemesResult {
  openings: string[];
  endings: string[];
}

export interface AnimeRecommendationItem {
  id: number;
  title: string;
  imageUrl: string;
  votesCount?: number;
}

export interface AnimeStreamingLink {
  name: string;
  url: string;
}

const charactersCache = new Map<string, { data: AnimeCharacterItem[]; timestamp: number }>();
const themesCache = new Map<string, { data: AnimeThemesResult; timestamp: number }>();
const recsCache = new Map<string, { data: AnimeRecommendationItem[]; timestamp: number }>();
const streamingCache = new Map<string, { data: AnimeStreamingLink[]; timestamp: number }>();

/**
 * Fallback via AniList GraphQL para Personagens e Dubladores (Seiyuus)
 */
async function fetchAniListCharacters(malId?: number, searchTitle?: string): Promise<AnimeCharacterItem[]> {
  try {
    const query = `
      query ($idMal: Int, $search: String) {
        Media(idMal: $idMal, search: $search, type: ANIME) {
          characters(sort: [ROLE, RELEVANCE], perPage: 20) {
            edges {
              role
              node {
                id
                name {
                  full
                  native
                  userPreferred
                }
                image {
                  large
                  medium
                }
              }
              voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
                id
                name {
                  full
                  native
                }
                image {
                  large
                }
              }
            }
          }
        }
      }
    `;

    const variables: Record<string, any> = {};
    if (malId) variables.idMal = malId;
    else if (searchTitle) variables.search = searchTitle;
    else return [];

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) return [];
    const json = await res.json();
    const edges = json?.data?.Media?.characters?.edges;
    if (!Array.isArray(edges) || edges.length === 0) return [];

    return edges.map((edge: any) => {
      const charNode = edge.node;
      const va = edge.voiceActors?.[0];

      return {
        id: charNode?.id || Math.random(),
        name: charNode?.name?.userPreferred || charNode?.name?.full || charNode?.name?.native || 'Personagem',
        role: edge.role === 'MAIN' ? 'Main' : 'Supporting',
        imageUrl: charNode?.image?.large || charNode?.image?.medium || '',
        voiceActor: va
          ? {
              name: va.name?.full || va.name?.native || '',
              language: 'Japanese',
              imageUrl: va.image?.large || undefined,
            }
          : undefined,
      };
    });
  } catch (err) {
    console.warn('AniList characters fallback falhou:', err);
    return [];
  }
}

/**
 * Fallback via AniList GraphQL para Streaming e Links Oficiais
 */
async function fetchAniListStreamingLinks(malId?: number, searchTitle?: string): Promise<AnimeStreamingLink[]> {
  try {
    const query = `
      query ($idMal: Int, $search: String) {
        Media(idMal: $idMal, search: $search, type: ANIME) {
          externalLinks {
            id
            site
            url
            type
            language
            icon
          }
        }
      }
    `;

    const variables: Record<string, any> = {};
    if (malId) variables.idMal = malId;
    else if (searchTitle) variables.search = searchTitle;
    else return [];

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) return [];
    const json = await res.json();
    const links = json?.data?.Media?.externalLinks;
    if (!Array.isArray(links)) return [];

    const knownStreamingSites = [
      'Crunchyroll',
      'Netflix',
      'Disney Plus',
      'Disney+',
      'Prime Video',
      'Amazon Prime Video',
      'Max',
      'HBO Max',
      'Hulu',
      'HIDIVE',
      'Bilibili',
      'YouTube',
      'Funimation',
      'Pluto TV',
    ];

    const results: AnimeStreamingLink[] = [];
    links.forEach((l: any) => {
      const siteName = l.site || '';
      const isStreamType = l.type === 'STREAMING';
      const isKnown = knownStreamingSites.some((k) => siteName.toLowerCase().includes(k.toLowerCase()));

      if ((isStreamType || isKnown) && l.url) {
        results.push({
          name: siteName,
          url: l.url,
        });
      }
    });

    return results;
  } catch (err) {
    console.warn('AniList streaming links falhou:', err);
    return [];
  }
}

/**
 * Fallback via AniList GraphQL para Recomendações
 */
async function fetchAniListRecommendations(malId?: number, searchTitle?: string): Promise<AnimeRecommendationItem[]> {
  try {
    const query = `
      query ($idMal: Int, $search: String) {
        Media(idMal: $idMal, search: $search, type: ANIME) {
          recommendations(sort: RATING_DESC, perPage: 10) {
            nodes {
              mediaRecommendation {
                id
                idMal
                title {
                  romaji
                  english
                  native
                }
                coverImage {
                  large
                  extraLarge
                }
                averageScore
              }
            }
          }
        }
      }
    `;

    const variables: Record<string, any> = {};
    if (malId) variables.idMal = malId;
    else if (searchTitle) variables.search = searchTitle;
    else return [];

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) return [];
    const json = await res.json();
    const nodes = json?.data?.Media?.recommendations?.nodes;
    if (!Array.isArray(nodes)) return [];

    return nodes
      .filter((n: any) => n?.mediaRecommendation)
      .map((n: any) => {
        const m = n.mediaRecommendation;
        return {
          id: m.idMal || m.id,
          title: m.title?.romaji || m.title?.english || m.title?.native || 'Sem título',
          imageUrl: m.coverImage?.extraLarge || m.coverImage?.large || '',
          votesCount: m.averageScore || undefined,
        };
      });
  } catch (err) {
    console.warn('AniList recommendations falhou:', err);
    return [];
  }
}

/**
 * Base curada de plataformas de exibição no Brasil para franquias renomadas
 */
function getCuratedStreamingLinks(title: string): AnimeStreamingLink[] {
  const t = title.toLowerCase();
  const list: AnimeStreamingLink[] = [];

  if (t.includes('the one piece') || t === 'one piece (wit)') {
    list.push(
      { name: 'Netflix', url: 'https://www.netflix.com/title/81610818' }
    );
  } else if (t.includes('one piece')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GRMG8ZQZR/one-piece' },
      { name: 'Netflix', url: 'https://www.netflix.com/title/80107103' },
      { name: 'Max', url: 'https://www.max.com' }
    );
  } else if (t.includes('mushoku tensei') || t.includes('jobless reincarnation')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/G6VNDNV26/mushoku-tensei-jobless-reincarnation' }
    );
  } else if (t.includes('demon slayer') || t.includes('kimetsu no yaiba')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GY5P48XEY/demon-slayer-kimetsu-no-yaiba' },
      { name: 'Netflix', url: 'https://www.netflix.com/title/81091393' }
    );
  } else if (t.includes('jujutsu kaisen')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GRDV0019R/jujutsu-kaisen' },
      { name: 'Netflix', url: 'https://www.netflix.com' }
    );
  } else if (t.includes('bleach')) {
    list.push(
      { name: 'Disney+', url: 'https://www.disneyplus.com' }
    );
  } else if (t.includes('solo leveling')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GDKH4E5VE/solo-leveling' }
    );
  } else if (t.includes('dandadan')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GG5H5XQ26/dandadan' },
      { name: 'Netflix', url: 'https://www.netflix.com' }
    );
  } else if (t.includes('frieren')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GG5H5XQX4/frieren-beyond-journeys-end' }
    );
  } else if (t.includes('attack on titan') || t.includes('shingeki no kyojin')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GR751KNZY/attack-on-titan' }
    );
  } else if (t.includes('naruto')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GY8VM8MWY/naruto' },
      { name: 'Netflix', url: 'https://www.netflix.com' }
    );
  } else if (t.includes('spy x family')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/G4PH0WXVJ/spy-x-family' },
      { name: 'Netflix', url: 'https://www.netflix.com' }
    );
  } else if (t.includes('chainsaw man')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GVDHXJ9VM/chainsaw-man' }
    );
  } else if (t.includes('dragon ball')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com' },
      { name: 'Max', url: 'https://www.max.com' }
    );
  } else if (t.includes('hunter x hunter')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GY3VKX1MR/hunter-x-hunter' },
      { name: 'Netflix', url: 'https://www.netflix.com' }
    );
  } else if (t.includes('my hero academia') || t.includes('boku no hero')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/G6NQ5DWZ6/my-hero-academia' },
      { name: 'Netflix', url: 'https://www.netflix.com' }
    );
  } else if (t.includes('kusuriya') || t.includes('diários de uma apotecária') || t.includes('apothecary diaries')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/G3KHEVDJ7/the-apothecary-diaries' }
    );
  } else if (t.includes('re:zero') || t.includes('rezero')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GRGG9798R/rezero-starting-life-in-another-world-' }
    );
  } else if (t.includes('sakamoto days')) {
    list.push(
      { name: 'Netflix', url: 'https://www.netflix.com' }
    );
  } else if (t.includes('blue lock')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/G4PH0WEKE/blue-lock' }
    );
  } else if (t.includes('kaiju no') || t.includes('kaiju no. 8') || t.includes('kaiju no 8')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GG5H5XQ0D/kaiju-no-8' }
    );
  } else if (t.includes('shangri-la frontier')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/G79H23WEN/shangri-la-frontier' }
    );
  } else if (t.includes('wind breaker')) {
    list.push(
      { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/G79H23W0G/wind-breaker' }
    );
  } else if (t.includes('delicious in dungeon') || t.includes('dungeon meshi')) {
    list.push(
      { name: 'Netflix', url: 'https://www.netflix.com' }
    );
  } else if (t.includes('ranma 1/2') || t.includes('ranma')) {
    list.push(
      { name: 'Netflix', url: 'https://www.netflix.com' }
    );
  } else if (t.includes('tokyo revengers')) {
    list.push(
      { name: 'Disney+', url: 'https://www.disneyplus.com' }
    );
  } else if (t.includes('undead unluck')) {
    list.push(
      { name: 'Disney+', url: 'https://www.disneyplus.com' }
    );
  } else if (t.includes('death note')) {
    list.push(
      { name: 'Netflix', url: 'https://www.netflix.com' },
      { name: 'Max', url: 'https://www.max.com' }
    );
  }

  return list;
}

/**
 * Busca Personagens e Dubladores (Seiyuus) do Anime (Jikan API -> AniList GraphQL)
 */
export const getAnimeCharacters = async (malId: number, animeTitle?: string): Promise<AnimeCharacterItem[]> => {
  const cacheKey = `${malId || 'no_id'}_${animeTitle || ''}`;
  const cached = charactersCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 1. Tenta Jikan API v4
  if (malId) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/characters`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const list: AnimeCharacterItem[] = json.data.slice(0, 20).map((item: any) => {
            const jaVoiceActor = item.voice_actors?.find((va: any) => va.language === 'Japanese') || item.voice_actors?.[0];

            return {
              id: item.character?.mal_id || Math.random(),
              name: item.character?.name || 'Personagem',
              role: item.role || 'Supporting',
              imageUrl:
                item.character?.images?.webp?.image_url ||
                item.character?.images?.jpg?.image_url ||
                '',
              voiceActor: jaVoiceActor
                ? {
                    name: jaVoiceActor.person?.name || '',
                    language: jaVoiceActor.language || 'Japanese',
                    imageUrl: jaVoiceActor.person?.images?.jpg?.image_url || undefined,
                  }
                : undefined,
            };
          });

          charactersCache.set(cacheKey, { data: list, timestamp: Date.now() });
          return list;
        }
      }
    } catch (err) {
      console.warn(`Jikan characters falhou para ID ${malId}, tentando AniList...`, err);
    }
  }

  // 2. Fallback AniList GraphQL (Resiliente e sem rate limit)
  const anilistList = await fetchAniListCharacters(malId, animeTitle);
  if (anilistList.length > 0) {
    charactersCache.set(cacheKey, { data: anilistList, timestamp: Date.now() });
    return anilistList;
  }

  return [];
};

/**
 * Busca Aberturas (Openings) e Encerramentos (Endings) do Anime
 * Estratégia Complementar: Jikan Themes + Jikan Full + AnimeThemes.moe API (100% Gratuito)
 */
async function fetchAnimeThemesMoe(searchTitle: string): Promise<AnimeThemesResult> {
  try {
    const cleanTitle = searchTitle.trim();
    if (!cleanTitle) return { openings: [], endings: [] };
    const url = `https://api.animethemes.moe/anime?filter[name]=${encodeURIComponent(cleanTitle)}&include=animethemes.song.artists`;
    const res = await fetch(url);
    if (!res.ok) return { openings: [], endings: [] };
    const json = await res.json();
    const animeData = json.anime?.[0];
    if (!animeData || !Array.isArray(animeData.animethemes)) return { openings: [], endings: [] };

    const openings: string[] = [];
    const endings: string[] = [];

    animeData.animethemes.forEach((theme: any) => {
      const type = theme.type; // "OP" ou "ED"
      const sequence = theme.sequence ? ` ${theme.sequence}` : '';
      const songTitle = theme.song?.title || '';
      const artist = theme.song?.artists?.[0]?.name ? ` por ${theme.song.artists[0].name}` : '';
      const formatted = `${type}${sequence}: "${songTitle}"${artist}`.trim();

      if (type === 'OP' && songTitle) {
        openings.push(formatted);
      } else if (type === 'ED' && songTitle) {
        endings.push(formatted);
      }
    });

    return { openings, endings };
  } catch (err) {
    console.warn('AnimeThemes.moe fallback falhou:', err);
    return { openings: [], endings: [] };
  }
}

export const getAnimeThemes = async (malId: number, animeTitle?: string): Promise<AnimeThemesResult> => {
  const cacheKey = `${malId || 'no_id'}_${animeTitle || ''}`;
  const cached = themesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let finalOpenings: string[] = [];
  let finalEndings: string[] = [];

  // 1. Tenta Jikan API /themes
  if (malId) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/themes`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const openings = json.data?.openings || [];
        const endings = json.data?.endings || [];
        if (openings.length > 0) finalOpenings = openings;
        if (endings.length > 0) finalEndings = endings;
      }
    } catch (err) {
      console.warn(`Jikan themes endpoint falhou para ${malId}:`, err);
    }

    // 2. Se faltar abertura ou encerramento, tenta Jikan /full
    if (finalOpenings.length === 0 || finalEndings.length === 0) {
      try {
        const resFull = await fetch(`https://api.jikan.moe/v4/anime/${malId}/full`);
        if (resFull.ok) {
          const json = await resFull.json();
          const theme = json.data?.theme;
          if (finalOpenings.length === 0 && theme?.openings?.length > 0) {
            finalOpenings = theme.openings;
          }
          if (finalEndings.length === 0 && theme?.endings?.length > 0) {
            finalEndings = theme.endings;
          }
        }
      } catch (e) {
        console.warn('Jikan full themes fallback falhou:', e);
      }
    }
  }

  // 3. Se ainda faltar abertura ou encerramento, complementa com a API AnimeThemes.moe
  if ((finalOpenings.length === 0 || finalEndings.length === 0) && animeTitle) {
    const extraThemes = await fetchAnimeThemesMoe(animeTitle);
    if (finalOpenings.length === 0 && extraThemes.openings.length > 0) {
      finalOpenings = extraThemes.openings;
    }
    if (finalEndings.length === 0 && extraThemes.endings.length > 0) {
      finalEndings = extraThemes.endings;
    }
  }

  const result: AnimeThemesResult = {
    openings: finalOpenings,
    endings: finalEndings,
  };

  themesCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
};

/**
 * Busca Recomendações de animes semelhantes (Jikan API -> AniList GraphQL)
 */
export const getAnimeRecommendations = async (malId: number, animeTitle?: string): Promise<AnimeRecommendationItem[]> => {
  const cacheKey = `${malId || 'no_id'}_${animeTitle || ''}`;
  const cached = recsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 1. Tenta Jikan API
  if (malId) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/recommendations`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const list: AnimeRecommendationItem[] = json.data.slice(0, 10).map((item: any) => ({
            id: item.entry?.mal_id || Math.random(),
            title: item.entry?.title || 'Sem título',
            imageUrl:
              item.entry?.images?.webp?.large_image_url ||
              item.entry?.images?.jpg?.large_image_url ||
              item.entry?.images?.jpg?.image_url ||
              '',
            votesCount: item.votes || undefined,
          }));

          recsCache.set(cacheKey, { data: list, timestamp: Date.now() });
          return list;
        }
      }
    } catch (err) {
      console.warn(`Jikan recs falhou para ${malId}, tentando AniList...`, err);
    }
  }

  // 2. Fallback AniList GraphQL
  const anilistRecs = await fetchAniListRecommendations(malId, animeTitle);
  if (anilistRecs.length > 0) {
    recsCache.set(cacheKey, { data: anilistRecs, timestamp: Date.now() });
    return anilistRecs;
  }

  return [];
};

/**
 * Normaliza e filtra apenas serviços de streaming com catálogo oficial legal no Brasil.
 * YouTube é estritamente proibido aqui (fica apenas para trailers oficiais PVs).
 */
export function normalizeBrazilStreaming(rawName: string, url: string): AnimeStreamingLink | null {
  if (!rawName || !url) return null;
  const n = rawName.toLowerCase();
  const u = url.toLowerCase();

  // Exclui plataformas internacionais/asiáticas inacessíveis no Brasil E YouTube (YouTube é só para trailers!)
  if (
    n.includes('youtube') ||
    u.includes('youtube.com') ||
    u.includes('youtu.be') ||
    n.includes('bilibili') ||
    n.includes('iqiyi') ||
    n.includes('wetv') ||
    n.includes('hulu') ||
    n.includes('niconico') ||
    n.includes('abema') ||
    n.includes('d anime') ||
    n.includes('u-next') ||
    n.includes('tver') ||
    n.includes('funimation') ||
    u.includes('bilibili.tv') ||
    u.includes('iqiyi.com') ||
    u.includes('wetv.vip') ||
    u.includes('hulu.com')
  ) {
    return null;
  }

  if (n.includes('crunchyroll') || u.includes('crunchyroll.com')) {
    return { name: 'Crunchyroll', url };
  }
  if (n.includes('netflix') || u.includes('netflix.com')) {
    return { name: 'Netflix', url };
  }
  if (n.includes('prime') || n.includes('amazon') || u.includes('primevideo.com') || u.includes('amazon.com')) {
    return { name: 'Prime Video', url };
  }
  if (n.includes('disney') || n.includes('star+') || u.includes('disneyplus.com')) {
    return { name: 'Disney+', url };
  }
  if (n.includes('max') || n.includes('hbo') || u.includes('max.com') || u.includes('hbomax.com')) {
    return { name: 'Max', url };
  }
  if (n.includes('onegai') || u.includes('animeonegai.com')) {
    return { name: 'Anime Onegai', url };
  }

  return null;
}

export interface BrazilStreamingBadge {
  name: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
}

/**
 * Identifica imediatamente o serviço de streaming no Brasil para cards e listagens
 * (verifica links externos conhecidos e a base curada)
 */
export function detectBrazilStreaming(item: {
  title: string;
  title_japanese?: string;
  title_english?: string;
  externalLinks?: Array<{ site: string; url: string }>;
}): BrazilStreamingBadge | null {
  // 1. Verifica links externos diretos da API
  if (item.externalLinks && item.externalLinks.length > 0) {
    for (const link of item.externalLinks) {
      const site = link.site.toLowerCase();
      const url = link.url.toLowerCase();
      if (site.includes('youtube') || url.includes('youtube.com') || url.includes('youtu.be')) {
        continue; // NUNCA considerar YouTube como serviço de episódios
      }
      if (site.includes('crunchyroll') || url.includes('crunchyroll.com')) {
        return {
          name: 'Crunchyroll',
          badgeBg: 'bg-[#f47521]/90',
          badgeBorder: 'border-orange-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-orange-300',
        };
      }
      if (site.includes('netflix') || url.includes('netflix.com')) {
        return {
          name: 'Netflix',
          badgeBg: 'bg-[#e50914]/90',
          badgeBorder: 'border-red-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-red-300',
        };
      }
      if (site.includes('prime') || site.includes('amazon') || url.includes('primevideo.com') || url.includes('amazon.com')) {
        return {
          name: 'Prime Video',
          badgeBg: 'bg-[#00a8e1]/90',
          badgeBorder: 'border-sky-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-sky-300',
        };
      }
      if (site.includes('disney') || site.includes('star+') || url.includes('disneyplus.com')) {
        return {
          name: 'Disney+',
          badgeBg: 'bg-[#113ccf]/90',
          badgeBorder: 'border-blue-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-blue-300',
        };
      }
      if (site.includes('max') || site.includes('hbo') || url.includes('max.com') || url.includes('hbomax.com')) {
        return {
          name: 'Max',
          badgeBg: 'bg-purple-700/90',
          badgeBorder: 'border-purple-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-purple-300',
        };
      }
      if (site.includes('onegai') || url.includes('animeonegai.com')) {
        return {
          name: 'Anime Onegai',
          badgeBg: 'bg-pink-600/90',
          badgeBorder: 'border-pink-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-pink-300',
        };
      }
    }
  }

  // 2. Verifica base curada por título em português, inglês ou japonês
  const searchTitles = [item.title, item.title_english, item.title_japanese].filter(Boolean) as string[];
  for (const t of searchTitles) {
    const curated = getCuratedStreamingLinks(t);
    if (curated && curated.length > 0) {
      const first = curated[0];
      const n = first.name.toLowerCase();
      if (n.includes('crunchyroll')) {
        return {
          name: 'Crunchyroll',
          badgeBg: 'bg-[#f47521]/90',
          badgeBorder: 'border-orange-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-orange-300',
        };
      }
      if (n.includes('netflix')) {
        return {
          name: 'Netflix',
          badgeBg: 'bg-[#e50914]/90',
          badgeBorder: 'border-red-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-red-300',
        };
      }
      if (n.includes('prime') || n.includes('amazon')) {
        return {
          name: 'Prime Video',
          badgeBg: 'bg-[#00a8e1]/90',
          badgeBorder: 'border-sky-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-sky-300',
        };
      }
      if (n.includes('disney')) {
        return {
          name: 'Disney+',
          badgeBg: 'bg-[#113ccf]/90',
          badgeBorder: 'border-blue-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-blue-300',
        };
      }
      if (n.includes('max') || n.includes('hbo')) {
        return {
          name: 'Max',
          badgeBg: 'bg-purple-700/90',
          badgeBorder: 'border-purple-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-purple-300',
        };
      }
      if (n.includes('onegai')) {
        return {
          name: 'Anime Onegai',
          badgeBg: 'bg-pink-600/90',
          badgeBorder: 'border-pink-400/50',
          badgeText: 'text-white',
          dotColor: 'bg-pink-300',
        };
      }
    }
  }

  return null;
}

/**
 * Busca Plataformas de Streaming onde o anime está disponível no Brasil
 * (Jikan Streaming + Jikan External + AniList External + Base Curada Brasil)
 */
export const getAnimeStreamingLinks = async (malId: number, animeTitle?: string): Promise<AnimeStreamingLink[]> => {
  const cacheKey = `${malId || 'no_id'}_${animeTitle || ''}`;
  const cached = streamingCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const linkMap = new Map<string, AnimeStreamingLink>();

  // 1. Curadoria direta por título
  if (animeTitle) {
    const curated = getCuratedStreamingLinks(animeTitle);
    curated.forEach((l) => {
      const normalized = normalizeBrazilStreaming(l.name, l.url);
      if (normalized) linkMap.set(normalized.name, normalized);
    });
  }

  // 2. Tenta Jikan API /streaming e /external
  if (malId) {
    try {
      const [resStream, resExternal] = await Promise.allSettled([
        fetch(`https://api.jikan.moe/v4/anime/${malId}/streaming`),
        fetch(`https://api.jikan.moe/v4/anime/${malId}/external`),
      ]);

      if (resStream.status === 'fulfilled' && resStream.value.ok) {
        const json = await resStream.value.json();
        if (Array.isArray(json.data)) {
          json.data.forEach((item: any) => {
            if (item.name && item.url) {
              const normalized = normalizeBrazilStreaming(item.name, item.url);
              if (normalized && !linkMap.has(normalized.name)) {
                linkMap.set(normalized.name, normalized);
              }
            }
          });
        }
      }

      if (resExternal.status === 'fulfilled' && resExternal.value.ok) {
        const json = await resExternal.value.json();
        if (Array.isArray(json.data)) {
          json.data.forEach((item: any) => {
            if (item.name && item.url) {
              const normalized = normalizeBrazilStreaming(item.name, item.url);
              if (normalized && !linkMap.has(normalized.name)) {
                linkMap.set(normalized.name, normalized);
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn(`Jikan streaming links falhou para ${malId}:`, err);
    }
  }

  // 3. AniList GraphQL External & Streaming Links
  try {
    const anilistStreams = await fetchAniListStreamingLinks(malId, animeTitle);
    anilistStreams.forEach((l) => {
      const normalized = normalizeBrazilStreaming(l.name, l.url);
      if (normalized && !linkMap.has(normalized.name)) {
        linkMap.set(normalized.name, normalized);
      }
    });
  } catch (e) {
    console.warn('AniList streaming fetch falhou:', e);
  }

  const combined = Array.from(linkMap.values());
  if (combined.length > 0) {
    streamingCache.set(cacheKey, { data: combined, timestamp: Date.now() });
    return combined;
  }

  // Fallback padrão se não houver link específico: busca direta oficial no Crunchyroll e Netflix Brasil
  if (animeTitle) {
    const fallbackLinks: AnimeStreamingLink[] = [
      {
        name: 'Crunchyroll',
        url: `https://www.crunchyroll.com/pt-br/search?q=${encodeURIComponent(animeTitle)}`,
      },
      {
        name: 'Netflix',
        url: `https://www.netflix.com/search?q=${encodeURIComponent(animeTitle)}`,
      },
    ];
    return fallbackLinks;
  }

  return [];
};

export const getHighResImageUrl = (url?: string | null): string => {
  if (!url) return '';
  let clean = url.trim();
  // Se for imagem do CDN do MAL (ex: .../images/anime/123/456.jpg ou .large.jpg ou com t/v thumbnails)
  clean = clean.replace(/([0-9]+)[tv]\.(jpe?g|png|webp)/gi, '$1.$2');
  clean = clean.replace(/(\.large)\.jpg/gi, '.jpg');
  // Kitsu: converte miniaturas de baixa resolução em original HD
  clean = clean.replace(/\/(medium|small|tiny)\.(jpe?g|png|webp)/gi, '/original.$2');
  // Unsplash: melhora resolução
  if (clean.includes('images.unsplash.com') && clean.includes('w=')) {
    clean = clean.replace(/w=\d+/g, 'w=1600').replace(/q=\d+/g, 'q=90');
  }
  return clean;
};

/**
 * Busca a imagem de banner oficial HD do anime (AniList GraphQL -> Kitsu)
 */
export const getAnimeBanner = async (malId?: number | null, animeTitle?: string): Promise<string | null> => {
  if (!malId && !animeTitle) return null;
  try {
    const query = `
      query ($idMal: Int, $search: String) {
        Media(idMal: $idMal, search: $search, type: ANIME) {
          bannerImage
          relations {
            edges {
              relationType
              node {
                type
                bannerImage
              }
            }
          }
        }
      }
    `;
    const variables: Record<string, any> = {};
    if (malId && malId > 0) variables.idMal = malId;
    else if (animeTitle && animeTitle.trim().length >= 2) variables.search = animeTitle.trim();
    else return null;

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (res.ok) {
      const json = await res.json();
      const media = json?.data?.Media;
      if (media?.bannerImage) return media.bannerImage;
      // Herda de temporadas anteriores / prequel / parent / relations
      if (media?.relations?.edges) {
        for (const edge of media.relations.edges) {
          if (edge?.node?.type === 'ANIME' && edge?.node?.bannerImage) {
            return edge.node.bannerImage;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao buscar banner oficial:', e);
  }

  // Se for nova temporada ou continuação (ex: Black Clover, etc.), busca banner da série original/raiz
  if (animeTitle && animeTitle.length >= 3) {
    try {
      const cleanRoot = animeTitle
        .replace(/(\d+(st|nd|rd|th)\s+season|season\s+\d+|part\s+\d+|2nd|3rd|4th|final\s+season|the\s+movie|movie|\(.*?\)|\[.*?\])/gi, '')
        .trim();
      if (cleanRoot && cleanRoot.toLowerCase() !== animeTitle.toLowerCase()) {
        const rootRes = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            query: `query ($search: String) { Media(search: $search, type: ANIME, sort: POPULARITY_DESC) { bannerImage } }`,
            variables: { search: cleanRoot }
          }),
        });
        if (rootRes.ok) {
          const rootJson = await rootRes.json();
          if (rootJson?.data?.Media?.bannerImage) {
            return rootJson.data.Media.bannerImage;
          }
        }
      }
    } catch {}
  }

  return null;
};

/**
 * Busca múltiplos banners oficiais ESTRITAMENTE DA MESMA OBRA / FRANQUIA
 * Filtra para nunca carregar imagens de animes não relacionados, garantindo fidelidade absoluta.
 */
export const getAnimeBannersGallery = async (malId?: number | null, animeTitle?: string): Promise<string[]> => {
  if (!malId && !animeTitle) return [];
  const banners: string[] = [];
  try {
    const query = `
      query ($idMal: Int, $search: String) {
        Media(idMal: $idMal, search: $search, type: ANIME) {
          id
          bannerImage
          title {
            romaji
            english
          }
          relations {
            edges {
              relationType
              node {
                id
                type
                format
                title {
                  romaji
                  english
                }
                bannerImage
              }
            }
          }
        }
      }
    `;
    const variables: Record<string, any> = {};
    if (malId && malId > 0) variables.idMal = malId;
    else if (animeTitle && animeTitle.trim().length >= 2) variables.search = animeTitle.trim();
    else return [];

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (res.ok) {
      const json = await res.json();
      const media = json?.data?.Media;
      if (media?.bannerImage && !banners.includes(media.bannerImage)) {
        banners.push(media.bannerImage);
      }

      // Palavras-chave da obra para validação estrita da franquia (impede crossovers alheios como Cowboy Bebop)
      const baseTitleRomaji = (media?.title?.romaji || animeTitle || '').toLowerCase();
      const baseTitleEng = (media?.title?.english || '').toLowerCase();
      const titleKeywords = (baseTitleRomaji + ' ' + baseTitleEng)
        .replace(/[^a-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !['season', 'part', 'the', 'movie', 'ova', 'ona', 'final', '2nd', '3rd', '1st'].includes(w));

      const allowedRelations = ['SEQUEL', 'PREQUEL', 'PARENT', 'SIDE_STORY', 'SPIN_OFF', 'ALTERNATIVE'];

      if (Array.isArray(media?.relations?.edges)) {
        for (const edge of media.relations.edges) {
          const relType = edge?.relationType;
          const node = edge?.node;
          if (!node || node.type !== 'ANIME' || !node.bannerImage) continue;
          if (!allowedRelations.includes(relType)) continue;

          // Validação de mesma obra por título
          const relRomaji = (node.title?.romaji || '').toLowerCase();
          const relEng = (node.title?.english || '').toLowerCase();
          const relCombined = relRomaji + ' ' + relEng;

          // Deve conter pelo menos uma palavra-chave raiz da obra
          const matchesKeyword = titleKeywords.length === 0 || titleKeywords.some((kw) => relCombined.includes(kw));

          if (matchesKeyword && !banners.includes(node.bannerImage)) {
            banners.push(node.bannerImage);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao buscar galeria de banners oficial:', e);
  }
  return banners;
};


