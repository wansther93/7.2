import type { Anime } from '../types';

export interface AnimeNewsItem {
  id: string;
  title: string;
  titlePt?: string;
  excerpt: string;
  excerptPt?: string;
  contentHtml?: string;
  url: string;
  imageUrl?: string;
  date: string;
  formattedDate: string;
  authorName?: string;
  category?: string; // 'Nova Temporada', 'Trailer & Teaser', 'Filme', 'Data de Lançamento', 'Elenco & Produção', 'Música & Trilha', 'Geral'
  relatedAnimeTitle?: string; // Nome do anime do usuário associado à notícia (se houver)
  isUserAnime?: boolean; // Se a notícia é de um anime que o usuário tem na lista
  isOldNews?: boolean; // Flag indicando que é notícia antiga (> 45 dias) exibida como última notícia lançada
  source: 'AnimeNewsNetwork' | 'OtakuPT' | 'AnimeUnited' | 'ANMTV' | 'JBox' | 'Crunchyroll' | 'MyAnimeList' | 'AniList' | 'Portal';
}

// Termos estritos para filtrar e eliminar notícias puramente de games/consoles/tecnologia
const STRICT_EXCLUDE_GAME_PATTERNS = [
  'gameplay',
  'trailer de gameplay',
  'game pass',
  'playstation 5',
  'playstation 4',
  'playstation',
  'ps5',
  'ps4',
  'ps3',
  'ps plus',
  'xbox series',
  'xbox one',
  'xbox',
  'nintendo switch',
  'nintendo',
  'switch 2',
  'steam deck',
  'steam',
  'epic games store',
  'epic games',
  'dualsense',
  'pc e consoles',
  'para consoles',
  'todas as plataformas',
  'rpg para pc',
  'rpg de turno',
  'jogo de luta',
  'jogo de tiro',
  'jogabilidade',
  'dlc',
  'expansão',
  'expansao',
  'patch notes',
  'patch de atualização',
  'descarregar dados',
  'lançamento de jogo',
  'lançamento do jogo',
  'jogos do mês',
  'jogo grátis',
  'jogos grátis',
  'jogo gratuito',
  'jogos gratuitos',
  'demo disponível',
  'demo de',
  'versão demo',
  'remake do jogo',
  'remaster',
  'steam sale',
  // Franquias e estúdios de games que costumam poluir portais de animes
  'final fantasy',
  'monster hunter',
  'resident evil',
  'silent hill',
  'elden ring',
  'dark souls',
  'bloodborne',
  'sekiro',
  'dragon age',
  'assassin\'s creed',
  'assassins creed',
  'metaphor: refantazio',
  'metaphor refantazio',
  'persona 3 reload',
  'persona 5 tactica',
  'persona 5 royal',
  'tekken',
  'street fighter',
  'mortal kombat',
  'super mario',
  'mario kart',
  'zelda',
  'the legend of zelda',
  'square enix',
  'capcom',
  'ubisoft',
  'fromsoftware',
  'bandai namco entertainment',
  'konami',
  'bethesda',
  'blizzard',
  'electronic arts',
  'ea games',
  'ea sports',
  'fortnite',
  'league of legends',
  'valorant',
  'roblox',
  'minecraft',
  'call of duty',
  'warzone',
  'gta vi',
  'gta 6',
  'gta v',
  'grand theft auto',
  'genshin impact',
  'honkai star rail',
  'zenless zone zero',
  'pokemon go',
  'pokemon scarlet',
  'pokemon violet',
  'pokemon tcg',
  'placa de vídeo',
  'geforce',
  'rtx 40',
  'rtx 50',
  'smartphone gamer'
];

const ANIME_OVERRIDE_TERMS = [
  'adaptação em anime',
  'adaptacao em anime',
  'adaptação para anime',
  'adaptacao para anime',
  'série em anime',
  'serie em anime',
  'série de anime',
  'serie de anime',
  'filme em anime',
  'filme de anime',
  'ganha anime',
  'anunciado anime',
  'anime oficial',
  'anime confirmado',
  'estúdio de animação',
  'estudio de animacao',
  'anime estreia',
  'anime revela',
  'novo anime',
  'nova temporada do anime'
];

/**
 * Valida se o artigo é estritamente sobre animes, mangás, estúdios, filmes e produções animadas
 */
export function isStrictlyAnimeNews(title: string, excerpt: string): boolean {
  const combined = `${title} ${excerpt}`.toLowerCase();

  // Verifica se tem termos de games
  const hasGameTerm = STRICT_EXCLUDE_GAME_PATTERNS.some((pattern) => combined.includes(pattern));

  if (hasGameTerm) {
    // Só permite se for explicitamente uma notícia sobre adaptação ou série em anime
    const hasAnimeContext = ANIME_OVERRIDE_TERMS.some((term) => combined.includes(term));
    if (!hasAnimeContext) {
      return false;
    }
  }

  return true;
}

// LocalStorage cache keys (v3 limpa o cache anterior com notícias sem capa ou de games)
const LOCAL_NEWS_CACHE_KEY = 'wanime_news_feed_cache_v3';
const LOCAL_POSTER_CACHE_KEY = 'wanime_news_poster_cache_v2';
const CACHE_TTL = 1000 * 60 * 10; // 10 minutos para frescor sem lentidão

// Limpa caches legados para renovação limpa e sem imagens quebradas
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('wanime_news_feed_cache_v2');
    localStorage.removeItem('wanime_news_feed_cache_v1');
    localStorage.removeItem('wanime_news_poster_cache_v1');
  } catch {}
}

// In-memory cache de notícias inicializado a partir do localStorage para abertura instantânea (0ms)
let newsCache: { data: AnimeNewsItem[]; timestamp: number } | null = (() => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_NEWS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignora erro de parsing
  }
  return null;
})();

// Dicionário de posters em cache persistente
const getStoredPosterCache = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_POSTER_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

const savePosterToCache = (titleKey: string, url: string) => {
  if (typeof window === 'undefined' || !titleKey || !url) return;
  try {
    const current = getStoredPosterCache();
    current[titleKey.toLowerCase().trim()] = url;
    localStorage.setItem(LOCAL_POSTER_CACHE_KEY, JSON.stringify(current));
  } catch {}
};

