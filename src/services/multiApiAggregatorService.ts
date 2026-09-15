/**
 * Serviço Agregador Multi-API (AniList + MyAnimeList/Jikan + Shikimori)
 * Orquestra as 3 APIs em cascata completa e redundante, garantindo que
 * nenhuma informação dependa de listas fixas e que falhas sejam contornadas em milissegundos.
 */

import type { ScheduleAnimeItem, AnimeCharacterItem, AnimeStreamingLink } from './jikanService';
import {
  getWeeklySchedule as fetchJikanOrAniListSchedule,
  getSeasonUpcomingAnimes as fetchJikanOrAniListUpcoming,
  getSeasonNowAnimes as fetchJikanOrAniListSeasonNow,
  getAnimeCharacters as fetchJikanOrAniListCharacters,
  getAnimeStreamingLinks as fetchJikanOrAniListStreaming,
  normalizeBrazilStreaming,
} from './jikanService';
import {
  fetchShikimoriSchedule,
  fetchShikimoriUpcoming,
  fetchShikimoriSeasonNow,
  fetchShikimoriCharacters,
  fetchShikimoriExternalLinks,
} from './shikimoriService';
import { reconcileScheduleLifecycle } from './scheduleLifecycleService';

const LOCAL_SEASON_NOW_KEY = 'wanime_season_now_v4';
const LOCAL_SEASON_UPCOMING_KEY = 'wanime_season_upcoming_v4';
const LOCAL_SCHEDULE_KEY_PREFIX = 'wanime_schedule_v4_';
const SCHEDULE_BACKGROUND_SYNC_TS = 'wanime_bg_schedule_sync_ts';

// Caches em memória para resposta instantânea
const multiScheduleCache = new Map<string, { data: ScheduleAnimeItem[]; timestamp: number }>();
const multiUpcomingCache = new Map<string, { data: ScheduleAnimeItem[]; timestamp: number }>();
const multiSeasonNowCache = new Map<string, { data: ScheduleAnimeItem[]; timestamp: number }>();
const multiCharCache = new Map<string, { data: AnimeCharacterItem[]; timestamp: number }>();
const multiStreamCache = new Map<string, { data: AnimeStreamingLink[]; timestamp: number }>();

const CACHE_TTL = 30 * 60 * 1000; // 30 minutos
const BG_SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutos para verificação silenciosa na inicialização

/**
 * 1. Calendário Semanal Agregado (AniList -> Jikan -> Shikimori)
 */
export async function getAggregatedWeeklySchedule(dayPt?: string): Promise<ScheduleAnimeItem[]> {
  const cacheKey = dayPt || 'all';
  const cached = multiScheduleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 1 & 2. Tenta AniList e Jikan
  let items: ScheduleAnimeItem[] = [];
  try {
    items = await fetchJikanOrAniListSchedule(dayPt);
  } catch (err) {
    console.warn('Falha em AniList/Jikan schedule, acionando Shikimori...', err);
  }

  // 3. Se retornar vazio, aciona a 3ª API (Shikimori Calendar)
  if (!items || items.length === 0) {
    try {
      const shikiItems = await fetchShikimoriSchedule();
      if (shikiItems.length > 0) {
        items = dayPt
          ? shikiItems.filter((a) => a.broadcastDay === dayPt || a.broadcastDay.startsWith(dayPt))
          : shikiItems;
      }
    } catch (e) {
      console.warn('Falha no fallback do Shikimori schedule:', e);
    }
  }

  if (items.length > 0) {
    multiScheduleCache.set(cacheKey, { data: items, timestamp: Date.now() });
  }
  return items;
}

/**
 * 2. Próxima Temporada e Futuros Agregados (AniList -> Jikan -> Shikimori)
 */
export async function getAggregatedUpcomingAnimes(): Promise<ScheduleAnimeItem[]> {
  const cacheKey = 'upcoming_all';
  const cached = multiUpcomingCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let items: ScheduleAnimeItem[] = [];
  try {
    items = await fetchJikanOrAniListUpcoming();
  } catch (err) {
    console.warn('Falha em AniList/Jikan upcoming, acionando Shikimori...', err);
  }

  // 3. Fallback no Shikimori se necessário
  if (!items || items.length === 0) {
    try {
      const shikiUpcoming = await fetchShikimoriUpcoming();
      if (shikiUpcoming.length > 0) {
        items = shikiUpcoming;
      }
    } catch (e) {
      console.warn('Falha no fallback Shikimori upcoming:', e);
    }
  }

  if (items.length > 0) {
    multiUpcomingCache.set(cacheKey, { data: items, timestamp: Date.now() });
  }
  return items;
}

