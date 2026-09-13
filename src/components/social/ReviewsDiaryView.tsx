import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Star,
  Flame,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Eye,
  EyeOff,
  Search,
  Plus,
  Trash2,
  Share2,
  Check,
  BookOpen,
  Filter,
  Sparkles,
  ExternalLink,
  Smile,
  Clock,
  User,
  Tv
} from 'lucide-react';
import type { Anime } from '../../types';
import type { UserProfile } from '../../services/profileService';
import {
  CommunityReview,
  submitAnimeReview,
  deleteCommunityReview
} from '../../services/communityService';
import { ARCHETYPES } from './socialThemes';

interface ReviewsDiaryViewProps {
  myAnimes: Anime[];
  currentUserProfile: UserProfile | null;
  currentUserName: string;
  currentUserAvatar?: string;
  currentUserId?: string;
  isGuest?: boolean;
  reviews: CommunityReview[];
  onRefreshReviews: () => Promise<void>;
  onRequireAuth?: (action: string) => void;
  onOpenAnimeDetail?: (anime: Anime | string) => void;
  onVisitUserProfile?: (userIdOrNick: string) => void;
}

export const ReviewsDiaryView: React.FC<ReviewsDiaryViewProps> = ({
  myAnimes,
  currentUserProfile,
  currentUserName,
  currentUserAvatar,
  currentUserId,
  isGuest = false,
  reviews,
  onRefreshReviews,
  onRequireAuth,
  onOpenAnimeDetail,
  onVisitUserProfile,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'friends' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  
  // Reações locais (concordo / discordo / util)
  const [userReactions, setUserReactions] = useState<Record<string, 'agree' | 'disagree' | 'helpful'>>(() => {
    try {
      const saved = localStorage.getItem('wanime_review_reactions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Estado do formulário de nova review
  const [selectedAnimeTitle, setSelectedAnimeTitle] = useState('');
  const [reviewRating, setReviewRating] = useState<number>(10);
  const [oneLineVerdict, setOneLineVerdict] = useState('');
  const [fullReviewText, setFullReviewText] = useState('');
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [verdictType, setVerdictType] = useState<'recommend' | 'avoid'>('recommend');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtra as reviews
  const filteredReviews = useMemo(() => {
    let list = [...reviews];

    if (filterMode === 'mine') {
      list = list.filter((r) => r.userId === currentUserId);
    } else if (filterMode === 'friends') {
      const followingList = currentUserProfile?.following || [];
      list = list.filter((r) => followingList.includes(r.userId) || (r.userNick && followingList.includes(r.userNick)));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.animeTitle.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q) ||
          r.userDisplayName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [reviews, filterMode, searchQuery, currentUserId, currentUserProfile]);

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReaction = (reviewId: string, reaction: 'agree' | 'disagree' | 'helpful') => {
    if (isGuest && onRequireAuth) {
      onRequireAuth('Reagir a resenhas');
      return;
    }
    const updated = { ...userReactions, [reviewId]: reaction };
    setUserReactions(updated);
    localStorage.setItem('wanime_review_reactions', JSON.stringify(updated));
  };

  const handleOpenWriteModal = () => {
    if (isGuest && onRequireAuth) {
      onRequireAuth('Publicar resenhas no Diário');
      return;
    }
    // Seleciona o primeiro anime da lista se existir
    if (myAnimes.length > 0 && !selectedAnimeTitle) {
      setSelectedAnimeTitle(myAnimes[0].title);
      setReviewRating(myAnimes[0].rating || 10);
    }
    setIsWriteModalOpen(true);
  };

  const handleSelectAnime = (title: string) => {
    setSelectedAnimeTitle(title);
    const matched = myAnimes.find((a) => a.title === title);
    if (matched && matched.rating) {
      setReviewRating(matched.rating);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimeTitle || !fullReviewText.trim()) return;

    setIsSubmitting(true);
    try {
      const matched = myAnimes.find((a) => a.title === selectedAnimeTitle);
      const combinedContent = oneLineVerdict.trim()
        ? `[VEREDITO: ${verdictType === 'recommend' ? 'VALE A PENA' : 'PASSE LONGE'}] "${oneLineVerdict.trim()}"\n\n${fullReviewText.trim()}`
        : fullReviewText.trim();

      await submitAnimeReview({
        userId: currentUserId || 'guest_user',
        userDisplayName: currentUserName,
        userAvatarUrl: currentUserAvatar,
        userNick: currentUserProfile?.publicUsername || currentUserName.toLowerCase().replace(/\s+/g, ''),
        animeId: String(matched?.id || selectedAnimeTitle),
        animeTitle: selectedAnimeTitle,
        animeCoverUrl: matched?.coverUrl,
        rating: reviewRating,
        content: combinedContent,
        hasSpoilers,
      });

      // Limpa e fecha modal
      setOneLineVerdict('');
      setFullReviewText('');
      setHasSpoilers(false);
      setIsWriteModalOpen(false);
      await onRefreshReviews();
    } catch (err) {
      console.error('Erro ao enviar resenha:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Deseja realmente remover esta resenha?')) return;
    await deleteCommunityReview(reviewId, currentUserId);
    await onRefreshReviews();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* BARRA DE COMANDO SUPERIOR DO DIÁRIO */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Abas de Escopo */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800/80 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button
            id="btn-reviews-scope-all"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterMode === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas as Resenhas
          </button>
          <button
            id="btn-reviews-scope-friends"
            onClick={() => setFilterMode('friends')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterMode === 'friends'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Círculo de Amigos
          </button>
          <button
            id="btn-reviews-scope-mine"
            onClick={() => setFilterMode('mine')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterMode === 'mine'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Minhas Análises
          </button>
        </div>

        {/* Busca & Ação de Escrever */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por anime, crítico..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            id="btn-open-write-review-modal"
            onClick={handleOpenWriteModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 whitespace-nowrap flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Escrever Análise
          </button>
        </div>
      </div>

      {/* LISTA DE RESENHAS DO DIÁRIO */}
      {filteredReviews.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-slate-200 text-sm">
            Nenhuma análise encontrada neste mural
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {filterMode === 'mine'
              ? 'Você ainda não registrou nenhuma resenha. Compartilhe o seu veredito sobre qualquer anime da sua lista!'
              : 'Seja o primeiro a forjar uma crítica sincera para a comunidade.'}
          </p>
          <button
            onClick={handleOpenWriteModal}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Publicar Primeira Análise
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const isOwner = review.userId === currentUserId;
            const isSpoilerRevealed = revealedSpoilers.has(review.id);
            const userReaction = userReactions[review.id];

            // Extrai veredito em 1 frase se existir o padrão [VEREDITO: ...]
            const verdictMatch = review.content.match(/\[VEREDITO:\s*(VALE A PENA|PASSE LONGE)\]\s*"([^"]+)"/);
            const verdictPill = verdictMatch ? verdictMatch[1] : null;
            const verdictHeadline = verdictMatch ? verdictMatch[2] : null;
            const cleanContent = verdictMatch
              ? review.content.replace(/\[VEREDITO:[^\]]+\]\s*"[^"]+"\s*\n*/, '')
              : review.content;

            return (
              <article
                key={review.id}
                className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-xl space-y-4"
              >
                {/* CABEÇALHO DO CRÍTICO */}
                <div className="flex items-center justify-between">
                  <div 
                    className={`flex items-center gap-3 ${
                      review.source === 'anilist' ? 'cursor-default' : 'cursor-pointer group'
                    }`}
                    onClick={() => {
                      if (review.source !== 'anilist' && onVisitUserProfile) {
                        onVisitUserProfile(review.userNick || review.userId);
                      }
                    }}
                  >
                    <img
                      src={review.userAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={review.userDisplayName}
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-amber-500/30 group-hover:ring-amber-400 transition-all"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors">
                          {review.userDisplayName}
                        </h5>
                        {/* Tag discreta de Origem: AniList ou WAnime */}
                        {review.source === 'anilist' ? (
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                            AniList
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                            WAnime
                          </span>
                        )}
                        {review.userNick && review.source !== 'anilist' && (
                          <span className="text-[11px] text-slate-500 font-mono">
                            @{review.userNick}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(review.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Ações do Autor */}
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Excluir resenha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* FICHA DA OBRA ANALISADA */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    onClick={() => onOpenAnimeDetail && onOpenAnimeDetail(review.animeTitle)}
                  >
                    {review.animeCoverUrl ? (
                      <img
                        src={review.animeCoverUrl}
                        alt={review.animeTitle}
                        className="w-10 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                        <Tv className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Obra Analisada
                      </span>
                      <h6 className="font-bold text-sm text-slate-200 truncate hover:text-amber-400 transition-colors">
                        {review.animeTitle}
                      </h6>
                    </div>
                  </div>

                  {/* Nota & Selo de Veredito */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {verdictPill && (
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          verdictPill === 'VALE A PENA'
                            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                            : 'bg-rose-950/80 border-rose-500/40 text-rose-400'
                        }`}
                      >
                        {verdictPill === 'VALE A PENA' ? '👍 Vale a Pena' : '👎 Passe Longe'}
                      </span>
                    )}

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-black">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ★ {review.rating}/10
                    </div>
                  </div>
                </div>

                {/* MANCHETE / VEREDITO EM 1 FRASE */}
                {verdictHeadline && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border-l-4 border-amber-500 text-amber-200 text-xs font-bold italic">
                    "{verdictHeadline}"
                  </div>
                )}

                {/* TEXTO DA RESENHA (COM PROTEÇÃO CONTRA SPOILER) */}
                <div className="relative">
                  {review.hasSpoilers && !isSpoilerRevealed ? (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        Esta resenha contém Spoilers da trama!
                      </div>
                      <button
                        onClick={() => toggleSpoiler(review.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Revelar Análise com Spoiler
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                      {cleanContent}
                    </p>
                  )}
                </div>

                {/* BARRA DE REAÇÕES DE RESENHA */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleReaction(review.id, 'agree')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        userReaction === 'agree'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Concordo
                    </button>
                    <button
                      onClick={() => handleReaction(review.id, 'disagree')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        userReaction === 'disagree'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      Discordo
                    </button>
                    <button
                      onClick={() => handleReaction(review.id, 'helpful')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        userReaction === 'helpful'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Crítica Útil
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-500 font-mono">
                    Diário Otaku
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL PARA ESCREVER NOVA ANÁLISE OFICIAL */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div 
            id="write-review-modal"
            className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            <div className="p-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <h4 className="font-black text-slate-100 text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  Publicar Análise no Diário Otaku
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Toda resenha é vinculada a uma obra real da sua coleção
                </p>
              </div>
              <button
                onClick={() => setIsWriteModalOpen(false)}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Seleção do Anime */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Escolha o Anime da Sua Coleção
                </label>
                {myAnimes.length === 0 ? (
                  <p className="text-xs text-rose-400">
                    Você precisa ter pelo menos um anime salvo na sua lista para resenhar.
                  </p>
                ) : (
                  <select
                    value={selectedAnimeTitle}
                    onChange={(e) => handleSelectAnime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  >
                    {myAnimes.map((a) => (
                      <option key={a.id || a.title} value={a.title}>
                        {a.title} {a.rating ? `(Sua nota: ★ ${a.rating})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Nota e Selo de Recomendação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Sua Nota (1 a 10)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                      className="flex-1 accent-amber-500"
                    />
                    <span className="w-9 text-center font-black text-amber-400 text-sm bg-amber-950/60 border border-amber-500/30 rounded-lg py-1">
                      {reviewRating}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Veredito Rápido
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVerdictType('recommend')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        verdictType === 'recommend'
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      👍 Vale a Pena
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerdictType('avoid')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        verdictType === 'avoid'
                          ? 'bg-rose-950 border-rose-500 text-rose-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      👎 Passe Longe
                    </button>
                  </div>
                </div>
              </div>

              {/* O Veredito em 1 Frase */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  O Veredito em 1 Frase (Manchete marcante)
                </label>
                <input
                  type="text"
                  value={oneLineVerdict}
                  onChange={(e) => setOneLineVerdict(e.target.value)}
                  placeholder="Ex: 'O melhor arco de anime dos últimos 5 anos, sem exceções.'"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Análise Completa */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Análise Completa / Justificativa
                </label>
                <textarea
                  value={fullReviewText}
                  onChange={(e) => setFullReviewText(e.target.value)}
                  rows={4}
                  required
                  placeholder="Discorra sobre a animação, trilha sonora, ritmo, personagens e o que mais te marcou..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Aviso de Spoilers */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hasSpoilersCheck"
                  checked={hasSpoilers}
                  onChange={(e) => setHasSpoilers(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="hasSpoilersCheck" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Esta análise revela partes importantes do enredo (Spoilers)
                </label>
              </div>

              {/* Botões */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedAnimeTitle || !fullReviewText.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Publicando...' : 'Publicar Análise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
