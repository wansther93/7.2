import type { Anime, AnimeFormData, AnimeStatus } from '../types';

export interface ImportResult {
  importedCount: number;
  totalParsed: number;
  errors: string[];
}

/**
 * Converte status do MyAnimeList para o formato WAnime List
 */
function mapMalStatus(statusStr?: string): AnimeStatus {
  if (!statusStr) return 'watching';
  const s = statusStr.toLowerCase().trim();
  if (s === 'watching' || s === 'currently watching' || s === '1') return 'watching';
  if (s === 'completed' || s === '2') return 'completed';
  if (s === 'on-hold' || s === 'on hold' || s === '3' || s === 'paused') return 'paused';
  if (s === 'dropped' || s === '4') return 'dropped';
  if (s === 'plan to watch' || s === 'plantowatch' || s === '6') return 'plan_to_watch';
  return 'watching';
}

/**
 * Converte status do AniList para o formato WAnime List
 */
function mapAniListStatus(statusStr?: string): AnimeStatus {
  if (!statusStr) return 'watching';
  const s = statusStr.toUpperCase().trim();
  if (s === 'CURRENT') return 'watching';
  if (s === 'COMPLETED') return 'completed';
  if (s === 'PAUSED') return 'paused';
  if (s === 'DROPPED') return 'dropped';
  if (s === 'PLANNING') return 'plan_to_watch';
  if (s === 'REPEATING') return 'watching';
  return 'watching';
}

/**
 * Faz parser de XML de exportação do MyAnimeList (MAL export format)
 */
export function parseMyAnimeListXml(xmlString: string): Partial<AnimeFormData>[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  const animeNodes = xmlDoc.getElementsByTagName('anime');
  const parsedList: Partial<AnimeFormData>[] = [];

  for (let i = 0; i < animeNodes.length; i++) {
    const node = animeNodes[i];
    const malId = Number(node.getElementsByTagName('series_animedb_id')[0]?.textContent) || undefined;
    const title = node.getElementsByTagName('series_title')[0]?.textContent || '';
    const totalEps = Number(node.getElementsByTagName('series_episodes')[0]?.textContent) || null;
    const currentEp = Number(node.getElementsByTagName('my_watched_episodes')[0]?.textContent) || 0;
    const statusText = node.getElementsByTagName('my_status')[0]?.textContent || '';
    const myScore = Number(node.getElementsByTagName('my_score')[0]?.textContent) || null;
    const myComments = node.getElementsByTagName('my_comments')[0]?.textContent || '';

    if (title.trim()) {
      parsedList.push({
        title: title.trim(),
        mal_id: malId,
        totalEpisodes: totalEps && totalEps > 0 ? totalEps : null,
        currentEpisode: currentEp,
        status: mapMalStatus(statusText),
        rating: myScore && myScore > 0 ? myScore : null,
        notes: myComments || '',
        season: 1,
        currentSeasonName: 'Temporada 1',
        seasons: [],
      });
    }
  }

  return parsedList;
}

/**
 * Faz parser de JSON de exportação do AniList
 */
export function parseAniListJson(jsonString: string): Partial<AnimeFormData>[] {
  const data = JSON.parse(jsonString);
  const parsedList: Partial<AnimeFormData>[] = [];

  // Formato AniList GraphQL Data Export ou listas
  const lists = data?.data?.MediaListCollection?.lists || data?.lists || (Array.isArray(data) ? [{ entries: data }] : []);

  for (const list of lists) {
    const entries = list.entries || [];
    for (const entry of entries) {
      const media = entry.media || {};
      const title = media.title?.romaji || media.title?.english || media.title?.native || entry.title || '';
      const malId = media.idMal || entry.idMal || undefined;
      const totalEps = media.episodes || entry.totalEpisodes || null;
      const currentEp = entry.progress || entry.currentEpisode || 0;
      const statusText = entry.status || list.name || '';
      const score = entry.score || entry.rating || null;
      const notes = entry.notes || '';
      const coverUrl = media.coverImage?.large || media.coverImage?.extraLarge || null;
      const genres = media.genres || [];

      if (title.trim()) {
        parsedList.push({
          title: title.trim(),
          japaneseTitle: media.title?.native || undefined,
          coverUrl: coverUrl,
          mal_id: malId,
          totalEpisodes: totalEps && totalEps > 0 ? totalEps : null,
          currentEpisode: currentEp,
          status: mapAniListStatus(statusText),
          rating: typeof score === 'number' && score > 0 ? Math.min(10, Math.round(score > 10 ? score / 10 : score)) : null,
          genres: genres,
          notes: notes,
          season: 1,
          currentSeasonName: 'Temporada 1',
          seasons: [],
        });
      }
    }
  }

  return parsedList;
}

/**
 * Gera arquivo XML no formato padrão MyAnimeList para exportação
 */
export function exportToMyAnimeListXml(animes: Anime[]): void {
  let xml = '<?xml version="1.0" encoding="UTF-8" ?>\n';
  xml += '<myanimelist>\n';
  xml += '  <myinfo>\n';
  xml += '    <user_export_type>1</user_export_type>\n';
  xml += '    <user_total_anime>' + animes.length + '</user_total_anime>\n';
  xml += '  </myinfo>\n';

  for (const anime of animes) {
    const statusMap: Record<AnimeStatus, string> = {
      watching: 'Watching',
      waiting_new_episodes: 'Watching',
      plan_to_watch: 'Plan to Watch',
      completed: 'Completed',
      paused: 'On-Hold',
      dropped: 'Dropped',
      cancelled: 'Dropped',
    };

    xml += '  <anime>\n';
    xml += `    <series_animedb_id>${anime.mal_id || 0}</series_animedb_id>\n`;
    xml += `    <series_title><![CDATA[${anime.title}]]></series_title>\n`;
    xml += `    <series_type>${anime.format || 'TV'}</series_type>\n`;
    xml += `    <series_episodes>${anime.totalEpisodes || 0}</series_episodes>\n`;
    xml += `    <my_watched_episodes>${anime.currentEpisode || 0}</my_watched_episodes>\n`;
    xml += `    <my_score>${anime.rating || 0}</my_score>\n`;
    xml += `    <my_status>${statusMap[anime.status] || 'Watching'}</my_status>\n`;
    xml += `    <my_comments><![CDATA[${anime.notes || ''}]]></my_comments>\n`;
    xml += `    <update_on_import>1</update_on_import>\n`;
    xml += '  </anime>\n';
  }

  xml += '</myanimelist>';

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `wanime-mal-export-${new Date().toISOString().split('T')[0]}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
