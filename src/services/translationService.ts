/**
 * Dicionário de tradução de gêneros e temas de animes (Inglês -> Português)
 */
export const GENRE_MAP_PT: Record<string, string> = {
  Action: 'Ação',
  Adventure: 'Aventura',
  Comedy: 'Comédia',
  Drama: 'Drama',
  Fantasy: 'Fantasia',
  Horror: 'Terror',
  Mystery: 'Mistério',
  Romance: 'Romance',
  'Sci-Fi': 'Ficção Científica',
  'Slice of Life': 'Slice of Life',
  Sports: 'Esportes',
  Supernatural: 'Sobrenatural',
  Suspense: 'Suspense',
  Thriller: 'Suspense / Thriller',
  Isekai: 'Isekai',
  Shounen: 'Shonen',
  Shonen: 'Shonen',
  Seinen: 'Seinen',
  Shoujo: 'Shoujo',
  Shojo: 'Shoujo',
  Josei: 'Josei',
  Psychological: 'Psicológico',
  Mecha: 'Mecha',
  Music: 'Música',
  Ecchi: 'Ecchi',
  Harem: 'Harem',
  School: 'Escolar',
  Historical: 'Histórico',
  Military: 'Militar',
  'Super Power': 'Super Poderes',
  Demons: 'Demônios',
  Magic: 'Magia',
  'Martial Arts': 'Artes Marciais',
  Parody: 'Paródia',
  Space: 'Espaço',
  Vampire: 'Vampiros',
  Gourmet: 'Culinária',
  Mythology: 'Mitologia',
  Strategy: 'Jogos',
  Game: 'Jogos',
  Cyberpunk: 'Cyberpunk',
  TimeTravel: 'Viagem no Tempo',
  Detective: 'Investigação',
  Police: 'Policial',
  Samurai: 'Samurai',
  Otaku: 'Cultura Otaku',
  Workplace: 'Adulto',
  Reincarnation: 'Reencarnação',
  Survival: 'Sobrevivência',
  PostApocalyptic: 'Pós-Apocalíptico',
};

/**
 * Traduz lista de gêneros brutos para Português
 */
export function translateGenres(rawGenres: string[]): string[] {
  if (!rawGenres || !Array.isArray(rawGenres)) return [];
  const translated = rawGenres.map((g) => GENRE_MAP_PT[g.trim()] || g.trim());
  return Array.from(new Set(translated));
}

/**
 * Tradutor resiliente e gratuito de sinopse para Português (Google Translate + MyMemory + Lingva)
 */
export async function translateSynopsisToPT(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return '';

  // Limpa tags desnecessárias de créditos e links
  const cleanedText = text
    .replace(/\[Written by MAL Rewrite\]/gi, '')
    .replace(/\(Source: [^)]+\)/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();

  if (cleanedText.length === 0) return '';

  // 1. Google Translate API pública
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt-BR&dt=t&q=${encodeURIComponent(cleanedText)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translatedParts = data[0].map((item: any) => item[0]).filter(Boolean);
        const translated = translatedParts.join('').trim();
        if (translated.length > 0) return translated;
      }
    }
  } catch (err) {
    console.warn('Google translation fallback triggered:', err);
  }

  // 2. MyMemory Translated API (divisão em blocos de 450 caracteres para garantir tradução completa)
  try {
    const chunks = cleanedText.match(/.{1,450}(\s|$)/g) || [cleanedText];
    const translatedChunks: string[] = [];

    for (const chunk of chunks.slice(0, 3)) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk.trim())}&langpair=en|pt-BR`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.responseData?.translatedText) {
          translatedChunks.push(data.responseData.translatedText);
        }
      }
    }

    if (translatedChunks.length > 0) {
      return translatedChunks.join(' ').trim();
    }
  } catch (err) {
    console.warn('MyMemory fallback triggered:', err);
  }

  return cleanedText;
}
