import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, 
  ExternalLink, 
  Flame, 
  Film, 
  Tv, 
  Search, 
  Clock, 
  HeartHandshake, 
  AlertCircle,
  Newspaper,
  Plus,
  Check,
  CalendarRange,
  BookmarkCheck
} from 'lucide-react';
import { HorizontalScrollContainer } from './HorizontalScrollContainer';
import { NewsReaderModal } from './NewsReaderModal';
import { getAllAnimeNewsWithUserTags, getCachedNewsInstant, tagUserAnimesInNews, GUARANTEED_ANIME_ARTWORKS, type AnimeNewsItem } from '../services/newsService';
import type { Anime, AnimeFormData } from '../types';

interface NewsViewProps {
  userAnimes: Anime[];
  onAddAnimeFromNews?: (prefill: Partial<AnimeFormData>) => void;
  news?: AnimeNewsItem[];
  loading?: boolean;
  isFetching?: boolean;
  lastUpdatedTime?: string;
  onRefreshNews?: (isManual?: boolean) => Promise<void>;
}

export const NewsView: React.FC<NewsViewProps> = ({
  userAnimes,
  onAddAnimeFromNews,
  news: propsNews,
  loading: propsLoading,
  isFetching: propsFetching,
  lastUpdatedTime: propsLastUpdatedTime,
  onRefreshNews,
}) => {
  // Estado local para fallback caso não receba dados de nível superior
  const [localNews, setLocalNews] = useState<AnimeNewsItem[]>(() => getCachedNewsInstant(userAnimes));
  const [localLoading, setLocalLoading] = useState<boolean>(() => getCachedNewsInstant(userAnimes).length === 0);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  const [justUpdated, setJustUpdated] = useState<boolean>(false);
  const [localLastUpdatedTime, setLocalLastUpdatedTime] = useState<string>('');

  // Notícias ativas: prefere os dados mantidos vivos em memória no App.tsx
  const news = propsNews !== undefined ? propsNews : localNews;
  const isFetching = propsFetching !== undefined ? propsFetching : isManualRefreshing;
  const loading = (propsLoading !== undefined ? propsLoading : localLoading) && news.length === 0;
  const lastUpdatedTime = propsLastUpdatedTime || localLastUpdatedTime;

  const [selectedNewsToRead, setSelectedNewsToRead] = useState<AnimeNewsItem | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'my_animes' | 'trailers' | 'movies' | 'seasons'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    setJustUpdated(false);
    try {
      if (onRefreshNews) {
        await onRefreshNews(true);
      } else {
        const items = await getAllAnimeNewsWithUserTags(userAnimes, true);
        if (items && items.length > 0) {
          setLocalNews(items);
        }
        const now = new Date();
        setLocalLastUpdatedTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 2000);
    } catch (err) {
      console.error('Failed to load anime news', err);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Se userAnimes mudar e estivermos usando estado local, reetiqueta
  useEffect(() => {
    if (propsNews === undefined) {
      setLocalNews((prev) => (prev.length > 0 ? tagUserAnimesInNews(prev, userAnimes) : prev));
    }
  }, [userAnimes, propsNews]);

  // Se o componente pai não forneceu notícias e ainda não temos dados, busca uma vez
  useEffect(() => {
    if (propsNews === undefined && localNews.length === 0) {
      handleRefresh();
    }
  }, []);

  const handleImageError = (id: string) => {
    setFailedImageIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const filteredNews = useMemo(() => {
    let list = news;

    if (activeTab === 'my_animes') {
      list = list.filter((n) => n.isUserAnime);
    } else if (activeTab === 'trailers') {
      list = list.filter(
        (n) =>
          n.category === 'Trailer & Teaser' ||
          n.title.toLowerCase().includes('trailer') ||
          n.title.toLowerCase().includes('pv') ||
          n.title.toLowerCase().includes('teaser')
      );
    } else if (activeTab === 'movies') {
      list = list.filter(
        (n) =>
          n.category === 'Filme' ||
          n.title.toLowerCase().includes('filme') ||
          n.title.toLowerCase().includes('movie')
      );
    } else if (activeTab === 'seasons') {
      list = list.filter(
        (n) =>
          n.category === 'Nova Temporada' ||
          n.title.toLowerCase().includes('temporada') ||
          n.title.toLowerCase().includes('season') ||
          n.title.toLowerCase().includes('sequência')
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.titlePt && n.titlePt.toLowerCase().includes(q)) ||
          n.excerpt.toLowerCase().includes(q) ||
          (n.relatedAnimeTitle && n.relatedAnimeTitle.toLowerCase().includes(q))
      );
    }

    return list;
  }, [news, activeTab, searchQuery]);

  const myAnimesMatchesCount = useMemo(() => {
    return news.filter((n) => n.isUserAnime).length;
  }, [news]);

  return (
    <div className="w-full space-y-3 animate-in fade-in duration-150">
      {/* Título Centralizado Limpo e Compacto (Sem container pesado) */}
      <div className="w-full relative py-1 flex flex-col items-center justify-center text-center">
        <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center justify-center gap-1.5">
          <Newspaper className="w-4 h-4 text-rose-400 inline-block" />
          <span>Central de Notícias</span>
        </h2>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
          Notícias em tempo real de OtakuPT, Crunchyroll e ANN
          {lastUpdatedTime && <span className="text-slate-500"> • {lastUpdatedTime}</span>}
        </p>

        <div className="mt-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || isFetching}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-sm ${
              justUpdated
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : isFetching || loading
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-black/60 hover:bg-white/10 hover:text-white text-slate-200 border-white/15 active:scale-95'
            }`}
            title="Buscar notícias mais recentes agora"
          >
            {justUpdated ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching || loading ? 'animate-spin text-rose-400' : 'text-slate-400'}`} />
            )}
            <span>
              {justUpdated
                ? 'Atualizado!'
                : isFetching || loading
                ? 'Buscando...'
                : 'Atualizar Notícias'}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar Flutuantes */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
        {/* Category Tabs */}
        <HorizontalScrollContainer id="news-categories-container" scrollStep={140}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-[#0a0a0f] text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            Todas ({news.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_animes')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
              activeTab === 'my_animes'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-[#0a0a0f] text-amber-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            <HeartHandshake className="w-3 h-3" />
            <span>Na Lista ({myAnimesMatchesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seasons')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
              activeTab === 'seasons'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-[#0a0a0f] text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            <CalendarRange className="w-3 h-3 text-indigo-400" />
            <span>Temporadas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trailers')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
              activeTab === 'trailers'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-[#0a0a0f] text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            <Film className="w-3 h-3 text-rose-400" />
            <span>Trailers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('movies')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
              activeTab === 'movies'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-[#0a0a0f] text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            <Tv className="w-3 h-3 text-cyan-400" />
            <span>Filmes</span>
          </button>
        </HorizontalScrollContainer>

        {/* Search input */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar nas notícias..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {/* News Feed Grid / Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800/80">
          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
          <p className="text-sm font-bold text-white">Buscando novidades globais...</p>
          <p className="text-xs text-slate-400">Consultando feeds e cruzando com seus animes</p>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-3xl border border-slate-800">
          <AlertCircle className="w-10 h-10 text-slate-500 mb-2" />
          <h4 className="text-sm font-bold text-white mb-1">Nenhuma notícia encontrada</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            {activeTab === 'my_animes'
              ? 'Nenhum dos animes da sua lista foi citado nas notícias mais recentes.'
              : 'Tente alterar os filtros de categoria ou a busca.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredNews.map((item) => {
            const hasFailedImg = failedImageIds.has(item.id);
            const displayTitle = item.titlePt || item.title;
            const displayExcerpt = item.excerptPt || item.excerpt;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedNewsToRead(item)}
                className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 hover:border-slate-700 bg-slate-900/70 hover:bg-slate-900/90 flex flex-row gap-3 shadow-sm group cursor-pointer ${
                  item.isUserAnime
                    ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-slate-900/80 to-slate-900/60 ring-1 ring-amber-500/20'
                    : 'border-slate-800/80'
                }`}
              >
                {/* Thumbnail (Compacta e elegante com fallback garantido) */}
                <div className="relative w-24 sm:w-28 h-24 sm:h-24 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 flex items-center justify-center">
                  <img
                    src={
                      !hasFailedImg && item.imageUrl
                        ? item.imageUrl
                        : GUARANTEED_ANIME_ARTWORKS[
                            Math.abs(item.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) %
                              GUARANTEED_ANIME_ARTWORKS.length
                          ]
                    }
                    alt={displayTitle}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    onError={() => handleImageError(item.id)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Source Tag */}
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/85 backdrop-blur-md text-[8.5px] font-bold text-slate-300 border border-white/10">
                    {item.source}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    {/* Badges & Date */}
                    <div className="flex items-center gap-1 flex-wrap mb-1">
                      {item.isUserAnime && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black flex items-center gap-0.5">
                          <HeartHandshake className="w-2.5 h-2.5" />
                          Na sua Lista
                        </span>
                      )}

                      {item.category && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold flex items-center gap-0.5">
                          {item.category.includes('Trailer') ? (
                            <Film className="w-2.5 h-2.5" />
                          ) : item.category.includes('Temporada') ? (
                            <Flame className="w-2.5 h-2.5" />
                          ) : (
                            <Tv className="w-2.5 h-2.5" />
                          )}
                          {item.category}
                        </span>
                      )}

                      <span className="text-[9.5px] text-slate-500 flex items-center gap-1 ml-auto shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {item.formattedDate || item.date}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs sm:text-[13px] font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-2 leading-snug">
                      {displayTitle}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {displayExcerpt}
                    </p>
                  </div>

                  {/* Actions Link */}
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-800/60">
                    <span className="text-[9.5px] text-slate-400">
                      Toque para ler
                    </span>
                    <span className="text-[10px] font-semibold text-rose-400 group-hover:text-rose-300 flex items-center gap-1">
                      <span>Leitura Rápida</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leitor Rápido de Notícias em Modal */}
      {selectedNewsToRead && (
        <NewsReaderModal
          news={selectedNewsToRead}
          onClose={() => setSelectedNewsToRead(null)}
        />
      )}
    </div>
  );
};
