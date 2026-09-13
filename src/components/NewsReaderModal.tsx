import React from 'react';
import { X, ExternalLink, Calendar, User, Newspaper, BookmarkCheck, Share2, Check } from 'lucide-react';
import type { AnimeNewsItem } from '../services/newsService';
import { copyToClipboard } from '../lib/clipboard';

interface NewsReaderModalProps {
  news: AnimeNewsItem | null;
  onClose: () => void;
}

export const NewsReaderModal: React.FC<NewsReaderModalProps> = ({ news, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  if (!news) return null;

  const handleShare = async () => {
    if (news.url) {
      const success = await copyToClipboard(news.url);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const displayTitle = news.titlePt || news.title;
  const displayExcerpt = news.excerptPt || news.excerpt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0c0c14] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header com botões de ação */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0e0e18]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold tracking-wider uppercase">
              {news.source}
            </span>
            {news.category && (
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 text-[10px] font-medium">
                {news.category}
              </span>
            )}
            {news.isUserAnime && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                <BookmarkCheck className="w-2.5 h-2.5" /> Na sua lista
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShare}
              title="Copiar link da notícia"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Imagem de Capa */}
          {news.imageUrl && !imgError && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 shadow-md">
              <img
                src={news.imageUrl}
                alt={displayTitle}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            </div>
          )}

          {/* Metadados de Data e Autor */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {news.formattedDate}
            </span>
            {news.authorName && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                {news.authorName}
              </span>
            )}
          </div>

          {/* Título Principal */}
          <h1 className="text-lg sm:text-xl font-bold text-white leading-snug">
            {displayTitle}
          </h1>

          {/* Conteúdo / Resumo da Notícia */}
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed pt-2 border-t border-white/5">
            <p className="text-slate-200 font-medium">
              {displayExcerpt}
            </p>

            {news.relatedAnimeTitle && (
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-slate-300">
                    Anime relacionado: <strong className="text-white font-semibold">{news.relatedAnimeTitle}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer com link original */}
        <div className="px-4 py-3 border-t border-white/10 bg-[#0e0e18]/90 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            Fonte oficial: <strong className="text-slate-300">{news.source}</strong>
          </p>

          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Ver Matéria Completa</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
