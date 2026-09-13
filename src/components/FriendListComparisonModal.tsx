import React, { useState, useMemo } from 'react';
import {
  X,
  HeartHandshake,
  Heart,
  Star,
  Plus,
  Check,
  Flame,
  Tv,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BookmarkPlus,
  Users
} from 'lucide-react';
import type { Anime, AnimeFormData } from '../types';

interface FriendListComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendName: string;
  friendAvatar?: string;
  friendUserId: string;
  friendAnimes: Anime[];
  myAnimes: Anime[];
  onAddAnimeFromFriend: (animeData: Partial<AnimeFormData>) => void;
  onOpenAnimeDetail?: (anime: Anime) => void;
}

export const FriendListComparisonModal: React.FC<FriendListComparisonModalProps> = ({
  isOpen,
  onClose,
  friendName,
  friendAvatar,
  friendUserId,
  friendAnimes,
  myAnimes,
  onAddAnimeFromFriend,
  onOpenAnimeDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'common' | 'friend_recs' | 'my_recs'>('common');
  const [addedAnimeIds, setAddedAnimeIds] = useState<Set<string>>(new Set());

  // Normalização de títulos para cruzamento confiável
  const normalizeTitle = (t: string) => {
    return (t || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');
  };

  const comparisonData = useMemo(() => {
    const myMap = new Map<string, Anime>();
    myAnimes.forEach((a) => {
      myMap.set(normalizeTitle(a.title), a);
      if (a.japaneseTitle) {
        myMap.set(normalizeTitle(a.japaneseTitle), a);
      }
    });

    const common: { friendAnime: Anime; myAnime: Anime }[] = [];
    const friendOnly: Anime[] = [];

    friendAnimes.forEach((fa) => {
      const fNorm = normalizeTitle(fa.title);
      const fJapNorm = fa.japaneseTitle ? normalizeTitle(fa.japaneseTitle) : '';
      const match = myMap.get(fNorm) || (fJapNorm ? myMap.get(fJapNorm) : undefined);

      if (match) {
        // Evita duplicatas na listagem em comum
        if (!common.some((c) => c.friendAnime.id === fa.id || c.myAnime.id === match.id)) {
          common.push({ friendAnime: fa, myAnime: match });
        }
      } else {
        friendOnly.push(fa);
      }
    });

    // Animes que eu tenho mas o amigo não tem
    const friendNormSet = new Set(
      friendAnimes.flatMap((a) => [normalizeTitle(a.title), a.japaneseTitle ? normalizeTitle(a.japaneseTitle) : '']).filter(Boolean)
    );

    const myOnly = myAnimes.filter((ma) => {
      const mNorm = normalizeTitle(ma.title);
      const mJapNorm = ma.japaneseTitle ? normalizeTitle(ma.japaneseTitle) : '';
      return !friendNormSet.has(mNorm) && (!mJapNorm || !friendNormSet.has(mJapNorm));
    });

    // Recomendações do Amigo: Animes que ele avaliou bem (nota >= 7 ou assistido)
    const friendRecs = friendOnly
      .filter((a) => (typeof a.rating === 'number' && a.rating >= 7) || a.status === 'completed' || a.status === 'watching')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Recomendações Suas para o amigo
    const myRecs = myOnly
      .filter((a) => (typeof a.rating === 'number' && a.rating >= 7) || a.status === 'completed' || a.status === 'watching')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Cálculo do Match Otaku (%)
    const totalDistinct = new Set([...friendAnimes.map((a) => normalizeTitle(a.title)), ...myAnimes.map((a) => normalizeTitle(a.title))]).size;
    
    let affinityScore = 0;
    if (totalDistinct > 0) {
      const baseOverlap = (common.length / Math.min(friendAnimes.length || 1, myAnimes.length || 1)) * 75;
      
      // Bônus de afinidade de notas para animes em comum
      let scoreBonus = 0;
      let ratedCount = 0;
      common.forEach((c) => {
        if (typeof c.friendAnime.rating === 'number' && typeof c.myAnime.rating === 'number') {
          const diff = Math.abs(c.friendAnime.rating - c.myAnime.rating);
          if (diff <= 1) scoreBonus += 2.5;
          else if (diff <= 2) scoreBonus += 1.5;
          ratedCount++;
        }
      });

      affinityScore = Math.min(99, Math.max(15, Math.round(baseOverlap + scoreBonus)));
    }

    return {
      common,
      friendRecs,
      myRecs,
      affinityScore,
      bothLovedCount: common.filter(
        (c) => (c.friendAnime.rating || 0) >= 8 && (c.myAnime.rating || 0) >= 8
      ).length,
    };
  }, [friendAnimes, myAnimes]);

  if (!isOpen) return null;

  const handleAdd = (anime: Anime) => {
    onAddAnimeFromFriend({
      title: anime.title,
      japaneseTitle: anime.japaneseTitle,
      coverUrl: anime.coverUrl,
      genres: anime.genres,
      totalEpisodes: anime.totalEpisodes,
      studio: anime.studio,
      broadcastDay: anime.broadcastDay,
      status: 'plan_to_watch',
      synopsis: anime.synopsis,
      rating: null,
      notes: `Recomendado por ${friendName}`,
    });

    setAddedAnimeIds((prev) => {
      const next = new Set(prev);
      next.add(anime.id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">Comparador de Listas</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400" />
                  Match Otaku
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Você e <span className="text-indigo-300 font-bold">{friendName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Affinity Score Banner */}
        <div className="p-4 sm:p-5 bg-slate-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* Circular or pill score */}
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 via-indigo-500 to-purple-500 flex flex-col items-center justify-center text-white font-black shadow-lg shadow-purple-500/20 shrink-0">
                <span className="text-xl leading-none">{comparisonData.affinityScore}%</span>
                <span className="text-[8px] uppercase tracking-wider font-bold opacity-80">Match</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                {comparisonData.affinityScore >= 80 ? (
                  <>
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Gostos Praticamente Idênticos!</span>
                  </>
                ) : comparisonData.affinityScore >= 50 ? (
                  <>
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span>Ótima Afinidade Otaku</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Novos Mundos para Descobrir</span>
                  </>
                )}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Vocês compartilham <strong className="text-indigo-300">{comparisonData.common.length}</strong> animes no catálogo.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto shrink-0">
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-medium">Em Comum</span>
              <span className="text-sm font-black text-white">{comparisonData.common.length}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-medium">Ambos Amam</span>
              <span className="text-sm font-black text-amber-300">{comparisonData.bothLovedCount}</span>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="px-4 pt-3 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('common')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'common'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Em Comum ({comparisonData.common.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('friend_recs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'friend_recs'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Recomendações do Amigo ({comparisonData.friendRecs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_recs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'my_recs'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Seus Destaques para Ele ({comparisonData.myRecs.length})</span>
          </button>
        </div>

        {/* Tab Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          
          {/* TAB 1: EM COMUM */}
          {activeTab === 'common' && (
            comparisonData.common.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Tv className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Nenhum anime em comum encontrado ainda</p>
                <p className="text-xs text-slate-500 mt-1">Confira a aba de recomendações para pegar dicas da lista do seu amigo!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {comparisonData.common.map(({ friendAnime, myAnime }) => (
                  <div
                    key={friendAnime.id}
                    className="p-3 bg-slate-950/70 hover:bg-slate-950 border border-slate-800/90 rounded-2xl flex items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                        {friendAnime.coverUrl ? (
                          <img
                            src={friendAnime.coverUrl}
                            alt={friendAnime.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Tv className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h5 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                          {friendAnime.title}
                        </h5>
                        <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{friendAnime.genres?.[0] || 'Anime'}</span>
                          <span>•</span>
                          <span>{friendAnime.totalEpisodes ? `${friendAnime.totalEpisodes} eps` : 'Em exibição'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Ratings Comparison */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2 text-right">
                        <div className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-medium">Você</span>
                          <span className="text-xs font-black text-indigo-400 flex items-center gap-1 justify-end">
                            <Star className="w-3 h-3 fill-indigo-400 text-indigo-400" />
                            {myAnime.rating ? myAnime.rating : '-'}
                          </span>
                        </div>

                        <div className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-medium">{friendName.slice(0, 7)}</span>
                          <span className="text-xs font-black text-purple-400 flex items-center gap-1 justify-end">
                            <Star className="w-3 h-3 fill-purple-400 text-purple-400" />
                            {friendAnime.rating ? friendAnime.rating : '-'}
                          </span>
                        </div>
                      </div>

                      {onOpenAnimeDetail && (
                        <button
                          type="button"
                          onClick={() => onOpenAnimeDetail(myAnime)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-slate-400 hover:text-white transition-all cursor-pointer"
                          title="Ver Ficha Detalhada"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 2: RECOMENDAÇÕES DO AMIGO (Que você não tem) */}
          {activeTab === 'friend_recs' && (
            comparisonData.friendRecs.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Check className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Você já assistiu ou adicionou todos os destaques do amigo!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {comparisonData.friendRecs.map((anime) => {
                  const isAdded = addedAnimeIds.has(anime.id);
                  return (
                    <div
                      key={anime.id}
                      className="p-3 bg-slate-950/70 hover:bg-slate-950 border border-slate-800/90 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                          {anime.coverUrl ? (
                            <img
                              src={anime.coverUrl}
                              alt={anime.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Tv className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate">{anime.title}</h5>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            {anime.rating && (
                              <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400" />
                                {anime.rating}
                              </span>
                            )}
                            <span>•</span>
                            <span className="truncate">{anime.genres?.[0] || 'Anime'}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAdd(anime)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Adicionado</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 3: SEUS DESTAQUES PARA O AMIGO */}
          {activeTab === 'my_recs' && (
            comparisonData.myRecs.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Nenhum anime adicional para sugerir</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {comparisonData.myRecs.map((anime) => (
                  <div
                    key={anime.id}
                    className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl flex items-center gap-3"
                  >
                    <div className="w-11 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                      {anime.coverUrl ? (
                        <img
                          src={anime.coverUrl}
                          alt={anime.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Tv className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-white truncate">{anime.title}</h5>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-amber-400 font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />
                          Sua nota: {anime.rating || '-'}
                        </span>
                        <span>•</span>
                        <span className="truncate">{anime.genres?.[0] || 'Anime'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