// Dicionário curado de alta resolução para animes recorrentes em notícias
const KNOWN_ANIME_POSTERS: Record<string, string> = {
  'dark gathering': 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx152802-ENRcnqD5axhQ.jpg',
  'ranma': 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx210-qgahLDYT0t9b.png',
  'ranma 1/2': 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx210-qgahLDYT0t9b.png',
  'fate': 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx160751-mF7gT45qKkYq.jpg',
  'fate/extra': 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx160751-mF7gT45qKkYq.jpg',
  'giant ojosama': 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx178923-dJzZ9u.jpg',
  'dragon quest': 'https://cdn.myanimelist.net/images/anime/1912/107771l.jpg',
  'rhapsody in scarlet': 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg',
  'detective is already dead': 'https://cdn.myanimelist.net/images/anime/1090/115598l.jpg',
  'one piece': 'https://cdn.myanimelist.net/images/anime/6/73245l.jpg',
  'jujutsu kaisen': 'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',
  'chainsaw man': 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg',
  'bleach': 'https://cdn.myanimelist.net/images/anime/1908/135406l.jpg',
  'solo leveling': 'https://cdn.myanimelist.net/images/anime/1565/140026l.jpg',
  'demon slayer': 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
  'kimetsu no yaiba': 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
  'spy x family': 'https://cdn.myanimelist.net/images/anime/1441/122795l.jpg',
  'my hero academia': 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
  'boku no hero': 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
  're:zero': 'https://cdn.myanimelist.net/images/anime/1522/128086l.jpg',
  'frieren': 'https://cdn.myanimelist.net/images/anime/1015/138025l.jpg',
  'oshi no ko': 'https://cdn.myanimelist.net/images/anime/1813/138363l.jpg',
  'dandadan': 'https://cdn.myanimelist.net/images/anime/1483/141369l.jpg',
  'kusuriya no hitorigoto': 'https://cdn.myanimelist.net/images/anime/1708/138033l.jpg',
  'apotecária': 'https://cdn.myanimelist.net/images/anime/1708/138033l.jpg',
  'sakamoto days': 'https://cdn.myanimelist.net/images/anime/1376/143525l.jpg',
  'kaiju no. 8': 'https://cdn.myanimelist.net/images/anime/1170/141368l.jpg',
  'blue lock': 'https://cdn.myanimelist.net/images/anime/1258/126926l.jpg',
  'attack on titan': 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
  'shingeki no kyojin': 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
  'naruto': 'https://cdn.myanimelist.net/images/anime/13/17405l.jpg',
  'boruto': 'https://cdn.myanimelist.net/images/anime/13/17405l.jpg',
  'dragon ball': 'https://cdn.myanimelist.net/images/anime/1884/124944l.jpg',
  'overlord': 'https://cdn.myanimelist.net/images/anime/7/74609l.jpg',
  'slime': 'https://cdn.myanimelist.net/images/anime/1879/101479l.jpg',
  'tensei shitara': 'https://cdn.myanimelist.net/images/anime/1879/101479l.jpg',
  'sword art online': 'https://cdn.myanimelist.net/images/anime/11/39717l.jpg',
  'konosuba': 'https://cdn.myanimelist.net/images/anime/8/77831l.jpg',
  'mushoku tensei': 'https://cdn.myanimelist.net/images/anime/1530/117776l.jpg',
  'haikyuu': 'https://cdn.myanimelist.net/images/anime/7/76014l.jpg',
  'vinland saga': 'https://cdn.myanimelist.net/images/anime/1500/103005l.jpg',
  'tokyo revengers': 'https://cdn.myanimelist.net/images/anime/1830/118984l.jpg',
  'hunter x hunter': 'https://cdn.myanimelist.net/images/anime/1337/99013l.jpg',
  'gundam': 'https://cdn.myanimelist.net/images/anime/1155/125740l.jpg',
  'pokemon': 'https://cdn.myanimelist.net/images/anime/1826/135245l.jpg',
  'dr. stone': 'https://cdn.myanimelist.net/images/anime/1613/102576l.jpg',
  'fire force': 'https://cdn.myanimelist.net/images/anime/1647/101478l.jpg',
  'jigokuraku': 'https://cdn.myanimelist.net/images/anime/1344/133649l.jpg',
  'mashle': 'https://cdn.myanimelist.net/images/anime/1128/133648l.jpg',
  'wind breaker': 'https://cdn.myanimelist.net/images/anime/1880/141367l.jpg',
  'shangri-la frontier': 'https://cdn.myanimelist.net/images/anime/1487/137682l.jpg',
};

// Dicionário de categorização inteligente de notícias
const KEYWORD_CATEGORIES: { keywords: string[]; category: string }[] = [
  { keywords: ['season', '2nd season', '3rd season', '4th season', 'sequel', 'continuação', 'temporada', '2ª temporada', '3ª temporada', 'nova temporada'], category: 'Nova Temporada' },
  { keywords: ['trailer', 'pv', 'teaser', 'preview', 'vídeo promocional', 'video', 'vídeo', 'comercial'], category: 'Trailer & Teaser' },
  { keywords: ['movie', 'film', 'filme', 'cinema', 'theatrical', 'longa-metragem'], category: 'Filme' },
  { keywords: ['cast', 'staff', 'voice', 'seiyuu', 'elenco', 'dublador', 'estúdio', 'studio', 'diretor', 'director', 'autor'], category: 'Elenco & Produção' },
  { keywords: ['release', 'premiere', 'broadcast', 'data de estreia', 'debut', 'airs', 'estréia', 'estreia', 'data de lançamento', 'quando estreia'], category: 'Data de Lançamento' },
  { keywords: ['opening', 'ending', 'theme song', 'ost', 'música', 'abertura', 'encerramento', 'cantor', 'banda', 'trilha'], category: 'Música & Trilha' },
  { keywords: ['delay', 'postponed', 'adiado', 'hiatus', 'pausa', 'cancelado'], category: 'Avisos & Alertas' },
  { keywords: ['manga', 'mangá', 'light novel', 'adaptation', 'adaptação', 'quadrinho'], category: 'Adaptação & Mangá' },
];

/**
 * Traduz termos recorrentes de títulos em inglês para português brasileiro natural
 */
function translateNewsTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let title = rawTitle;
  title = title.replace(/\bAnnounces\b/gi, 'Anuncia');
  title = title.replace(/\bAnnounced\b/gi, 'Anunciado');
  title = title.replace(/\bReveals\b/gi, 'Revela');
  title = title.replace(/\bRevealed\b/gi, 'Revelado');
  title = title.replace(/\bRelease Date\b/gi, 'Data de Estreia');
  title = title.replace(/\bTeaser Visual\b/gi, 'Visual Promocional');
  title = title.replace(/\bMain Visual\b/gi, 'Pôster Oficial');
  title = title.replace(/\bKey Visual\b/gi, 'Pôster Visual');
  title = title.replace(/\bNew Trailer\b/gi, 'Novo Trailer');
  title = title.replace(/\bTrailer Streamed\b/gi, 'Trailer Oficial Divulgado');
  title = title.replace(/\bGets TV Anime\b/gi, 'Ganha Adaptação em Anime');
  title = title.replace(/\bGets Anime\b/gi, 'Ganha Anime');
  title = title.replace(/\bPremieres on\b/gi, 'Estreia em');
  title = title.replace(/\bPremieres in\b/gi, 'Estreia em');
  title = title.replace(/\bDelayed to\b/gi, 'Adiado para');
  title = title.replace(/\bNew Cast Member\b/gi, 'Novo Membro do Elenco');
  title = title.replace(/\bTheme Song\b/gi, 'Música Tema');
  title = title.replace(/\bUnveils\b/gi, 'Apresenta');
  title = title.replace(/\bBroadcast\b/gi, 'Transmissão');
  title = title.replace(/\bFinal Season\b/gi, 'Temporada Final');
  title = title.replace(/\bPart\s*(\d+)\b/gi, 'Parte $1');
  title = title.replace(/\bMovie\b/gi, 'Filme');
  title = title.replace(/\bConfirmed for\b/gi, 'Confirmado para');
  title = title.replace(/\bIn Production\b/gi, 'Em Produção');
  title = title.replace(/\bPostponed\b/gi, 'Adiado');
  title = title.replace(/\bNew Season\b/gi, 'Nova Temporada');
  title = title.replace(/\bStaff & Cast\b/gi, 'Equipe & Elenco');
  title = title.replace(/\bCast Members\b/gi, 'Membros do Elenco');
  title = title.replace(/\bOpening Theme\b/gi, 'Tema de Abertura');
  title = title.replace(/\bEnding Theme\b/gi, 'Tema de Encerramento');
  title = title.replace(/\bCrunchyroll to Stream\b/gi, 'Crunchyroll Transmitirá');
  title = title.replace(/\bNetflix to Stream\b/gi, 'Netflix Transmitirá');
  title = title.replace(/\bStreams on\b/gi, 'Disponível em');
  title = title.replace(/\bSpecial Video\b/gi, 'Vídeo Especial');
  title = title.replace(/\bPromo Video\b/gi, 'Vídeo Promocional');
  title = title.replace(/\bVisual Unveiled\b/gi, 'Visual Revelado');
  return title;
}

/**
 * Traduz e limpa trechos/resumos em inglês para português
 */
function translateNewsExcerpt(rawExcerpt: string): string {
  if (!rawExcerpt) return '';
  let text = rawExcerpt;
  text = text.replace(/\bThe official website for\b/gi, 'O site oficial de');
  text = text.replace(/\bThe television anime\b/gi, 'O anime para TV');
  text = text.replace(/\bannounced on\b/gi, 'anunciou no');
  text = text.replace(/\breveled that\b/gi, 'revelou que');
  text = text.replace(/\brevealed that\b/gi, 'revelou que');
  text = text.replace(/\bwill premiere in\b/gi, 'estreará em');
  text = text.replace(/\bwill premiere on\b/gi, 'estreará em');
  text = text.replace(/\bwill stream on\b/gi, 'será transmitido na');
  text = text.replace(/\bnew promotional video\b/gi, 'novo vídeo promocional');
  text = text.replace(/\bteaser visual\b/gi, 'visual promocional');
  text = text.replace(/\bkey visual\b/gi, 'pôster visual');
  return text;
}

function cleanHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectCategory(title: string, excerpt: string): string {
  const combined = `${title} ${excerpt}`.toLowerCase();
  for (const entry of KEYWORD_CATEGORIES) {
    if (entry.keywords.some((kw) => combined.includes(kw))) {
      return entry.category;
    }
  }
  return 'Geral';
}

function formatNewsDate(rawDateString: string): string {
  try {
    const date = new Date(rawDateString);
    if (isNaN(date.getTime())) return 'Hoje';
    
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 5) return 'Agora pouco';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours === 1) return 'Há 1 hora';
    if (diffHours < 24) return `Há ${diffHours} horas`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays <= 7) return `Há ${diffDays} dias`;

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return 'Hoje';
  }
}

