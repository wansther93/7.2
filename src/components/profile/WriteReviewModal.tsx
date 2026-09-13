import React, { useState } from 'react';
import { X, Star, Search, AlertTriangle, Send } from 'lucide-react';
import type { Anime } from '../../types';
import { submitAnimeReview, type CommunityReview } from '../../services/communityService';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAnimes: Anime[];
  userId: string;
  userDisplayName: string;
  userNick?: string;
  userAvatarUrl?: string;
  onReviewCreated: (review: CommunityReview) => void;
}

export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  isOpen,
  onClose,
  userAnimes,
  userId,
  userDisplayName,
  userNick,
  userAvatarUrl,
  onReviewCreated,
}) => {
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rating, setRating] = useState<number>(10);
  const [content, setContent] = useState('');
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectAnime = (anime: Anime) => {
    setSelectedAnime(anime);
    if (typeof anime.rating === 'number' && anime.rating > 0) {
      setRating(anime.rating);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnime) {
      alert('Selecione um anime para avaliar.');
      return;
    }
    if (!content.trim() || content.trim().length < 10) {
      alert('Escreva uma resenha com pelo menos 10 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await submitAnimeReview({
        userId,
        userDisplayName: userDisplayName || 'Otaku',
        userNick: userNick || undefined,
        userAvatarUrl: userAvatarUrl || undefined,
        animeId: selectedAnime.id,
        animeTitle: selectedAnime.title,
        animeCoverUrl: selectedAnime.coverUrl || undefined,
        rating,
        content: content.trim(),
        hasSpoilers,
      });

      onReviewCreated(created);
      onClose();
    } catch (err) {
      console.error('Erro ao postar resenha:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAnimes = userAnimes.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0b0e18] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Topo */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">Escrever Resenha Comunitária</h3>
            <p className="text-xs text-slate-400">Compartilhe sua visão sincera com outros fãs de animes</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* 1. Escolha do Anime */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">Anime Avaliado</label>
            {selectedAnime ? (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedAnime.coverUrl ? (
                    <img
                      src={selectedAnime.coverUrl}
                      alt={selectedAnime.title}
                      referrerPolicy="no-referrer"
                      className="w-10 h-14 object-cover rounded-xl shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-10 h-14 rounded-xl bg-slate-800 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-white block truncate">
                      {selectedAnime.title}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Status na sua lista: {selectedAnime.status}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAnime(null)}
                  className="text-xs text-amber-400 hover:underline px-2 cursor-pointer font-semibold"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar anime na sua lista..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {filteredAnimes.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => handleSelectAnime(a)}
                      className="p-2 rounded-xl border border-white/5 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.06] flex items-center justify-between cursor-pointer select-none text-xs"
                    >
                      <span className="font-bold text-white truncate max-w-[280px]">{a.title}</span>
                      <span className="text-amber-400 font-bold shrink-0">
                        {a.rating ? `⭐ ${a.rating}` : 'Sem nota'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Nota */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">Sua Nota (1 a 10)</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="flex-1 accent-amber-400 cursor-pointer"
              />
              <span className="w-14 text-center font-black text-amber-400 text-sm px-2 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {rating.toFixed(1)}
              </span>
            </div>
          </div>

          {/* 3. Conteúdo da Resenha */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">Texto da Resenha</label>
            <textarea
              required
              rows={4}
              placeholder="O que achou da narrativa, animação, trilha sonora e final? Deixe sua análise..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* 4. Alerta de Spoiler */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Contém Spoilers?</span>
                <span className="text-[10px] text-slate-400 block">
                  Oculta o texto inicial com aviso para não estragar a experiência dos outros
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hasSpoilers}
              onChange={(e) => setHasSpoilers(e.target.checked)}
              className="w-4 h-4 accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Botões */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedAnime}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Publicando...' : 'Publicar Resenha'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
