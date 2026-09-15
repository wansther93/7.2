import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Tv,
  Star,
  ExternalLink,
  Play,
  Share2,
  Check,
  Plus,
  Compass,
  Newspaper,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ScheduleAnimeItem,
  getAnimeBanner,
  AnimeStreamingLink,
} from '../services/jikanService';
import { getAggregatedStreamingLinks } from '../services/multiApiAggregatorService';
import { formatUpcomingReleaseForecast } from '../services/scheduleLifecycleService';
import { fetchFreshAnimeDetails } from '../services/animeSyncService';
import { fetchAnimeSpecificNews, GUARANTEED_ANIME_ARTWORKS } from '../services/newsService';
import { checkIsSameFranchise } from '../services/franchiseService';
import { resolveAnimeAggregatedStatus, translateBroadcastDay, type AnimeAggregatedStatus } from '../services/aggregatorStatusService';
import { updateAnime } from '../services/animeService';
import { Anime, AnimeFormData, AnimeNewsItem, AnimeStatus, STATUS_CONFIG } from '../types';

interface ScheduleDetailModalProps {
  anime: ScheduleAnimeItem | null;
  isOpen: boolean;
  onClose: () => void;
  userAnimes: Anime[];
  onAddAnime?: (anime: Partial<AnimeFormData>) => void;
  onOpenInTracker?: (animeId: string) => void;
  onOpenNewsReader?: (newsItem: AnimeNewsItem) => void;
}