/**
 * 3. Temporada Atual Agregada (AniList -> Jikan -> Shikimori)
 */
export async function getAggregatedSeasonNowAnimes(): Promise<ScheduleAnimeItem[]> {
  const cacheKey = 'season_now_all';
  const cached = multiSeasonNowCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let items: ScheduleAnimeItem[] = [];
  try {
    items = await fetchJikanOrAniListSeasonNow();
  } catch (err) {
    console.warn('Falha em AniList/Jikan season now, acionando Shikimori...', err);
  }

  if (!items || items.length === 0) {
    try {
      const shikiSeason = await fetchShikimoriSeasonNow();
      if (shikiSeason.length > 0) {
        items = shikiSeason;
      }
    } catch (e) {
      console.warn('Falha no fallback Shikimori season now:', e);
    }
  }

  if (items.length > 0) {
    multiSeasonNowCache.set(cacheKey, { data: items, timestamp: Date.now() });
  }
  return items;
}

/**
 * 4. Ciclo de Vida Completo da Agenda:
 * Executa as 3 APIs, reconcilia as transições automáticas e entrega dados 100% atualizados.
 */
export async function getAutomatedScheduleLifecycle(dayPt?: string): Promise<{
  activeWeekly: ScheduleAnimeItem[];
  activeUpcoming: ScheduleAnimeItem[];
}> {
  const [weekly, upcoming] = await Promise.all([
    getAggregatedWeeklySchedule(dayPt),
    getAggregatedUpcomingAnimes(),
  ]);

  const reconciled = reconcileScheduleLifecycle(weekly, upcoming);
  return {
    activeWeekly: reconciled.activeWeekly,
    activeUpcoming: reconciled.cleanUpcoming,
  };
}

/**
 * Evento disparado no window quando o ciclo em segundo plano descobre animes novos,
 * transições de estreia ou mudanças de data.
 */
export const SCHEDULE_UPDATED_EVENT = 'wanime_schedule_updated';

let isBgSyncRunning = false;

/**
 * Worker Silencioso de Inicialização da Agenda:
 * Disparado na inicialização do aplicativo em segundo plano.
 * - Varre as 3 APIs (AniList -> Jikan -> Shikimori).
 * - Identifica novas produções cadastradas pelas produtoras japonesas em Próxima Temporada.
 * - Migra animes que estrearam para a grade de Em Exibição na semana e horário brasileiro.
 * - Remove do calendário semanal animes que concluíram sua temporada.
 * - Salva nos armazenamentos locais persistentes para abertura imediata (0ms) na aba de Agenda.
 */
