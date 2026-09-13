import React, { useState, useMemo } from 'react';
import {
  X,
  Swords,
  Flame,
  Heart,
  Star,
  Plus,
  Check,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  AlertTriangle,
  Zap,
  BookmarkPlus
} from 'lucide-react';
import type { Anime } from '../../types';
import type { UserProfile } from '../../services/profileService';
import { calculateCompatibilityScore } from '../../services/communityService';
import { PROFILE_THEMES, ARCHETYPES } from './socialThemes';

interface CollectionVersusModalProps {
  isOpen: boolean;
  onClose: () => void;
  myAnimes: Anime[];
  myProfile: UserProfile | null;
  myUserName: string;
  myAvatar?: string;
  friendAnimes: Anime[];
  friendProfile: UserProfile | null;
  friendUserName: string;
  friendAvatar?: string;
  onAddAnimeToMyList: (animeData: Partial<Anime>) => void;
  onOpenAnimeDetail?: (anime: Anime) => void;
}

export const CollectionVersusModal: React.FC<CollectionVersusModalProps> = ({
  isOpen,
  onClose,
  myAnimes,
  myProfile,
  myUserName,
  myAvatar,
  friendAnimes,
  friendProfile,
  friendUserName,
  friendAvatar,
  onAddAnimeToMyList,
  onOpenAnimeDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'clash' | 'recommendations' | 'friend_list'>('clash');
  const [listFilter, setListFilter] = useState<'all' | 'completed' | 'watching' | 'favorites'>('all');
  const [listSearch, setListSearch] = useState('');
  const [addedAnimeIds, setAddedAnimeIds] = useState<Set<string>>(new Set());

  // Calcular pontuação de ressonância
  const compatibility = useMemo(() => {
    return calculateCompatibilityScore(myAnimes, friendAnimes);
  }, [myAnimes, friendAnimes]);

  // Checar se anime já está na lista do usuário
  const myAnimeTitles = useMemo(() => {
    return new Set(myAnimes.map((a) => (a.title || '').trim().toLowerCase()));
  }, [myAnimes]);

  if (!isOpen) return null;

  const myTheme = PROFILE_THEMES[myProfile?.cardTheme || 'cyberpunk'];
  const friendTheme = PROFILE_THEMES[friendProfile?.cardTheme || 'cyberpunk'];

  const myArchetype = ARCHETYPES[myProfile?.archetype || 'noble_heart'];
  const friendArchetype = ARCHETYPES[friendProfile?.archetype || 'noble_heart'];

  const handleQuickAdd = (anime: Anime) => {
    onAddAnimeToMyList({
      title: anime.title,
      japaneseTitle: anime.japaneseTitle,
      coverUrl: anime.coverUrl,
      synopsis: anime.synopsis,
      genres: anime.genres,
      status: 'plan_to_watch',
      currentEpisode: 0,
      totalEpisodes: anime.totalEpisodes,
      rating: 0,
      format: anime.format,
      releaseYear: anime.releaseYear,
    });
    setAddedAnimeIds((prev) => new Set(prev).add(String(anime.id || anime.title)));
  };

  const filteredFriendAnimes = friendAnimes.filter((a) => {
    if (listSearch) {
      const q = listSearch.toLowerCase();
      const matchTitle = (a.title || '').toLowerCase().includes(q);
      const matchJap = (a.japaneseTitle || '').toLowerCase().includes(q);
      if (!matchTitle && !matchJap) return false;
    }
    if (listFilter === 'completed') return a.status === 'completed';
    if (listFilter === 'watching') return a.status === 'watching';
    if (listFilter === 'favorites') return (a.rating || 0) >= 9;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        id="versus-modal-container"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* CABEÇALHO DO DUELO (VS ARENA) */}
        <div className="relative p-5 sm:p-7 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800/80">
          <button
            id="btn-close-versus-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors z-20"
            aria-label="Fechar duelo"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Confronto Visual: Você VS Amigo */}
          <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 max-w-2xl mx-auto">
            {/* Lado Esquerdo: Você */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <img
                  src={myAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80'}
                  alt={myUserName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-cyan-400/60 shadow-lg shadow-cyan-500/20"
                />
                <span className="absolute -bottom-2 -right-1 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-md">
                  Você
                </span>
              </div>
              <h3 className="mt-3 font-black text-sm sm:text-base text-slate-100 truncate max-w-[120px] sm:max-w-[160px]">
                {myUserName}
              </h3>
              <p className="text-[11px] text-cyan-400 font-medium truncate">
                {myArchetype.title}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {myAnimes.length} animes salvos
              </span>
            </div>

            {/* Centro: Termômetro de Ressonância Otaku */}
            <div className="flex flex-col items-center justify-center text-center px-2">
              <div className="flex items-center gap-1 text-amber-400 font-black text-xs uppercase tracking-widest mb-1">
                <Swords className="w-4 h-4" />
                Duelo de Coleções
              </div>
              
              <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900 border-2 border-amber-500/40 shadow-inner shadow-black">
                <div className="flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
                    {compatibility.scorePercent}%
                  </span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">
                    Ressonância
                  </span>
                </div>
              </div>

              <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                {compatibility.levelDescription}
              </div>
            </div>

            {/* Lado Direito: Amigo */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <img
                  src={friendAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80'}
                  alt={friendUserName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-pink-400/60 shadow-lg shadow-pink-500/20"
                />
                <span className="absolute -bottom-2 -left-1 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-pink-950 border border-pink-500/40 text-pink-300 rounded-md">
                  Amigo
                </span>
              </div>
              <h3 className="mt-3 font-black text-sm sm:text-base text-slate-100 truncate max-w-[120px] sm:max-w-[160px]">
                {friendUserName}
              </h3>
              <p className="text-[11px] text-pink-400 font-medium truncate">
                {friendArchetype.title}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {friendAnimes.length} animes salvos
              </span>
            </div>
          </div>

          {/* Abas de Navegação Internas do Duelo */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              id="btn-versus-tab-clash"
              onClick={() => setActiveTab('clash')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'clash'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Confronto & Divergências ({compatibility.sharedFavorites.length + compatibility.epicDivergences.length})
            </button>
            <button
              id="btn-versus-tab-recommendations"
              onClick={() => setActiveTab('recommendations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'recommendations'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Recomendações Cruzadas ({compatibility.crossRecommendations.length})
            </button>
            <button
              id="btn-versus-tab-friend-list"
              onClick={() => setActiveTab('friend_list')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'friend_list'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Lista Completa ({friendAnimes.length})
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL SCROLLÁVEL */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* 1. VISÃO DE CONFRONTO E DIVERGÊNCIAS */}
          {activeTab === 'clash' && (
            <div className="space-y-6">
              {/* O que Amamos em Comum */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
                    <h4 className="font-bold text-slate-100 text-sm sm:text-base">
                      O Que Amamos em Comum (Ambos deram 8+)
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">
                    {compatibility.sharedFavorites.length} obras
                  </span>
                </div>

                {compatibility.sharedFavorites.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs">
                    Nenhum anime em comum com nota 8 ou superior ainda. Vocês têm gostos bem peculiares!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {compatibility.sharedFavorites.map((fav, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all"
                      >
                        <img
                          src={fav.coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=120&auto=format&fit=crop&q=80'}
                          alt={fav.title}
                          className="w-12 h-16 rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs sm:text-sm text-slate-200 truncate">
                            {fav.title}
                          </h5>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-cyan-300 font-semibold flex items-center gap-1">
                              <Star className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                              Você: ★{fav.userScore}
                            </span>
                            <span className="text-[11px] text-pink-300 font-semibold flex items-center gap-1">
                              <Star className="w-3 h-3 text-pink-400 fill-pink-400" />
                              Amigo: ★{fav.targetScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divergências Épicas (Onde as opiniões se chocam!) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <h4 className="font-bold text-slate-100 text-sm sm:text-base">
                      Divergências Épicas (Diferença de 3+ pontos nas notas!)
                    </h4>
                  </div>
                  <span className="text-xs text-amber-400/80 font-medium">
                    {compatibility.epicDivergences.length} debates quentes
                  </span>
                </div>

                {compatibility.epicDivergences.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs">
                    Incrível! Vocês não têm nenhuma grande discórdia de notas nos animes que ambos assistiram.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {compatibility.epicDivergences.map((div, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-amber-500/20 hover:border-amber-500/40 transition-all"
                      >
                        <img
                          src={div.coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=120&auto=format&fit=crop&q=80'}
                          alt={div.title}
                          className="w-12 h-16 rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-xs sm:text-sm text-slate-200 truncate">
                              {div.title}
                            </h5>
                            <span className="text-[10px] font-black text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded">
                              Δ {div.diff} pts
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-cyan-300 font-semibold">
                              Você deu ★{div.userScore}
                            </span>
                            <span className="text-[11px] text-pink-300 font-semibold">
                              {friendUserName} deu ★{div.targetScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gêneros em Harmonia */}
              {compatibility.commonGenres.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Gêneros com Maior Sintonia Entre Vocês
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {compatibility.commonGenres.map((g, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-purple-950/50 border border-purple-500/30 text-purple-300 text-xs font-medium flex items-center gap-1.5"
                      >
                        {g.genre}
                        <span className="text-[10px] text-purple-400/80 font-bold bg-purple-900/60 px-1.5 py-0.2 rounded-full">
                          {g.count} animes
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. RECOMENDAÇÕES CRUZADAS (1 TOQUE) */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30">
                <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Roleta de Ouro: O Que {friendUserName} Adorou e Você Ainda Não Viu!
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Obras que seu amigo avaliou com notas altíssimas ou completou, mas que não constam na sua lista. Adicione à sua lista com um toque.
                </p>
              </div>

              {compatibility.crossRecommendations.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs">
                  Nenhuma recomendação nova encontrada no momento. Vocês já conhecem praticamente as mesmas obras!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {compatibility.crossRecommendations.map((anime) => {
                    const isAdded = addedAnimeIds.has(String(anime.id || anime.title));
                    return (
                      <div
                        key={anime.id || anime.title}
                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all"
                      >
                        <img
                          src={anime.coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=120&auto=format&fit=crop&q=80'}
                          alt={anime.title}
                          className="w-14 h-20 rounded-xl object-cover flex-shrink-0 cursor-pointer"
                          onClick={() => onOpenAnimeDetail && onOpenAnimeDetail(anime)}
                        />
                        <div className="flex-1 min-w-0">
                          <h5 
                            className="font-bold text-sm text-slate-100 truncate cursor-pointer hover:text-amber-400 transition-colors"
                            onClick={() => onOpenAnimeDetail && onOpenAnimeDetail(anime)}
                          >
                            {anime.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-1">
                            {anime.rating ? (
                              <span className="text-xs font-bold text-amber-400 flex items-center gap-0.5">
                                ★ {anime.rating}
                              </span>
                            ) : null}
                            <span className="text-[11px] text-slate-400">
                              {anime.totalEpisodes ? `${anime.totalEpisodes} eps` : 'Série'}
                            </span>
                          </div>

                          <div className="mt-2.5">
                            {isAdded ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                                <Check className="w-3.5 h-3.5" />
                                Adicionado!
                              </span>
                            ) : (
                              <button
                                onClick={() => handleQuickAdd(anime)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Adicionar à Minha Lista
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. LISTA COMPLETA DO AMIGO */}
          {activeTab === 'friend_list' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder={`Buscar na lista de ${friendUserName}...`}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {(['all', 'completed', 'watching', 'favorites'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setListFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        listFilter === f
                          ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {f === 'all' && 'Todos'}
                      {f === 'completed' && 'Completos'}
                      {f === 'watching' && 'Assistindo'}
                      {f === 'favorites' && '★ 9 e 10'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredFriendAnimes.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs">
                  Nenhum anime encontrado com os filtros atuais.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredFriendAnimes.map((anime) => {
                    const alreadyInMyList = myAnimeTitles.has((anime.title || '').trim().toLowerCase()) || addedAnimeIds.has(String(anime.id || anime.title));
                    return (
                      <div
                        key={anime.id || anime.title}
                        className="group relative flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden hover:border-slate-700 transition-all"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <img
                            src={anime.coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80'}
                            alt={anime.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {anime.rating ? (
                            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-amber-400 text-[11px] font-black border border-amber-500/30">
                              ★ {anime.rating}
                            </span>
                          ) : null}
                        </div>
                        <div className="p-2.5 flex flex-col flex-1">
                          <h6 className="font-bold text-xs text-slate-200 line-clamp-1">
                            {anime.title}
                          </h6>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {anime.currentEpisode ? `Ep. ${anime.currentEpisode}` : ''}
                            {anime.totalEpisodes ? ` / ${anime.totalEpisodes}` : ''}
                          </span>

                          <div className="mt-auto pt-2">
                            {alreadyInMyList ? (
                              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                Na sua lista
                              </span>
                            ) : (
                              <button
                                onClick={() => handleQuickAdd(anime)}
                                className="w-full py-1 text-[10px] font-bold text-amber-400 hover:text-slate-950 bg-amber-500/10 hover:bg-amber-400 rounded-lg transition-all border border-amber-500/20"
                              >
                                + Pegar pra Mim
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
