/**
 * Serviço de Busca Reversa de Cenas de Anime usando a API pública e gratuita trace.moe
 * Documentação: https://soruly.github.io/trace.moe-api/
 */

export interface TraceMoeMatch {
  anilistId: number;
  filename: string;
  episode: number | string | null;
  from: number; // segundos
  to: number; // segundos
  similarity: number; // 0.0 - 1.0 (ex: 0.96 = 96%)
  videoUrl: string;
  imageUrl: string;
  title?: {
    romaji?: string;
    english?: string;
    native?: string;
  };
}

export interface TraceMoeResponse {
  frameCount: number;
  error?: string;
  result: TraceMoeMatch[];
}

/**
 * Formata segundos em formato mm:ss
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Busca o anime a partir de um arquivo de imagem (File/Blob)
 */
export async function searchAnimeByImageFile(imageFile: Blob | File): Promise<TraceMoeMatch[]> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch('https://api.trace.moe/search?anilistInfo', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Erro na API trace.moe (${response.status}): ${errorText || 'Falha ao processar imagem'}`);
  }

  const data: TraceMoeResponse = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return (data.result || []).map((item: any) => ({
    anilistId: typeof item.anilist === 'object' ? item.anilist?.id : item.anilist,
    filename: item.filename || '',
    episode: item.episode ?? null,
    from: item.from || 0,
    to: item.to || 0,
    similarity: item.similarity || 0,
    videoUrl: item.video || '',
    imageUrl: item.image || '',
    title: typeof item.anilist === 'object' ? item.anilist?.title : undefined,
  }));
}

/**
 * Busca o anime a partir de uma URL de imagem pública
 */
export async function searchAnimeByImageUrl(imageUrl: string): Promise<TraceMoeMatch[]> {
  const url = `https://api.trace.moe/search?anilistInfo&url=${encodeURIComponent(imageUrl.trim())}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Erro na API trace.moe (${response.status}): ${errorText || 'Falha ao buscar URL'}`);
  }

  const data: TraceMoeResponse = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return (data.result || []).map((item: any) => ({
    anilistId: typeof item.anilist === 'object' ? item.anilist?.id : item.anilist,
    filename: item.filename || '',
    episode: item.episode ?? null,
    from: item.from || 0,
    to: item.to || 0,
    similarity: item.similarity || 0,
    videoUrl: item.video || '',
    imageUrl: item.image || '',
    title: typeof item.anilist === 'object' ? item.anilist?.title : undefined,
  }));
}