export function formatNewsFullDate(rawDateString: string): string {
  try {
    const date = new Date(rawDateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function sanitizeImageUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl) return undefined;
  let url = rawUrl.trim();
  if (!url || url.length < 4) return undefined;

  // Corrige links relativos (como /thumbnails/max500x500/cms/news.6/... do AnimeNewsNetwork)
  if (url.startsWith('/') && !url.startsWith('//')) {
    url = `https://www.animenewsnetwork.com${url}`;
  }

  // Corrige links protocol-relative como //cdn.site.com/image.jpg
  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  // Força HTTPS para evitar bloqueios de conteúdo misto no mobile
  if (url.startsWith('http://')) {
    url = url.replace(/^http:\/\//i, 'https://');
  }

  // Remove caracteres HTML escapados acidentalmente
  url = url.replace(/&amp;/g, '&');

  // Ignora links inválidos de data: ou beacons de tracking
  if (url.startsWith('data:') || url.includes('1x1') || url.includes('pixel.gif') || url.includes('gravatar.com')) {
    return undefined;
  }

  return url;
}

/**
 * Extrai URLs de imagens de modo resiliente de itens RSS em XML e tags HTML
 */
function extractImageFromXmlItem(item: Element, descText: string): string | undefined {
  // 1. Enclosure padrão (comum em WordPress, JBox, OtakuPT)
  const enclosure = item.querySelector('enclosure');
  if (enclosure) {
    const encUrl = enclosure.getAttribute('url');
    if (encUrl) {
      const sanitized = sanitizeImageUrl(encUrl);
      if (sanitized) return sanitized;
    }
  }

  // 2. Namespace media:content e media:thumbnail
  const mediaTags = ['media:content', 'media:thumbnail', 'thumbnail', 'content'];
  for (const tag of mediaTags) {
    const el = item.getElementsByTagName(tag)[0] || item.getElementsByTagNameNS('*', tag.replace('media:', ''))[0];
    if (el) {
      const u = el.getAttribute('url') || el.getAttribute('src');
      if (u) {
        const sanitized = sanitizeImageUrl(u);
        if (sanitized) return sanitized;
      }
    }
  }

  // 3. iTunes image ou tags de imagem padrão
  const itunesImg = item.getElementsByTagName('itunes:image')[0] || item.getElementsByTagNameNS('*', 'image')[0];
  if (itunesImg) {
    const u = itunesImg.getAttribute('href') || itunesImg.getAttribute('url');
    if (u) {
      const sanitized = sanitizeImageUrl(u);
      if (sanitized) return sanitized;
    }
  }

  // 4. Busca tag <img> dentro de content:encoded ou encoded
  const encodedContent =
    item.getElementsByTagName('content:encoded')[0]?.textContent ||
    item.getElementsByTagNameNS('*', 'encoded')[0]?.textContent ||
    item.querySelector('encoded, content')?.textContent || '';

  if (encodedContent) {
    const match = encodedContent.match(/<img[^>]+(?:src|data-orig-file|data-lazy-src)=["']([^"']+)["']/i);
    if (match && match[1]) {
      const sanitized = sanitizeImageUrl(match[1]);
      if (sanitized) return sanitized;
    }
  }

  // 5. Fallback para tag <img> dentro da description
  if (descText && descText.includes('<img')) {
    const match = descText.match(/<img[^>]+(?:src|data-orig-file|data-lazy-src)=["']([^"']+)["']/i);
    if (match && match[1]) {
      const sanitized = sanitizeImageUrl(match[1]);
      if (sanitized) return sanitized;
    }
  }

  return undefined;
}

/**
 * Multi-Proxy Resiliente para RSS Feeds (Cadeia de contingência com fallback automático)
 */
async function fetchXmlWithProxyFallback(url: string): Promise<string | null> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    url // Direct fetch se CORS permitir
  ];

  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const text = await res.text();
        if (text && (text.includes('<rss') || text.includes('<feed') || text.includes('<channel'))) {
          return text;
        }
      }
    } catch {
      // Tenta o próximo proxy
    }
  }

  return null;
}

/**
 * 1. Fetch de RSS Feed Multi-Provedor com Parser Nativo de XML + Fallback rss2json
 */
async function fetchRssFeed(
  rssUrl: string,
  sourceName: 'OtakuPT' | 'AnimeUnited' | 'ANMTV' | 'AnimeNewsNetwork' | 'JBox' | 'Crunchyroll'
): Promise<AnimeNewsItem[]> {
  // Tentativa A: Multi-Proxy XML Parser
  try {
    const xmlText = await fetchXmlWithProxyFallback(rssUrl);
    if (xmlText && typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item, entry'));

      if (items.length > 0) {
        return items.slice(0, 15).map((item) => {
          const title = item.querySelector('title')?.textContent || 'Novidade de Anime';
          const cleanTitle = cleanHtml(title);
          const desc = item.querySelector('description, summary, content')?.textContent || '';
          const cleanExcerpt = cleanHtml(desc).slice(0, 260);
          const link = item.querySelector('link')?.textContent || item.querySelector('link')?.getAttribute('href') || '#';
          
          const img = extractImageFromXmlItem(item, desc);

          const pubDate = item.querySelector('pubDate, published, updated')?.textContent || new Date().toISOString();
          const category = detectCategory(cleanTitle, cleanExcerpt);
          const isForeign = sourceName === 'AnimeNewsNetwork';
          const titlePt = isForeign ? translateNewsTitle(cleanTitle) : cleanTitle;
          const excerptPt = isForeign ? translateNewsExcerpt(cleanExcerpt) : cleanExcerpt;

          return {
            id: `rss_${sourceName.toLowerCase()}_${Math.random().toString(36).substring(2, 9)}`,
            title: cleanTitle,
            titlePt,
            excerpt: cleanExcerpt,
            excerptPt,
            url: link,
            imageUrl: img,
            date: new Date(pubDate).toISOString(),
            formattedDate: formatNewsDate(pubDate),
            authorName: item.querySelector('creator, author')?.textContent || `Redação ${sourceName}`,
            category,
            source: sourceName,
          };
        }).filter((n) => isStrictlyAnimeNews(n.title, n.excerpt));
      }
    }
  } catch {
    // Continua para rss2json
  }

  // Tentativa B: rss2json API
  try {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.items)) {
        return json.items.slice(0, 15).map((item: any) => {
          const cleanTitle = cleanHtml(item.title || 'Novidade de Anime');
          const cleanExcerpt = cleanHtml(item.description || item.content || '').slice(0, 240);
          const isForeign = sourceName === 'AnimeNewsNetwork';
          const titlePt = isForeign ? translateNewsTitle(cleanTitle) : cleanTitle;
          const excerptPt = isForeign ? translateNewsExcerpt(cleanExcerpt) : cleanExcerpt;
          const category = detectCategory(cleanTitle, cleanExcerpt);
          
          let img = item.thumbnail || item.enclosure?.link || item.enclosure?.url;
          if (!img && item.description && item.description.includes('<img')) {
            const match = item.description.match(/<img[^>]+(?:src|data-orig-file|data-lazy-src)=["']([^"']+)["']/i);
            if (match && match[1]) img = match[1];
          }
          if (!img && item.content && item.content.includes('<img')) {
            const match = item.content.match(/<img[^>]+(?:src|data-orig-file|data-lazy-src)=["']([^"']+)["']/i);
            if (match && match[1]) img = match[1];
          }

          const sanitizedImg = sanitizeImageUrl(img);
          const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

          return {
            id: `rss_${sourceName.toLowerCase()}_${item.guid || item.link || Math.random().toString(36).substring(2, 9)}`,
            title: cleanTitle,
            titlePt,
            excerpt: cleanExcerpt,
            excerptPt,
            url: item.link || '#',
            imageUrl: sanitizedImg,
            date: pubDate,
            formattedDate: formatNewsDate(pubDate),
            authorName: item.author ? cleanHtml(item.author) : `Redação ${sourceName}`,
            category,
            source: sourceName,
          };
        }).filter((item: AnimeNewsItem) => isStrictlyAnimeNews(item.title, item.excerpt));
      }
    }
  } catch {
    // Falha silenciosa
  }

  return [];
}

