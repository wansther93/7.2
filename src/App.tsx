import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  logout, 
  signInWithGoogle,
  type User 
} from './lib/firebase';
import {
  subscribeToUserAnimes,
  getPublicUserAnimes,
  addAnime,
  updateAnime,
  deleteAnime,
  deleteAllUserAnimes,
  incrementEpisode,
  decrementEpisode,
  setEpisodeDirectly,
  toggleSeasonWatchedStatus,
} from './services/animeService';
import type { Anime, AnimeFormData, AnimeSeasonOrArc, AnimeStatus, SortOption } from './types';
import { getUserProfile, getUserProfileByUsername, saveUserProfile, deleteUserProfile, type UserProfile } from './services/profileService';
import { isAiringToday, isAnimeActiveAndAiringToday, getTodayBroadcastName } from './lib/dateUtils';
import { calculateUserAchievements } from './services/achievementService';
import { Header } from './components/Header';
import { EditProfileModal } from './components/profile/EditProfileModal';
import { LoginScreen } from './components/LoginScreen';
import { AuthPromptModal } from './components/AuthPromptModal';
import { SAMPLE_GUEST_ANIMES } from './data/sampleAnimes';
import { FilterControlsBar } from './components/FilterControlsBar';
import type { FilterStatus } from './components/StatusTabs';
import { AnimeCard } from './components/AnimeCard';
import { AnimeCompactCard } from './components/AnimeCompactCard';
import { AnimeModal } from './components/AnimeModal';
import { AnimeDetailModal } from './components/AnimeDetailModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { QuickSearch, type ViewMode } from './components/QuickSearch';
import { EmptyState } from './components/EmptyState';
import { BackupModal } from './components/BackupModal';
import { InstallPromptModal } from './components/InstallPromptModal';
import { StatsModal } from './components/StatsModal';
import { AdvancedFilterModal } from './components/AdvancedFilterModal';
import { UnifiedFilterModal } from './components/UnifiedFilterModal';
import { ShareListModal } from './components/ShareListModal';
import { SharedListPublicView } from './components/SharedListPublicView';
import { NewsModal } from './components/NewsModal';
import { AchievementsModal } from './components/AchievementsModal';
import { AnimeListHeader } from './components/AnimeListHeader';
import { AppNavigation, type MainNavTab } from './components/AppNavigation';
import { NewsView } from './components/NewsView';
import { ScheduleView } from './components/ScheduleView';
import { AchievementsView } from './components/AchievementsView';
import { StatsView } from './components/StatsView';
import { CommunityFeedView } from './components/CommunityFeedView';
import { OtakuProfileView } from './components/profile/OtakuProfileView';
import { getRecentReviews, type CommunityReview } from './services/communityService';
import { ImageAnimeSearchModal } from './components/ImageAnimeSearchModal';
import { SocialCardGeneratorModal, type CardType } from './components/SocialCardGeneratorModal';
import { calculateOtakuLevel } from './services/xpService';
import { checkAllAiringAnimesUpdates } from './services/animeSyncService';
import { prefetchUserCollectionMetadata } from './services/animeMetadataService';
import { checkAndNotifyTodayEpisodes } from './services/notificationService';
import {
  getWeeklySchedule,
  getSeasonNowAnimes,
  getSeasonUpcomingAnimes,
  getCachedWeeklySchedule,
  getCachedSeasonNow,
  getCachedSeasonUpcoming,
} from './services/jikanService';
import { runBackgroundScheduleSync } from './services/multiApiAggregatorService';
import {
  getAllAnimeNewsWithUserTags,
  getCachedNewsInstant,
  tagUserAnimesInNews,
  type AnimeNewsItem,
} from './services/newsService';
import { Plus, Tv, Loader2, WifiOff, Flame, X, Calendar, BarChart3, SlidersHorizontal, Share2, Newspaper, RefreshCw, Bell, Trophy, Camera, CheckCircle2, Radio } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Estados Globais da Aba de Notícias (Cache em Memória e Background Prefetch)
  const [cachedNews, setCachedNews] = useState<AnimeNewsItem[]>(() => getCachedNewsInstant());
  const [isNewsLoading, setIsNewsLoading] = useState<boolean>(() => getCachedNewsInstant().length === 0);
  const [isNewsFetching, setIsNewsFetching] = useState<boolean>(false);
  const [lastNewsUpdatedTime, setLastNewsUpdatedTime] = useState<string>('');
  const newsPrefetchDoneRef = React.useRef(false);
  const animesRef = React.useRef(animes);
  animesRef.current = animes;

  const handleFetchNews = React.useCallback(async (isManual = false) => {
    setIsNewsFetching(true);
    if (cachedNews.length === 0) {
      setIsNewsLoading(true);
    }
    try {
      const items = await getAllAnimeNewsWithUserTags(animesRef.current, isManual);
      if (items && items.length > 0) {
        setCachedNews(items);
      }
      const now = new Date();
      setLastNewsUpdatedTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Falha ao sincronizar notícias em segundo plano:', err);
    } finally {
      setIsNewsLoading(false);
      setIsNewsFetching(false);
    }
  }, [cachedNews.length]);

  // Atualiza as marcações das notícias ("Na Lista") e sincroniza metadados ricos em segundo plano
  useEffect(() => {
    if (animes && animes.length > 0) {
      setCachedNews((prev) => (prev.length > 0 ? tagUserAnimesInNews(prev, animes) : prev));
      // Prefetch inteligente em segundo plano (processa apenas animes que ainda não estão salvos)
      prefetchUserCollectionMetadata(animes).catch(() => {});
    }
  }, [animes]);

  // Guest Mode State
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    return localStorage.getItem('wanime_guest_mode') === 'true';
  });

  // Auth Prompt Modal State (when guest attempts restricted actions)
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptActionName, setAuthPromptActionName] = useState<string | undefined>(undefined);
  const [authPromptDescription, setAuthPromptDescription] = useState<string | undefined>(undefined);

  // Resenhas Comunitárias do Feed Coletivo
  const [communityReviews, setCommunityReviews] = useState<CommunityReview[]>([]);

  useEffect(() => {
    getRecentReviews().then((revs) => {
      setCommunityReviews(revs);
    }).catch(console.error);
  }, []);

  const triggerAuthPrompt = (actionName: string, customDesc?: string): boolean => {
    if (isGuestMode || !user) {
      setAuthPromptActionName(actionName);
      setAuthPromptDescription(customDesc || 'Necessário criar uma conta com o Google para salvar, editar ou interagir nesta funcionalidade.');
      setAuthPromptOpen(true);
      return true;
    }
    return false;
  };

  const handleEnterGuestMode = () => {
    setIsGuestMode(true);
    localStorage.setItem('wanime_guest_mode', 'true');
    setAnimes(SAMPLE_GUEST_ANIMES);
    setDataLoading(false);
  };

  const handleGoogleLoginFromApp = async () => {
    try {
      await signInWithGoogle();
      setIsGuestMode(false);
      localStorage.removeItem('wanime_guest_mode');
      setAuthPromptOpen(false);
    } catch (err: any) {
      console.error('Erro ao fazer login com Google:', err);
    }
  };

  const handleLogoutOrExitGuest = async () => {
    if (isGuestMode) {
      setIsGuestMode(false);
      localStorage.removeItem('wanime_guest_mode');
      setAnimes([]);
    } else {
      await logout();
    }
  };

  // Main navigation view: 'list' | 'news' | 'schedule' | 'achievements' | 'stats'
  const [activeTab, setActiveTab] = useState<MainNavTab>('list');

  // Controle de Notificações de Abas (Agenda e Notícias)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [lastViewedScheduleDate, setLastViewedScheduleDate] = useState<string>(() => {
    return localStorage.getItem('wanime_last_viewed_schedule_date') || '';
  });
  const [lastViewedNewsTimestamp, setLastViewedNewsTimestamp] = useState<number>(() => {
    const saved = localStorage.getItem('wanime_last_viewed_news_timestamp');
    return saved ? parseInt(saved, 10) : 0;
  });

  const handleSelectTab = (tab: MainNavTab) => {
    setActiveTab(tab);
    if (tab === 'schedule') {
      // Marca a agenda como lida no dia atual
      setLastViewedScheduleDate(todayStr);
      try {
        localStorage.setItem('wanime_last_viewed_schedule_date', todayStr);
      } catch {
        // ignore
      }
    } else if (tab === 'news') {
      // Marca as notícias atuais como lidas
      const now = Date.now();
      setLastViewedNewsTimestamp(now);
      try {
        localStorage.setItem('wanime_last_viewed_news_timestamp', now.toString());
      } catch {
        // ignore
      }
    }
  };

  // PWA Install prompt capture
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Batch Syncing State
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Auto-dismiss do Toast de sincronização e avisos após 3.0 segundos com fade-out
  useEffect(() => {
    if (syncToast) {
      const timer = setTimeout(() => {
        setSyncToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [syncToast]);

  // Theme State: 'dark' (Original) vs 'light' (Claro)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('wanime_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
    localStorage.setItem('wanime_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter & Search & Sort states
  const [currentFilter, setCurrentFilter] = useState<FilterStatus>('all');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [airingTodayOnly, setAiringTodayOnly] = useState(false);
  const [showAiringBanner, setShowAiringBanner] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('updated_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Phase 3 Advanced Filters states
  const [selectedStudio, setSelectedStudio] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStudio !== null) count++;
    if (selectedFormat !== null) count++;
    if (selectedYear !== null) count++;
    if (selectedSource !== null) count++;
    if (minRating !== null) count++;
    return count;
  }, [selectedStudio, selectedFormat, selectedYear, selectedSource, minRating]);

  const totalActiveFilterCount = useMemo(() => {
    let count = 0;
    if (selectedGenre !== null) count++;
    if (selectedStudio !== null) count++;
    if (selectedFormat !== null) count++;
    if (selectedYear !== null) count++;
    if (selectedSource !== null) count++;
    if (minRating !== null) count++;
    if (sortOption !== 'updated_desc') count++;
    return count;
  }, [selectedGenre, selectedStudio, selectedFormat, selectedYear, selectedSource, minRating, sortOption]);

  const handleResetAllFilters = () => {
    setCurrentFilter('all');
    setSelectedGenre(null);
    setAiringTodayOnly(false);
    setSelectedStudio(null);
    setSelectedFormat(null);
    setSelectedYear(null);
    setSelectedSource(null);
    setMinRating(null);
    setSortOption('updated_desc');
    setSearchQuery('');
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('wanime_view_mode', mode);
    } catch {
      // ignore
    }
  };

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isImageSearchModalOpen, setIsImageSearchModalOpen] = useState(false);
  const [isSocialCardModalOpen, setIsSocialCardModalOpen] = useState(false);
  const [socialCardInitialType, setSocialCardInitialType] = useState<CardType>('top5');

  const handleOpenSocialCard = (type: CardType = 'top5') => {
    setSocialCardInitialType(type);
    setIsSocialCardModalOpen(true);
  };
  const [editingAnime, setEditingAnime] = useState<Anime | null>(null);
  const [prefillAnimeData, setPrefillAnimeData] = useState<Partial<AnimeFormData> | null>(null);
  const [detailAnime, setDetailAnime] = useState<Anime | null>(null);
  const [deletingAnime, setDeletingAnime] = useState<Anime | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Animes with new episodes detected
  const animesWithNewEpisodes = useMemo(() => {
    return animes.filter(
      (a) =>
        (a.status === 'watching' || a.status === 'waiting_new_episodes') &&
        typeof a.latestAiredEpisode === 'number' &&
        a.latestAiredEpisode > a.currentEpisode
    );
  }, [animes]);

  const handleBatchSyncAiring = async () => {
    if (triggerAuthPrompt('Sincronizar lançamentos com a nuvem', 'Crie sua conta com o Google para sincronizar lançamentos automaticamente.')) return;
    if (!user || isBatchSyncing) return;
    setIsBatchSyncing(true);
    try {
      const results = await checkAllAiringAnimesUpdates(user.uid, animes);
      const updatedWithNew = results.filter((r) => r.hasNewEpisode);
      if (updatedWithNew.length > 0) {
        setSyncToast({
          message: `${updatedWithNew.length} anime(s) com episódios mais recentes encontrados!`,
          type: 'success',
        });
      } else {
        setSyncToast({
          message: 'Sincronização concluída! Todos os animes estão atualizados.',
          type: 'info',
        });
      }
    } catch (err) {
      setSyncToast({
        message: 'Erro ao verificar atualizações de episódios.',
        type: 'error',
      });
    } finally {
      setIsBatchSyncing(false);
    }
  };

  // Monitora e avisa sobre episódios lançados hoje caso o usuário tenha ativado notificações
  useEffect(() => {
    if (animes && animes.length > 0) {
      checkAndNotifyTodayEpisodes(animes);
    }
  }, [animes]);

  // Pré-carregamento silencioso no Boot do App (executa logo após abertura em background com baixa prioridade)
  useEffect(() => {
    const today = (getTodayBroadcastName() as any) || 'Segunda';

    // 0. Sincronização automatizada da Agenda em segundo plano (AniList -> Jikan -> Shikimori)
    // Disparada silenciosamente logo após o mount para garantir que novas obras, transições de estreia
    // e conclusões de temporada estejam 100% atualizadas sem bloquear o usuário.
    runBackgroundScheduleSync().catch(() => {});

    // Dispara com prioridade baixa (1.5s após inicializar) para garantir que a lista principal já esteja leve e pronta
    const bootTimer = setTimeout(() => {
      // 1. Calendário de hoje
      if (!getCachedWeeklySchedule(today)) {
        getWeeklySchedule(today).catch(() => {});
      }

      // 2. Temporada Atual ("Em Exibição")
      if (!getCachedSeasonNow()) {
        getSeasonNowAnimes().catch(() => {});
      }

      // 3. Próxima Temporada ("Próximas Estreias")
      setTimeout(() => {
        if (!getCachedSeasonUpcoming()) {
          getSeasonUpcomingAnimes().catch(() => {});
        }
      }, 1000);

      // 4. Notícias Globais e Feeds de Imprensa (Pré-carregamento Silencioso em Segundo Plano)
      setTimeout(() => {
        if (!newsPrefetchDoneRef.current) {
          newsPrefetchDoneRef.current = true;
          handleFetchNews(false);
        }
      }, 1800);
    }, 1500);

    // Sincronização periódica silenciosa a cada 4 minutos para manter novidades atualizadas
    const newsInterval = setInterval(() => {
      handleFetchNews(false);
      // Mantém a agenda periodicamente sincronizada caso o app fique aberto
      runBackgroundScheduleSync().catch(() => {});
    }, 1000 * 60 * 4);

    return () => {
      clearTimeout(bootTimer);
      clearInterval(newsInterval);
    };
  }, [handleFetchNews]);

  // Shared List Public Viewer State (e.g., ?share=USER_ID or ?user=USER_ID or /perfil/SLUG)
  const [sharedUserId, setSharedUserId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('share') || params.get('user');
    if (fromParam) return fromParam;

    const pathname = window.location.pathname;
    if (pathname.startsWith('/perfil/')) {
      const slug = pathname.replace(/^\/perfil\//, '').replace(/\/$/, '').trim();
      if (slug) return slug;
    }
    return null;
  });
  const [sharedUserProfile, setSharedUserProfile] = useState<UserProfile | null>(null);
  const [sharedAnimes, setSharedAnimes] = useState<Anime[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);

  // Detect URL share parameter changes & load shared list
  useEffect(() => {
    if (!sharedUserId) return;

    let isMounted = true;
    setSharedLoading(true);

    const loadSharedProfileAndAnimes = async () => {
      try {
        let profile = await getUserProfile(sharedUserId);
        let actualUid = sharedUserId;

        // If not found by document ID, try finding by Nickname / publicUsername
        if (!profile) {
          const profileByNick = await getUserProfileByUsername(sharedUserId);
          if (profileByNick) {
            profile = profileByNick;
            if (profileByNick.userId) {
              actualUid = profileByNick.userId;
            }
          }
        }

        const list = await getPublicUserAnimes(actualUid);
        if (!isMounted) return;
        setSharedUserProfile(profile);
        setSharedAnimes(list);
      } catch (err) {
        console.error('Erro ao carregar lista pública:', err);
      } finally {
        if (isMounted) setSharedLoading(false);
      }
    };

    loadSharedProfileAndAnimes();

    return () => {
      isMounted = false;
    };
  }, [sharedUserId]);

  const handleExitSharedView = () => {
    // Remove query params from URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.delete('share');
    url.searchParams.delete('user');
    window.history.pushState({}, '', url.pathname);
    setSharedUserId(null);
    setSharedUserProfile(null);
    setSharedAnimes([]);
  };

  const handleOpenScheduleModal = (_tab: 'schedule' | 'season' = 'schedule') => {
    setActiveTab('schedule');
  };

  const handleAddFromExplorer = (data: Partial<AnimeFormData>) => {
    if (triggerAuthPrompt('Adicionar anime da programação/notícias', 'Necessário criar uma conta com o Google para adicionar animes à sua lista pessoal.')) return;
    setEditingAnime(null);
    setPrefillAnimeData(data);
    setIsModalOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // 1. Apaga todos os animes do usuário no Firestore
      await deleteAllUserAnimes(user.uid);
      // 2. Apaga o perfil do usuário no Firestore e limpa localStorage
      await deleteUserProfile(user.uid);
      // 3. Limpa estados locais
      setAnimes([]);
      setDetailAnime(null);
      setEditingAnime(null);
      setCustomAvatarUrl('');
      // 4. Desconectar conta
      await logout();
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      throw err;
    }
  };


  // User Profile Customization state (Avatar, Public preferences)
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Load custom user profile
  useEffect(() => {
    if (!user) {
      setCustomAvatarUrl('');
      setCurrentUserProfile(null);
      return;
    }

    let isMounted = true;
    getUserProfile(user.uid).then(async (profile) => {
      if (!isMounted) return;
      const userEmail = (user.email || '').trim().toLowerCase();
      const isDev = userEmail === 'lanskyy93@gmail.com';

      if (profile) {
        let needsUpdate = false;
        const updatedData: Partial<UserProfile> = { ...profile, email: user.email || profile.email };

        if (isDev) {
          if (!profile.isDeveloperAdmin) {
            updatedData.isDeveloperAdmin = true;
            needsUpdate = true;
          }
        } else {
          // Conta comum ou wansther93@gmail.com: desvincula de qualquer privilégio administrativo
          if (profile.isDeveloperAdmin) {
            updatedData.isDeveloperAdmin = false;
            needsUpdate = true;
          }
          // Nick @Lanskyy é exclusivo da conta oficial
          const nickClean = (profile.publicUsername || '').toLowerCase().replace(/^@/, '');
          if (nickClean === 'lanskyy' || nickClean === 'lansky') {
            const defaultId = userEmail ? userEmail.split('@')[0] : 'usuario';
            updatedData.publicUsername = defaultId;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          const updated = await saveUserProfile(user.uid, updatedData);
          if (isMounted) {
            setCurrentUserProfile(updated);
            if (updated.customAvatarUrl) setCustomAvatarUrl(updated.customAvatarUrl);
          }
        } else {
          setCurrentUserProfile(profile);
          if (profile.customAvatarUrl) setCustomAvatarUrl(profile.customAvatarUrl);
        }
      } else if (user.email) {
        const defaultNick = isDev ? 'Lanskyy' : userEmail.split('@')[0];
        const newProfile = await saveUserProfile(user.uid, {
          email: user.email,
          publicUsername: defaultNick,
          isDeveloperAdmin: isDev,
        });
        if (isMounted) {
          setCurrentUserProfile(newProfile);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSaveAvatar = async (newUrl: string) => {
    if (!user) return;
    setCustomAvatarUrl(newUrl);
    const isDev = Boolean(user.email && user.email.toLowerCase() === 'lanskyy93@gmail.com');
    const updated = await saveUserProfile(user.uid, {
      customAvatarUrl: newUrl,
      email: user.email || undefined,
      isDeveloperAdmin: Boolean(isDev),
    });
    setCurrentUserProfile(updated);
  };

  const handleSaveProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) return;
    if (profileData.customAvatarUrl !== undefined) {
      setCustomAvatarUrl(profileData.customAvatarUrl);
    }
    // Optimistic immediate update
    setCurrentUserProfile((prev) => {
      if (!prev) {
        return {
          userId: user.uid,
          email: user.email || undefined,
          ...profileData,
        } as UserProfile;
      }
      return {
        ...prev,
        ...profileData,
      };
    });

    try {
      const isDev = Boolean(user.email && user.email.toLowerCase() === 'lanskyy93@gmail.com');
      const updated = await saveUserProfile(user.uid, {
        ...profileData,
        email: user.email || profileData.email,
        isDeveloperAdmin: Boolean(isDev),
      });
      setCurrentUserProfile(updated);
    } catch (err) {
      console.error('Erro ao salvar dados de perfil:', err);
      // Reverte se necessário
      const restored = await getUserProfile(user.uid);
      if (restored) setCurrentUserProfile(restored);
      throw err;
    }
  };

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuestMode(false);
        localStorage.removeItem('wanime_guest_mode');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore animes in real time when user logs in, or load sample animes in guest mode
  useEffect(() => {
    if (!user) {
      if (isGuestMode) {
        setAnimes(SAMPLE_GUEST_ANIMES);
        setDataLoading(false);
      } else {
        setAnimes([]);
        setDataLoading(false);
      }
      return;
    }

    // Inicialização instantânea do cache local para 0ms de espera e suporte offline real
    try {
      const cached = localStorage.getItem(`wanime_offline_animes_${user.uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAnimes(parsed);
          setDataLoading(false);
        }
      }
    } catch {}

    const unsubscribe = subscribeToUserAnimes(
      user.uid,
      (updatedList) => {
        setAnimes(updatedList);
        prefetchUserCollectionMetadata(updatedList);
        setDataLoading(false);
        try {
          localStorage.setItem(`wanime_offline_animes_${user.uid}`, JSON.stringify(updatedList));
        } catch {}
        // Keep active detail modal in sync with live data
        setDetailAnime((prev) => {
          if (!prev) return null;
          return updatedList.find((a) => a.id === prev.id) || null;
        });
      },
      (err) => {
        console.error('Erro na sincronização:', err);
        setDataLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isGuestMode]);

  // Calculate counts for tabs
  const counts = useMemo(() => {
    const map: Record<FilterStatus, number> = {
      all: animes.length,
      watching: 0,
      waiting_new_episodes: 0,
      plan_to_watch: 0,
      completed: 0,
      paused: 0,
      dropped: 0,
      cancelled: 0,
    };

    animes.forEach((anime) => {
      if (map[anime.status] !== undefined) {
        map[anime.status]++;
      }
    });

    return map;
  }, [animes]);

  // Animes com lançamento oficial ativo hoje (exclui concluídos, encerrados e dropados)
  const airingTodayAnimes = useMemo(() => {
    return animes.filter((a) => isAnimeActiveAndAiringToday(a));
  }, [animes]);

  // Há novos episódios na agenda de hoje que o usuário ainda não visualizou?
  const hasNewScheduleEpisodes = useMemo(() => {
    if (airingTodayAnimes.length === 0) return false;
    return lastViewedScheduleDate !== todayStr;
  }, [airingTodayAnimes.length, lastViewedScheduleDate, todayStr]);

  // Há notícias mais recentes do que a última visualização?
  const hasUnreadNews = useMemo(() => {
    if (cachedNews.length === 0) return false;
    // Se o usuário nunca entrou na aba de notícias, mostra o aviso
    if (!lastViewedNewsTimestamp) return true;
    // Verifica se alguma das primeiras notícias possui timestamp mais recente
    const latestNewsTime = cachedNews.slice(0, 5).reduce((latest, item) => {
      const itemTime = item.publishedAt ? new Date(item.publishedAt).getTime() : 0;
      return Math.max(latest, itemTime);
    }, 0);
    return latestNewsTime > lastViewedNewsTimestamp;
  }, [cachedNews, lastViewedNewsTimestamp]);

  // Extract all distinct genres across user's animes
  const availableGenres = useMemo(() => {
    const genreMap = new Map<string, number>();
    animes.forEach((a) => {
      if (a.genres && Array.isArray(a.genres)) {
        a.genres.forEach((g) => {
          const trim = g.trim();
          if (trim) {
            genreMap.set(trim, (genreMap.get(trim) || 0) + 1);
          }
        });
      }
    });

    return Array.from(genreMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .map(([genre]) => genre);
  }, [animes]);

  // Achievements calculations for unified badges
  const achievementsResult = useMemo(() => {
    return calculateUserAchievements(animes);
  }, [animes]);
  const unlockedAchievementsCount = achievementsResult.totalUnlocked;
  const totalAchievementsCount = achievementsResult.totalAchievements;

  // Otaku Level & Gamification XP (Totalmente integrado com episódios, animes e XP de conquistas)
  const otakuLevelData = useMemo(() => {
    return calculateOtakuLevel(animes, {
      totalUnlocked: achievementsResult.totalUnlocked,
      totalXpEarned: achievementsResult.totalXpEarned,
    });
  }, [animes, achievementsResult.totalUnlocked, achievementsResult.totalXpEarned]);

  // Contagem individual de animes por gênero
  const genreCounts = useMemo(() => {
    const map: Record<string, number> = {};
    animes.forEach((a) => {
      if (a.genres && Array.isArray(a.genres)) {
        a.genres.forEach((g) => {
          const trim = g.trim();
          if (trim) {
            map[trim] = (map[trim] || 0) + 1;
          }
        });
      }
    });
    return map;
  }, [animes]);

  // Filtered & Sorted animes
  const filteredAndSortedAnimes = useMemo(() => {
    let result = animes.filter((anime) => {
      // Airing today filter
      if (airingTodayOnly) {
        if (!isAnimeActiveAndAiringToday(anime)) return false;
      }

      // Status filter
      if (currentFilter !== 'all' && anime.status !== currentFilter) {
        return false;
      }

      // Genre filter
      if (selectedGenre) {
        if (!anime.genres || !anime.genres.includes(selectedGenre)) {
          return false;
        }
      }

      // Phase 3 Studio filter
      if (selectedStudio) {
        if (!anime.studio || anime.studio.toLowerCase().trim() !== selectedStudio.toLowerCase().trim()) {
          return false;
        }
      }

      // Phase 3 Format filter
      if (selectedFormat) {
        if (!anime.format || anime.format.toLowerCase().trim() !== selectedFormat.toLowerCase().trim()) {
          return false;
        }
      }

      // Phase 3 Year filter
      if (selectedYear !== null) {
        if (!anime.releaseYear || anime.releaseYear !== selectedYear) {
          return false;
        }
      }

      // Phase 3 Source filter
      if (selectedSource) {
        if (!anime.source || anime.source.toLowerCase().trim() !== selectedSource.toLowerCase().trim()) {
          return false;
        }
      }

      // Phase 3 Minimum Rating filter
      if (minRating !== null) {
        if (typeof anime.rating !== 'number' || anime.rating < minRating) {
          return false;
        }
      }

      // Smart search filter (matches title, japaneseTitle, studio, format, notes, season/arc names, broadcast day, genres)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = anime.title.toLowerCase().includes(q);
        const matchJapTitle = anime.japaneseTitle ? anime.japaneseTitle.toLowerCase().includes(q) : false;
        const matchStudio = anime.studio ? anime.studio.toLowerCase().includes(q) : false;
        const matchFormat = anime.format ? anime.format.toLowerCase().includes(q) : false;
        const matchNotes = anime.notes ? anime.notes.toLowerCase().includes(q) : false;
        const matchSeason = anime.currentSeasonName ? anime.currentSeasonName.toLowerCase().includes(q) : false;
        const matchArc = anime.seasons ? anime.seasons.some((s) => s.name.toLowerCase().includes(q)) : false;
        const matchDay = anime.broadcastDay ? anime.broadcastDay.toLowerCase().includes(q) : false;
        const matchGenre = anime.genres ? anime.genres.some((g) => g.toLowerCase().includes(q)) : false;

        return matchTitle || matchJapTitle || matchStudio || matchFormat || matchNotes || matchSeason || matchArc || matchDay || matchGenre;
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'updated_desc':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'name_asc':
          return a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' });
        case 'name_desc':
          return b.title.localeCompare(a.title, 'pt-BR', { sensitivity: 'base' });
        case 'rating_desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'created_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'created_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'episodes_desc':
          return b.currentEpisode - a.currentEpisode;
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return result;
  }, [
    animes, 
    currentFilter, 
    selectedGenre, 
    airingTodayOnly, 
    selectedStudio, 
    selectedFormat, 
    selectedYear, 
    selectedSource, 
    minRating, 
    searchQuery, 
    sortOption
  ]);

  // Handlers
  const handleOpenAdd = () => {
    if (triggerAuthPrompt('Adicionar anime à lista', 'Necessário criar uma conta com o Google para adicionar animes à sua lista.')) return;
    setEditingAnime(null);
    setPrefillAnimeData(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (anime: Anime) => {
    if (triggerAuthPrompt('Editar anime', 'Necessário criar uma conta com o Google para editar animes.')) return;
    setEditingAnime(anime);
    setPrefillAnimeData(null);
    setIsModalOpen(true);
  };


  const handleSaveAnime = async (formData: AnimeFormData) => {
    if (triggerAuthPrompt('Salvar anime')) return;
    if (!user) return;
    if (editingAnime) {
      await updateAnime(editingAnime.id, formData);
    } else {
      await addAnime(user.uid, formData);
    }
  };

  const handleConfirmDelete = async () => {
    if (triggerAuthPrompt('Excluir anime')) return;
    if (!deletingAnime) return;
    setIsDeleting(true);
    try {
      await deleteAnime(deletingAnime.id);
      if (detailAnime?.id === deletingAnime.id) {
        setDetailAnime(null);
      }
      setDeletingAnime(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (anime: Anime, newStatus: AnimeStatus) => {
    if (triggerAuthPrompt('Alterar status do anime', 'Necessário criar uma conta com o Google para alterar o status dos animes.')) return;
    setAnimes((prev) =>
      prev.map((a) => (a.id === anime.id ? { ...a, status: newStatus, updatedAt: new Date().toISOString() } : a))
    );
    if (detailAnime?.id === anime.id) {
      setDetailAnime((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    try {
      await updateAnime(anime.id, { status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNotes = async (anime: Anime, newNotes: string) => {
    if (triggerAuthPrompt('Salvar anotações')) return;
    setAnimes((prev) =>
      prev.map((a) => (a.id === anime.id ? { ...a, notes: newNotes, updatedAt: new Date().toISOString() } : a))
    );
    if (detailAnime?.id === anime.id) {
      setDetailAnime((prev) => (prev ? { ...prev, notes: newNotes } : null));
    }
    try {
      await updateAnime(anime.id, { notes: newNotes });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateEpisode = async (anime: Anime, newEpisode: number) => {
    if (triggerAuthPrompt('Atualizar episódios', 'Necessário criar uma conta com o Google para salvar o progresso de episódios.')) return;
    setAnimes((prev) =>
      prev.map((a) => (a.id === anime.id ? { ...a, currentEpisode: newEpisode, updatedAt: new Date().toISOString() } : a))
    );
    if (detailAnime?.id === anime.id) {
      setDetailAnime((prev) => (prev ? { ...prev, currentEpisode: newEpisode } : null));
    }
    try {
      await setEpisodeDirectly(anime, newEpisode);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchSeason = async (anime: Anime, season: AnimeSeasonOrArc) => {
    if (triggerAuthPrompt('Trocar temporada ativa')) return;
    setAnimes((prev) =>
      prev.map((a) =>
        a.id === anime.id
          ? {
              ...a,
              currentSeasonName: season.name,
              totalEpisodes: season.totalEpisodes || a.totalEpisodes,
              currentEpisode: 0,
              updatedAt: new Date().toISOString(),
            }
          : a
      )
    );
    if (detailAnime?.id === anime.id) {
      setDetailAnime((prev) =>
        prev
          ? {
              ...prev,
              currentSeasonName: season.name,
              totalEpisodes: season.totalEpisodes || prev.totalEpisodes,
              currentEpisode: 0,
            }
          : null
      );
    }
    try {
      await updateAnime(anime.id, {
        currentSeasonName: season.name,
        totalEpisodes: season.totalEpisodes || anime.totalEpisodes,
        currentEpisode: 0,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSeasonWatched = async (anime: Anime, seasonId: string) => {
    if (triggerAuthPrompt('Marcar temporada como assistida')) return;
    try {
      await toggleSeasonWatchedStatus(anime, seasonId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRating = async (anime: Anime, rating: number | null) => {
    if (triggerAuthPrompt('Dar nota ao anime', 'Necessário criar uma conta com o Google para avaliar animes com notas.')) return;
    setAnimes((prev) =>
      prev.map((a) => (a.id === anime.id ? { ...a, rating, updatedAt: new Date().toISOString() } : a))
    );
    if (detailAnime?.id === anime.id) {
      setDetailAnime((prev) => (prev ? { ...prev, rating } : null));
    }
    try {
      await updateAnime(anime.id, { rating });
    } catch (err) {
      console.error(err);
    }
  };

  const handleIncrementEp = async (anime: Anime) => {
    if (triggerAuthPrompt('Atualizar episódios', 'Necessário criar uma conta com o Google para salvar o progresso de episódios.')) return;

    const currentEp = Number(anime.currentEpisode) || 0;
    const nextEp = currentEp + 1;

    // Obter lista de temporadas ordenadas por order
    const seasonsList = anime.seasons && anime.seasons.length > 0
      ? [...anime.seasons].sort((a, b) => (a.order || 0) - (b.order || 0))
      : [];

    const currentIdx = seasonsList.findIndex((s) => s.name === anime.currentSeasonName);
    const activeSeason = currentIdx !== -1 ? seasonsList[currentIdx] : seasonsList[0];
    const maxEp = activeSeason?.totalEpisodes || anime.totalEpisodes;

    // Se alcançou o último episódio desta temporada
    const isSeasonCompleted = Boolean(maxEp && nextEp >= maxEp);

    // CASO 1: Terminou a temporada atual e EXISTE uma próxima temporada na franquia
    if (isSeasonCompleted && seasonsList.length > 0 && currentIdx !== -1 && currentIdx + 1 < seasonsList.length) {
      const nextSeason = seasonsList[currentIdx + 1];
      const updatedSeasons = seasonsList.map((s, idx) =>
        idx === currentIdx ? { ...s, isWatched: true } : s
      );

      const updatedAnimeData: Partial<Anime> = {
        currentSeasonName: nextSeason.name,
        totalEpisodes: nextSeason.totalEpisodes || null,
        currentEpisode: 0, // Zera para iniciar a nova temporada
        seasons: updatedSeasons,
        status: 'watching', // PERMANECE RIGOROSAMENTE ASSISTINDO!
        updatedAt: new Date().toISOString(),
      };

      setAnimes((prev) =>
        prev.map((a) => (a.id === anime.id ? { ...a, ...updatedAnimeData } : a))
      );
      if (detailAnime?.id === anime.id) {
        setDetailAnime((prev) => (prev ? { ...prev, ...updatedAnimeData } : null));
      }

      try {
        await updateAnime(anime.id, {
          currentSeasonName: nextSeason.name,
          totalEpisodes: nextSeason.totalEpisodes || null,
          currentEpisode: 0,
          seasons: updatedSeasons,
          status: 'watching',
        });
      } catch (err) {
        console.error('Erro ao avançar para próxima temporada automaticamente:', err);
      }
      return;
    }

    // CASO 2: Última temporada ou anime de temporada única
    let updatedStatus: AnimeStatus = anime.status;
    let updatedSeasons = seasonsList;

    if (isSeasonCompleted) {
      if (seasonsList.length > 0 && currentIdx !== -1) {
        updatedSeasons = seasonsList.map((s, idx) =>
          idx === currentIdx ? { ...s, isWatched: true } : s
        );
      }

      // Se for anime semanal com dia de lançamento ativo
      if (anime.broadcastDay && anime.broadcastDay.trim()) {
        updatedStatus = 'waiting_new_episodes';
      } else {
        // Anime finalizado sem mais lançamentos
        updatedStatus = 'completed';
      }
    } else if (anime.status === 'plan_to_watch' || anime.status === 'waiting_new_episodes') {
      updatedStatus = 'watching';
    }

    setAnimes((prev) =>
      prev.map((a) =>
        a.id === anime.id
          ? {
              ...a,
              currentEpisode: nextEp,
              status: updatedStatus,
              seasons: updatedSeasons,
              updatedAt: new Date().toISOString(),
            }
          : a
      )
    );
    if (detailAnime?.id === anime.id) {
      setDetailAnime((prev) =>
        prev
          ? {
              ...prev,
              currentEpisode: nextEp,
              status: updatedStatus,
              seasons: updatedSeasons,
            }
          : null
      );
    }

    try {
      await incrementEpisode(anime);
      if (updatedStatus !== anime.status || updatedSeasons !== seasonsList) {
        await updateAnime(anime.id, {
          status: updatedStatus,
          seasons: updatedSeasons,
        });
      }
    } catch (err) {
      console.error('Erro ao incrementar episódio:', err);
    }
  };

  const handleDecrementEp = async (anime: Anime) => {
    if (triggerAuthPrompt('Atualizar episódios', 'Necessário criar uma conta com o Google para salvar o progresso de episódios.')) return;
    const current = Number(anime.currentEpisode) || 0;
    if (current <= 0) return;
    const prevEp = current - 1;
    setAnimes((prev) =>
      prev.map((a) => (a.id === anime.id ? { ...a, currentEpisode: prevEp, updatedAt: new Date().toISOString() } : a))
    );
    if (detailAnime?.id === anime.id) {
      setDetailAnime((prev) => (prev ? { ...prev, currentEpisode: prevEp } : null));
    }
    try {
      await decrementEpisode(anime);
    } catch (err) {
      console.error('Erro ao decrementar episódio:', err);
    }
  };

  // Loading Splash Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3.5 animate-pulse">
          <Tv className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Carregando WAnime List...</span>
        </div>
      </div>
    );
  }

  // If visiting a shared public list link (?share=UID or ?user=UID)
  if (sharedUserId) {
    return (
      <SharedListPublicView
        ownerUserId={sharedUserId}
        ownerProfile={sharedUserProfile}
        animes={sharedAnimes}
        loading={sharedLoading}
        onGoToMyList={handleExitSharedView}
        currentUserId={user?.uid}
        isGuest={isGuestMode}
        myAnimes={animes}
        onAddAnimeFromFriend={handleAddFromExplorer}
        onRequireAuth={(action) => triggerAuthPrompt(action)}
      />
    );
  }

  // Not logged in and not in guest mode -> Show login
  if (!user && !isGuestMode) {
    return <LoginScreen onEnterGuest={handleEnterGuestMode} />;
  }

  const handleOpenAvatarModal = () => {
    if (isGuestMode) {
      triggerAuthPrompt('Gerenciar Perfil e Avatar', 'O modo visitante não possui perfil público. Crie sua conta com o Google para personalizar sua foto de perfil, link exclusivo e insígnias.');
      return;
    }
    setIsAvatarModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600/90 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 text-center shadow-lg">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Modo Offline Ativo: Você pode continuar usando! Suas alterações serão sincronizadas com a nuvem automaticamente ao reconectar.</span>
        </div>
      )}

      {/* App Header */}
      <Header
        user={user}
        customAvatarUrl={customAvatarUrl}
        theme={theme}
        isGuestMode={isGuestMode}
        onLoginGoogle={handleGoogleLoginFromApp}
        onToggleTheme={toggleTheme}
        onOpenAvatarModal={handleOpenAvatarModal}
        onLogout={handleLogoutOrExitGuest}
        onOpenBackup={() => {
          if (triggerAuthPrompt('Backup e Exportação', 'Crie sua conta com o Google para fazer backup de seus dados na nuvem.')) return;
          setIsBackupOpen(true);
        }}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenShareModal={() => {
          if (triggerAuthPrompt('Compartilhar Perfil Público', 'O modo visitante não possui perfil público. Crie sua conta com o Google para ter seu link de perfil personalizado.')) return;
          setIsShareModalOpen(true);
        }}
        onOpenImageSearch={() => setIsImageSearchModalOpen(true)}
        onOpenSocialCard={() => setIsSocialCardModalOpen(true)}
        watchingCount={counts.watching}
        totalCount={counts.all}
        otakuLevel={otakuLevelData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-2.5 sm:px-6 py-2 sm:py-4 pb-16 md:pb-8">
        {/* Sync Toast Notification */}
        {syncToast && (
          <div
            className={`mb-2 sm:mb-3 px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-top-1 ${
              syncToast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/40'
                : syncToast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border border-rose-500/40'
                : 'bg-indigo-950/90 text-indigo-200 border border-indigo-500/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncToast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncToast(null)}
              className="text-slate-400 hover:text-white cursor-pointer p-0.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Central Integrated App Navigation (Desktop Top Bar / Mobile Fixed Bottom Bar) */}
        <div className="hidden md:block mb-3 sm:mb-4">
          <AppNavigation
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            airingTodayCount={airingTodayAnimes.length}
            totalAnimesCount={animes.length}
            unlockedAchievementsCount={unlockedAchievementsCount}
            totalAchievementsCount={totalAchievementsCount}
            onOpenImageSearch={() => setIsImageSearchModalOpen(true)}
            onOpenSocialCard={() => setIsSocialCardModalOpen(true)}
            hasNewScheduleEpisodes={hasNewScheduleEpisodes}
            hasUnreadNews={hasUnreadNews}
          />
        </div>
        {/* Mobile Navigation render outside hidden wrapper */}
        <div className="md:hidden">
          <AppNavigation
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            airingTodayCount={airingTodayAnimes.length}
            totalAnimesCount={animes.length}
            unlockedAchievementsCount={unlockedAchievementsCount}
            totalAchievementsCount={totalAchievementsCount}
            onOpenImageSearch={() => setIsImageSearchModalOpen(true)}
            onOpenSocialCard={() => setIsSocialCardModalOpen(true)}
            hasNewScheduleEpisodes={hasNewScheduleEpisodes}
            hasUnreadNews={hasUnreadNews}
          />
        </div>

        {/* 1. ABA DE NOTÍCIAS */}
        {activeTab === 'news' && (
          <NewsView
            userAnimes={animes}
            onAddAnimeFromNews={(prefill) => handleAddFromExplorer(prefill)}
            news={cachedNews}
            loading={isNewsLoading}
            isFetching={isNewsFetching}
            lastUpdatedTime={lastNewsUpdatedTime}
            onRefreshNews={handleFetchNews}
          />
        )}

        {/* 2. ABA DE LANÇAMENTOS E GUIA DA TEMPORADA */}
        {activeTab === 'schedule' && (
          <ScheduleView
            userAnimes={animes}
            onAddFromExplorer={handleAddFromExplorer}
            onOpenAnimeDetail={(anime) => setDetailAnime(anime)}
          />
        )}

        {/* 3. ABA DE PERFIL OTAKU UNIFICADO COM TOP 5, INSÍGNIAS E FEED COLETIVO */}
        {activeTab === 'community' && (
          <OtakuProfileView
            profile={currentUserProfile}
            animes={animes}
            isOwner={true}
            currentUserId={user?.uid}
            reviews={communityReviews}
            onOpenAnimeDetail={(anime) => setDetailAnime(anime)}
            onOpenEditProfile={handleOpenAvatarModal}
            onUpdateProfile={async (up) => {
              if (user) {
                const updated = await saveUserProfile(user.uid, up);
                setCurrentUserProfile(updated);
                setSyncToast({ message: 'Perfil otaku atualizado com sucesso!', type: 'success' });
              }
            }}
            onReviewCreated={(newRev) => {
              setCommunityReviews((prev) => [newRev, ...prev]);
              setSyncToast({ message: 'Resenha compartilhada no feed da comunidade!', type: 'success' });
            }}
            onOpenStatsDetail={() => setActiveTab('stats')}
            onOpenPublicProfile={(target) => setSharedUserId(target)}
            onAddAnimeFromFriend={(prefill) => handleAddFromExplorer(prefill)}
          />
        )}

        {/* 4. ABA DE CONQUISTAS */}
        {activeTab === 'achievements' && (
          <AchievementsView
            animes={animes}
            userName={currentUserProfile?.publicUsername || (isGuestMode ? 'Visitante' : (user?.displayName || 'Otaku'))}
            userProfile={currentUserProfile}
            onOpenSocialCard={handleOpenSocialCard}
          />
        )}

        {/* 5. ABA DE ESTATÍSTICAS */}
        {activeTab === 'stats' && (
          <StatsView
            animes={animes}
            onOpenSocialCard={handleOpenSocialCard}
            onBackToProfile={() => setActiveTab('community')}
          />
        )}

        {/* 6. ABA PRINCIPAL: MINHA LISTA */}
        {activeTab === 'list' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* New Episodes Alert Banner (Smart Automation) */}
            {animesWithNewEpisodes.length > 0 && (
              <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/50 border border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-300">
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Novos Episódios Disponíveis na Sua Lista!</span>
                      <span className="bg-cyan-500 text-slate-950 font-black text-[10px] px-2 py-0.2 rounded-full">
                        {animesWithNewEpisodes.length} {animesWithNewEpisodes.length === 1 ? 'anime' : 'animes'}
                      </span>
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1">
                      {animesWithNewEpisodes.map((a) => `${a.title} (Ep ${a.latestAiredEpisode})`).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setCurrentFilter('watching')}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    Ver Animes
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchSyncAiring}
                    disabled={isBatchSyncing}
                    title="Sincronizar metadados dos animes em exibição"
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isBatchSyncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Airing Today Cinematic Notice - Compacto, Elegante e Discreto */}
            {airingTodayAnimes.length > 0 && showAiringBanner && (() => {
              const featuredAnime = airingTodayAnimes[0];
              const heroBgImage = featuredAnime.bannerUrl || featuredAnime.coverUrl;

              return (
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/35 bg-[#0a0b12] shadow-xl shadow-black/80 group">
                  {/* Imagem de Fundo Cinematográfica com Arte Nítida e Visível à Direita */}
                  {heroBgImage ? (
                    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                      <img
                        src={heroBgImage}
                        alt={featuredAnime.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-right sm:object-center opacity-85 brightness-95 contrast-105 scale-105 group-hover:scale-100 transition-transform duration-700 ease-out"
                      />
                      {/* Gradiente direcional inteligente: Sombra escura no lado esquerdo para legibilidade e transparência total no lado direito para visibilidade da arte */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 via-40% sm:via-45% to-black/15" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#0a0b12] to-[#121422] pointer-events-none" />
                  )}

                  {/* Linha luminosa dourada elegante no topo */}
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/90 to-transparent z-10" />

                  <div className="relative z-10 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {/* Capa Principal com Arte e Badge HOJE */}
                      <div className="relative w-10 h-13 sm:w-11 sm:h-14 rounded-xl overflow-hidden border border-amber-400/60 bg-black/80 shadow-md shrink-0 group-hover:border-amber-400 transition-colors">
                        {featuredAnime.coverUrl ? (
                          <img
                            src={featuredAnime.coverUrl}
                            alt={featuredAnime.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-amber-400">
                            <Flame className="w-4 h-4" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-amber-400 text-slate-950 font-black text-[7px] py-0.2 text-center shadow-xs tracking-wider">
                          HOJE
                        </div>
                      </div>

                      {/* Miniaturas de outros animes de hoje caso haja mais de 1 */}
                      {airingTodayAnimes.length > 1 && (
                        <div className="hidden sm:flex items-center -space-x-2.5 shrink-0">
                          {airingTodayAnimes.slice(1, 3).map((a) => (
                            <div
                              key={`today_sub_${a.id}`}
                              className="w-7 h-10 rounded-lg overflow-hidden border border-amber-500/40 bg-slate-900 shadow-sm relative"
                              title={a.title}
                            >
                              {a.coverUrl ? (
                                <img
                                  src={a.coverUrl}
                                  alt={a.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[7px] text-amber-300 font-bold">
                                  {a.title.slice(0, 2)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Textos Informativos Formatados com Elegância */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-amber-400 flex items-center gap-1 drop-shadow-sm">
                            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse shrink-0" />
                            <span>Lançamentos de Hoje • {getTodayBroadcastName()}</span>
                          </span>
                          <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full shadow-xs">
                            {airingTodayAnimes.length} {airingTodayAnimes.length === 1 ? 'anime' : 'animes'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5 truncate drop-shadow-sm max-w-xs sm:max-w-md md:max-w-xl">
                          {airingTodayAnimes.map((a) => a.title).join(' • ')}
                        </p>
                      </div>
                    </div>

                    {/* Botão Discreto de Dispensar Aviso */}
                    <button
                      type="button"
                      onClick={() => setShowAiringBanner(false)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-1"
                      title="Ocultar aviso de hoje"
                      aria-label="Ocultar aviso de hoje"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Ultra-Compact Unified Control Bar */}
            <FilterControlsBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              currentFilter={currentFilter}
              onSelectFilter={(f) => setCurrentFilter(f)}
              statusCounts={counts}
              onOpenFiltersModal={() => setIsAdvancedFilterOpen(true)}
              activeFilterCount={totalActiveFilterCount}
              selectedGenre={selectedGenre}
              onClearGenre={() => setSelectedGenre(null)}
              selectedStudio={selectedStudio}
              onClearStudio={() => setSelectedStudio(null)}
              selectedFormat={selectedFormat}
              onClearFormat={() => setSelectedFormat(null)}
              selectedYear={selectedYear}
              onClearYear={() => setSelectedYear(null)}
              minRating={minRating}
              onClearRating={() => setMinRating(null)}
              onResetAllFilters={handleResetAllFilters}
              totalFilteredCount={filteredAndSortedAnimes.length}
            />

            {/* Main Grid / State Display */}
            {dataLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="text-xs">Sincronizando seus animes da nuvem...</span>
              </div>
            ) : filteredAndSortedAnimes.length === 0 ? (
              <EmptyState
                currentFilter={currentFilter}
                searchQuery={searchQuery}
                onAddNew={handleOpenAdd}
              />
            ) : viewMode === 'grid' ? (
              /* Grade Compacta 4x4 (4 colunas no computador, 3 em tablets, 2 no celular) */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredAndSortedAnimes.map((anime) => (
                  <AnimeCompactCard
                    key={anime.id}
                    anime={anime}
                    onOpenDetail={(a) => setDetailAnime(a)}
                    onIncrement={handleIncrementEp}
                    onDecrement={handleDecrementEp}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateEpisode={handleUpdateEpisode}
                    onSwitchSeason={handleSwitchSeason}
                  />
                ))}
              </div>
            ) : (
              /* Modo Lista: Cartões Horizontais Compactos e Empilháveis */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
                {filteredAndSortedAnimes.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    onOpenDetail={(a) => setDetailAnime(a)}
                    onIncrement={handleIncrementEp}
                    onDecrement={handleDecrementEp}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateEpisode={handleUpdateEpisode}
                    onSwitchSeason={handleSwitchSeason}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) - Somente na Aba de Lista e Mais Compacto */}
      {activeTab === 'list' && (
        <div className="fixed bottom-14 md:bottom-6 right-4 sm:right-6 z-40">
          <button
            id="btn-fab-add"
            onClick={handleOpenAdd}
            className="group flex items-center justify-center gap-1.5 h-11 sm:h-12 px-3.5 sm:px-4 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-xl shadow-indigo-600/40 hover:shadow-indigo-500/50 border border-indigo-400/30 transition-all cursor-pointer"
            title="Adicionar Anime"
          >
            <Plus className="w-5 h-5 shrink-0 group-hover:rotate-90 transition-transform duration-300 stroke-[2.5]" />
            <span className="hidden sm:inline text-xs font-black tracking-wide">
              Adicionar Anime
            </span>
          </button>
        </div>
      )}

      {/* Dedicated Anime Detail View */}
      <AnimeDetailModal
        anime={detailAnime}
        isOpen={!!detailAnime}
        onClose={() => setDetailAnime(null)}
        onEdit={(a) => handleOpenEdit(a)}
        onDelete={(a) => setDeletingAnime(a)}
        onIncrement={handleIncrementEp}
        onDecrement={handleDecrementEp}
        onUpdateStatus={handleUpdateStatus}
        onUpdateNotes={handleUpdateNotes}
        onUpdateEpisode={handleUpdateEpisode}
        onSwitchSeason={handleSwitchSeason}
        onToggleSeasonWatched={handleToggleSeasonWatched}
        onUpdateRating={handleUpdateRating}
        onAddFromExplorer={handleAddFromExplorer}
        onOpenAnimeDetail={(a) => setDetailAnime(a)}
      />

      {/* Add / Edit Form Modal */}
      <AnimeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPrefillAnimeData(null);
        }}
        onSave={handleSaveAnime}
        initialData={editingAnime || prefillAnimeData}
        existingGenres={availableGenres}
      />

      {/* Phase 3 Stats Modal */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        animes={animes}
        userName={currentUserProfile?.publicUsername || (isGuestMode ? 'Visitante' : (user?.displayName || 'Otaku'))}
        userAvatar={customAvatarUrl || user?.photoURL || undefined}
        onOpenAchievements={() => setIsAchievementsModalOpen(true)}
        onOpenSocialCard={handleOpenSocialCard}
      />

      {/* Quadro de Conquistas & Insígnias */}
      <AchievementsModal
        isOpen={isAchievementsModalOpen}
        onClose={() => setIsAchievementsModalOpen(false)}
        animes={animes}
        userName={currentUserProfile?.publicUsername || (isGuestMode ? 'Visitante' : (user?.displayName || 'Otaku'))}
        onOpenSocialCard={handleOpenSocialCard}
      />

      {/* Central de Notícias & Novidades */}
      <NewsModal
        isOpen={isNewsModalOpen}
        onClose={() => setIsNewsModalOpen(false)}
        userAnimes={animes}
        news={cachedNews}
        loading={isNewsLoading}
        isFetching={isNewsFetching}
        onRefreshNews={handleFetchNews}
      />

      {/* Unified Filter & Sorting Modal */}
      <UnifiedFilterModal
        isOpen={isAdvancedFilterOpen}
        onClose={() => setIsAdvancedFilterOpen(false)}
        animes={animes}
        currentFilter={currentFilter}
        onSelectFilter={setCurrentFilter}
        statusCounts={counts}
        sortOption={sortOption}
        onSelectSort={setSortOption}
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
        genreCounts={genreCounts}
        selectedStudio={selectedStudio}
        onSelectStudio={setSelectedStudio}
        selectedFormat={selectedFormat}
        onSelectFormat={setSelectedFormat}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
        selectedSource={selectedSource}
        onSelectSource={setSelectedSource}
        minRating={minRating}
        onSelectMinRating={setMinRating}
        onResetAll={handleResetAllFilters}
        activeFilterCount={totalActiveFilterCount}
      />

      {/* Backup & Export Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        animes={animes}
        userId={user?.uid || 'guest'}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={!!deletingAnime}
        anime={deletingAnime}
        onClose={() => setDeletingAnime(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />

      {/* Modal Moderno Unificado de Edição de Perfil e Avatar */}
      <EditProfileModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        profile={currentUserProfile}
        userAnimes={animes}
        onSave={handleSaveProfile}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* Share List & Public Profile Modal */}
      <ShareListModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        userId={user?.uid || 'guest'}
        userName={isGuestMode ? 'Visitante' : (user?.displayName || 'Otaku')}
        avatarUrl={customAvatarUrl || user?.photoURL || undefined}
        animes={animes}
        userProfile={currentUserProfile}
        onProfileUpdated={(updated) => setCurrentUserProfile(updated)}
        onOpenProfileSettings={handleOpenAvatarModal}
      />

      {/* Identificador de Cenas de Anime por Imagem (trace.moe) */}
      <ImageAnimeSearchModal
        isOpen={isImageSearchModalOpen}
        onClose={() => setIsImageSearchModalOpen(false)}
        onSelectAnimeForAdd={(title) => handleAddFromExplorer({ title })}
        onOpenDetails={(title) => {
          const matched = animes.find((a) => a.title.toLowerCase() === title.toLowerCase());
          if (matched) setDetailAnime(matched);
          else handleAddFromExplorer({ title });
        }}
      />

      {/* Gerador de Cards / Stories para Redes Sociais */}
      <SocialCardGeneratorModal
        isOpen={isSocialCardModalOpen}
        onClose={() => setIsSocialCardModalOpen(false)}
        animes={animes}
        userProfile={currentUserProfile}
        userName={currentUserProfile?.publicUsername || (isGuestMode ? 'Visitante' : (user?.displayName || 'Otaku'))}
        avatarUrl={customAvatarUrl || user?.photoURL || undefined}
        unlockedAchievementsCount={unlockedAchievementsCount}
        initialCardType={socialCardInitialType}
      />

      {/* PWA Install Prompt Modal */}
      <InstallPromptModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />

      {/* Modal de Aviso para Visitantes (Necessário Criar Conta) */}
      <AuthPromptModal
        isOpen={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        onLoginGoogle={handleGoogleLoginFromApp}
        actionName={authPromptActionName}
        description={authPromptDescription}
      />
    </div>
  );
}

