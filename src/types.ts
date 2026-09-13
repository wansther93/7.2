export type AnimeStatus =
  | 'watching'
  | 'waiting_new_episodes'
  | 'plan_to_watch'
  | 'completed'
  | 'paused'
  | 'dropped'
  | 'cancelled';

export type ArcWatchStatus = 'completed' | 'in_progress' | 'not_started';

export interface AnimeSeasonOrArc {
  id: string;
  name: string; // Ex: "Temporada 1", "Arco de Alabasta", "Temporada 3" (Nome de exibição customizável pelo usuário)
  canonicalTitle?: string; // Título original oficial da API (ex: "Kono Subarashii Sekai ni Shukufuku wo! 3")
  mal_id?: number; // ID canônico no MyAnimeList / AniList
  type?: 'tv' | 'movie' | 'ova' | 'ona' | 'arc' | 'special'; // Tipo de mídia na obra
  totalEpisodes?: number | null; // Total de episódios deste arco/temporada (opcional)
  order: number;
  isWatched?: boolean; // Se o usuário já assistiu este arco/temporada
  releaseYear?: number | null; // Ano de exibição desta mídia
  status?: string | null; // Status oficial desta mídia (ex: "Finished Airing", "Currently Airing")
}

export interface EpisodeHistoryEntry {
  id: string;
  episode: number;
  seasonName?: string;
  timestamp: string; // ISO date
  notes?: string;
}

export interface Anime {
  id: string;
  userId: string;
  title: string;
  japaneseTitle?: string;
  coverUrl?: string | null;
  bannerUrl?: string | null; // Imagem de banner / backdrop panorâmica HD
  synopsis?: string | null;
  genres?: string[]; // Gêneros / tags (ex: ["Ação", "Shonen", "Fantasia"])
  studio?: string | null; // Estúdio de animação (ex: "Ufotable", "Mappa")
  format?: string | null; // Formato (ex: "TV", "Filme", "OVA", "ONA", "Especial")
  source?: string | null; // Fonte original (ex: "Mangá", "Light Novel", "Original", "Jogo")
  releaseYear?: number | null; // Ano de lançamento (ex: 2024)
  trailerUrl?: string | null; // Link externo do trailer (ex: YouTube)
  season: number; // Temporada numérica (legado / fallback)
  currentSeasonName: string; // Ex: "Temporada 3" ou "Arco de Wano"
  seasons: AnimeSeasonOrArc[]; // Lista opcional/personalizada de temporadas e arcos
  currentEpisode: number; // Episódio atual assistido
  totalEpisodes?: number | null; // Total de episódios (opcional)
  notes: string; // Onde parei / anotação detalhada
  status: AnimeStatus;
  rating?: number | null; // Nota pessoal de 1 a 10 (opcional)
  broadcastDay?: string | null; // Dia da semana de novos episódios (ex: "Domingo")
  structureMode?: 'seasons' | 'arcs' | null; // Modo da árvore: 'seasons' (temporadas & filmes) ou 'arcs' (arcos da história)
  mal_id?: number | null; // ID do anime no MyAnimeList / AniList para sincronização
  franchiseIds?: number[]; // Lista de IDs de todas as temporadas/filmes da franquia
  franchiseTitle?: string; // Título raiz da franquia para cruzamento de dados (ex: "Tensei Shitara Slime Datta Ken")
  excludedFranchiseItems?: (number | string)[]; // Lista de IDs e títulos de temporadas/OVAs descartados pelo usuário
  latestAiredEpisode?: number | null; // Último episódio lançado no Japão / streaming
  airingStatus?: string | null; // Status de exibição da API (ex: "Currently Airing", "Finished Airing")
  lastSyncTimestamp?: string | null; // Data/hora da última sincronização automática
  history?: EpisodeHistoryEntry[]; // Histórico de episódios assistidos com data
  createdAt: string;
  updatedAt: string;
}

export interface AnimeFormData {
  title: string;
  japaneseTitle?: string;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  synopsis?: string | null;
  genres?: string[];
  studio?: string | null;
  format?: string | null;
  source?: string | null;
  releaseYear?: number | null;
  trailerUrl?: string | null;
  season: number;
  currentSeasonName: string;
  seasons: AnimeSeasonOrArc[];
  currentEpisode: number;
  totalEpisodes?: number | null;
  notes: string;
  status: AnimeStatus;
  rating?: number | null;
  broadcastDay?: string | null;
  structureMode?: 'seasons' | 'arcs' | null;
  mal_id?: number | null;
  franchiseIds?: number[];
  franchiseTitle?: string;
  excludedFranchiseItems?: (number | string)[];
  latestAiredEpisode?: number | null;
  airingStatus?: string | null;
}

export interface FranchiseTreeItem {
  id: number;
  title: string;
  japaneseTitle?: string;
  englishTitle?: string;
  format: 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special' | 'Arc';
  episodes: number | null;
  seasonYear?: number | null;
  coverUrl?: string;
  relationType: 'sequel' | 'prequel' | 'side_story' | 'movie' | 'ova' | 'spin_off' | 'parent' | 'main' | 'arc';
  order: number;
  isWatched?: boolean;
  isCurrent?: boolean;
}

