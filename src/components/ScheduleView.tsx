import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  Search, 
  Flame, 
  Star, 
  Plus, 
  Check, 
  Loader2, 
  Clock, 
  Tv,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';
import { HorizontalScrollContainer } from './HorizontalScrollContainer';
import { ScheduleDetailModal } from './ScheduleDetailModal';
import { 
  getWeeklySchedule, 
  getSeasonNowAnimes, 
  getSeasonUpcomingAnimes, 
  getCachedWeeklySchedule,
  getCachedSeasonNow,
  getCachedSeasonUpcoming,
  detectBrazilStreaming,
  type ScheduleAnimeItem, 
  type DayOfWeek 
} from '../services/jikanService';
import { getTodayBroadcastName, getAnimeAirCountdown } from '../lib/dateUtils';
import { checkIsSameFranchise, getFranchiseRootTitle } from '../services/franchiseService';
import type { Anime, AnimeFormData } from '../types';

interface ScheduleViewProps {
  userAnimes: Anime[];
  onAddFromExplorer: (animeData: Partial<AnimeFormData>) => void;
  onOpenAnimeDetail?: (anime: Anime) => void;
  defaultTab?: 'schedule' | 'season';
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
];

interface ScheduleAnimeCardProps {
  item: ScheduleAnimeItem;
  mainTab: 'schedule' | 'season';
  seasonSubTab: 'now' | 'upcoming';
  trackerMatch: { inTracker: boolean; isFranchise: boolean; matchedAnime?: Anime };
  onOpenDetail: (item: ScheduleAnimeItem) => void;
  onQuickAdd: (item: ScheduleAnimeItem) => void;
  onOpenInTracker?: (anime: Anime) => void;
}