/**
 * Extrai o provável nome do anime a partir do título da notícia para buscar o pôster correto
 */
export function extractAnimeNameFromNewsTitle(rawTitle: string): string {
  let t = (rawTitle || '').trim();
  // Remove prefixos editoriais comuns
  t = t.replace(/^(review|column|interview|feature|announcement|report|news|exclusive):\s*/i, '');
  
  // Tenta encontrar animes citados entre aspas ou antes de verbos-chave
  const quotedMatch = t.match(/['"“]([^'"”]{3,40})['"”]/);
  if (quotedMatch && quotedMatch[1]) {
    return quotedMatch[1].trim();
  }

  const patterns = [
    /^(.*?)(?:\s+(?:tv\s+)?anime(?:'s)?|\s+season\s+\d+|\s+movie|\s+film|\s+gets\s+|\s+reveals|\s+announces|\s+premieres|\s+delayed|\s+teaser|\s+trailer|\s+game|\s+manga|\s+video)/i,
    /^(.*?)(?:'s\s+(?:teaser|trailer|cast|staff|promo|video|season|release|author|director))/i,
    /^([A-Za-z0-9\s:!?-]{3,35})/
  ];

  for (const p of patterns) {
    const m = t.match(p);
    if (m && m[1] && m[1].trim().length >= 3) {
      return m[1].trim();
    }
  }

  return t.slice(0, 30).trim();
}

/**
 * Resolve o poster para notícias (especialmente AnimeNewsNetwork)
 */
export async function resolveNewsPosterImage(title: string, userAnimes: Anime[] = []): Promise<string | undefined> {
  const candidateName = extractAnimeNameFromNewsTitle(title).toLowerCase();
  
  // 1. Dicionário curado de posters conhecidos
  for (const [key, url] of Object.entries(KNOWN_ANIME_POSTERS)) {
    if (candidateName.includes(key) || key.includes(candidateName)) {
      return url;
    }
  }

  // 2. Cache persistente em LocalStorage
  const stored = getStoredPosterCache();
  if (stored[candidateName]) {
    return stored[candidateName];
  }

  // 3. Verifica se o usuário tem esse anime na sua lista
  for (const a of userAnimes) {
    const aTitle = a.title.toLowerCase();
    if (a.coverUrl && (aTitle.includes(candidateName) || candidateName.includes(aTitle))) {
      return a.coverUrl;
    }
  }

  // 4. Consulta rápida à API GraphQL aberta do AniList (resiliente com timeout curto)
  try {
    const cleanSearch = candidateName.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    if (cleanSearch.length >= 3) {
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query ($search: String) { Media (search: $search, type: ANIME) { coverImage { large medium } } }`,
          variables: { search: cleanSearch.slice(0, 30) }
        }),
        signal: controller.signal
      });
      clearTimeout(tId);
      if (res.ok) {
        const json = await res.json();
        const posterUrl = json?.data?.Media?.coverImage?.large || json?.data?.Media?.coverImage?.medium;
        if (posterUrl) {
          savePosterToCache(candidateName, posterUrl);
          return posterUrl;
        }
      }
    }
  } catch {
    // Falha silenciosa
  }

  return undefined;
}

/**
 * 2. Fetch de notícias dinâmicas do Jikan API (Top Airing + Notícias Oficiais MAL)
 */
async function fetchJikanNews(): Promise<AnimeNewsItem[]> {
  try {
    const popularAiringIds = [21, 54857, 54595, 53446, 52991, 40748];
    const pickedId = popularAiringIds[Math.floor(Math.random() * popularAiringIds.length)];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://api.jikan.moe/v4/anime/${pickedId}/news`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json.data)) return [];

    return json.data.slice(0, 3).map((item: any) => {
      const rawTitle = cleanHtml(item.title || 'Notícia de Anime');
      const rawExcerpt = cleanHtml(item.excerpt || item.intro || '');
      const titlePt = translateNewsTitle(rawTitle);
      const category = detectCategory(rawTitle, rawExcerpt);
      const dateStr = item.date || new Date().toISOString();

      return {
        id: `mal_news_${item.mal_id || Math.random().toString(36).substring(2, 9)}`,
        title: rawTitle,
        titlePt,
        excerpt: rawExcerpt,
        excerptPt: rawExcerpt,
        url: item.url || `https://myanimelist.net/news/${item.mal_id}`,
        imageUrl: item.images?.jpg?.image_url || undefined,
        date: dateStr,
        formattedDate: formatNewsDate(dateStr),
        authorName: item.author_username || 'MyAnimeList News',
        category,
        source: 'MyAnimeList' as const,
      };
    });
  } catch {
    return [];
  }
}

export const GUARANTEED_ANIME_ARTWORKS = [
  'https://cdn.myanimelist.net/images/anime/1792/138022l.jpg', // Frieren
  'https://cdn.myanimelist.net/images/anime/1844/141706l.jpg', // Demon Slayer
  'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg', // Jujutsu Kaisen
  'https://cdn.myanimelist.net/images/anime/1286/141594l.jpg', // Bleach TYBW
  'https://cdn.myanimelist.net/images/anime/6/73245l.jpg',    // Attack on Titan
  'https://cdn.myanimelist.net/images/anime/1066/143521l.jpg', // Solo Leveling
  'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg', // Chainsaw Man
  'https://cdn.myanimelist.net/images/anime/1708/138033l.jpg', // Spy x Family
  'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg', // Oshi no Ko
  'https://cdn.myanimelist.net/images/anime/1935/127974l.jpg', // Vinland Saga
  'https://cdn.myanimelist.net/images/anime/1208/94745l.jpg',  // My Hero Academia
  'https://cdn.myanimelist.net/images/anime/1000/110531l.jpg', // Haikyuu!!
];

/**
 * Busca de Notícias com Multi-Provedores em Português e Global (OtakuPT, AnimeUnited, ANMTV, JBox, ANN, MAL News)
 * 100% Feeds Reais, estritamente filtradas sem games, ordenadas por data e limitadas a 35-40 itens
 */
export async function getAggregatedAnimeNews(userAnimes: Anime[] = []): Promise<AnimeNewsItem[]> {
  const now = Date.now();
  if (newsCache && now - newsCache.timestamp < CACHE_TTL && newsCache.data.length > 0) {
    return tagUserAnimesInNews(newsCache.data, userAnimes);
  }

  const [otakuPt, animeUnited, anmtv, jbox, ann, malNews] = await Promise.allSettled([
    fetchRssFeed('https://www.otakupt.com/feed/', 'OtakuPT'),
    fetchRssFeed('https://www.animeunited.com.br/feed/', 'AnimeUnited'),
    fetchRssFeed('https://anmtv.com.br/feed/', 'ANMTV'),
    fetchRssFeed('https://www.jbox.com.br/feed/', 'JBox'),
    fetchRssFeed('https://www.animenewsnetwork.com/all/rss.xml?ann-edition=w', 'AnimeNewsNetwork'),
    fetchJikanNews(),
  ]);

  const allItems: AnimeNewsItem[] = [];

  const addIfFulfilled = (res: PromiseSettledResult<AnimeNewsItem[]>) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      allItems.push(...res.value);
    }
  };

  addIfFulfilled(otakuPt);
  addIfFulfilled(animeUnited);
  addIfFulfilled(anmtv);
  addIfFulfilled(jbox);
  addIfFulfilled(ann);
  addIfFulfilled(malNews);

  // Filtro estrito para garantir que não haja notícias puramente de games
  const strictlyAnimeItems = allItems.filter((item) => isStrictlyAnimeNews(item.title, item.excerpt));

  // Deduplicação inteligente de títulos similares
  const seenTitles = new Set<string>();
  const uniqueItems: AnimeNewsItem[] = [];

  for (const item of strictlyAnimeItems) {
    const norm = (item.titlePt || item.title).toLowerCase().replace(/[^\w\s]/g, '').slice(0, 35);
    if (!seenTitles.has(norm)) {
      seenTitles.add(norm);
      uniqueItems.push(item);
    }
  }

  // Ordenação cronológica estrita (mais recentes primeiro)
  uniqueItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Limita estritamente a 35-40 notícias (definido em 38)
  const topRecentItems = uniqueItems.slice(0, 38);

  // Enriquece itens sem imagem com poster identificado ou artwork de qualidade
  const enrichedItems = await Promise.all(
    topRecentItems.map(async (item, idx) => {
      let finalImg = item.imageUrl;
      if (!finalImg) {
        finalImg = await resolveNewsPosterImage(item.title, userAnimes);
      }
      if (!finalImg) {
        // Fallback determinístico garantido baseado no índice
        finalImg = GUARANTEED_ANIME_ARTWORKS[idx % GUARANTEED_ANIME_ARTWORKS.length];
      }

      return {
        ...item,
        imageUrl: finalImg,
        titlePt: item.titlePt || item.title,
        excerptPt: item.excerptPt || item.excerpt,
      };
    })
  );

  // Salva no cache de memória e no LocalStorage para carregamento em 0ms
  newsCache = {
    data: enrichedItems,
    timestamp: now,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_NEWS_CACHE_KEY, JSON.stringify({ data: enrichedItems, timestamp: now }));
    } catch {
      // Ignora erro de cota de armazenamento
    }
  }

  return tagUserAnimesInNews(enrichedItems, userAnimes);
}