export interface AnimeArcPreset {
  id: string;
  name: string;
  episodesCount?: number | null;
  startEpisode?: number;
  endEpisode?: number | null;
  isCanon?: boolean;
  isWatched?: boolean;
  isOngoing?: boolean;
}

export type SortOption =
  | 'updated_desc'
  | 'name_asc'
  | 'name_desc'
  | 'rating_desc'
  | 'created_desc'
  | 'created_asc'
  | 'episodes_desc';

export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'updated_desc', label: 'Última atualização' },
  { id: 'name_asc', label: 'Nome (A - Z)' },
  { id: 'name_desc', label: 'Nome (Z - A)' },
  { id: 'rating_desc', label: 'Maior Nota Pessoal (⭐)' },
  { id: 'created_desc', label: 'Mais recentes cadastrados' },
  { id: 'created_asc', label: 'Mais antigos cadastrados' },
  { id: 'episodes_desc', label: 'Maior número de episódios' },
];

export const BROADCAST_DAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

export const STATUS_CONFIG: Record<
  AnimeStatus,
  {
    label: string;
    shortLabel: string;
    bgClass: string;
    badgeBg: string;
    textClass: string;
    borderClass: string;
    dotColor: string;
  }
> = {
  watching: {
    label: 'Assistindo',
    shortLabel: 'Assistindo',
    bgClass: 'bg-black/60 backdrop-blur-md text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-black/80',
    badgeBg: 'bg-black/70 backdrop-blur-md text-emerald-300 border border-emerald-500/30 shadow-sm',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    dotColor: 'bg-emerald-400',
  },
  waiting_new_episodes: {
    label: 'Esperando novos episódios',
    shortLabel: 'Esperando eps',
    bgClass: 'bg-black/60 backdrop-blur-md text-cyan-300 border-cyan-500/30 hover:border-cyan-500/50 hover:bg-black/80',
    badgeBg: 'bg-black/70 backdrop-blur-md text-cyan-300 border border-cyan-500/30 shadow-sm',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/40',
    dotColor: 'bg-cyan-400',
  },
  plan_to_watch: {
    label: 'Quero assistir',
    shortLabel: 'Quero assistir',
    bgClass: 'bg-black/60 backdrop-blur-md text-amber-300 border-amber-500/30 hover:border-amber-500/50 hover:bg-black/80',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/40',
    dotColor: 'bg-amber-400',
  },
  completed: {
    label: 'Terminado',
    shortLabel: 'Terminado',
    bgClass: 'bg-black/60 backdrop-blur-md text-purple-300 border-purple-500/30 hover:border-purple-500/50 hover:bg-black/80',
    badgeBg: 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/40',
    dotColor: 'bg-purple-400',
  },
  paused: {
    label: 'Pausado',
    shortLabel: 'Pausado',
    bgClass: 'bg-black/60 backdrop-blur-md text-yellow-300 border-yellow-500/30 hover:border-yellow-500/50 hover:bg-black/80',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/40',
    dotColor: 'bg-yellow-400',
  },
  dropped: {
    label: 'Abandonei',
    shortLabel: 'Abandonei',
    bgClass: 'bg-black/60 backdrop-blur-md text-rose-300 border-rose-500/30 hover:border-rose-500/50 hover:bg-black/80',
    badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/40',
    dotColor: 'bg-rose-400',
  },
  cancelled: {
    label: 'Cancelado',
    shortLabel: 'Cancelado',
    bgClass: 'bg-black/60 backdrop-blur-md text-rose-300 border-rose-500/30 hover:border-rose-500/50 hover:bg-black/80',
    badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/40',
    dotColor: 'bg-rose-400',
  },
};

// Lista completa de gêneros, temas e demografias de animes (organizados e em Português)
export const ALL_ANIME_GENRES = [
  'Ação',
  'Aventura',
  'Comédia',
  'Shonen',
  'Seinen',
  'Shoujo',
  'Josei',
  'Isekai',
  'Romance',
  'Fantasia',
  'Ficção Científica',
  'Drama',
  'Mistério',
  'Sobrenatural',
  'Suspense / Thriller',
  'Psicológico',
  'Slice of Life',
  'Esportes',
  'Escolar',
  'Magia',
  'Mecha',
  'Super Poderes',
  'Cyberpunk',
  'Artes Marciais',
  'Ecchi',
  'Harem',
  'Militar',
  'Histórico',
  'Música',
  'Sobrevivência',
  'Horror / Terror',
  'Jogos',
  'Vampiros',
  'Demônios',
  'Espaço',
  'Paródia',
  'Pós-Apocalíptico',
  'Investigação',
  'Culinária',
  'Viagem no Tempo',
  'Reencarnação',
  'Mitologia',
  'Policial',
  'Samurai',
  'Delinquentes',
  'Super Heróis',
  'Idols',
  'Gore',
  'Vida no Campo',
  'Adulto',
] as const;

export type { AnimeNewsItem } from './services/newsService';
