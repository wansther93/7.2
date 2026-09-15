import React, { useState, useEffect } from 'react';
import {
  X,
  Tv,
  Play,
  Star,
  ExternalLink,
  Calendar,
  ChevronDown,
  ChevronUp,
  Layers,
  Users,
  Music,
  Check,
  Film,
  FileText,
  Bookmark,
  Share2,
} from 'lucide-react';
import type { Anime } from '../../types';
import { STATUS_CONFIG } from '../../types';
import type { AnimeStreamingLink, AnimeCharacterItem } from '../../services/jikanService';
import type { AnimeThemeMedia } from '../../services/animeThemesService';
import {
  getPersistedAnimeRichData,
  getOrFetchAnimeRichData,
} from '../../services/animeMetadataService';

interface CollectionAnimeModalProps {
  anime: Anime;
  isOpen: boolean;
  onClose: () => void;
  isOwner?: boolean;
  onOpenInTracker?: (animeId: string) => void;
  onAddAnimeFromFriend?: (prefill: Partial<Anime>) => void;
}

export const CollectionAnimeModal: React.FC<CollectionAnimeModalProps> = ({
  anime,
  isOpen,
  onClose,
  isOwner = true,
  onOpenInTracker,
  onAddAnimeFromFriend,
}) => {
  const [streamingLinks, setStreamingLinks] = useState<AnimeStreamingLink[]>([]);
  const [loadingStreaming, setLoadingStreaming] = useState(true);

  const [characters, setCharacters] = useState<AnimeCharacterItem[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);

  const [themes, setThemes] = useState<AnimeThemeMedia[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(false);

  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Carrega informações ricas de forma inteligente:
  // Se já estiver salvo na coleção, lê imediatamente do armazenamento persistente (0ms de espera, 0 buscas repetidas).
  // Se for novo ou não tiver sido sincronizado ainda, busca nas 3 APIs e salva localmente.
  useEffect(() => {
    if (!isOpen || !anime) return;

    let isMounted = true;

    // 1. Tenta carregar os dados persistidos imediatamente
    const persisted = getPersistedAnimeRichData(anime);
    if (persisted) {
      setStreamingLinks(persisted.streamingLinks || []);
      setCharacters(persisted.characters || []);
      setThemes(persisted.themes || []);
      setLoadingStreaming(false);
      setLoadingCharacters(false);
      setLoadingThemes(false);
      return;
    }

    // 2. Se for a 1ª vez ou anime recém-adicionado, busca nas APIs e salva
    setLoadingStreaming(true);
    setLoadingCharacters(true);
    setLoadingThemes(true);

    getOrFetchAnimeRichData(anime)
      .then((data) => {
        if (isMounted) {
          setStreamingLinks(data.streamingLinks || []);
          setCharacters(data.characters || []);
          setThemes(data.themes || []);
          setLoadingStreaming(false);
          setLoadingCharacters(false);
          setLoadingThemes(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadingStreaming(false);
          setLoadingCharacters(false);
          setLoadingThemes(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, anime]);

  if (!isOpen || !anime) return null;

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${anime.title} no WAnimeList: ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.warn('Erro ao copiar link:', e);
    }
  };

  // Estilização dinâmica por marca de streaming oficial
  const getStreamingBadgeStyle = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('crunchyroll')) {
      return {
        bg: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30 text-orange-300',
        dot: 'bg-orange-400',
      };
    }
    if (lower.includes('netflix')) {
      return {
        bg: 'bg-red-600/10 hover:bg-red-600/20 border-red-600/30 text-red-300',
        dot: 'bg-red-500',
      };
    }
    if (lower.includes('prime') || lower.includes('amazon')) {
      return {
        bg: 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30 text-sky-300',
        dot: 'bg-sky-400',
      };
    }
    if (lower.includes('disney')) {
      return {
        bg: 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-600/30 text-blue-300',
        dot: 'bg-blue-400',
      };
    }
    if (lower.includes('max') || lower.includes('hbo')) {
      return {
        bg: 'bg-purple-600/10 hover:bg-purple-600/20 border-purple-600/30 text-purple-300',
        dot: 'bg-purple-500',
      };
    }
    if (lower.includes('onegai')) {
      return {
        bg: 'bg-pink-600/10 hover:bg-pink-600/20 border-pink-600/30 text-pink-300',
        dot: 'bg-pink-500',
      };
    }
    return {
      bg: 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700 text-zinc-300',
      dot: 'bg-zinc-400',
    };
  };

  // Cálculo da porcentagem assistida pelo usuário
  const totalEps = anime.totalEpisodes || 0;
  const currentEp = anime.currentEpisode || 0;
  const progressPercent = totalEps > 0 ? Math.min(100, Math.round((currentEp / totalEps) * 100)) : 0;

  // Extração do ID do YouTube se o anime possuir trailerUrl
  const extractYoutubeId = (url?: string | null): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };
  const youtubeVideoId = extractYoutubeId(anime.trailerUrl);

  const statusConfig = STATUS_CONFIG[anime.status] || {
    label: anime.status || 'Na Lista',
    color: 'bg-zinc-700 text-zinc-300',
  };

  return (
    <div
      id="collection-anime-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="collection-anime-modal-card"
        className="relative w-full max-w-3xl my-auto bg-black border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Superior */}
        <div className="relative h-48 sm:h-56 w-full bg-black flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            {anime.bannerUrl ? (
              <img
                src={anime.bannerUrl}
                alt={anime.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center brightness-100"
              />
            ) : (
              <div className="w-full h-full relative overflow-hidden bg-black">
                <img
                  src={anime.coverUrl}
                  alt={anime.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center blur-md scale-110 opacity-40 brightness-75"
                />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          </div>

          {/* Botões do Topo */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-30">
            <button
              id="collection-modal-share-btn"
              type="button"
              onClick={handleShare}
              title="Copiar link"
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 border border-white/10 text-zinc-300 hover:text-white transition-all backdrop-blur-md cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              id="collection-modal-close-btn"
              type="button"
              onClick={onClose}
              title="Fechar"
              className="p-2 rounded-xl bg-black/60 hover:bg-rose-500/20 hover:border-rose-500/30 border border-white/10 text-zinc-300 hover:text-white transition-all backdrop-blur-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Informações sobre o Banner (Pôster + Títulos) */}
          <div className="absolute bottom-3 sm:bottom-4 left-4 right-4 flex items-end gap-3.5 sm:gap-4 z-20">
            <div className="relative w-22 sm:w-28 md:w-32 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl shadow-black/90 border border-white/20 bg-zinc-900 flex-shrink-0">
              <img
                src={anime.coverUrl}
                alt={anime.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

              {anime.score ? (
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-amber-500/30 flex items-center gap-1 text-[10px] font-bold text-amber-300 shadow-sm">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  {anime.score}
                </div>
              ) : null}
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {anime.format && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-white/10 text-zinc-300 border border-white/10">
                    {anime.format}
                  </span>
                )}
                {anime.studio && (
                  <span className="text-xs text-amber-400/90 font-medium truncate">
                    {anime.studio}
                  </span>
                )}
                {anime.year && (
                  <span className="text-xs text-zinc-400 font-medium">
                    {anime.year}
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-xl md:text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-md">
                {anime.title}
              </h2>

              {anime.title_japanese && (
                <p className="text-xs text-zinc-400 truncate mt-0.5 font-sans">
                  {anime.title_japanese}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-zinc-200">
          
          {/* ========================================================================= */}
          {/* PAINEL DE PROGRESSO REAL DO USUÁRIO (Substitui os containers deduzidos) */}
          {/* ========================================================================= */}
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 space-y-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  Seu Progresso no Acervo
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold tracking-wide ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>

            {/* Linha de Episódio e Barra de Progresso */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">
                  {anime.currentSeasonName ? (
                    <span className="text-amber-300 font-semibold">{anime.currentSeasonName} • </span>
                  ) : anime.season ? (
                    <span className="text-amber-300 font-semibold">Temporada {anime.season} • </span>
                  ) : null}
                  Episódio <span className="text-white font-bold">{currentEp}</span> de {totalEps > 0 ? totalEps : 'Indeterminado'}
                </span>
                {totalEps > 0 && (
                  <span className="text-[11px] font-bold text-amber-400">{progressPercent}%</span>
                )}
              </div>
              {totalEps > 0 && (
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>

            {/* Avaliação Pessoal e Nota */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <div className="flex items-center gap-1 text-zinc-400">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                <span>Sua Nota:</span>
                <span className="font-bold text-white ml-0.5">
                  {anime.rating && anime.rating > 0 ? `${anime.rating} / 10` : 'Não avaliado'}
                </span>
              </div>
              {anime.rewatchCount && anime.rewatchCount > 0 ? (
                <div className="text-zinc-400">
                  <span>Reassistido:</span> <span className="font-bold text-white">{anime.rewatchCount}x</span>
                </div>
              ) : null}
            </div>

            {/* Anotações Pessoais se houver */}
            {anime.notes && anime.notes.trim() && (
              <div className="mt-2 p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-400 font-semibold text-[11px]">
                  <FileText className="w-3 h-3 text-amber-400" />
                  <span>Suas Anotações</span>
                </div>
                <p className="text-zinc-300 italic whitespace-pre-wrap">{anime.notes}</p>
              </div>
            )}
          </div>

          {/* Onde Assistir Legalmente no Brasil (100% Dinâmico das APIs) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-amber-400" />
                Onde Assistir Oficialmente no Brasil
              </h3>
              <span className="text-[10px] text-zinc-500 font-medium">Fontes Oficiais das APIs</span>
            </div>

            {loadingStreaming ? (
              <div className="flex items-center gap-2 py-2.5 text-xs text-zinc-400 animate-pulse">
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Consultando distribuidores oficiais nas APIs...
              </div>
            ) : streamingLinks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {streamingLinks.map((link, idx) => {
                  const style = getStreamingBadgeStyle(link.name);
                  return (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all group ${style.bg}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                        <span className="truncate">{link.name}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-1.5" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 text-xs text-zinc-400 flex items-center justify-between">
                <span>Nenhuma plataforma com transmissão simultânea confirmada nas APIs oficiais para o Brasil.</span>
                <a
                  href={`https://www.crunchyroll.com/pt-br/search?q=${encodeURIComponent(anime.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1 font-medium ml-2 flex-shrink-0 text-[11px]"
                >
                  Buscar no Crunchyroll <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Trailer Oficial da Produção (YouTube) */}
          {youtubeVideoId ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                Trailer Oficial
              </h3>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`}
                  title={`Trailer de ${anime.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 border border-white/5 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <Play className="w-3.5 h-3.5 text-zinc-400" />
                <span>Trailer oficial da produção</span>
              </div>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                  `${anime.title} official trailer pv`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-[11px] font-medium"
              >
                Buscar no YouTube <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Sinopse Retrátil */}
          {anime.synopsis && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  Sinopse
                </h3>
                {anime.synopsis.length > 120 && (
                  <button
                    type="button"
                    onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {isSynopsisExpanded ? (
                      <>
                        <span>Minimizar sinopse</span>
                        <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        <span>Ler sinopse completa</span>
                        <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
              <div
                className={`text-xs sm:text-[13px] text-zinc-300 leading-relaxed bg-zinc-900/40 p-3 rounded-xl border border-white/5 whitespace-pre-line transition-all ${
                  isSynopsisExpanded ? '' : 'line-clamp-2'
                }`}
              >
                {anime.synopsis}
              </div>
            </div>
          )}

          {/* Gêneros */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-zinc-500" />
                Gêneros & Temas
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {anime.genres.map((g, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-zinc-900 border border-white/10 text-zinc-300"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Personagens & Dubladores (Seiyuus) - Carregados Dinamicamente da API */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Personagens & Dubladores Oficiais
              </h3>
              <span className="text-[10px] text-zinc-500">Jikan / AniList</span>
            </div>

            {loadingCharacters ? (
              <div className="flex items-center gap-2 py-2 text-xs text-zinc-400 animate-pulse">
                <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                Carregando elenco de vozes e personagens...
              </div>
            ) : characters.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {characters.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="p-2 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center gap-2.5"
                  >
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="w-10 h-10 rounded-lg object-cover bg-zinc-800 shrink-0 border border-white/10"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-zinc-200 truncate">{c.name}</h4>
                      <p className="text-[10px] text-zinc-400 truncate">
                        {c.voiceActor?.name ? `Voz: ${c.voiceActor.name}` : c.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-zinc-900/30 border border-white/5 text-xs text-zinc-400">
                Informações de elenco não disponíveis nesta ficha.
              </div>
            )}
          </div>

          {/* Temas Musicais (Openings & Endings) - Dinâmicos das APIs */}
          {themes && themes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-purple-400" />
                Músicas Oficiais (Aberturas & Encerramentos)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {themes
                  .filter((t) => t.themeType === 'OP')
                  .slice(0, 2)
                  .map((op, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-zinc-900/40 border border-white/5 space-y-0.5">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                        Abertura {op.sequence}
                      </span>
                      <p className="text-zinc-300 font-medium line-clamp-1">{op.songTitle}</p>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">{op.artistName}</p>
                    </div>
                  ))}
                {themes
                  .filter((t) => t.themeType === 'ED')
                  .slice(0, 2)
                  .map((ed, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-zinc-900/40 border border-white/5 space-y-0.5">
                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                        Encerramento {ed.sequence}
                      </span>
                      <p className="text-zinc-300 font-medium line-clamp-1">{ed.songTitle}</p>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">{ed.artistName}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Links Rápidos de Fichas Oficiais */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500 text-[11px] font-medium mr-1">Fichas Oficiais:</span>
            {anime.mal_id ? (
              <a
                href={`https://myanimelist.net/anime/${anime.mal_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              >
                MyAnimeList <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}
            {anime.mal_id ? (
              <a
                href={`https://shikimori.one/animes/${anime.mal_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              >
                Shikimori <ExternalLink className="w-3 h-3" />
              </a>
            ) : null}
            <a
              href={`https://anilist.co/search/anime?search=${encodeURIComponent(anime.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
            >
              AniList <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Rodapé de Ações Fixo e Compacto */}
        <div className="py-2 px-4 bg-black border-t border-white/10 flex items-center justify-between gap-2 flex-shrink-0 min-h-[42px]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-500/30 whitespace-nowrap">
              <Check className="w-3 h-3 shrink-0" />
              <span>No seu acervo</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && onOpenInTracker && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInTracker(anime.id);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors cursor-pointer"
              >
                Ver no Rastreador
              </button>
            )}

            {!isOwner && onAddAnimeFromFriend && (
              <button
                type="button"
                onClick={() => {
                  onAddAnimeFromFriend({
                    title: anime.title,
                    mal_id: anime.mal_id,
                    coverUrl: anime.coverUrl,
                    bannerUrl: anime.bannerUrl,
                    totalEpisodes: anime.totalEpisodes,
                    format: anime.format,
                    genres: anime.genres,
                    synopsis: anime.synopsis,
                    year: anime.year,
                    studio: anime.studio,
                  });
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors cursor-pointer"
              >
                Adicionar à Minha Lista
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