// Retorna imediatamente o cache em 0ms sem nenhuma espera para o usuário
export function getCachedNewsInstant(userAnimes: Anime[] = []): AnimeNewsItem[] {
  if (newsCache && Array.isArray(newsCache.data) && newsCache.data.length > 0) {
    return tagUserAnimesInNews(newsCache.data, userAnimes);
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_NEWS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
          return tagUserAnimesInNews(parsed.data, userAnimes);
        }
      }
    } catch {}
  }
  return [];
}

// Alias de conveniência
export async function getAllAnimeNewsWithUserTags(userAnimes: Anime[] = [], forceRefresh = false): Promise<AnimeNewsItem[]> {
  if (forceRefresh) {
    newsCache = null;
  }
  return getAggregatedAnimeNews(userAnimes);
}


/**
 * Associa as notícias aos animes presentes na lista do usuário
 */
export function tagUserAnimesInNews(news: AnimeNewsItem[], userAnimes: Anime[]): AnimeNewsItem[] {
  if (!userAnimes || userAnimes.length === 0) return news;

  return news.map((item) => {
    const textToMatch = `${item.title} ${item.titlePt || ''} ${item.excerpt}`.toLowerCase();

    for (const anime of userAnimes) {
      const titleLower = anime.title.toLowerCase().trim();
      const japLower = (anime.japaneseTitle || '').toLowerCase().trim();

      // Procura correspondência
      const matchRomaji = titleLower.length >= 4 && textToMatch.includes(titleLower);
      const matchJap = japLower.length >= 4 && textToMatch.includes(japLower);

      if (matchRomaji || matchJap) {
        return {
          ...item,
          isUserAnime: true,
          relatedAnimeTitle: anime.title,
          imageUrl: item.imageUrl || anime.coverUrl || undefined,
        };
      }
    }

    return item;
  });
}

// Cache em memória para notícias específicas de animes (0ms de carregamento ao reabrir o modal)
const specificAnimeNewsCache = new Map<string, { data: AnimeNewsItem[]; timestamp: number }>();

export function extractBaseFranchiseTitle(rawTitle?: string): string {
  if (!rawTitle) return '';
  let clean = rawTitle.trim();
  clean = clean
    .replace(/\s*(?:\d+(?:st|nd|rd|th)\s+season|season\s+\d+|parte\s+\d+|part\s+\d+|\d+ª\s+temporada|\d+a\s+temporada|temporada\s+\d+).*$/i, '')
    .replace(/\s*(?:the\s+final\s+season|final\s+season|the\s+movie|movie|tv\s+series).*$/i, '')
    .replace(/:\s*(?:season\s+\d+|\d+(?:st|nd|rd|th)\s+season|part\s+\d+|parte\s+\d+).*$/i, '')
    .trim();
  return clean.length >= 3 ? clean : rawTitle.trim();
}

/**
 * Separa o título da notícia e a fonte jornalística do feed RSS do Google News
 */
function parseGoogleNewsTitle(rawTitle: string): { title: string; source: string } {
  const parts = rawTitle.split(' - ');
  if (parts.length > 1) {
    const source = parts.pop()!.trim();
    return { title: parts.join(' - ').trim(), source };
  }
  return { title: rawTitle, source: 'Portal de Animes' };
}

