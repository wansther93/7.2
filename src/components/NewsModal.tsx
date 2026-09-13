import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
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
  CalendarRange
} from 'lucide-react';
import { getAllAnimeNewsWithUserTags, getCachedNewsInstant, type AnimeNewsItem } from '../services/newsService';
import type { Anime, AnimeFormData } from '../types';
import { HorizontalScrollContainer } from './HorizontalScrollContainer';

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAnimes: Anime[];
  onAddAnimeFromNews?: (prefill: Partial<AnimeFormData>) => void;
  news?: AnimeNewsItem[];
  loading?: boolean;
  isFetching?: boolean;
  onRefreshNews?: (isManual?: boolean) => Promise<void>;
}

export const NewsModal: React.FC<NewsModalProps> = ({
  isOpen,
  onClose,
  userAnimes,
  onAddAnimeFromNews,
  news: propsNews,
  loading: propsLoading,
  isFetching: propsFetching,
  onRefreshNews,
}) => {
  const [localNews, setLocalNews] = useState<AnimeNewsItem[]>(() => getCachedNewsInstant(userAnimes));
  const [localLoading, setLocalLoading] = useState<boolean>(() => getCachedNewsInstant(userAnimes).length === 0);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my_animes' | 'trailers' | 'movies' | 'seasons'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());

  const news = propsNews !== undefined ? propsNews : localNews;
  const isFetching = propsFetching !== undefined ? propsFetching : isManualRefreshing;
  const loading = (propsLoading !== undefined ? propsLoading : localLoading) && news.length === 0;

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      if (onRefreshNews) {
        await onRefreshNews(true);
      } else {
        const items = await getAllAnimeNewsWithUserTags(userAnimes, true);
        if (items && items.length > 0) setLocalNews(items);
      }
    } catch (err) {
      console.error('Failed to load anime news', err);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && propsNews === undefined && localNews.length === 0) {
      handleRefresh();
    }
  }, [isOpen]);

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
      list = list.filter((n) => n.category === 'Trailer & Teaser' || n.title.toLowerCase().includes('trailer') || n.title.toLowerCase().includes('pv') || n.title.toLowerCase().includes('teaser'));
    } else if (activeTab === 'movies') {
      list = list.filter((n) => n.category === 'Filme' || n.title.toLowerCase().includes('filme') || n.title.toLowerCase().includes('movie'));
    } else if (activeTab === 'seasons') {
      list = list.filter((n) => n.category === 'Nova Temporada' || n.title.toLowerCase().includes('temporada') || n.title.toLowerCase().includes('season') || n.title.toLowerCase().includes('sequência'));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((n) => 
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh] sm:h-[85vh] max-h-[850px]">
        {/* Compact Header */}
        <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30 shrink-0">
              <Newspaper className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white truncate">Central de Notícias</h3>
                <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold items-center gap-1 shrink-0">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Feed Global
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Novidades, trailers e estreias do mundo otaku
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || isFetching}
              title="Buscar notícias mais recentes agora"
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching || loading ? 'animate-spin text-rose-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Compact Controls: Tabs and Search */}
        <div className="px-3 sm:px-4 py-2 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          {/* Scrollable Tabs with Auto-Center */}
          <HorizontalScrollContainer id="news-modal-tabs-container" scrollStep={140} autoCenterOnClick={true}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'all'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              🌍 Todas ({news.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my_animes')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
                activeTab === 'my_animes'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'bg-slate-800/80 text-amber-300 hover:bg-slate-800'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Minha Lista ({myAnimesMatchesCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('seasons')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
                activeTab === 'seasons'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <CalendarRange className="w-3 h-3 text-indigo-400" />
              <span>Temporadas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('trailers')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
                activeTab === 'trailers'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Film className="w-3 h-3 text-rose-400" />
              <span>Trailers</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('movies')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
                activeTab === 'movies'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Tv className="w-3 h-3 text-cyan-400" />
              <span>Filmes</span>
            </button>
          </HorizontalScrollContainer>

          {/* Search Box */}
          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nas notícias..."
              className="w-full pl-8 pr-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center space-y-2">
              <RefreshCw className="w-7 h-7 text-rose-500 animate-spin" />
              <p className="text-xs sm:text-sm font-bold text-white">Carregando novidades globais...</p>
              <p className="text-[11px] text-slate-400">Consultando feeds e cruzando com sua coleção</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-2xl border border-slate-800">
              <AlertCircle className="w-10 h-10 text-slate-500 mb-2" />
              <h4 className="text-sm font-bold text-white mb-1">Nenhuma notícia encontrada</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                {activeTab === 'my_animes'
                  ? 'Nenhum dos seus animes rastreados foi citado nas manchetes mais recentes.'
                  : 'Tente alterar os filtros ou o termo de busca.'}
              </p>
            </div>
          ) : (
            filteredNews.map((item) => {
              const hasFailedImg = failedImageIds.has(item.id);
              const displayTitle = item.titlePt || item.title;
              const displayExcerpt = item.excerptPt || item.excerpt;

              return (
                <div
                  key={item.id}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all hover:border-slate-700 bg-slate-950/60 flex flex-col sm:flex-row gap-3 ${
                    item.isUserAnime
                      ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-slate-950/80 to-slate-950/60 shadow-lg'
                      : 'border-slate-800/80'
                  }`}
                >
                  {/* Thumbnail / Placeholder */}
                  <div className="relative w-full sm:w-36 h-28 sm:h-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0 flex items-center justify-center">
                    {item.imageUrl && !hasFailedImg ? (
                      <img
                        src={item.imageUrl}
                        alt={displayTitle}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={() => handleImageError(item.id)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-slate-500 p-2 text-center">
                        <Newspaper className="w-6 h-6 text-rose-500/70 mb-1" />
                        <span className="text-[9px] font-bold text-slate-400 line-clamp-1">{item.source}</span>
                      </div>
                    )}

                    {/* Source Pill */}
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[9px] font-bold text-slate-300">
                      {item.source}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {item.isUserAnime && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold flex items-center gap-1">
                            <HeartHandshake className="w-3 h-3" />
                            Na sua Lista: {item.relatedAnimeTitle}
                          </span>
                        )}

                        {item.category && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                            {item.category.includes('Trailer') ? (
                              <Film className="w-3 h-3" />
                            ) : item.category.includes('Temporada') ? (
                              <Flame className="w-3 h-3" />
                            ) : (
                              <Tv className="w-3 h-3" />
                            )}
                            {item.category}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-500 flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {item.formattedDate || item.date}
                        </span>
                      </div>

                      {/* Title */}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-bold text-white hover:text-rose-400 transition-colors line-clamp-2"
                      >
                        {displayTitle}
                      </a>

                      {/* Excerpt */}
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {displayExcerpt}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end mt-2 pt-2 border-t border-slate-900">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 hover:text-white text-[10px] font-bold text-slate-300 border border-slate-800 transition-all cursor-pointer"
                      >
                        <span>Ler matéria completa</span>
                        <ExternalLink className="w-3 h-3 text-rose-400" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