const ScheduleAnimeCard = React.memo<ScheduleAnimeCardProps>(({
  item,
  mainTab,
  seasonSubTab,
  trackerMatch,
  onOpenDetail,
  onQuickAdd,
  onOpenInTracker,
}) => {
  const countdown = useMemo(() => {
    return item.broadcastDay ? getAnimeAirCountdown(item.broadcastDay, item.broadcastTime) : null;
  }, [item.broadcastDay, item.broadcastTime]);

  const streamingBadge = useMemo(() => {
    return detectBrazilStreaming(item);
  }, [item]);

  return (
    <div
      id={`schedule-card-${item.id}`}
      onClick={() => onOpenDetail(item)}
      className="group relative bg-[#0a0a0f] hover:bg-[#111118] border border-white/10 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-xl shadow-black/80 hover:shadow-2xl hover:shadow-amber-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer select-none"
      title="Clique para ver ficha completa, streaming oficial no Brasil e trailer"
    >
      {/* Poster Cover HD Vertical */}
      <div className="relative w-full aspect-[3/4.2] overflow-hidden bg-slate-950 shrink-0">
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900/50 p-2 text-center">
            <Tv className="w-8 h-8 opacity-40 mb-1" />
            <span className="text-[10px] text-slate-500 font-medium">Sem imagem</span>
          </div>
        )}

        {/* Gradientes de sombra para legibilidade das tags */}
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent pointer-events-none" />

        {/* Top Left: Selo Oficial de Streaming no Brasil */}
        {streamingBadge && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide border shadow-md backdrop-blur-md h-5 ${streamingBadge.badgeBg} ${streamingBadge.badgeBorder} ${streamingBadge.badgeText}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${streamingBadge.dotColor} animate-pulse`} />
              <span>{streamingBadge.name}</span>
            </span>
          </div>
        )}

        {/* Top Right: Tag de Formato (exclusivo para Próxima Temporada) ou Nota com Estrela (Semana e Em Exibição) */}
        {mainTab === 'season' && seasonSubTab === 'upcoming' ? (
          item.format ? (
            <div className="absolute top-2.5 right-2.5 z-10">
              <span className="inline-flex items-center justify-center bg-black/90 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/20 text-[8.5px] font-black text-slate-200 uppercase tracking-wider shadow-md h-5">
                {item.format}
              </span>
            </div>
          ) : null
        ) : item.score ? (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="inline-flex items-center gap-1 bg-black/90 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-amber-500/30 text-[9px] font-black text-amber-300 shadow-md h-5">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>{item.score.toFixed(1)}</span>
            </span>
          </div>
        ) : null}

        {/* Bottom of Poster: Horário & Contagem Regressiva */}
        <div className="absolute bottom-2 inset-x-2 z-10 flex items-center justify-between gap-1">
          {item.broadcastTime ? (
            <span className="bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-md text-amber-300 font-mono text-[9.5px] font-bold flex items-center gap-1 border border-amber-500/30 shadow-sm">
              <Clock className="w-2.5 h-2.5 text-amber-400" />
              <span>{item.broadcastTime}</span>
            </span>
          ) : item.episodes ? (
            <span className="bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-md text-slate-300 font-mono text-[9px] font-medium border border-white/10">
              {item.episodes} eps
            </span>
          ) : (
            <div />
          )}

          {countdown && (
            <span
              className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] flex items-center gap-1 backdrop-blur-md border shadow-sm ${
                countdown.isToday
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                  : countdown.isSoon
                  ? 'bg-purple-600 text-white border-purple-400'
                  : 'bg-black/85 text-slate-300 border-white/15'
              }`}
            >
              <span>{countdown.formattedCountdown}</span>
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo Abaixo do Pôster: Fundo preto, espaçamento harmônico */}
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5 bg-[#0a0a0f]">
        <div>
          {/* Título Principal em 2 linhas */}
          <h4
            className="text-xs sm:text-[13px] font-bold text-white line-clamp-2 group-hover:text-amber-300 transition-colors leading-snug"
            title={item.title}
          >
            {item.title}
          </h4>

          {/* Gêneros Minimalistas */}
          <div className="flex items-center gap-1 mt-1.5 flex-wrap min-h-[18px]">
            {item.genres && item.genres.slice(0, 2).map((g) => (
              <span
                key={g}
                className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-white/[0.04] text-slate-400 border border-white/5 truncate max-w-[85px]"
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Barra de Ação: Estado no Rastreador ou Adicionar Rápido */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
          {trackerMatch.inTracker ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (trackerMatch.matchedAnime && onOpenInTracker) {
                  onOpenInTracker(trackerMatch.matchedAnime);
                } else {
                  onOpenDetail(item);
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 text-[10.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 py-1.5 px-2 rounded-xl cursor-pointer hover:bg-emerald-500/20 transition-all shadow-xs"
              title={
                trackerMatch.isFranchise && trackerMatch.matchedAnime
                  ? `Obra na sua lista (${trackerMatch.matchedAnime.title})! Clique para abrir`
                  : 'Já está na sua lista! Clique para ver'
              }
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Na sua lista</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(item);
              }}
              className="w-full py-1.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-[11px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-amber-500/20"
              title="Adicionar diretamente à sua lista de animes"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span>Adicionar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  userAnimes,
  onAddFromExplorer,
  onOpenAnimeDetail,
  defaultTab = 'schedule',
}) => {
  const todayName = (getTodayBroadcastName() as DayOfWeek) || 'Segunda';

  // Estados das abas principais e sub-abas com resposta 0ms síncrona
  const [mainTab, setMainTab] = useState<'schedule' | 'season'>(defaultTab);
  const [seasonSubTab, setSeasonSubTab] = useState<'now' | 'upcoming'>('now');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayName);

  // Limite de renderização da lista ativa (inicia em 24 para carregamento <3ms imediato no clique)
  const [visibleCount, setVisibleCount] = useState(24);

  // Troca de aba instantânea no clique com 0ms de latência
  const handleSelectMainTab = useCallback((tab: 'schedule' | 'season') => {
    setMainTab(tab);
    setVisibleCount(24);
  }, []);

  const handleSelectSeasonSubTab = useCallback((tab: 'now' | 'upcoming') => {
    setSeasonSubTab(tab);
    setVisibleCount(24);
  }, []);

  const handleSelectDay = useCallback((day: DayOfWeek) => {
    setSelectedDay(day);
    setVisibleCount(24);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal de Detalhes Completo da Agenda com Streaming Oficial no Brasil
  const [selectedModalAnime, setSelectedModalAnime] = useState<ScheduleAnimeItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Toast temporário de feedback ao adicionar
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Intervalo a cada 60s para atualizar contagem regressiva em tempo real
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [scheduleList, setScheduleList] = useState<ScheduleAnimeItem[]>(() => getCachedWeeklySchedule(todayName) || []);
  const [seasonNowList, setSeasonNowList] = useState<ScheduleAnimeItem[]>(() => getCachedSeasonNow() || []);
  const [seasonUpcomingList, setSeasonUpcomingList] = useState<ScheduleAnimeItem[]>(() => getCachedSeasonUpcoming() || []);
  
  // Estados discretos de sincronização em segundo plano
  const [isFetchingSchedule, setIsFetchingSchedule] = useState(false);
  const [isFetchingSeasonNow, setIsFetchingSeasonNow] = useState(false);
  const [isFetchingSeasonUpcoming, setIsFetchingSeasonUpcoming] = useState(false);

  // PREFETCH EM SEGUNDO PLANO: busca silenciosa das abas apenas se não houver dados em cache
  useEffect(() => {
    let isMounted = true;

    // Se a temporada atual ainda não tiver em memória, preenche do cache local ou busca uma vez
    if (seasonNowList.length === 0) {
      const localNow = getCachedSeasonNow();
      if (localNow && localNow.length > 0) {
        setSeasonNowList(localNow);
      } else {
        setIsFetchingSeasonNow(true);
        getSeasonNowAnimes()
          .then((data) => {
            if (isMounted && data && data.length > 0) {
              setSeasonNowList(data);
            }
          })
          .catch((err) => console.warn('Prefetch temporada atual:', err))
          .finally(() => {
            if (isMounted) setIsFetchingSeasonNow(false);
          });
      }
    }

    // Se a próxima temporada ainda não tiver em memória, preenche do cache local ou busca uma vez
    if (seasonUpcomingList.length === 0) {
      const localUp = getCachedSeasonUpcoming();
      if (localUp && localUp.length > 0) {
        setSeasonUpcomingList(localUp);
      } else {
        const timerUpcoming = setTimeout(() => {
          if (!isMounted) return;
          setIsFetchingSeasonUpcoming(true);
          getSeasonUpcomingAnimes()
            .then((data) => {
              if (isMounted && data && data.length > 0) {
                setSeasonUpcomingList(data);
              }
            })
            .catch((err) => console.warn('Prefetch próxima temporada:', err))
            .finally(() => {
              if (isMounted) setIsFetchingSeasonUpcoming(false);
            });
        }, 500);

        return () => {
          isMounted = false;
          clearTimeout(timerUpcoming);
        };
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Forçar atualização quando o usuário clica no botão manual de "Recarregar"
  useEffect(() => {
    if (refreshTrigger === 0) return;
    let isMounted = true;
    setErrorMsg(null);

    if (mainTab === 'schedule') {
      setIsFetchingSchedule(true);
      getWeeklySchedule(selectedDay)
        .then((data) => {
          if (isMounted) setScheduleList(data);
        })
        .catch(() => {
          if (isMounted) setErrorMsg('Não foi possível recarregar a programação para este dia.');
        })
        .finally(() => {
          if (isMounted) setIsFetchingSchedule(false);
        });
    } else if (seasonSubTab === 'now') {
      setIsFetchingSeasonNow(true);
      getSeasonNowAnimes()
        .then((data) => {
          if (isMounted && data && data.length > 0) setSeasonNowList(data);
        })
        .catch(() => {
          if (isMounted) setErrorMsg('Não foi possível recarregar os animes da temporada.');
        })
        .finally(() => {
          if (isMounted) setIsFetchingSeasonNow(false);
        });
    } else {
      setIsFetchingSeasonUpcoming(true);
      getSeasonUpcomingAnimes()
        .then((data) => {
          if (isMounted && data && data.length > 0) setSeasonUpcomingList(data);
        })
        .catch(() => {
          if (isMounted) setErrorMsg('Não foi possível recarregar as próximas estreias.');
        })
        .finally(() => {
          if (isMounted) setIsFetchingSeasonUpcoming(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  // Carrega calendário semanal de forma instantânea do cache se disponível
  useEffect(() => {
    if (mainTab !== 'schedule') return;

    let isMounted = true;
    const cached = getCachedWeeklySchedule(selectedDay);
    if (cached && cached.length > 0) {
      setScheduleList(cached);
      return;
    }
    
    setIsFetchingSchedule(true);
    setErrorMsg(null);

    getWeeklySchedule(selectedDay)
      .then((data) => {
        if (isMounted) {
          setScheduleList(data);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar calendário:', err);
        if (isMounted && scheduleList.length === 0) {
          setErrorMsg('Não foi possível carregar a programação para este dia. Tente recarregar.');
        }
      })
      .finally(() => {
        if (isMounted) setIsFetchingSchedule(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mainTab, selectedDay]);

  // Se o usuário entrar na aba e ela estiver vazia, busca na rede
  useEffect(() => {
    if (mainTab !== 'season') return;
    let isMounted = true;

    if (seasonSubTab === 'now' && seasonNowList.length === 0) {
      const cached = getCachedSeasonNow();
      if (cached && cached.length > 0) {
        setSeasonNowList(cached);
        return;
      }
      setIsFetchingSeasonNow(true);
      getSeasonNowAnimes()
        .then((data) => {
          if (isMounted && data && data.length > 0) setSeasonNowList(data);
        })
        .catch((err) => console.error('Erro ao carregar animes da temporada:', err))
        .finally(() => {
          if (isMounted) setIsFetchingSeasonNow(false);
        });
    } else if (seasonSubTab === 'upcoming' && seasonUpcomingList.length === 0) {
      const cached = getCachedSeasonUpcoming();
      if (cached && cached.length > 0) {
        setSeasonUpcomingList(cached);
        return;
      }
      setIsFetchingSeasonUpcoming(true);
      getSeasonUpcomingAnimes()
        .then((data) => {
          if (isMounted && data && data.length > 0) setSeasonUpcomingList(data);
        })
        .catch((err) => console.error('Erro ao carregar próximas estreias:', err))
        .finally(() => {
          if (isMounted) setIsFetchingSeasonUpcoming(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [mainTab, seasonSubTab, seasonNowList.length, seasonUpcomingList.length]);

  // Determina se a tela atual está vazia e aguardando primeira carga (apenas se não houver dados em cache)
  const isCurrentTabEmptyAndLoading = useMemo(() => {
    if (mainTab === 'schedule') {
      return scheduleList.length === 0 && isFetchingSchedule;
    }
    if (seasonSubTab === 'now') {
      return seasonNowList.length === 0 && isFetchingSeasonNow;
    }
    return seasonUpcomingList.length === 0 && isFetchingSeasonUpcoming;
  }, [mainTab, seasonSubTab, scheduleList.length, seasonNowList.length, seasonUpcomingList.length, isFetchingSchedule, isFetchingSeasonNow, isFetchingSeasonUpcoming]);

  // TABELA DE FRANQUIAS INTELIGENTE:
  // Indexa em O(1) o card unificado do usuário com todas as temporadas associadas (mal_id, franchiseIds, seasons.mal_id e raízes)
  const franchiseLookup = useMemo(() => {
    const idToAnime = new Map<number, Anime>();
    const titleToAnime = new Map<string, Anime>();
    const roots: Array<{ anime: Anime; root: string; rootJap: string }> = [];

    for (const anime of userAnimes) {
      if (anime.mal_id) {
        idToAnime.set(Number(anime.mal_id), anime);
      }
      if (Array.isArray(anime.franchiseIds)) {
        for (const fId of anime.franchiseIds) {
          if (fId) idToAnime.set(Number(fId), anime);
        }
      }
      if (Array.isArray(anime.seasons)) {
        for (const s of anime.seasons) {
          if (s.mal_id) {
            idToAnime.set(Number(s.mal_id), anime);
          }
          if (s.canonicalTitle) {
            titleToAnime.set(s.canonicalTitle.toLowerCase().trim(), anime);
          }
          if (s.name) {
            titleToAnime.set(s.name.toLowerCase().trim(), anime);
          }
        }
      }

      if (anime.title) {
        titleToAnime.set(anime.title.toLowerCase().trim(), anime);
      }
      if (anime.japaneseTitle) {
        titleToAnime.set(anime.japaneseTitle.toLowerCase().trim(), anime);
      }
      if (anime.franchiseTitle) {
        titleToAnime.set(anime.franchiseTitle.toLowerCase().trim(), anime);
      }

      const root = (anime.franchiseTitle || getFranchiseRootTitle(anime.title)).toLowerCase().trim();
      const rootJap = (anime.japaneseTitle || '').toLowerCase().trim();
      roots.push({ anime, root, rootJap });
    }

    return { idToAnime, titleToAnime, roots };
  }, [userAnimes]);

  // Cache em memória de matches para evitar re-execuções repetidas
  const matchResultCache = React.useRef<Map<string | number, { inTracker: boolean; isFranchise: boolean; matchedAnime?: Anime }>>(new Map());

  // Limpa cache de matches quando os animes do usuário mudam
  useEffect(() => {
    matchResultCache.current.clear();
  }, [userAnimes]);

  // Checa instantaneamente em O(1) se o anime ou qualquer temporada da franquia está no card unificado do usuário
  const getTrackerMatch = (item: ScheduleAnimeItem): { inTracker: boolean; isFranchise: boolean; matchedAnime?: Anime } => {
    const cacheKey = item.id || item.idMal || item.title;
    const cached = matchResultCache.current.get(cacheKey);
    if (cached) return cached;

    const { idToAnime, titleToAnime, roots } = franchiseLookup;
    const candId = item.id ? Number(item.id) : null;
    const candMalId = item.idMal ? Number(item.idMal) : null;

    // 1. Match direto por ID em O(1) (cobre ID principal da obra, franchiseIds e todas as temporadas filhas salvas)
    if (candId && idToAnime.has(candId)) {
      const matched = idToAnime.get(candId)!;
      const res = { inTracker: true, isFranchise: matched.mal_id !== candId, matchedAnime: matched };
      matchResultCache.current.set(cacheKey, res);
      return res;
    }

    if (candMalId && idToAnime.has(candMalId)) {
      const matched = idToAnime.get(candMalId)!;
      const res = { inTracker: true, isFranchise: matched.mal_id !== candMalId, matchedAnime: matched };
      matchResultCache.current.set(cacheKey, res);
      return res;
    }

    // 2. Match direto por título exato normalizado em O(1)
    const itemTitle = item.title.toLowerCase().trim();
    if (titleToAnime.has(itemTitle)) {
      const matched = titleToAnime.get(itemTitle)!;
      const res = { inTracker: true, isFranchise: false, matchedAnime: matched };
      matchResultCache.current.set(cacheKey, res);
      return res;
    }

    if (item.title_english) {
      const eng = item.title_english.toLowerCase().trim();
      if (titleToAnime.has(eng)) {
        const matched = titleToAnime.get(eng)!;
        const res = { inTracker: true, isFranchise: false, matchedAnime: matched };
        matchResultCache.current.set(cacheKey, res);
        return res;
      }
    }

    if (item.title_japanese) {
      const jap = item.title_japanese.toLowerCase().trim();
      if (titleToAnime.has(jap)) {
        const matched = titleToAnime.get(jap)!;
        const res = { inTracker: true, isFranchise: false, matchedAnime: matched };
        matchResultCache.current.set(cacheKey, res);
        return res;
      }
    }

    // 3. Match de Franquia / Sequência / Temporadas para lançamentos novos não mapeados ainda
    const cRoot = getFranchiseRootTitle(item.title).toLowerCase().trim();
    const cEngRoot = item.title_english ? getFranchiseRootTitle(item.title_english).toLowerCase().trim() : '';
    const cJap = (item.title_japanese || '').toLowerCase().trim();

    for (const { anime, root: uRoot, rootJap: uJap } of roots) {
      if (uRoot && cRoot) {
        if (uRoot === cRoot || (uRoot.length >= 4 && cRoot.length >= 4 && (uRoot.includes(cRoot) || cRoot.includes(uRoot)))) {
          const res = { inTracker: true, isFranchise: true, matchedAnime: anime };
          matchResultCache.current.set(cacheKey, res);
          return res;
        }
      }

      if (uRoot && cEngRoot) {
        if (uRoot === cEngRoot || (uRoot.length >= 4 && cEngRoot.length >= 4 && (uRoot.includes(cEngRoot) || cEngRoot.includes(uRoot)))) {
          const res = { inTracker: true, isFranchise: true, matchedAnime: anime };
          matchResultCache.current.set(cacheKey, res);
          return res;
        }
      }

      if (uJap && cJap) {
        if (uJap === cJap || (uJap.length >= 4 && (uJap.includes(cJap) || cJap.includes(uJap)))) {
          const res = { inTracker: true, isFranchise: true, matchedAnime: anime };
          matchResultCache.current.set(cacheKey, res);
          return res;
        }
      }
    }

    const notFound = { inTracker: false, isFranchise: false };
    matchResultCache.current.set(cacheKey, notFound);
    return notFound;
  };

  // Listas filtradas independentes pré-computadas para troca instantânea de 0ms
  const filteredScheduleList = useMemo(() => {
    if (!searchQuery.trim()) return scheduleList;
    const q = searchQuery.toLowerCase().trim();
    return scheduleList.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchJap = item.title_japanese ? item.title_japanese.toLowerCase().includes(q) : false;
      const matchEng = item.title_english ? item.title_english.toLowerCase().includes(q) : false;
      const matchStudio = item.studio ? item.studio.toLowerCase().includes(q) : false;
      const matchGenre = item.genres ? item.genres.some((g) => g.toLowerCase().includes(q)) : false;
      return matchTitle || matchJap || matchEng || matchStudio || matchGenre;
    });
  }, [scheduleList, searchQuery]);

  const filteredSeasonNowList = useMemo(() => {
    if (!searchQuery.trim()) return seasonNowList;
    const q = searchQuery.toLowerCase().trim();
    return seasonNowList.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchJap = item.title_japanese ? item.title_japanese.toLowerCase().includes(q) : false;
      const matchEng = item.title_english ? item.title_english.toLowerCase().includes(q) : false;
      const matchStudio = item.studio ? item.studio.toLowerCase().includes(q) : false;
      const matchGenre = item.genres ? item.genres.some((g) => g.toLowerCase().includes(q)) : false;
      return matchTitle || matchJap || matchEng || matchStudio || matchGenre;
    });
  }, [seasonNowList, searchQuery]);

  const filteredSeasonUpcomingList = useMemo(() => {
    if (!searchQuery.trim()) return seasonUpcomingList;
    const q = searchQuery.toLowerCase().trim();
    return seasonUpcomingList.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchJap = item.title_japanese ? item.title_japanese.toLowerCase().includes(q) : false;
      const matchEng = item.title_english ? item.title_english.toLowerCase().includes(q) : false;
      const matchStudio = item.studio ? item.studio.toLowerCase().includes(q) : false;
      const matchGenre = item.genres ? item.genres.some((g) => g.toLowerCase().includes(q)) : false;
      return matchTitle || matchJap || matchEng || matchStudio || matchGenre;
    });
  }, [seasonUpcomingList, searchQuery]);

  // Lista ativa no momento conforme a aba e sub-aba selecionada
  const currentActiveList = useMemo(() => {
    if (mainTab === 'schedule') return filteredScheduleList;
    if (seasonSubTab === 'now') return filteredSeasonNowList;
    return filteredSeasonUpcomingList;
  }, [mainTab, seasonSubTab, filteredScheduleList, filteredSeasonNowList, filteredSeasonUpcomingList]);

  // Sentinela de rolagem com IntersectionObserver para carregamento sob demanda
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < currentActiveList.length) {
              return Math.min(prev + 24, currentActiveList.length);
            }
            return prev;
          });
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [currentActiveList.length]);

  // Adição rápida ao clicar no botão "+ Adicionar" do card
  const handleQuickAdd = useCallback((item: ScheduleAnimeItem) => {
    onAddFromExplorer({
      title: item.title,
      japaneseTitle: item.title_japanese || '',
      coverUrl: item.coverUrl,
      bannerUrl: item.bannerUrl || null,
      synopsis: item.synopsis || '',
      genres: item.genres || [],
      broadcastDay: item.broadcastDay !== 'Outros' && item.broadcastDay !== 'Em breve' ? item.broadcastDay : null,
      totalEpisodes: item.episodes || null,
      status: item.status === 'Not yet aired' ? 'plan_to_watch' : 'watching',
      studio: item.studio || null,
      format: item.format || null,
      source: item.source || null,
      releaseYear: item.year || null,
      season: 1,
      currentSeasonName: 'Temporada 1',
      mal_id: item.idMal || item.id,
      rating: item.score || null,
      notes: '',
    });

    setAddedToast(item.title);
    setTimeout(() => setAddedToast(null), 3000);
  }, [onAddFromExplorer]);

  // Abre o modal de detalhes oficial
  const handleOpenDetailModal = useCallback((item: ScheduleAnimeItem) => {
    setSelectedModalAnime(item);
    setIsDetailModalOpen(true);
  }, []);

  const handleOpenInTracker = useCallback((anime: Anime) => {
    if (onOpenAnimeDetail) {
      onOpenAnimeDetail(anime);
    }
  }, [onOpenAnimeDetail]);

  return (
    <div className="w-full space-y-3.5 animate-in fade-in duration-150">
      {/* Toast de Confirmação Rápida */}
      {addedToast && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0d0e17]/95 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="line-clamp-1">"{addedToast}" adicionado à sua lista!</span>
        </div>
      )}

      {/* Cabeçalho Limpo, Compacto e Alinhado */}
      <div className="w-full relative py-1 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 justify-center">
          <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center justify-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-400 inline-block" />
            <span>Agenda & Temporadas</span>
          </h2>
          <button
            type="button"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            disabled={isCurrentTabEmptyAndLoading}
            title="Atualizar dados de exibição"
            className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-all cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingSchedule || isFetchingSeasonNow || isFetchingSeasonUpcoming ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
          Horários de exibição, onde assistir no Brasil e estreias da temporada
        </p>

        {/* Seletor Principal: Calendário Semanal vs Temporada */}
        <div className="flex items-center gap-1 p-1 bg-[#0a0a0f] rounded-xl border border-white/15 shrink-0 mt-2 shadow-sm">
          <button
            type="button"
            id="tab-btn-schedule-weekly"
            onClick={() => handleSelectMainTab('schedule')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mainTab === 'schedule'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Semana</span>
          </button>

          <button
            type="button"
            id="tab-btn-schedule-season"
            onClick={() => handleSelectMainTab('season')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mainTab === 'season'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3 h-3" />
            <span>Temporada</span>
          </button>
        </div>
      </div>

      {/* Barra de Controles: Dias da Semana / Sub-abas da Temporada & Campo de Busca */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {mainTab === 'schedule' ? (
          /* Seletor horizontal com rolagem suave dos dias da semana */
          <HorizontalScrollContainer id="schedule-days-container" scrollStep={140}>
            {DAYS_OF_WEEK.map((day) => {
              const isToday = day === todayName;
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  id={`day-filter-${day.toLowerCase()}`}
                  onClick={() => handleSelectDay(day)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : isToday
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
                      : 'bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-white/10'
                  }`}
                >
                  {isToday && <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                  <span>{day}</span>
                  {isToday && (
                    <span className="text-[9px] bg-amber-400/25 text-amber-200 px-1.5 py-0.2 rounded font-black">
                      Hoje
                    </span>
                  )}
                </button>
              );
            })}
          </HorizontalScrollContainer>
        ) : (
          /* Sub-abas de Temporada: Atual vs Próxima */
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <button
              type="button"
              id="subtab-season-now"
              onClick={() => handleSelectSeasonSubTab('now')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center ${
                seasonSubTab === 'now'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-white/10'
              }`}
            >
              Em Exibição
            </button>
            <button
              type="button"
              id="subtab-season-upcoming"
              onClick={() => handleSelectSeasonSubTab('upcoming')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center ${
                seasonSubTab === 'upcoming'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-white/10'
              }`}
            >
              Próxima Temporada
            </button>
          </div>
        )}

        {/* Filtro de Busca */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            id="schedule-search-filter"
            placeholder="Filtrar por nome, estúdio, gênero..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-white/15 focus:border-amber-500/70 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 transition-colors shadow-sm"
          />
        </div>
      </div>

      {/* Erro de rede amigável com botão de tentar novamente */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-white font-bold transition-all cursor-pointer shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Conteúdo Principal: Grid Único Instantâneo (0ms) de Altíssima Performance */}
      {currentActiveList.length === 0 && isCurrentTabEmptyAndLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={`schedule-skeleton-${idx}`}
              className="bg-[#0a0a0f] border border-white/5 rounded-2xl overflow-hidden animate-pulse flex flex-col shadow-xl shadow-black/80"
            >
              <div className="w-full aspect-[3/4.2] bg-slate-900/80" />
              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-slate-800 rounded w-4/5" />
                  <div className="h-3 bg-slate-800/60 rounded w-3/5" />
                </div>
                <div className="h-7 bg-slate-800/40 rounded-xl w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : currentActiveList.length === 0 ? (
        <div className="py-16 text-center text-slate-500 space-y-2 bg-slate-900/40 rounded-3xl border border-slate-800">
          <Tv className="w-8 h-8 mx-auto text-slate-600 mb-1" />
          <p className="text-sm font-bold text-slate-300">Nenhum anime encontrado</p>
          <p className="text-xs text-slate-500">Tente buscar por outro termo ou selecione outra opção.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {currentActiveList.slice(0, visibleCount).map((item) => {
            const trackerMatch = getTrackerMatch(item);
            return (
              <ScheduleAnimeCard
                key={item.id}
                item={item}
                mainTab={mainTab}
                seasonSubTab={seasonSubTab}
                trackerMatch={trackerMatch}
                onOpenDetail={handleOpenDetailModal}
                onQuickAdd={handleQuickAdd}
                onOpenInTracker={handleOpenInTracker}
              />
            );
          })}

          {/* Sentinela e Botão de Carregamento Automático Suave */}
          {currentActiveList.length > visibleCount && (
            <div className="col-span-full py-4 flex flex-col items-center justify-center gap-2">
              <div ref={loadMoreRef} className="h-2 w-full" />
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(prev + 24, currentActiveList.length))}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                <span>Mostrar mais animes ({currentActiveList.length - visibleCount} restantes)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Dedicado de Detalhes, Streaming no Brasil, Notícias e Trailer */}
      <ScheduleDetailModal
        anime={selectedModalAnime}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        userAnimes={userAnimes}
        onAddAnime={(formData) => {
          onAddFromExplorer(formData);
          setAddedToast(formData.title || 'Anime');
          setTimeout(() => setAddedToast(null), 3000);
        }}
        onOpenInTracker={(animeId) => {
          setIsDetailModalOpen(false);
          const found = userAnimes.find((a) => a.id === animeId);
          if (found && onOpenAnimeDetail) {
            onOpenAnimeDetail(found);
          }
        }}
      />
    </div>
  );
};