/**
 * Busca notícias dedicadas de uma obra no feed RSS do Google News (com portais brasileiros oficiais)
 */
async function fetchGoogleAnimeNews(
  searchQuery: string,
  fallbackImage?: string
): Promise<AnimeNewsItem[]> {
  const cleanQuery = encodeURIComponent(`${searchQuery} anime`);
  const targetRssUrl = `https://news.google.com/rss/search?q=${cleanQuery}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const items: AnimeNewsItem[] = [];

  // 1. Tenta via rss2json (CORS aberto, ultra-rápido e com JSON estruturado)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const r2jUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(targetRssUrl)}`;
    const res = await fetch(r2jUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.items) && json.items.length > 0) {
        for (let idx = 0; idx < json.items.length; idx++) {
          const it = json.items[idx];
          const { title: parsedTitle, source: parsedSource } = parseGoogleNewsTitle(cleanHtml(it.title || ''));
          const desc = cleanHtml(it.description || '');
          const dateStr = it.pubDate || new Date().toISOString();
          const category = detectCategory(parsedTitle, desc);

          items.push({
            id: `gnews_${idx}_${Math.random().toString(36).substring(2, 7)}`,
            title: parsedTitle,
            titlePt: parsedTitle,
            excerpt: desc,
            excerptPt: desc,
            url: it.link || '#',
            imageUrl: fallbackImage || GUARANTEED_ANIME_ARTWORKS[idx % GUARANTEED_ANIME_ARTWORKS.length],
            date: dateStr,
            formattedDate: formatNewsDate(dateStr),
            authorName: parsedSource,
            source: (parsedSource as any) || 'Portal de Animes',
            category,
          });
        }
        return items;
      }
    }
  } catch {
    // Continua para fallback XML
  }

  // 2. Fallback via proxy multi-provedores com DOMParser
  try {
    const xmlText = await fetchXmlWithProxyFallback(targetRssUrl);
    if (xmlText && typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const xmlItems = Array.from(doc.querySelectorAll('item')).slice(0, 10);

      for (let idx = 0; idx < xmlItems.length; idx++) {
        const it = xmlItems[idx];
        const rawTitle = cleanHtml(it.querySelector('title')?.textContent || '');
        const { title: parsedTitle, source: parsedSource } = parseGoogleNewsTitle(rawTitle);
        const link = it.querySelector('link')?.textContent || '#';
        const pubDate = it.querySelector('pubDate')?.textContent || new Date().toISOString();
        const desc = cleanHtml(it.querySelector('description')?.textContent || '');
        const category = detectCategory(parsedTitle, desc);

        items.push({
          id: `gnews_xml_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          title: parsedTitle,
          titlePt: parsedTitle,
          excerpt: desc,
          excerptPt: desc,
          url: link,
          imageUrl: fallbackImage || GUARANTEED_ANIME_ARTWORKS[idx % GUARANTEED_ANIME_ARTWORKS.length],
          date: pubDate,
          formattedDate: formatNewsDate(pubDate),
          authorName: parsedSource,
          source: (parsedSource as any) || 'Portal de Animes',
          category,
        });
      }
    }
  } catch {
    // Falha silenciosa
  }

  return items;
}

/**
 * Busca notícias específicas de um determinado anime:
 * Camada 1: Busca em tempo real nos portais brasileiros e veículos de imprensa (Google News Anime Feed)
 * Camada 2: Jikan API oficial MyAnimeList (/v4/anime/{malId}/news) com timeout seguro de 6s
 * Camada 3: Busca cruzada no catálogo agregado de notícias da aplicação
 *
 * Regras Estritas de Exibição:
 * - Janela de até 45 Dias: se houver novidades <= 45 dias, exibe até 3 matérias sob "Notícias Recentes da Obra"
 * - Fallback "Última Notícia Lançada": se não houver matérias <= 45 dias, mas a mais recente for de 45 a 60 dias,
 *   exibe a matéria mais recente com badge dourado e data por extenso
 * - Estado Vazio Transparente: se a última notícia for > 60 dias (ou nada for encontrado), retorna []
 *   para exibir "sem notícias até o momento"
 */
export async function fetchAnimeSpecificNews(
  malId?: number,
  animeTitle?: string,
  userAnimes: Anime[] = [],
  options?: {
    englishTitle?: string;
    japaneseTitle?: string;
    studio?: string | null;
    coverUrl?: string;
    bannerUrl?: string;
  }
): Promise<AnimeNewsItem[]> {
  const cacheKey = `${malId || 'no_id'}_${(animeTitle || '').toLowerCase()}`;
  const now = Date.now();

  const cached = specificAnimeNewsCache.get(cacheKey);
  if (cached && now - cached.timestamp < 1000 * 60 * 10) {
    return cached.data;
  }

  const candidates: AnimeNewsItem[] = [];
  const cleanTitle = (animeTitle || '').trim();
  const baseTitle = extractBaseFranchiseTitle(animeTitle).trim();
  const englishTitle = (options?.englishTitle || '').trim();
  const defaultArtwork = options?.coverUrl || options?.bannerUrl || GUARANTEED_ANIME_ARTWORKS[0];

  const parseJikanItems = (data: any[]): AnimeNewsItem[] => {
    return data.map((item: any, idx: number) => {
      const rawTitle = cleanHtml(item.title || 'Notícia de Anime');
      const rawExcerpt = cleanHtml(item.excerpt || item.intro || '');
      const titlePt = translateNewsTitle(rawTitle);
      const category = detectCategory(rawTitle, rawExcerpt);
      const dateStr = item.date || new Date().toISOString();

      return {
        id: `mal_news_${item.mal_id || Math.random().toString(36).substring(2, 9)}`,
        title: rawTitle,
        titlePt,
        excerpt: rawExcerpt,
        excerptPt: rawExcerpt,
        url: item.url || `https://myanimelist.net/news/${item.mal_id}`,
        imageUrl: item.images?.jpg?.image_url || defaultArtwork,
        date: dateStr,
        formattedDate: formatNewsDate(dateStr),
        authorName: item.author_username || 'MyAnimeList News',
        category,
        source: 'MyAnimeList' as const,
        relatedAnimeTitle: animeTitle,
      };
    });
  };

  // --- CAMADA 1: Busca em Tempo Real nos Portais Brasileiros (Google News Anime Feed) ---
  const searchQueries: string[] = [];
  if (baseTitle && baseTitle.length >= 3) {
    searchQueries.push(baseTitle);
  }
  if (cleanTitle && cleanTitle !== baseTitle && cleanTitle.length >= 3) {
    searchQueries.push(cleanTitle);
  }
  if (englishTitle && englishTitle !== cleanTitle && englishTitle !== baseTitle && englishTitle.length >= 3) {
    searchQueries.push(englishTitle);
  }

  // Consulta prioritária com o nome da obra / franquia
  const primarySearch = searchQueries[0] || cleanTitle;
  if (primarySearch && primarySearch.length >= 3) {
    try {
      const gNews = await fetchGoogleAnimeNews(primarySearch, defaultArtwork);
      if (gNews.length > 0) {
        candidates.push(...gNews);
      }
    } catch {
      // Continua para as outras camadas
    }
  }

  // --- CAMADA 2: Jikan API direto com timeout seguro de 6s ---
  if (malId) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/news`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          candidates.push(...parseJikanItems(json.data));
        }
      }
    } catch {
      // Jikan pode estar em 504 ou instável, segue normalmente
    }
  }

  // Se for nova temporada e o ID ainda não tem matérias no MAL, tenta a obra principal
  if (candidates.length === 0 && baseTitle.length >= 3 && baseTitle !== cleanTitle) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const searchRes = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(baseTitle)}&limit=3`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        const mainAnime = (searchJson.data || []).find((a: any) => a.mal_id !== malId) || searchJson.data?.[0];
        if (mainAnime?.mal_id) {
          const controllerNews = new AbortController();
          const timeoutNewsId = setTimeout(() => controllerNews.abort(), 5000);
          const newsRes = await fetch(
            `https://api.jikan.moe/v4/anime/${mainAnime.mal_id}/news`,
            { signal: controllerNews.signal }
          );
          clearTimeout(timeoutNewsId);

          if (newsRes.ok) {
            const newsJson = await newsRes.json();
            if (Array.isArray(newsJson.data) && newsJson.data.length > 0) {
              candidates.push(...parseJikanItems(newsJson.data));
            }
          }
        }
      }
    } catch {
      // Ignora erro
    }
  }

  // --- CAMADA 3: Busca cruzada no feed dos portais e notícias já agregadas no app ---
  if (cleanTitle.length >= 3 || baseTitle.length >= 3) {
    try {
      const allNews = await getAllAnimeNewsWithUserTags(userAnimes);
      const lowerClean = cleanTitle.toLowerCase();
      const lowerBase = baseTitle.toLowerCase();
      const lowerEnglish = englishTitle.toLowerCase();
      const matchWords = (lowerBase || lowerClean)
        .split(/\s+/)
        .filter((w) => w.length > 3 && !['season', 'parte', 'part', 'the', 'and', 'uma', 'para', 'das', 'dos'].includes(w));

      const matched = allNews.filter((n) => {
        const text = `${n.title} ${n.titlePt || ''} ${n.excerpt || ''}`.toLowerCase();
        if (lowerClean && text.includes(lowerClean)) return true;
        if (lowerBase && text.includes(lowerBase)) return true;
        if (lowerEnglish && text.includes(lowerEnglish)) return true;
        if (matchWords.length >= 2 && matchWords.every((k) => text.includes(k))) return true;
        return false;
      });

      candidates.push(...matched);
    } catch {
      // Ignora erro
    }
  }

  // Se nenhuma notícia foi encontrada em nenhuma camada
  if (candidates.length === 0) {
    specificAnimeNewsCache.set(cacheKey, { data: [], timestamp: now });
    return [];
  }

  // Filtra itens estritamente de anime e deduplica por URL ou título
  const strictlyAnime = candidates.filter((item) => isStrictlyAnimeNews(item.title, item.excerpt));
  const seenKeys = new Set<string>();
  const uniqueList: AnimeNewsItem[] = [];

  for (const item of strictlyAnime) {
    const key = item.url && item.url !== '#' ? item.url : item.title.toLowerCase().slice(0, 35);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueList.push(item);
    }
  }

  // Ordena cronologicamente decrescente (mais recente primeiro)
  uniqueList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const DAY_IN_MS = 1000 * 60 * 60 * 24;

  // 1. Janela de até 45 Dias: se possuir novidades recentes publicadas nos últimos 45 dias
  const recentNews = uniqueList.filter((item) => {
    const itemTime = new Date(item.date).getTime();
    if (isNaN(itemTime)) return false;
    const diffDays = (now - itemTime) / DAY_IN_MS;
    return diffDays <= 45;
  });

  let finalResult: AnimeNewsItem[] = [];

  if (recentNews.length > 0) {
    // Exibe até 3 novidades sob "Notícias Recentes da Obra"
    finalResult = recentNews.slice(0, 3).map((item, idx) => ({
      ...item,
      isOldNews: false,
      formattedDate: formatNewsDate(item.date),
      imageUrl: item.imageUrl || defaultArtwork || GUARANTEED_ANIME_ARTWORKS[idx % GUARANTEED_ANIME_ARTWORKS.length],
    }));
  } else {
    // 2. Fallback "Última Notícia Lançada": caso a obra não receba novas publicações há mais de 45 dias,
    // mas possua notícia recente publicada entre 45 e 60 dias
    const olderUnder60Days = uniqueList.filter((item) => {
      const itemTime = new Date(item.date).getTime();
      if (isNaN(itemTime)) return false;
      const diffDays = (now - itemTime) / DAY_IN_MS;
      return diffDays > 45 && diffDays <= 60;
    });

    if (olderUnder60Days.length > 0) {
      const latestOldNews = olderUnder60Days[0];
      finalResult = [
        {
          ...latestOldNews,
          isOldNews: true,
          formattedDate: formatNewsFullDate(latestOldNews.date) || formatNewsDate(latestOldNews.date),
          imageUrl: latestOldNews.imageUrl || defaultArtwork || GUARANTEED_ANIME_ARTWORKS[0],
        },
      ];
    }
    // 3. Se a notícia mais recente for há mais de 60 dias, finalResult permanece []
    // resultando no status "sem notícias até o momento" no modal
  }

  // Salva no cache em memória
  specificAnimeNewsCache.set(cacheKey, { data: finalResult, timestamp: now });
  return finalResult;
}