export async function runBackgroundScheduleSync(force = false): Promise<void> {
  if (isBgSyncRunning) return;
  if (typeof window === 'undefined') return;

  const lastSync = Number(localStorage.getItem(SCHEDULE_BACKGROUND_SYNC_TS) || '0');
  const now = Date.now();

  // Evita requisições repetidas se já foi sincronizado recentemente, exceto se forçado
  if (!force && now - lastSync < BG_SYNC_INTERVAL) {
    return;
  }

  isBgSyncRunning = true;
  try {
    // 1. Busca calendário semanal e próximas estreias via cascata multi-API
    const [weeklyRaw, upcomingRaw, seasonNowRaw] = await Promise.all([
      getAggregatedWeeklySchedule().catch(() => []),
      getAggregatedUpcomingAnimes().catch(() => []),
      getAggregatedSeasonNowAnimes().catch(() => []),
    ]);

    // 2. Reconciliação do ciclo de vida: promove estreias e remove finalizados
    const { activeWeekly, cleanUpcoming } = reconcileScheduleLifecycle(weeklyRaw, upcomingRaw);

    // 3. Atualiza cache em memória e persistente local
    if (activeWeekly.length > 0) {
      multiScheduleCache.set('all', { data: activeWeekly, timestamp: now });
      try {
        localStorage.setItem(`${LOCAL_SCHEDULE_KEY_PREFIX}all`, JSON.stringify({ data: activeWeekly, timestamp: now }));
        localStorage.setItem(`${LOCAL_SCHEDULE_KEY_PREFIX}all_ts`, String(now));
      } catch {}
    }

    if (cleanUpcoming.length > 0) {
      multiUpcomingCache.set('upcoming_all', { data: cleanUpcoming, timestamp: now });
      try {
        localStorage.setItem(LOCAL_SEASON_UPCOMING_KEY, JSON.stringify({ data: cleanUpcoming, timestamp: now }));
        localStorage.setItem(`${LOCAL_SEASON_UPCOMING_KEY}_ts`, String(now));
      } catch {}
    }

    if (seasonNowRaw.length > 0) {
      multiSeasonNowCache.set('season_now_all', { data: seasonNowRaw, timestamp: now });
      try {
        localStorage.setItem(LOCAL_SEASON_NOW_KEY, JSON.stringify({ data: seasonNowRaw, timestamp: now }));
        localStorage.setItem(`${LOCAL_SEASON_NOW_KEY}_ts`, String(now));
      } catch {}
    }

    // Grava timestamp da última sincronização bem-sucedida
    localStorage.setItem(SCHEDULE_BACKGROUND_SYNC_TS, String(now));

    // 4. Notifica componentes da aplicação sobre dados frescos
    try {
      window.dispatchEvent(new CustomEvent(SCHEDULE_UPDATED_EVENT, {
        detail: {
          weeklyCount: activeWeekly.length,
          upcomingCount: cleanUpcoming.length,
          seasonNowCount: seasonNowRaw.length,
          timestamp: now,
        }
      }));
    } catch {}
  } catch (err) {
    console.warn('Sincronização em background da Agenda falhou silenciosamente:', err);
  } finally {
    isBgSyncRunning = false;
  }
}

/**
 * 5. Personagens e Dubladores Agregados (Jikan -> AniList -> Shikimori)
 */
export async function getAggregatedCharacters(malId: number, animeTitle?: string): Promise<AnimeCharacterItem[]> {
  const cacheKey = `${malId || 0}_${animeTitle || ''}`;
  const cached = multiCharCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let chars: AnimeCharacterItem[] = [];
  try {
    chars = await fetchJikanOrAniListCharacters(malId, animeTitle);
  } catch (err) {
    console.warn('Falha ao buscar personagens em Jikan/AniList:', err);
  }

  // Se Jikan e AniList não entregarem e tivermos malId, consulta Shikimori
  if ((!chars || chars.length === 0) && malId) {
    try {
      const shikiChars = await fetchShikimoriCharacters(malId);
      if (shikiChars.length > 0) {
        chars = shikiChars;
      }
    } catch (e) {
      console.warn('Falha ao buscar personagens no Shikimori:', e);
    }
  }

  if (chars && chars.length > 0) {
    multiCharCache.set(cacheKey, { data: chars, timestamp: Date.now() });
  }
  return chars || [];
}

/**
 * 6. Plataformas de Streaming Oficiais no Brasil Agregadas (Jikan + AniList + Shikimori)
 */
export async function getAggregatedStreamingLinks(malId: number, animeTitle?: string): Promise<AnimeStreamingLink[]> {
  const cacheKey = `${malId || 0}_${animeTitle || ''}`;
  const cached = multiStreamCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const linkMap = new Map<string, AnimeStreamingLink>();

  // 1 & 2. Jikan e AniList
  try {
    const jikanLinks = await fetchJikanOrAniListStreaming(malId, animeTitle);
    jikanLinks.forEach((l) => {
      if (l.name && l.url && !linkMap.has(l.name)) {
        linkMap.set(l.name, l);
      }
    });
  } catch (e) {
    console.warn('Falha ao buscar streaming em Jikan/AniList:', e);
  }

  // 3. Shikimori External Links
  if (malId) {
    try {
      const shikiLinks = await fetchShikimoriExternalLinks(malId);
      shikiLinks.forEach((l) => {
        const norm = normalizeBrazilStreaming(l.site, l.url);
        if (norm && !linkMap.has(norm.name)) {
          linkMap.set(norm.name, norm);
        }
      });
    } catch (e) {
      console.warn('Falha ao buscar links no Shikimori:', e);
    }
  }

  const results = Array.from(linkMap.values());
  if (results.length > 0) {
    multiStreamCache.set(cacheKey, { data: results, timestamp: Date.now() });
  }
  return results;
}