export const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  anime,
  isOpen,
  onClose,
  userAnimes,
  onAddAnime,
  onOpenInTracker,
  onOpenNewsReader,
}) => {
  const [streamingLinks, setStreamingLinks] = useState<AnimeStreamingLink[]>([]);
  const [loadingStreaming, setLoadingStreaming] = useState(false);
  const [news, setNews] = useState<AnimeNewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addedJustNow, setAddedJustNow] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [failedNewsImages, setFailedNewsImages] = useState<Record<string, boolean>>({});
  const [liveDetails, setLiveDetails] = useState<{
    status?: string;
    totalEpisodes?: number | null;
    bannerUrl?: string | null;
    studio?: string | null;
    broadcastDay?: string | null;
    broadcastTime?: string | null;
    nextEpisode?: any;
  } | null>(null);

  // Fecha com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Carrega links de streaming, banner de temporadas anteriores se necessário e notícias
  useEffect(() => {
    if (!isOpen || !anime) return;

    let isMounted = true;
    setLoadingStreaming(true);
    setLoadingNews(true);
    setAddedJustNow(false);
    setIsSynopsisExpanded(false);
    setBannerUrl(anime.bannerUrl || null);
    setLiveDetails(null);

    const malId = anime.idMal || anime.id;

    // Sincroniza metadados oficiais automaticamente da API (AniList / Jikan) para precisão absoluta de status e episódios da obra
    fetchFreshAnimeDetails(anime.title, malId)
      .then((data) => {
        if (!isMounted || !data) return;
        setLiveDetails(data);
        if (data.bannerUrl) {
          setBannerUrl(data.bannerUrl);
          if (existingUserAnime && !existingUserAnime.bannerUrl && existingUserAnime.id) {
            updateAnime(existingUserAnime.id, { bannerUrl: data.bannerUrl }).catch(() => {});
          }
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar detalhes frescos do anime:', err);
      });

    // Se anime não possuir banner próprio (comum em temporadas futuras), busca banner da franquia/temporada anterior
    if (!anime.bannerUrl) {
      getAnimeBanner(malId, anime.title).then((foundBanner) => {
        if (isMounted && foundBanner) {
          setBannerUrl(foundBanner);
          if (existingUserAnime && !existingUserAnime.bannerUrl && existingUserAnime.id) {
            updateAnime(existingUserAnime.id, { bannerUrl: foundBanner }).catch(() => {});
          }
        }
      });
    }

    // Busca streaming oficial no Brasil com cascata multi-API (AniList + Jikan + Shikimori)
    getAggregatedStreamingLinks(malId, anime.title)
      .then((links) => {
        if (isMounted) {
          const sanitized = links.filter(
            (l) => !l.name.toLowerCase().includes('youtube') && !l.url.toLowerCase().includes('youtube')
          );
          setStreamingLinks(sanitized);
          setLoadingStreaming(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingStreaming(false);
      });

    // Busca notícias específicas desta obra com multicamadas
    fetchAnimeSpecificNews(malId, anime.title, userAnimes, {
      englishTitle: anime.title_english,
      japaneseTitle: anime.title_japanese,
      studio: anime.studio,
      coverUrl: anime.coverUrl,
      bannerUrl: anime.bannerUrl,
    })
      .then((newsItems) => {
        if (isMounted) {
          setNews(newsItems);
          setLoadingNews(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingNews(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, anime, userAnimes]);

  if (!isOpen || !anime) return null;

  // Verifica se o anime já está na lista do usuário (match direto ou franquia)
  const existingUserAnime = userAnimes.find((a) => {
    const isDirect =
      (a.mal_id && (a.mal_id === anime.id || a.mal_id === anime.idMal)) ||
      a.title.toLowerCase().trim() === anime.title.toLowerCase().trim() ||
      (anime.title_japanese && a.japaneseTitle?.toLowerCase().trim() === anime.title_japanese.toLowerCase().trim());
    if (isDirect) return true;
    return checkIsSameFranchise(a, {
      id: anime.id,
      mal_id: anime.idMal || anime.id,
      title: anime.title,
      title_japanese: anime.title_japanese,
      title_english: anime.title_english,
    });
  });

  const handleShare = () => {
    const url = `https://myanimelist.net/anime/${anime.idMal || anime.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${anime.title} - ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddToList = (status: AnimeStatus = 'plan_to_watch') => {
    if (!onAddAnime) return;

    onAddAnime({
      title: anime.title,
      japaneseTitle: anime.title_japanese || '',
      coverUrl: anime.coverUrl,
      bannerUrl: bannerUrl || anime.bannerUrl || null,
      totalEpisodes: anime.episodes || null,
      currentEpisode: 0,
      rating: anime.score || null,
      genres: anime.genres || [],
      status,
      broadcastDay: anime.broadcastDay !== 'Outros' && anime.broadcastDay !== 'Em breve' ? anime.broadcastDay : null,
      studio: anime.studio || null,
      format: anime.format || null,
      source: anime.source || null,
      releaseYear: anime.year || null,
      season: 1,
      currentSeasonName: 'Temporada 1',
      mal_id: anime.idMal || anime.id,
      synopsis: anime.synopsis || '',
      notes: '',
    });

    setAddedJustNow(true);
  };

  // Formata contagem regressiva para o próximo episódio
  const formatCountdown = (airingAt?: number) => {
    if (!airingAt) return null;
    const now = Math.floor(Date.now() / 1000);
    const diff = airingAt - now;
    if (diff <= 0) return 'Transmissão hoje!';

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    if (days > 0) return `em ${days}d ${hours}h`;
    if (hours > 0) return `em ${hours}h ${minutes}m`;
    return `em ${minutes} min`;
  };

  // Formata data de estreia para animes futuros com precisão 100% das APIs oficiais
  const formatReleaseDate = () => {
    return formatUpcomingReleaseForecast(anime.startDate, anime.season, anime.year).text;
  };

  const getStreamingBadgeStyle = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('crunchyroll')) {
      return {
        bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400',
        dot: 'bg-amber-500',
      };
    }
    if (lower.includes('netflix')) {
      return {
        bg: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400',
        dot: 'bg-rose-500',
      };
    }
    if (lower.includes('prime') || lower.includes('amazon')) {
      return {
        bg: 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30 text-sky-400',
        dot: 'bg-sky-500',
      };
    }
    if (lower.includes('disney')) {
      return {
        bg: 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-600/30 text-blue-400',
        dot: 'bg-blue-500',
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

  const effectiveAggregatedStatus: AnimeAggregatedStatus =
    (liveDetails as any)?.aggregatedStatus ||
    resolveAnimeAggregatedStatus({
      title: anime.title,
      rawApiStatus: anime.status,
      broadcastDay: anime.broadcastDay,
      broadcastTime: anime.broadcastTime,
      totalEpisodes: anime.episodes,
      bannerUrl: bannerUrl || anime.bannerUrl || null,
      startDate: anime.startDate,
      season: anime.season,
      seasonYear: anime.year,
    });

  // Previsão de Lançamento 100% fiel às APIs oficiais (paridade exata com o card da Agenda)
  const initialForecast = formatUpcomingReleaseForecast(anime.startDate, anime.season, anime.year);
  const liveUpcomingDate = effectiveAggregatedStatus.upcomingDate;

  const displayUpcomingDate =
    initialForecast.hasConfirmedDate
      ? initialForecast.text
      : (liveUpcomingDate && liveUpcomingDate !== 'Aguardando data oficial de estreia'
          ? liveUpcomingDate
          : initialForecast.text);

  const displayUpcomingTitle =
    effectiveAggregatedStatus.upcomingTitle &&
    effectiveAggregatedStatus.upcomingTitle !== 'Próxima Temporada' &&
    effectiveAggregatedStatus.upcomingTitle !== 'Em Produção'
      ? effectiveAggregatedStatus.upcomingTitle
      : anime.title;

  return (
    <div
      id="schedule-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="schedule-detail-modal-card"
        className="relative w-full max-w-3xl my-auto bg-black border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner superior com transição suave para o fundo preto */}
        <div className="relative h-48 sm:h-56 w-full bg-black flex-shrink-0 overflow-hidden">
          {/* Camada da imagem do banner com proporção e nitidez reais */}
          <div className="absolute inset-0 overflow-hidden">
            {bannerUrl ? (
              <img
                src={bannerUrl}
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
                  className="w-full h-full object-cover object-center brightness-90"
                />
              </div>
            )}
          </div>

          {/* Sombra de transição suave apenas na borda inferior do banner para fundir sem linha visível */}
          <div className="absolute inset-x-0 bottom-0 h-8 sm:h-10 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />

          {/* Botões do topo (Compartilhar e Fechar) */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            <button
              id="schedule-modal-share-btn"
              type="button"
              onClick={handleShare}
              title="Copiar link"
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 border border-white/10 text-zinc-300 hover:text-white transition-all backdrop-blur-md cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              id="schedule-modal-close-btn"
              type="button"
              onClick={onClose}
              title="Fechar"
              className="p-2 rounded-xl bg-black/60 hover:bg-rose-500/20 hover:border-rose-500/30 border border-white/10 text-zinc-300 hover:text-white transition-all backdrop-blur-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Informações centrais integradas ao Banner */}
          <div className="absolute bottom-3 sm:bottom-4 left-4 right-4 flex items-end gap-3.5 sm:gap-4 z-20">
            {/* Pôster Vertical com cantos preservados e sombra de transição suave na base */}
            <div className="relative w-22 sm:w-28 md:w-32 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl shadow-black/90 border border-white/20 bg-zinc-900 flex-shrink-0">
              <img
                src={anime.coverUrl}
                alt={anime.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
              {/* Efeito de sombra/gradiente suave na base da miniatura para não ter linha de corte */}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

              {anime.score && (
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-amber-500/30 flex items-center gap-1 text-[10px] font-bold text-amber-300 shadow-sm">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  {anime.score}
                </div>
              )}
            </div>

            {/* Títulos e Estúdio */}
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
              </div>
              <h2 className="text-base sm:text-xl md:text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-md">
                {anime.title}
              </h2>
              {anime.title_japanese && (
                <p className="text-xs text-zinc-400 truncate mt-0.5 font-sans opacity-80">
                  {anime.title_japanese}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Corpo com rolagem */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar pt-4 sm:pt-5 bg-black">
          {/* Card de Previsão de Lançamento / Horário de Transmissão / Status da Obra (Agregador) */}
          {effectiveAggregatedStatus.isCurrentlyAiring ? (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <Clock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10.5px]">
                  Em Exibição:
                </span>
                <span className="font-semibold text-white truncate">
                  {translateBroadcastDay(effectiveAggregatedStatus.broadcastDay) || 'Semanalmente'}
                  {effectiveAggregatedStatus.broadcastTime ? ` às ${effectiveAggregatedStatus.broadcastTime}` : ''}
                </span>
              </div>

              {anime.nextEpisode && (
                <div className="flex items-center gap-1.5 bg-black/50 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 text-[11px] ml-auto">
                  <span className="text-zinc-400">Próximo:</span>
                  <span className="font-bold text-emerald-300">Ep. {anime.nextEpisode.episode}</span>
                  {anime.nextEpisode.airingAt && (
                    <span className="text-emerald-400 font-mono text-[10.5px]">
                      ({formatCountdown(anime.nextEpisode.airingAt)})
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : effectiveAggregatedStatus.isUpcoming ? (
            <div className="px-3.5 py-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex flex-col gap-1.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="font-bold text-amber-400 uppercase tracking-wider text-[10.5px]">
                    {effectiveAggregatedStatus.statusBadgeLabel}:
                  </span>
                  <span className="font-semibold text-white truncate">
                    {displayUpcomingTitle}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/50 border border-amber-500/20 text-amber-200 font-medium text-[11px]">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>{displayUpcomingDate}</span>
                </div>
              </div>
              {effectiveAggregatedStatus.statusDescription && (
                <p className="text-[11px] text-zinc-400 pl-5.5">
                  {effectiveAggregatedStatus.statusDescription}
                </p>
              )}
            </div>
          ) : effectiveAggregatedStatus.isFinished ? (
            <div className="px-3.5 py-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="font-bold text-purple-400 uppercase tracking-wider text-[10.5px]">
                  Status da Obra:
                </span>
                <span className="font-semibold text-white truncate">
                  Já finalizado
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400 text-[11px] sm:text-xs">
                {anime.episodes ? (
                  <span className="font-medium text-zinc-300">
                    {anime.episodes} episódios completos
                  </span>
                ) : (
                  <span>Obra concluída</span>
                )}
                {anime.year && (
                  <span className="text-zinc-500">({anime.year})</span>
                )}
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-zinc-900/70 border border-white/10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="font-bold text-zinc-300 uppercase tracking-wider text-[10px] sm:text-[10.5px] whitespace-nowrap">
                  Previsão de Lançamento:
                </span>
              </div>
              <span className="font-semibold text-white text-[11px] sm:text-xs text-right whitespace-normal sm:whitespace-nowrap break-words">
                {formatReleaseDate()}
              </span>
            </div>
          )}

          {/* Onde Assistir Legalmente no Brasil */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-amber-400" />
                Onde Assistir Oficialmente no Brasil
              </h3>
              <span className="text-[10px] text-zinc-500 font-medium">Transmissão Legal</span>
            </div>

            {loadingStreaming ? (
              <div className="flex items-center gap-2 py-2.5 text-xs text-zinc-400 animate-pulse">
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Identificando plataformas com transmissão no Brasil...
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
                <span>Transmissão simultânea ainda não confirmada pelas distribuidoras locais.</span>
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

          {/* Trailer Oficial */}
          {anime.trailer?.id && anime.trailer.site?.toLowerCase() === 'youtube' ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                Trailer Oficial
              </h3>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${anime.trailer.id}`}
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
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
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

          {/* Notícias do Anime (Regra de 30-45 dias ou Última Notícia Lançada) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Newspaper className="w-3.5 h-3.5 text-sky-400" />
                {news.length > 0 && news[0].isOldNews ? 'Última Notícia Lançada' : 'Notícias Recentes da Obra'}
              </h3>
              {news.length > 0 && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-sm ${
                  news[0].isOldNews
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700/50'
                }`}>
                  {news[0].isOldNews
                    ? 'Última Notícia Lançada'
                    : `${news.length} ${news.length === 1 ? 'notícia recente' : 'notícias recentes'}`}
                </span>
              )}
            </div>

            {loadingNews ? (
              <div className="py-3 px-3 rounded-xl bg-zinc-900/40 border border-white/5 text-xs text-zinc-400 flex items-center gap-2.5 animate-pulse">
                <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <span>Buscando reportagens e novidades da obra...</span>
              </div>
            ) : news.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {news.map((item, idx) => {
                  const itemHashCode = Math.abs(item.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + idx);
                  const fallbackArt = anime.coverUrl || GUARANTEED_ANIME_ARTWORKS[itemHashCode % GUARANTEED_ANIME_ARTWORKS.length];

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (onOpenNewsReader) {
                          onOpenNewsReader(item);
                        } else {
                          window.open(item.url, '_blank');
                        }
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex gap-2.5 group ${
                        item.isOldNews
                          ? 'bg-zinc-900/80 hover:bg-zinc-800/90 border-amber-500/30 hover:border-amber-500/50 ring-1 ring-amber-500/10'
                          : 'bg-zinc-900/50 hover:bg-zinc-800/60 border-white/5 hover:border-sky-500/30'
                      }`}
                    >
                      <img
                        src={!failedNewsImages[item.id] && item.imageUrl ? item.imageUrl : fallbackArt}
                        alt=""
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        onError={() =>
                          setFailedNewsImages((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-white/10 bg-zinc-800 group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[9.5px] text-zinc-400 mb-0.5 flex-wrap">
                          <span className="px-1.5 py-0.2 rounded bg-sky-950/60 text-sky-300 font-semibold border border-sky-500/20">
                            {item.source}
                          </span>
                          {item.isOldNews && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                              Última notícia
                            </span>
                          )}
                          <span className="truncate">{item.formattedDate}</span>
                        </div>
                        <h4 className="text-xs font-medium text-zinc-200 group-hover:text-white line-clamp-2 leading-snug">
                          {item.titlePt || item.title}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-zinc-900/30 border border-white/5 text-xs text-zinc-400 flex items-center justify-between">
                <span>sem notícias até o momento</span>
                <a
                  href={`https://myanimelist.net/anime/${anime.idMal || anime.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline flex items-center gap-1 font-medium ml-2 flex-shrink-0 text-[11px]"
                >
                  Ver no MyAnimeList <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Links Rápidos de Aprofundamento (Fichas Oficiais) */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500 text-[11px] font-medium mr-1">Fichas Oficiais:</span>
            <a
              href={`https://myanimelist.net/anime/${anime.idMal || anime.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
            >
              MyAnimeList <ExternalLink className="w-3 h-3" />
            </a>
            {anime.idAniList && (
              <a
                href={`https://anilist.co/anime/${anime.idAniList}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              >
                AniList <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <a
              href={`https://www.livechart.me/search?q=${encodeURIComponent(anime.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
            >
              LiveChart.me <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://animeschedule.net/anime?q=${encodeURIComponent(anime.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
            >
              AnimeSchedule <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Rodapé de Ações Fixo e Ultra-Compacto (-70% de altura) */}
        <div className="py-1.5 px-3 bg-black border-t border-white/10 flex items-center justify-between gap-2 flex-shrink-0 min-h-[38px]">
          <div className="flex items-center gap-2 min-w-0">
            {existingUserAnime || addedJustNow ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-500/30 whitespace-nowrap h-7">
                  <Check className="w-3 h-3 shrink-0" />
                  <span className="truncate">Na sua lista ({existingUserAnime?.status ? STATUS_CONFIG[existingUserAnime.status]?.label : 'Adicionado'})</span>
                </span>
                {existingUserAnime && onOpenInTracker && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenInTracker(existingUserAnime.id);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-white underline whitespace-nowrap cursor-pointer"
                  >
                    Ver no rastreador
                  </button>
                )}
              </div>
            ) : (
              <button
                id="schedule-modal-add-btn"
                type="button"
                onClick={() => handleAddToList(effectiveAggregatedStatus.isCurrentlyAiring ? 'watching' : 'plan_to_watch')}
                className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap h-7"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{effectiveAggregatedStatus.isCurrentlyAiring ? 'Começar a Assistir' : 'Adicionar à Lista'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-0.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-zinc-200 hover:text-white text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap h-7 flex items-center justify-center shrink-0"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

