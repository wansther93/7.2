import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  ArrowLeft, 
  Lock, 
  ExternalLink, 
  Copy, 
  Check 
} from 'lucide-react';
import type { Anime, AnimeFormData } from '../types';
import type { UserProfile } from '../services/profileService';
import { AnimeDetailModal } from './AnimeDetailModal';
import { OtakuProfileView } from './profile/OtakuProfileView';
import { getRecentReviews, type CommunityReview } from '../services/communityService';
import { copyToClipboard } from '../lib/clipboard';

interface SharedListPublicViewProps {
  ownerUserId: string;
  ownerProfile: UserProfile | null;
  animes: Anime[];
  loading: boolean;
  onGoToMyList: () => void;
  currentUserId?: string;
  isGuest?: boolean;
  myAnimes?: Anime[];
  onAddAnimeFromFriend?: (animeData: Partial<AnimeFormData>) => void;
  onRequireAuth?: (action: string) => void;
}

export const SharedListPublicView: React.FC<SharedListPublicViewProps> = ({
  ownerUserId,
  ownerProfile,
  animes,
  loading,
  onGoToMyList,
  currentUserId,
  myAnimes = [],
  onAddAnimeFromFriend,
}) => {
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [copied, setCopied] = useState(false);
  const [reviews, setReviews] = useState<CommunityReview[]>([]);

  const isMe = Boolean(currentUserId && ownerUserId && currentUserId === ownerUserId);
  const isPrivate = !isMe && ownerProfile?.isPublicList === false;

  // Carrega resenhas comunitárias
  useEffect(() => {
    getRecentReviews().then((revs) => {
      setReviews(revs);
    }).catch(console.error);
  }, []);

  const handleCopyPublicUrl = async () => {
    await copyToClipboard(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onGoToMyList}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Voltar para Minha Lista</span>
            </button>

            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-md shadow-amber-400/20">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <span>Perfil Otaku</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                  Público
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPublicUrl}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span className="hidden sm:inline">{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>

            <button
              type="button"
              onClick={onGoToMyList}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
            >
              <span>Acessar App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 w-full flex-1">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Carregando perfil e coleção de animes...</p>
          </div>
        )}

        {!loading && isPrivate && (
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-[#0a0d16] border border-white/10 rounded-3xl space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Este perfil está privado</h2>
              <p className="text-xs text-slate-400">
                O proprietário desta coleção configurou a visibilidade do perfil como privada.
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToMyList}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-lg shadow-amber-400/20"
            >
              Acessar Minha Lista
            </button>
          </div>
        )}

        {!loading && !isPrivate && (
          <OtakuProfileView
            profile={ownerProfile}
            animes={animes}
            isOwner={isMe}
            currentUserId={currentUserId}
            myAnimes={myAnimes}
            reviews={reviews}
            onOpenAnimeDetail={(anime) => setSelectedAnime(anime)}
            onReviewCreated={(newRev) => setReviews((prev) => [newRev, ...prev])}
            onAddAnimeFromFriend={(prefill) => {
              if (onAddAnimeFromFriend) onAddAnimeFromFriend(prefill as any);
            }}
          />
        )}
      </main>

      {/* Modal de Detalhes do Anime */}
      {selectedAnime && (
        <AnimeDetailModal
          anime={selectedAnime}
          isOpen={true}
          onClose={() => setSelectedAnime(null)}
          onEdit={() => {}}
          onDelete={() => {}}
          onIncrement={() => {}}
          onDecrement={() => {}}
          onSetEpisode={() => {}}
          onUpdateStatus={() => {}}
          onUpdateRating={() => {}}
          onToggleSeasonWatched={() => {}}
          isReadOnly={true}
        />
      )}
    </div>
  );
};
