/**
 * Serviço de Músicas, Temas de Abertura (OP) e Encerramento (ED) via AnimeThemes.moe API (100% Grátis)
 * Permite reproduzir prévias de áudio/vídeo oficiais das músicas lendárias de animes.
 */

export interface AnimeThemeMedia {
  id: string;
  themeType: 'OP' | 'ED';
  sequence: number; // ex: OP1, OP2, ED1
  songTitle: string;
  artistName: string;
  episodes?: string;
  videoUrl?: string;
  audioUrl?: string;
  resolution?: number; // 720, 1080
}

export async function fetchAnimeThemesMedia(animeTitle: string, malId?: number): Promise<AnimeThemeMedia[]> {
  if (!animeTitle && !malId) return [];

  try {
    let cleanTitle = animeTitle
      .replace(/:\s*season\s*\d+/gi, '')
      .replace(/\s*\d+(?:nd|rd|th|st)?\s*season/gi, '')
      .replace(/:\s*part\s*\d+/gi, '')
      .replace(/\s*temporada\s*\d+/gi, '')
      .trim();

    // Query para o endpoint oficial do AnimeThemes
    const url = `https://api.animethemes.moe/anime?filter[has]=resources&filter[name]=${encodeURIComponent(
      cleanTitle
    )}&include=animethemes.animethemeentries.videos,animethemes.song.artists&fields[anime]=name,slug&fields[animetheme]=type,sequence,slug&fields[song]=title&fields[artist]=name&fields[video]=link,resolution`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const json = await res.json();
    const animeList = json?.anime;
    if (!Array.isArray(animeList) || animeList.length === 0) return [];

    const animeObj = animeList[0];
    const themes = animeObj?.animethemes;
    if (!Array.isArray(themes) || themes.length === 0) return [];

    const results: AnimeThemeMedia[] = [];

    themes.forEach((th: any) => {
      const type = th.type === 'OP' ? 'OP' : 'ED';
      const sequence = th.sequence || 1;
      const songTitle = th.song?.title || `${type} ${sequence}`;
      const artistName = th.song?.artists?.[0]?.name || 'Artista Oficial';
      const entry = th.animethemeentries?.[0];
      const video = entry?.videos?.[0];

      results.push({
        id: `at_${th.slug || `${type}_${sequence}`}`,
        themeType: type,
        sequence,
        songTitle,
        artistName,
        episodes: entry?.episodes || undefined,
        videoUrl: video?.link || undefined,
        audioUrl: video?.audio?.link || undefined,
        resolution: video?.resolution || 720,
      });
    });

    return results;
  } catch (err) {
    console.warn('AnimeThemes API aviso:', err);
    return [];
  }
}
