import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  Tv, 
  Calendar, 
  Newspaper, 
  Users, 
  Trophy, 
  BarChart3, 
  Camera, 
  Share2, 
  Plus, 
  Image, 
  Flame, 
  Clock, 
  ExternalLink,
  ArrowRight,
  Command
} from 'lucide-react';
import type { Anime } from '../types';
import type { MainNavTab } from './AppNavigation';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  animes: Anime[];
  onSelectAnime: (anime: Anime) => void;
  onSelectTab: (tab: MainNavTab) => void;
  onOpenAddAnime: () => void;
  onOpenImageSearch?: () => void;
  onOpenSocialCard?: () => void;
  onOpenShareModal?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  animes,
  onSelectAnime,
  onSelectTab,
  onOpenAddAnime,
  onOpenImageSearch,
  onOpenSocialCard,
  onOpenShareModal,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Ações de navegação rápida disponíveis
  const quickActions = useMemo(() => [
    {
      id: 'action-add',
      title: 'Adicionar Novo Anime',
      subtitle: 'Registrar um anime ou temporada na minha lista',
      icon: Plus,
      category: 'Ação Rápida',
      onTrigger: () => {
        onClose();
        onOpenAddAnime();
      },
    },
    {
      id: 'action-schedule',
      title: 'Ver Calendário de Lançamentos & Horários',
      subtitle: 'Explorar estreias da semana e contagem regressiva',
      icon: Calendar,
      category: 'Navegação',
      onTrigger: () => {
        onClose();
        onSelectTab('schedule');
      },
    },
    {
      id: 'action-news',
      title: 'Notícias do Mundo dos Animes',
      subtitle: 'Feed atualizado com lançamentos, filmes e notícias oficiais',
      icon: Newspaper,
      category: 'Navegação',
      onTrigger: () => {
        onClose();
        onSelectTab('news');
      },
    },
    {
      id: 'action-community',
      title: 'Comunidade & Feed de Amigos',
      subtitle: 'Descobrir listas públicas, reviews e comparar afinidade',
      icon: Users,
      category: 'Navegação',
      onTrigger: () => {
        onClose();
        onSelectTab('community');
      },
    },
    {
      id: 'action-achievements',
      title: 'Quadro de Conquistas & Insígnias Otaku',
      subtitle: 'Ver insígnias desbloqueadas e equipar no perfil',
      icon: Trophy,
      category: 'Navegação',
      onTrigger: () => {
        onClose();
        onSelectTab('achievements');
      },
    },
    {
      id: 'action-stats',
      title: 'Estatísticas & Nível Otaku',
      subtitle: 'Gráficos de horas assistidas, gêneros e progresso',
      icon: BarChart3,
      category: 'Navegação',
      onTrigger: () => {
        onClose();
        onSelectTab('stats');
      },
    },
    ...(onOpenImageSearch ? [{
      id: 'action-trace',
      title: 'Identificar Cena por Imagem (trace.moe)',
      subtitle: 'Envie um print e descubra o anime e minuto exato',
      icon: Camera,
      category: 'Ferramentas',
      onTrigger: () => {
        onClose();
        onOpenImageSearch();
      },
    }] : []),
    ...(onOpenSocialCard ? [{
      id: 'action-card',
      title: 'Gerador de Card para Redes Sociais',
      subtitle: 'Exportar card estilizado para Instagram Stories/Feed',
      icon: Image,
      category: 'Ferramentas',
      onTrigger: () => {
        onClose();
        onOpenSocialCard();
      },
    }] : []),
    ...(onOpenShareModal ? [{
      id: 'action-share',
      title: 'Compartilhar Meu Perfil & QR Code',
      subtitle: 'Gerar link público para amigos acompanharem sua lista',
      icon: Share2,
      category: 'Compartilhar',
      onTrigger: () => {
        onClose();
        onOpenShareModal();
      },
    }] : []),
  ], [onClose, onOpenAddAnime, onSelectTab, onOpenImageSearch, onOpenSocialCard, onOpenShareModal]);

  // Filtragem combinada (Animes da lista + Ações rápidas)
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        animesList: animes.slice(0, 5),
        actionsList: quickActions.slice(0, 5),
      };
    }

    const matchedAnimes = animes.filter((a) => {
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchJp = a.japaneseTitle?.toLowerCase().includes(q);
      const matchNotes = a.notes?.toLowerCase().includes(q);
      const matchGenres = Array.isArray(a.genres) && a.genres.some((g) => g.toLowerCase().includes(q));
      return matchTitle || matchJp || matchNotes || matchGenres;
    }).slice(0, 8);

    const matchedActions = quickActions.filter((act) => {
      return act.title.toLowerCase().includes(q) || act.subtitle.toLowerCase().includes(q);
    });

    return {
      animesList: matchedAnimes,
      actionsList: matchedActions,
    };
  }, [query, animes, quickActions]);

  const totalResultsCount = filteredResults.animesList.length + filteredResults.actionsList.length;

  // Keyboard navigation (Arrow keys + Enter + Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < totalResultsCount ? prev + 1 : 0));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, totalResultsCount - 1)));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex < filteredResults.animesList.length) {
          const anime = filteredResults.animesList[selectedIndex];
          if (anime) {
            onClose();
            onSelectAnime(anime);
          }
        } else {
          const actionIndex = selectedIndex - filteredResults.animesList.length;
          const action = filteredResults.actionsList[actionIndex];
          if (action) {
            action.onTrigger();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, totalResultsCount, filteredResults, onClose, onSelectAnime]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-3 sm:px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Header */}
        <div className="relative px-4 py-3.5 border-b border-slate-800 bg-slate-950/90 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar anime, ir para notícias, calendário ou ação rápida..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder:text-slate-500 outline-none font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 text-[10px] text-slate-400 border border-slate-700 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="p-3 overflow-y-auto space-y-4 max-h-[60vh] no-scrollbar">
          {/* Animes Section */}
          {filteredResults.animesList.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Tv className="w-3 h-3 text-indigo-400" />
                <span>Minha Lista de Animes</span>
              </div>
              {filteredResults.animesList.map((anime, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={anime.id}
                    onClick={() => {
                      onClose();
                      onSelectAnime(anime);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-md'
                        : 'hover:bg-slate-800/60 text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-12 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                        {anime.coverUrl ? (
                          <img
                            src={anime.coverUrl}
                            alt={anime.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <Tv className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white truncate">
                          {anime.title}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="text-indigo-400 font-semibold">
                            Ep. {anime.currentEpisode}{anime.totalEpisodes ? ` / ${anime.totalEpisodes}` : ''}
                          </span>
                          <span>•</span>
                          <span className="truncate">{anime.currentSeasonName || 'Temporada 1'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {anime.rating !== null && anime.rating !== undefined && (
                        <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                          ★ {anime.rating}
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Actions & Navigation Section */}
          {filteredResults.actionsList.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Command className="w-3 h-3 text-purple-400" />
                <span>Navegação & Ferramentas Rápidas</span>
              </div>
              {filteredResults.actionsList.map((action, actIdx) => {
                const globalIndex = filteredResults.animesList.length + actIdx;
                const isSelected = selectedIndex === globalIndex;
                const Icon = action.icon;

                return (
                  <div
                    key={action.id}
                    onClick={action.onTrigger}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600/20 border border-purple-500/40 text-white shadow-md'
                        : 'hover:bg-slate-800/60 text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-purple-400 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white truncate">
                          {action.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {action.subtitle}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 shrink-0">
                      {action.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* No results message */}
          {totalResultsCount === 0 && (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-300">Nenhum resultado encontrado para "{query}"</p>
              <p className="text-xs text-slate-500">Tente buscar por outro nome de anime ou comando de navegação.</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Navegar: <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">↑</kbd> <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">↓</kbd></span>
            <span>Abrir: <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">ENTER</kbd></span>
          </div>
          <span className="text-indigo-400 font-semibold">WAnime List Hub</span>
        </div>
      </div>
    </div>
  );
};
