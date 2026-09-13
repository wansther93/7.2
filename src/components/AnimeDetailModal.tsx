import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Edit3,
  Trash2,
  Check,
  MapPin,
  ExternalLink,
  Search,
  Layers,
  Tv,
  Calendar,
  Clock,
  BookOpen,
  ChevronRight,
  Save,
  Star,
  CheckCircle2,
  Circle,
  History,
  Flame,
  Tag,
  Play,
  RefreshCw,
  AlertCircle,
  Users,
  Music,
  Film,
  Compass,
  BookmarkPlus,
  BookmarkCheck,
  Volume2,
  Share2,
  Info,
  CalendarDays,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { HorizontalScrollContainer } from './HorizontalScrollContainer';
import type { Anime, AnimeFormData, AnimeSeasonOrArc, AnimeStatus } from '../types';
import { STATUS_CONFIG } from '../types';
import { isAiringToday, isAnimeActiveAndAiringToday } from '../lib/dateUtils';
import { fetchAnimeThemesMedia, type AnimeThemeMedia } from '../services/animeThemesService';
import {
  getAnimeCharacters,
  getAnimeThemes,
  getAnimeRecommendations,
  getAnimeStreamingLinks,
  getAnimeBanner,
  getAnimeBannersGallery,
  getHighResImageUrl,
  searchAnimeMetadata,
  AnimeCharacterItem,
  AnimeThemesResult,
  AnimeRecommendationItem,
  AnimeStreamingLink,
} from '../services/jikanService';
import { updateAnime } from '../services/animeService';
import { fetchAnimeFranchiseTree } from '../services/franchiseService';

interface AnimeDetailModalProps {
  anime: Anime | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (anime: Anime) => void;
  onDelete?: (anime: Anime) => void;
  onIncrement?: (anime: Anime) => void;
  onDecrement?: (anime: Anime) => void;
  onUpdateStatus?: (anime: Anime, newStatus: AnimeStatus) => void;
  onUpdateNotes?: (anime: Anime, newNotes: string) => void;
  onUpdateEpisode?: (anime: Anime, newEpisode: number) => void;
  onSwitchSeason?: (anime: Anime, season: AnimeSeasonOrArc) => void;
  onToggleSeasonWatched?: (anime: Anime, seasonId: string) => void;
  onUpdateRating?: (anime: Anime, rating: number | null) => void;
  onAddFromExplorer?: (animeData: Partial<AnimeFormData>) => void;
  onOpenAnimeDetail?: (anime: Anime) => void;
  isReadOnly?: boolean;
}

export const AnimeDetailModal: React.FC<AnimeDetailModalProps> = ({
  anime,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onIncrement,
  onDecrement,
  onUpdateStatus,
  onUpdateNotes,
  onUpdateEpisode,
  onSwitchSeason,
  onToggleSeasonWatched,
  onUpdateRating,
  onAddFromExplorer,
  onOpenAnimeDetail,
  isReadOnly = false,
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(anime?.notes || '');
  const [directEpInput, setDirectEpInput] = useState<string>(String(anime?.currentEpisode ?? 0));
  const [isEditingDirectEp, setIsEditingDirectEp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEmbeddedTrailer, setShowEmbeddedTrailer] = useState(false);
  const [dynamicBanner, setDynamicBanner] = useState<string | null>(anime?.bannerUrl || null);
  const [bannerGallery, setBannerGallery] = useState<string[]>(anime?.bannerUrl ? [anime.bannerUrl] : []);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  // Estados extras do portal: Personagens, Temas, Recomendações e Streaming
  const [characters, setCharacters] = useState<AnimeCharacterItem[]>([]);
  const [themes, setThemes] = useState<AnimeThemesResult>({ openings: [], endings: [] });
  const [mediaThemes, setMediaThemes] = useState<AnimeThemeMedia[]>([]);
  const [activeMediaUrl, setActiveMediaUrl] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<AnimeRecommendationItem[]>([]);
  const [streamingLinks, setStreamingLinks] = useState<AnimeStreamingLink[]>([]);
  const [loadingPortalExtras, setLoadingPortalExtras] = useState(false);
  const [activeTab, setActiveTab] = useState<'seasons' | 'info' | 'characters' | 'music' | 'media'>('seasons');

  // Gerenciamento de temporadas inline dentro da Ficha Técnica
  const [isManagingSeasons, setIsManagingSeasons] = useState(false);
  const [isSavingSeasons, setIsSavingSeasons] = useState(false);
  const [isRefreshingTree, setIsRefreshingTree] = useState(false);
  const [refreshTreeFeedback, setRefreshTreeFeedback] = useState<{ text: string; success: boolean } | null>(null);

  useEffect(() => {
    if (anime) {
      setNotesDraft(anime.notes || '');
      setDirectEpInput(String(anime.currentEpisode ?? 0));
      setIsEditingNotes(false);
      setIsEditingDirectEp(false);
      setShowHistory(false);
      setShowEmbeddedTrailer(false);
      setActiveTab('seasons');
      setActiveMediaUrl(null);
      setDynamicBanner(anime.bannerUrl || null);
      setBannerGallery(anime.bannerUrl ? [anime.bannerUrl] : []);
      setActiveBannerIndex(0);
      setIsSynopsisExpanded(false);
      setIsManagingSeasons(false);
      setRefreshTreeFeedback(null);
    }
  }, [anime?.id, anime?.notes, anime?.currentEpisode, anime?.bannerUrl]);

  // Ciclo suave de rotação de banners estritamente da mesma obra (a cada 7 segundos)
  useEffect(() => {
    if (bannerGallery.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % bannerGallery.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [bannerGallery.length]);

  useEffect(() => {
    if (!isOpen || !anime) {
      setCharacters([]);
      setThemes({ openings: [], endings: [] });
      setMediaThemes([]);
      setRecommendations([]);
      setStreamingLinks([]);
      setDynamicBanner(null);
      setBannerGallery([]);
      setActiveBannerIndex(0);
      return;
    }

    let isMounted = true;
    setLoadingPortalExtras(true);

    const resolveAndFetch = async () => {
      // Identificação estrita do mal_id: NUNCA usar anime.id arbitrário para evitar carregar animes não relacionados (ex: Cowboy Bebop ID 1)
      let resolvedMalId: number | null = (anime.mal_id && anime.mal_id > 0) ? anime.mal_id : null;

      if (!resolvedMalId && typeof anime.id === 'string' && anime.id.startsWith('preview_')) {
        const num = parseInt(anime.id.replace('preview_', ''), 10);
        if (!isNaN(num) && num > 0) resolvedMalId = num;
      }

      // Se não tiver ID verificado, busca exclusivamente pelo título oficial do anime
      if (!resolvedMalId && anime.title) {
        try {
          const searchResults = await searchAnimeMetadata(anime.title);
          if (searchResults.length > 0 && searchResults[0].mal_id) {
            resolvedMalId = searchResults[0].mal_id;
          }
        } catch (e) {
          console.warn('Busca de ID por título falhou:', e);
        }
      }

      if (!isMounted) return;

      try {
        const [chars, ths, recs, streams, themeMedia, bannersFromFranchise] = await Promise.all([
          getAnimeCharacters(resolvedMalId || 0, anime.title),
          getAnimeThemes(resolvedMalId || 0, anime.title),
          getAnimeRecommendations(resolvedMalId || 0, anime.title),
          getAnimeStreamingLinks(resolvedMalId || 0, anime.title),
          fetchAnimeThemesMedia(anime.title, resolvedMalId || undefined),
          getAnimeBannersGallery(resolvedMalId || 0, anime.title),
        ]);

        if (!isMounted) return;
        setCharacters(chars);
        setThemes(ths);
        setMediaThemes(themeMedia);
        setRecommendations(recs);
        setStreamingLinks(streams);

        // Agrupa estritamente banners da própria obra (o salvo originalmente + mídias da franquia oficial)
        const combinedBanners = [
          ...(anime.bannerUrl ? [anime.bannerUrl] : []),
          ...bannersFromFranchise,
        ].filter((url, index, self) => Boolean(url) && self.indexOf(url) === index);

        if (combinedBanners.length > 0) {
          setBannerGallery(combinedBanners);
          setDynamicBanner(combinedBanners[0]);
          if (!anime.bannerUrl && anime.id) {
            updateAnime(anime.id, { bannerUrl: combinedBanners[0] }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar extras do anime:', err);
      } finally {
        if (isMounted) setLoadingPortalExtras(false);
      }
    };

    resolveAndFetch();

    return () => {
      isMounted = false;
    };
  }, [isOpen, anime?.id, anime?.mal_id, anime?.title]);

  if (!isOpen || !anime) return null;

  const statusConfig = STATUS_CONFIG[anime.status] || STATUS_CONFIG.watching;

  const handleSaveNotes = () => {
    if (onUpdateNotes) onUpdateNotes(anime, notesDraft);
    setIsEditingNotes(false);
  };

  const handleSaveDirectEp = () => {
    const val = Math.max(0, parseInt(directEpInput, 10) || 0);
    if (onUpdateEpisode) onUpdateEpisode(anime, val);
    setIsEditingDirectEp(false);
  };

  const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1` : null;
  };

  const embedTrailerUrl = getYouTubeEmbedUrl(anime.trailerUrl);

  const googleNewsUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${anime.title} anime novos episódios lançamento`
  )}`;

  const activeSeason = anime.seasons?.find((s) => s.name === anime.currentSeasonName) || anime.seasons?.[0];
  const maxEp = activeSeason?.totalEpisodes || anime.totalEpisodes;
  const progressPercent = maxEp && maxEp > 0
    ? Math.min(100, Math.round((anime.currentEpisode / maxEp) * 100))
    : null;

  const isPreviewOrReadOnly = isReadOnly || (typeof anime.id === 'string' && anime.id.startsWith('preview_'));

  const handleUpdateSeasonNameInline = async (seasonId: string, newName: string) => {
    if (!anime || isPreviewOrReadOnly || !anime.seasons || !newName.trim()) return;
    const trimmed = newName.trim();
    const oldSeason = anime.seasons.find((s) => s.id === seasonId);
    if (!oldSeason || oldSeason.name === trimmed) return;

    const isCurrent = oldSeason.name === anime.currentSeasonName;
    const updatedSeasons = anime.seasons.map((s) => {
      if (s.id === seasonId) {
        return {
          ...s,
          name: trimmed,
          // Preserva intacto o vínculo com o título canônico da API oficial
          canonicalTitle: s.canonicalTitle || oldSeason.canonicalTitle || oldSeason.name,
        };
      }
      return s;
    });

    try {
      await updateAnime(anime.id, {
        seasons: updatedSeasons,
        ...(isCurrent ? { currentSeasonName: trimmed } : {}),
      });
    } catch (err) {
      console.error('Erro ao renomear temporada:', err);
    }
  };

  const handleRefreshOfficialTreeInline = async () => {
    if (!anime || isPreviewOrReadOnly) return;
    setIsRefreshingTree(true);
    setRefreshTreeFeedback(null);

    try {
      const searchKey = anime.mal_id || anime.franchiseTitle || anime.title;
      const res = await fetchAnimeFranchiseTree(searchKey, anime.title);

      const currentSeasons = anime.seasons || [];
      const effectiveMode: 'seasons' | 'arcs' = anime.structureMode || (
        currentSeasons.some((s) => s.type === 'arc' || s.name.toLowerCase().includes('arco')) ? 'arcs' : 'seasons'
      );

      const isArcsMode = effectiveMode === 'arcs' && !!res.predefinedArcs && res.predefinedArcs.length > 0;

      if (!isArcsMode && (!res.items || res.items.length === 0)) {
        setRefreshTreeFeedback({
          text: 'Nenhuma temporada oficial encontrada na base.',
          success: false,
        });
        return;
      }

      const updatedSeasons: AnimeSeasonOrArc[] = [];
      const seenItemIds = new Set<string>();

      const excludedNorm = (anime.excludedFranchiseItems || []).map((x) => String(x).toLowerCase().trim());
      const isExcluded = (id: number | string | undefined, titles: (string | undefined | null)[]) => {
        if (!excludedNorm.length) return false;
        if (id !== undefined && id !== null) {
          const strId = String(id).toLowerCase().trim();
          if (excludedNorm.includes(strId)) return true;
          if (excludedNorm.some((ex) => ex.includes(strId) || strId.includes(ex))) return true;
        }
        return titles.some((t) => {
          if (!t) return false;
          const normT = t.toLowerCase().trim();
          return excludedNorm.some((ex) => {
            if (ex === normT) return true;
            if (ex.length >= 4 && (normT.includes(ex) || ex.includes(normT))) return true;
            return false;
          });
        });
      };

      const doesArcMatchSeason = (arc: { id: string; name: string }, s: AnimeSeasonOrArc): boolean => {
        if (s.id && s.id.includes(arc.id)) return true;
        const arcNameNorm = arc.name.toLowerCase().trim();
        const canonNorm = s.canonicalTitle ? s.canonicalTitle.toLowerCase().trim() : '';
        const sNameNorm = s.name ? s.name.toLowerCase().trim() : '';
        if (canonNorm && canonNorm === arcNameNorm) return true;
        if (sNameNorm && sNameNorm === arcNameNorm) return true;

        const arcNum = arc.name.match(/(?:temporada|season|parte|\b)(\d+)/i)?.[1];
        const sNum = (s.canonicalTitle || s.name).match(/(?:temporada|season|parte|\b)(\d+)/i)?.[1];
        if (arcNum && sNum && arcNum === sNum) {
          const arcIsOva = /ova|special|especial|spin-off|nikki/i.test(arc.name);
          const sIsOva = /ova|special|especial|spin-off|nikki/i.test(s.canonicalTitle || s.name);
          if (arcIsOva === sIsOva) return true;
        }

        if (canonNorm.length >= 6 && (arcNameNorm.includes(canonNorm) || canonNorm.includes(arcNameNorm))) return true;
        if (sNameNorm.length >= 6 && (arcNameNorm.includes(sNameNorm) || sNameNorm.includes(arcNameNorm))) return true;

        return false;
      };

      const doesItemMatchSeason = (item: { id: number; title: string; englishTitle?: string; format?: string }, s: AnimeSeasonOrArc): boolean => {
        if (s.mal_id && s.mal_id === item.id) return true;
        const itemTitleNorm = item.title.toLowerCase().trim();
        const itemEngNorm = item.englishTitle ? item.englishTitle.toLowerCase().trim() : '';
        const canonNorm = s.canonicalTitle ? s.canonicalTitle.toLowerCase().trim() : '';
        const sNameNorm = s.name ? s.name.toLowerCase().trim() : '';

        if (canonNorm && (canonNorm === itemTitleNorm || (itemEngNorm && canonNorm === itemEngNorm))) return true;
        if (sNameNorm && (sNameNorm === itemTitleNorm || (itemEngNorm && sNameNorm === itemEngNorm))) return true;

        const itemNum = (item.title + ' ' + (item.englishTitle || '')).match(/(?:temporada|season|part|\b)(\d+)/i)?.[1];
        const sNum = (s.canonicalTitle || s.name).match(/(?:temporada|season|parte|\b)(\d+)/i)?.[1];
        if (itemNum && sNum && itemNum === sNum) {
          const itemIsOva = item.format === 'OVA' || item.format === 'Special' || /ova|special/i.test(item.title);
          const sIsOva = /ova|special/i.test(s.canonicalTitle || s.name);
          if (itemIsOva === sIsOva) return true;
        }

        if (canonNorm.length >= 6 && (itemTitleNorm.includes(canonNorm) || canonNorm.includes(itemTitleNorm))) return true;
        if (sNameNorm.length >= 6 && (itemTitleNorm.includes(sNameNorm) || sNameNorm.includes(itemTitleNorm))) return true;

        return false;
      };

      if (currentSeasons.length > 0) {
        // O anime já está cadastrado no app e possui temporadas definidas pelo usuário:
        // 1. Preservamos 100% as temporadas do usuário, mantendo nomes customizados e status de assistido
        currentSeasons.forEach((s, idx) => {
          const patchedSeason: AnimeSeasonOrArc = { ...s, order: idx + 1 };
          seenItemIds.add(patchedSeason.id);

          if (isArcsMode && res.predefinedArcs) {
            const matchedArc = res.predefinedArcs.find((arc) => doesArcMatchSeason(arc, s));
            if (matchedArc) {
              if (!patchedSeason.canonicalTitle) patchedSeason.canonicalTitle = matchedArc.name;
              if (matchedArc.episodesCount && matchedArc.episodesCount !== patchedSeason.totalEpisodes) {
                patchedSeason.totalEpisodes = matchedArc.episodesCount;
              }
            }
          } else if (res.items) {
            const matchedItem = res.items.find((item) => doesItemMatchSeason(item, s));
            if (matchedItem) {
              if (!patchedSeason.canonicalTitle) patchedSeason.canonicalTitle = matchedItem.title;
              if (!patchedSeason.mal_id) patchedSeason.mal_id = matchedItem.id;
              if (matchedItem.episodes && matchedItem.episodes !== patchedSeason.totalEpisodes) {
                patchedSeason.totalEpisodes = matchedItem.episodes;
              }
              if (matchedItem.seasonYear && !patchedSeason.releaseYear) {
                patchedSeason.releaseYear = matchedItem.seasonYear;
              }
            }
          }
          updatedSeasons.push(patchedSeason);
        });

        // 2. Recarregar temporadas FUTURAS apenas!
        // Itens intermediários ou passados que o usuário descartou (como OVAs, spin-offs e filmes) NUNCA serão reinseridos.
        if (isArcsMode && res.predefinedArcs) {
          let maxMatchedArcIdx = -1;
          res.predefinedArcs.forEach((arc, idx) => {
            if (currentSeasons.some((s) => doesArcMatchSeason(arc, s))) {
              maxMatchedArcIdx = Math.max(maxMatchedArcIdx, idx);
            }
          });

          // Só avaliamos itens estritamente posteriores ao último arco/temporada que o usuário possui
          const startIdx = maxMatchedArcIdx >= 0 ? maxMatchedArcIdx + 1 : res.predefinedArcs.length;
          for (let i = startIdx; i < res.predefinedArcs.length; i++) {
            const futureArc = res.predefinedArcs[i];
            if (isExcluded(futureArc.id, [futureArc.name])) continue;

            // Ignora OVAs, especiais e spin-offs secundários lançados no futuro
            if (/ova|special|especial|spin-off|nikki/i.test(futureArc.name)) continue;

            const nextOrder = updatedSeasons.length + 1;
            const targetId = `sec_${nextOrder}_${futureArc.id || Date.now()}`;
            seenItemIds.add(targetId);
            updatedSeasons.push({
              id: targetId,
              name: futureArc.name,
              canonicalTitle: futureArc.name,
              type: 'arc',
              order: nextOrder,
              totalEpisodes: futureArc.episodesCount || null,
              isWatched: false,
            });
          }
        } else if (res.items) {
          let maxMatchedItemIdx = -1;
          res.items.forEach((item, idx) => {
            if (currentSeasons.some((s) => doesItemMatchSeason(item, s))) {
              maxMatchedItemIdx = Math.max(maxMatchedItemIdx, idx);
            }
          });

          const startIdx = maxMatchedItemIdx >= 0 ? maxMatchedItemIdx + 1 : res.items.length;
          for (let i = startIdx; i < res.items.length; i++) {
            const futureItem = res.items[i];
            if (isExcluded(futureItem.id, [futureItem.title, futureItem.englishTitle])) continue;

            // Não adiciona OVAs ou Specials como temporadas futuras automáticas
            if (futureItem.format === 'OVA' || futureItem.format === 'Special') continue;
            if (/ova|special|especial/i.test(futureItem.title)) continue;

            const nextOrder = updatedSeasons.length + 1;
            const targetId = `sec_${nextOrder}_${futureItem.id || Date.now()}`;
            seenItemIds.add(targetId);
            updatedSeasons.push({
              id: targetId,
              name: futureItem.title,
              canonicalTitle: futureItem.title,
              mal_id: futureItem.id,
              type: futureItem.format ? (futureItem.format.toLowerCase() as any) : 'tv',
              releaseYear: futureItem.seasonYear || null,
              totalEpisodes: futureItem.episodes || null,
              order: nextOrder,
              isWatched: false,
            });
          }
        }
      } else {
        // Caso excepcional onde o anime ainda não possui nenhuma temporada
        if (isArcsMode && res.predefinedArcs) {
          res.predefinedArcs.forEach((arc, idx) => {
            if (isExcluded(arc.id, [arc.name])) return;
            const targetId = `sec_${idx + 1}_${arc.id || Date.now()}`;
            updatedSeasons.push({
              id: targetId,
              name: arc.name,
              canonicalTitle: arc.name,
              type: 'arc',
              totalEpisodes: arc.episodesCount || null,
              order: idx + 1,
              isWatched: false,
            });
          });
        } else if (res.items) {
          res.items.forEach((item, idx) => {
            if (isExcluded(item.id, [item.title, item.englishTitle])) return;
            const targetId = `sec_${idx + 1}_${item.id || Date.now()}`;
            updatedSeasons.push({
              id: targetId,
              name: item.title,
              canonicalTitle: item.title,
              mal_id: item.id,
              type: item.format ? (item.format.toLowerCase() as any) : 'tv',
              releaseYear: item.seasonYear || null,
              totalEpisodes: item.episodes || null,
              order: idx + 1,
              isWatched: false,
            });
          });
        }
      }

      // PRESERVAÇÃO RIGOROSA DA TEMPORADA ATIVA:
      // O usuário nunca deve ter sua temporada ou progresso resetados ao recarregar a árvore!
      let nextCurrentSeasonName = anime.currentSeasonName;
      let activeTotalEpisodes = anime.totalEpisodes;

      // 1. Verifica se o nome atual exato existe na nova lista
      const activeFound = updatedSeasons.find((s) => s.name === anime.currentSeasonName);
      if (activeFound) {
        nextCurrentSeasonName = activeFound.name;
        activeTotalEpisodes = activeFound.totalEpisodes || anime.totalEpisodes;
      } else {
        // 2. Tenta localizar pelo item anterior ativo do usuário
        const prevActiveItem = currentSeasons.find((s) => s.name === anime.currentSeasonName);
        if (prevActiveItem) {
          const matchedByIdOrOrder = updatedSeasons.find((s) => s.id === prevActiveItem.id || s.order === prevActiveItem.order);
          if (matchedByIdOrOrder) {
            nextCurrentSeasonName = matchedByIdOrOrder.name;
            activeTotalEpisodes = matchedByIdOrOrder.totalEpisodes || anime.totalEpisodes;
          }
        }
      }

      // Se ainda não tiver nome e houver itens, mantém o que tem ou pega o primeiro
      if (!nextCurrentSeasonName && updatedSeasons.length > 0) {
        nextCurrentSeasonName = updatedSeasons[0].name;
        activeTotalEpisodes = updatedSeasons[0].totalEpisodes || null;
      }

      const mergedFranchiseIds = Array.from(
        new Set([
          ...(anime.franchiseIds || []),
          ...(res.franchiseIds || []),
          ...updatedSeasons.map((s) => s.mal_id).filter((id): id is number => typeof id === 'number' && id > 0),
        ])
      );

      const updatePayload: Partial<Anime> = {
        seasons: updatedSeasons,
        currentSeasonName: nextCurrentSeasonName,
        totalEpisodes: activeTotalEpisodes,
        franchiseIds: mergedFranchiseIds,
        structureMode: effectiveMode,
        ...(res.rootTitle ? { franchiseTitle: res.rootTitle } : {}),
        broadcastDay: res.activeAiringDay || anime.broadcastDay || null,
      };

      if (activeTotalEpisodes && anime.currentEpisode > activeTotalEpisodes) {
        updatePayload.currentEpisode = activeTotalEpisodes;
      }

      await updateAnime(anime.id, updatePayload);
      setRefreshTreeFeedback({
        text: isArcsMode
          ? `✓ Árvore de arcos da história sincronizada com sucesso! (${updatedSeasons.length} arcos)`
          : `✓ Árvore oficial de temporadas e filmes sincronizada com sucesso! (${updatedSeasons.length} mídias)`,
        success: true,
      });
    } catch (err) {
      console.error('Erro ao atualizar árvore oficial:', err);
      setRefreshTreeFeedback({
        text: 'Não foi possível consultar a base oficial de franquias.',
        success: false,
      });
    } finally {
      setIsRefreshingTree(false);
      setTimeout(() => setRefreshTreeFeedback(null), 5000);
    }
  };

  const handleDeleteSeasonInline = async (seasonId: string) => {
    if (!anime || isPreviewOrReadOnly || !anime.seasons || anime.seasons.length <= 1) return;
    setIsSavingSeasons(true);
    const deletedSeason = anime.seasons.find((s) => s.id === seasonId);
    const updatedSeasons = anime.seasons.filter((s) => s.id !== seasonId);
    let nextCurrentSeasonName = anime.currentSeasonName;
    let nextTotalEpisodes = anime.totalEpisodes;

    if (!updatedSeasons.some((s) => s.name === anime.currentSeasonName)) {
      nextCurrentSeasonName = updatedSeasons[0]?.name || 'Temporada 1';
      nextTotalEpisodes = updatedSeasons[0]?.totalEpisodes || null;
    }

    const identifiers: (string | number)[] = [];
    if (deletedSeason) {
      if (deletedSeason.id) identifiers.push(deletedSeason.id);
      if (deletedSeason.mal_id) identifiers.push(deletedSeason.mal_id);
      if (deletedSeason.canonicalTitle) identifiers.push(deletedSeason.canonicalTitle);
      if (deletedSeason.name) identifiers.push(deletedSeason.name);
      const match = deletedSeason.id?.match?.(/^sec_\d+_(.+)$/);
      if (match && match[1]) identifiers.push(match[1]);
    }
    const updatedExcluded = Array.from(new Set([...(anime.excludedFranchiseItems || []), ...identifiers]));

    try {
      await updateAnime(anime.id, {
        seasons: updatedSeasons,
        currentSeasonName: nextCurrentSeasonName,
        totalEpisodes: nextTotalEpisodes,
        excludedFranchiseItems: updatedExcluded.length > 0 ? updatedExcluded : undefined,
      });
    } catch (err) {
      console.error('Erro ao excluir temporada inline:', err);
    } finally {
      setIsSavingSeasons(false);
    }
  };

  const handleUpdateSeasonEpisodesInline = async (seasonId: string, newTotal: number | null) => {
    if (!anime || isPreviewOrReadOnly || !anime.seasons) return;
    const updatedSeasons = anime.seasons.map((s) => (s.id === seasonId ? { ...s, totalEpisodes: newTotal } : s));
    const activeSec = updatedSeasons.find((s) => s.name === anime.currentSeasonName);

    try {
      await updateAnime(anime.id, {
        seasons: updatedSeasons,
        totalEpisodes: activeSec?.totalEpisodes || anime.totalEpisodes,
      });
    } catch (err) {
      console.error('Erro ao atualizar episódios da temporada:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        id="anime-detail-modal-container"
        className="w-full max-w-2xl bg-black border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-100 relative"
      >
        {/* ============================================================
            CORPO UNIFICADO COM HERO BANNER CINEMÁTICO HD
           ============================================================ */}
        <div className="overflow-y-auto flex-1 no-scrollbar flex flex-col">
          {/* HERO BANNER PANORÂMICO */}
          <div className="relative w-full overflow-hidden bg-black shrink-0 border-b border-white/10">
            {/* Banner Backdrop Container */}
            <div className="relative w-full h-44 sm:h-56 md:h-64 overflow-hidden bg-black">
              {/* Main Banner Carousel (Artes oficiais em alta nitidez sem blur de fundo) */}
              {bannerGallery.length > 0 ? (
                bannerGallery.map((bannerUrl, index) => (
                  <img
                    key={`banner_${index}_${bannerUrl.slice(-12)}`}
                    src={bannerUrl}
                    alt={`Banner oficial ${index + 1} de ${anime.title}`}
                    referrerPolicy="no-referrer"
                    className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out ${
                      index === activeBannerIndex ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'
                    }`}
                  />
                ))
              ) : (dynamicBanner || anime.bannerUrl) ? (
                <img
                  src={getHighResImageUrl(dynamicBanner || anime.bannerUrl || '')}
                  alt={`Banner de ${anime.title}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center relative z-10"
                />
              ) : anime.coverUrl ? (
                <img
                  src={getHighResImageUrl(anime.coverUrl)}
                  alt={`Capa de ${anime.title}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center relative z-10"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black text-slate-600">
                  <Tv className="w-12 h-12 opacity-30 text-indigo-400" />
                </div>
              )}

              {/* Sombra suave apenas na base do banner para fundir com o corpo preto sem cobrir o banner */}
              <div className="absolute inset-x-0 bottom-0 h-8 sm:h-10 z-10 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

              {/* Indicadores sutis de rotação de banners oficiais da franquia */}
              {bannerGallery.length > 1 && (
                <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 pointer-events-none">
                  {bannerGallery.map((_, i) => (
                    <span
                      key={`banner_dot_${i}`}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        i === activeBannerIndex ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Floating Top Action Controls */}
              <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-lg text-slate-200">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusConfig.dotColor || 'bg-indigo-400'} shadow-sm`} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {isPreviewOrReadOnly ? 'Ficha & Guia' : statusConfig.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isPreviewOrReadOnly && onAddFromExplorer && (
                    <button
                      type="button"
                      id="btn-add-from-detail-header"
                      onClick={() => {
                        onAddFromExplorer({
                          title: anime.title,
                          japaneseTitle: anime.japaneseTitle,
                          coverUrl: anime.coverUrl,
                          bannerUrl: dynamicBanner || anime.bannerUrl,
                          synopsis: anime.synopsis,
                          genres: anime.genres,
                          studio: anime.studio,
                          format: anime.format,
                          source: anime.source,
                          releaseYear: anime.releaseYear,
                          trailerUrl: anime.trailerUrl,
                          totalEpisodes: anime.totalEpisodes,
                          broadcastDay: anime.broadcastDay,
                          mal_id: anime.mal_id,
                        });
                        onClose();
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/40 cursor-pointer active:scale-95 border border-indigo-400/40"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">+ Adicionar</span>
                    </button>
                  )}

                  {!isReadOnly && onEdit && (
                    <button
                      type="button"
                      id="btn-edit-from-detail"
                      onClick={() => {
                        onClose();
                        onEdit(anime);
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-black/80 hover:bg-white/15 backdrop-blur-md text-white font-semibold border border-white/15 transition-all shadow-lg cursor-pointer active:scale-95"
                      title="Editar informações do anime"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="btn-close-detail"
                    onClick={onClose}
                    className="p-1.5 sm:p-2 rounded-xl bg-black/80 hover:bg-white/15 text-slate-300 hover:text-white backdrop-blur-md border border-white/15 transition-all shadow-lg cursor-pointer active:scale-95"
                    title="Fechar"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Poster Overlap & Main Info */}
            <div className="relative z-20 px-4 sm:px-6 pb-4 -mt-16 sm:-mt-20 flex flex-col sm:flex-row gap-3.5 sm:gap-5 items-center sm:items-end">
              {/* Floating Poster Card */}
              <div className="relative shrink-0 w-28 sm:w-36 aspect-[3/4] rounded-2xl overflow-hidden bg-black border-2 border-white/20 shadow-2xl shadow-black ring-1 ring-black/50 group">
                {anime.coverUrl ? (
                  <img
                    src={anime.coverUrl}
                    alt={anime.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-slate-500 text-center">
                    <Tv className="w-8 h-8 mb-1 opacity-50 text-indigo-400" />
                    <span className="text-[10px] font-medium">Sem imagem</span>
                  </div>
                )}

                {anime.rating !== null && anime.rating !== undefined && (
                  <div className="absolute top-2 left-2 bg-black/90 backdrop-blur-md border border-amber-500/60 text-amber-300 font-black text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-lg">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{anime.rating}/10</span>
                  </div>
                )}
              </div>

              {/* Title & Metadata & Fast Controls */}
              <div className="flex-1 min-w-0 text-center sm:text-left space-y-2 pt-1 sm:pt-0">
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                    {anime.title}
                  </h2>
                  {anime.japaneseTitle && (
                    <p className="text-xs sm:text-sm text-slate-400 font-medium truncate mt-0.5">
                      {anime.japaneseTitle}
                    </p>
                  )}
                </div>

                {/* Badges Rápidos de Ficha Técnica */}
                <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start text-[11px]">
                  {isReadOnly && (
                    <span className={`px-2.5 py-0.5 rounded-lg font-bold border ${statusConfig.badgeBg}`}>
                      {statusConfig.label}
                    </span>
                  )}

                  {anime.format && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-black border border-white/10 text-slate-300 font-medium">
                      {anime.format}
                    </span>
                  )}

                  {anime.releaseYear && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-black border border-white/10 text-slate-300 font-medium">
                      {anime.releaseYear}
                    </span>
                  )}

                  {anime.studio && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-black border border-indigo-500/30 text-indigo-300 font-medium">
                      {anime.studio}
                    </span>
                  )}

                  {anime.broadcastDay && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-black border border-white/10 text-slate-300 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-400" />
                      <span>{anime.broadcastDay}</span>
                    </span>
                  )}

                  {isAnimeActiveAndAiringToday(anime) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500 text-black font-black shadow-md animate-pulse">
                      <Flame className="w-3 h-3 fill-black" />
                      <span>Episódio Hoje!</span>
                    </span>
                  )}
                </div>

                {/* Status pills diretos para troca rápida */}
                {!isReadOnly && onUpdateStatus && (
                  <div className="pt-0.5 flex flex-wrap items-center gap-1 justify-center sm:justify-start">
                    {(Object.keys(STATUS_CONFIG) as AnimeStatus[]).map((st) => {
                      const cfg = STATUS_CONFIG[st];
                      const isSelected = anime.status === st;
                      return (
                        <button
                          key={st}
                          id={`detail-status-pill-${st}`}
                          onClick={() => onUpdateStatus(anime, st)}
                          className={`text-[11px] px-2.5 py-0.5 rounded-lg font-semibold transition-all cursor-pointer border ${
                            isSelected
                              ? `${cfg.badgeBg} font-bold ring-1 ring-white/30 shadow-xs scale-105`
                              : 'bg-black border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {cfg.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Trailer & Notícias Buttons */}
                <div className="pt-0.5 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  {anime.trailerUrl && (
                    <button
                      type="button"
                      onClick={() => setShowEmbeddedTrailer(!showEmbeddedTrailer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black hover:bg-rose-950/40 text-rose-300 text-xs font-bold border border-rose-500/40 transition-colors shadow-sm cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-rose-400" />
                      <span>{showEmbeddedTrailer ? 'Ocultar Trailer' : 'Assistir Trailer'}</span>
                    </button>
                  )}

                  <a
                    href={googleNewsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Notícias</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </div>
              </div>
            </div>

            {/* Embedded Trailer Player (if opened) */}
            {showEmbeddedTrailer && embedTrailerUrl && (
              <div className="p-4 bg-black border-t border-white/10 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                    <span>Trailer Oficial</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmbeddedTrailer(false)}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Fechar Player ✕
                  </button>
                </div>
                <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                  <iframe
                    src={embedTrailerUrl}
                    title={`Trailer de ${anime.title}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* CARD DE PROGRESSO FLUIDO E RÁPIDO */}
          {!isReadOnly && onIncrement && onDecrement && (
            <div className="p-3.5 sm:px-6 bg-black border-b border-white/10 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Progresso Atual
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-indigo-300 truncate max-w-xs">
                    {anime.currentSeasonName || 'Temporada 1'}
                  </h4>
                </div>

                {/* Botões Rápidos de Episódio [-1] [+1] e Digitar */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="flex items-baseline gap-1 mr-2">
                    <span className="text-xl sm:text-2xl font-black text-white">
                      Ep {anime.currentEpisode}
                    </span>
                    {maxEp ? (
                      <span className="text-xs font-bold text-slate-400">
                        / {maxEp}
                      </span>
                    ) : null}
                  </div>

                  <button
                    id="detail-btn-minus-ep"
                    onClick={() => onDecrement(anime)}
                    disabled={anime.currentEpisode <= 0}
                    className="px-2.5 py-1.5 rounded-xl bg-black border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:pointer-events-none text-slate-200 font-bold text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  >
                    <span>-1</span>
                  </button>

                  <button
                    id="detail-btn-plus-ep"
                    onClick={() => onIncrement(anime)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs flex items-center justify-center transition-all shadow-md shadow-indigo-600/30 cursor-pointer border border-indigo-400/40"
                  >
                    <span>+1</span>
                  </button>

                  {!isEditingDirectEp ? (
                    <button
                      onClick={() => {
                        setDirectEpInput(String(anime.currentEpisode));
                        setIsEditingDirectEp(true);
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 ml-1 cursor-pointer font-medium"
                    >
                      Digitar
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 ml-1">
                      <input
                        type="number"
                        min="0"
                        value={directEpInput}
                        onChange={(e) => setDirectEpInput(e.target.value)}
                        className="w-14 bg-black border border-indigo-500 rounded-lg px-2 py-0.5 text-xs text-white text-center focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveDirectEp}
                        className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de Progresso Visual */}
              {progressPercent !== null && (
                <div className="w-full space-y-1">
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>{progressPercent}% concluído</span>
                    <span>{maxEp ? `${maxEp - anime.currentEpisode} eps restantes` : ''}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              BARRA DE NAVEGAÇÃO POR ABAS FIXADA AO ROLAR (STICKY TABS)
             ============================================================ */}
          <div className="sticky top-0 z-20 border-b border-white/10 px-3 sm:px-6 bg-black/95 backdrop-blur-md shadow-md">
            <HorizontalScrollContainer id="anime-detail-modal-tabs" scrollStep={140} className="py-2.5">
              <button
                type="button"
                id="detail-tab-seasons"
                onClick={() => setActiveTab('seasons')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 touch-manipulation select-none border ${
                  activeTab === 'seasons'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 border-indigo-400/40'
                    : 'bg-black text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Temporadas & Arcos ({anime.seasons?.length || 1})</span>
              </button>

              <button
                type="button"
                id="detail-tab-info"
                onClick={() => setActiveTab('info')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 touch-manipulation select-none border ${
                  activeTab === 'info'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 border-indigo-400/40'
                    : 'bg-black text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Visão Geral</span>
              </button>

              <button
                type="button"
                id="detail-tab-characters"
                onClick={() => setActiveTab('characters')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 touch-manipulation select-none border ${
                  activeTab === 'characters'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 border-indigo-400/40'
                    : 'bg-black text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Personagens ({characters.length})</span>
              </button>

              <button
                type="button"
                id="detail-tab-music"
                onClick={() => setActiveTab('music')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 touch-manipulation select-none border ${
                  activeTab === 'music'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 border-indigo-400/40'
                    : 'bg-black text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Músicas & OP/ED</span>
              </button>

              <button
                type="button"
                id="detail-tab-media"
                onClick={() => setActiveTab('media')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 touch-manipulation select-none border ${
                  activeTab === 'media'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 border-indigo-400/40'
                    : 'bg-black text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Onde Assistir & Extras</span>
              </button>
            </HorizontalScrollContainer>
          </div>

          {/* ============================================================
              CONTEÚDO DA ABA ATIVA (COM ALTURA NATURAL E ESPAÇO AMPLO)
             ============================================================ */}
          <div className="p-4 sm:p-6 space-y-4 flex-1">
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Sinopse / Descrição (Minimizada por padrão, expansível) */}
              {anime.synopsis ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Sinopse / História</span>
                    </h4>
                    <button
                      type="button"
                      id="btn-toggle-synopsis"
                      onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1 transition-colors bg-black border border-white/10 px-2.5 py-1 rounded-xl hover:border-white/20"
                    >
                      <span>{isSynopsisExpanded ? 'Minimizar' : 'Maximizar'}</span>
                      {isSynopsisExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div
                    onClick={() => !isSynopsisExpanded && setIsSynopsisExpanded(true)}
                    className={`text-xs sm:text-sm text-slate-300 leading-relaxed bg-black p-3.5 sm:p-4 rounded-2xl border border-white/10 relative transition-all ${
                      !isSynopsisExpanded ? 'cursor-pointer hover:border-white/20' : ''
                    }`}
                  >
                    <p className={isSynopsisExpanded ? '' : 'line-clamp-2 sm:line-clamp-3'}>
                      {anime.synopsis}
                    </p>
                    {!isSynopsisExpanded && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-indigo-400 font-semibold">
                        <span>Toque para ver a sinopse completa ▾</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Gêneros */}
              {anime.genres && anime.genres.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 block">Gêneros e Temas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {anime.genres.map((g) => (
                      <span
                        key={g}
                        className="text-xs bg-black text-indigo-300 border border-white/10 px-2.5 py-1 rounded-xl font-medium"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AVALIAÇÃO PESSOAL (NOTA 1 A 10) */}
              {!isReadOnly && onUpdateRating && (
                <div className="bg-black border border-white/10 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>Sua Nota Pessoal (1 a 10)</span>
                    </span>

                    {anime.rating !== null && anime.rating !== undefined ? (
                      <button
                        type="button"
                        onClick={() => onUpdateRating(anime, null)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer font-semibold"
                      >
                        Remover nota
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Sem nota</span>
                    )}
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                      const isSelected = anime.rating === score;
                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => onUpdateRating(anime, score)}
                          className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30 scale-105'
                              : 'bg-black text-slate-400 border-white/10 hover:text-amber-300 hover:border-white/20'
                          }`}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Onde Parei / Anotações */}
              {!isReadOnly && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Onde Parei / Anotação</span>
                    </h4>
                    {!isEditingNotes && (
                      <button
                        id="btn-edit-detail-notes"
                        onClick={() => {
                          setNotesDraft(anime.notes || '');
                          setIsEditingNotes(true);
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium"
                      >
                        {anime.notes ? 'Editar nota' : '+ Adicionar nota'}
                      </button>
                    )}
                  </div>

                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Ex: Minuto 14:35, parou no início da batalha..."
                        className="w-full bg-black border border-indigo-500 rounded-2xl p-3 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setNotesDraft(anime.notes || '');
                            setIsEditingNotes(false);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white bg-black border border-white/10 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveNotes}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-sm border border-indigo-400/40"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Salvar Nota</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black border border-white/10 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 leading-relaxed min-h-[48px]">
                      {anime.notes ? (
                        <span>{anime.notes}</span>
                      ) : (
                        <span className="text-slate-500 italic text-xs">
                          Nenhuma anotação. Clique em "+ Adicionar nota" para registrar o minuto exato ou observação.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Histórico recente de episódios (máximo 10 registros para performance e leveza) */}
              {anime.history && anime.history.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Histórico recente (últimos {Math.min(10, anime.history.length)} episódios)</span>
                    </span>
                    <span className="text-[11px] text-indigo-400">{showHistory ? 'Ocultar' : 'Exibir'}</span>
                  </button>

                  {showHistory && (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-black rounded-2xl border border-white/10 no-scrollbar">
                      {anime.history.slice(0, 10).map((h) => (
                        <div
                          key={h.id}
                          className="text-[11px] bg-black px-3 py-1.5 rounded-xl border border-white/10 flex items-center justify-between text-slate-300"
                        >
                          <span className="font-bold text-indigo-300">
                            {h.seasonName || 'Ep'} • Episódio {h.episode}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            {new Date(h.timestamp).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEMPORADAS & ARCOS */}
          {activeTab === 'seasons' && (() => {
            const currentSeasonIndex = (anime.seasons || []).findIndex(s => s.name === anime.currentSeasonName);
            const nextSeason = currentSeasonIndex !== -1 && anime.seasons && currentSeasonIndex + 1 < anime.seasons.length
              ? anime.seasons[currentSeasonIndex + 1]
              : null;
            const isCurrentSeasonCompleted = Boolean(anime.totalEpisodes && anime.currentEpisode >= anime.totalEpisodes);

            return (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Banner de Avanço Automático para Próxima Temporada */}
                {isCurrentSeasonCompleted && nextSeason && !isReadOnly && onSwitchSeason && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 flex items-center justify-between gap-3 flex-wrap shadow-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-white">Temporada Concluída!</h5>
                        <p className="text-[11px] text-slate-300">Pronto para começar: <strong className="text-indigo-300">{nextSeason.name}</strong>?</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSwitchSeason(anime, nextSeason)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30 ml-auto border border-indigo-400/30"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Avançar para {nextSeason.name}</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Linha do Tempo de Temporadas & Arcos</span>
                  </h4>
                  {!isReadOnly && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsManagingSeasons(!isManagingSeasons)}
                        className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isManagingSeasons
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                            : 'bg-black text-indigo-400 hover:text-indigo-300 border-white/10 hover:border-indigo-500/30'
                        }`}
                      >
                        {isManagingSeasons ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Pronto</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Gerenciar Temporadas</span>
                          </>
                        )}
                      </button>
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEdit(anime);
                          }}
                          className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer hidden sm:inline"
                          title="Abrir editor completo com árvore de franquias"
                        >
                          (Editor Avançado)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Painel Completo de Gerenciar Temporadas */}
                {isManagingSeasons && !isReadOnly && (
                  <div className="p-3 sm:p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3 animate-in fade-in">
                    {/* Barra de Ações: Sincronizar Franquia Oficial */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-black/50 border border-white/10">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRefreshOfficialTreeInline}
                          disabled={isRefreshingTree}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Busca e atualiza a árvore completa de acordo com o modo configurado para o anime"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTree ? 'animate-spin text-indigo-400' : ''}`} />
                          <span>
                            {isRefreshingTree
                              ? 'Consultando Franquia...'
                              : (anime.structureMode === 'arcs' || anime.seasons?.some((s) => s.type === 'arc' || s.name.toLowerCase().includes('arco')))
                              ? 'Recarregar Árvore de Arcos'
                              : 'Recarregar Árvore de Temporadas'}
                          </span>
                        </button>

                        <span className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-medium">
                          Estrutura: {(anime.structureMode === 'arcs' || anime.seasons?.some((s) => s.type === 'arc' || s.name.toLowerCase().includes('arco'))) ? 'Arcos da História' : 'Temporadas & Filmes'}
                        </span>
                      </div>

                      {refreshTreeFeedback && (
                        <div
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                            refreshTreeFeedback.success
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                          }`}
                        >
                          {refreshTreeFeedback.text}
                        </div>
                      )}
                    </div>

                    {/* Banner explicativo de automação */}
                    <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200/90 leading-relaxed flex items-start gap-2.5">
                      <RefreshCw className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">Sincronização 100% Automática</p>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Novas temporadas, filmes e arcos lançados são detectados e incluídos automaticamente na sua ficha sem precisar cadastrar manualmente. Você pode renomear livremente qualquer temporada abaixo (ex: &ldquo;Temporada 3&rdquo;) &mdash; o título oficial canônico continuará salvo na memória para garantir as próximas atualizações.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {anime.seasons && anime.seasons.length > 0 ? (
                    anime.seasons.map((sec, idx) => {
                      const isActive = anime.currentSeasonName === sec.name;
                      return (
                        <div
                          key={`detail_season_${sec.id || sec.name || idx}_${idx}`}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                            isActive
                              ? 'bg-black border-indigo-500 text-white ring-1 ring-indigo-500/40 shadow-lg'
                              : 'bg-black border-white/10 text-slate-300 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              {isManagingSeasons ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      defaultValue={sec.name}
                                      onBlur={(e) => handleUpdateSeasonNameInline(sec.id, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                      }}
                                      title="Clique para editar o nome da temporada"
                                      className="w-full bg-black/80 border border-white/20 focus:border-indigo-500 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none"
                                    />
                                  </div>
                                  {sec.canonicalTitle && sec.canonicalTitle.toLowerCase().trim() !== sec.name.toLowerCase().trim() && (
                                    <div
                                      className="text-[10px] text-indigo-300/80 font-mono truncate px-1"
                                      title={`Título oficial canônico na API: ${sec.canonicalTitle}`}
                                    >
                                      Canônico: {sec.canonicalTitle}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 pt-0.5">
                                    {sec.type && (
                                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                                        {sec.type === 'movie' ? 'Filme' : sec.type === 'ova' ? 'OVA' : sec.type === 'ona' ? 'ONA' : 'TV'}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400">Total eps:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      defaultValue={sec.totalEpisodes || ''}
                                      placeholder="-"
                                      onBlur={(e) => {
                                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                        handleUpdateSeasonEpisodesInline(sec.id, val);
                                      }}
                                      className="w-14 bg-black/70 border border-white/15 focus:border-indigo-500 rounded-lg px-1.5 py-0.5 text-xs text-white text-center outline-none"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                                    <span className="break-words leading-tight">{sec.name}</span>
                                    {isActive && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500 text-white font-bold shrink-0">
                                        Assistindo
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    <span>{sec.totalEpisodes ? `${sec.totalEpisodes} episódios` : 'Em exibição'}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isReadOnly && onToggleSeasonWatched && !isManagingSeasons && (
                                <button
                                  type="button"
                                  onClick={() => onToggleSeasonWatched(anime, sec.id)}
                                  title={sec.isWatched ? 'Já assistido (clique para desmarcar)' : 'Marcar como assistido'}
                                  className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer border shrink-0 ${
                                    sec.isWatched
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-black text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                                  }`}
                                >
                                  {sec.isWatched ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Assistido</span>
                                    </>
                                  ) : (
                                    <>
                                      <Circle className="w-3.5 h-3.5 opacity-60" />
                                      <span>Pendente</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {isManagingSeasons && !isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSeasonInline(sec.id)}
                                  disabled={anime.seasons && anime.seasons.length <= 1}
                                  title={
                                    anime.seasons && anime.seasons.length <= 1
                                      ? 'Não é possível excluir a única temporada'
                                      : 'Excluir esta temporada'
                                  }
                                  className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {!isReadOnly && !isActive && onSwitchSeason && (
                            <button
                              type="button"
                              onClick={() => onSwitchSeason(anime, sec)}
                              className="w-full text-center text-xs font-bold text-indigo-300 hover:text-white py-1.5 bg-black hover:bg-indigo-600 rounded-xl border border-indigo-800/50 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Play className="w-3 h-3 text-indigo-400 fill-indigo-400/30" />
                              <span>Tornar Temporada Ativa</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {anime.currentSeasonName || 'Temporada 1'} ({anime.totalEpisodes ? `${anime.totalEpisodes} episódios` : 'em andamento'})
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                          Atual
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Este anime ainda não possui temporadas adicionadas.
                      </p>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => setIsManagingSeasons(true)}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Temporada Agora</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: PERSONAGENS */}
          {activeTab === 'characters' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Personagens Principais & Dubladores (Seiyuus)</span>
              </h4>

              {loadingPortalExtras ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Carregando elenco oficial...</span>
                </div>
              ) : characters.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {characters.map((char) => (
                    <div
                      key={char.id}
                      className="p-2.5 rounded-2xl bg-black border border-white/10 flex items-center gap-2.5 hover:border-white/20 transition-colors"
                    >
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                        {char.imageUrl ? (
                          <img
                            src={char.imageUrl}
                            alt={char.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold">
                            ?
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h6 className="text-xs font-bold text-white truncate" title={char.name}>
                          {char.name}
                        </h6>
                        <p className="text-[10px] text-indigo-300 truncate mt-0.5" title={char.voiceActor?.name || char.role}>
                          {char.voiceActor?.name ? `🎙️ ${char.voiceActor.name}` : char.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-black rounded-2xl border border-white/10 text-slate-400 text-xs">
                  Nenhum personagem registrado na base para esta obra.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MÚSICAS */}
          {activeTab === 'music' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-indigo-400" />
                  <span>Trilha Sonora & Aberturas (Openings / Endings)</span>
                </h4>
                {mediaThemes.length > 0 && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-black text-indigo-300 border border-indigo-500/30 font-bold">
                    AnimeThemes HD
                  </span>
                )}
              </div>

              {activeMediaUrl && (
                <div className="p-3.5 rounded-2xl bg-black border border-indigo-500/40 space-y-2 animate-in fade-in shadow-2xl">
                  <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
                      Reproduzindo Tema Oficial
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveMediaUrl(null)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      Fechar Player ✕
                    </button>
                  </div>
                  <video
                    src={activeMediaUrl}
                    controls
                    autoPlay
                    className="w-full max-h-56 rounded-xl bg-black aspect-video object-contain"
                  />
                </div>
              )}

              {loadingPortalExtras ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Carregando temas musicais...</span>
                </div>
              ) : themes.openings.length > 0 || themes.endings.length > 0 || mediaThemes.length > 0 ? (
                <div className="space-y-3">
                  {/* Aberturas */}
                  {(themes.openings.length > 0 || mediaThemes.some((m) => m.themeType === 'OP')) && (
                    <div>
                      <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block mb-2">
                        Aberturas (Openings)
                      </span>
                      <div className="space-y-1.5">
                        {themes.openings.map((op, i) => {
                          const matchedMedia = mediaThemes.find((m) => m.themeType === 'OP' && m.sequence === i + 1) || mediaThemes.find((m) => m.themeType === 'OP');
                          return (
                            <div
                              key={`op-${i}`}
                              className="p-3 rounded-2xl bg-black border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="px-2 py-0.5 rounded-md bg-black text-indigo-300 text-[10px] font-black shrink-0 border border-indigo-500/30">
                                  OP {i + 1}
                                </span>
                                <span className="text-xs text-slate-200 font-medium truncate">{op}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {matchedMedia?.videoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveMediaUrl(matchedMedia.videoUrl || null)}
                                    className="text-xs text-emerald-300 hover:text-white font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black hover:bg-emerald-600 border border-emerald-500/40 transition-all shadow-sm cursor-pointer"
                                  >
                                    <Play className="w-3 h-3 fill-emerald-400" />
                                    <span>Vídeo HD</span>
                                  </button>
                                )}

                                <a
                                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                                    `${anime.title} ${op}`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-300 hover:text-white font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black hover:bg-indigo-600 border border-white/10 transition-all shadow-sm"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>YouTube</span>
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Encerramentos */}
                  {(themes.endings.length > 0 || mediaThemes.some((m) => m.themeType === 'ED')) && (
                    <div className="mt-4">
                      <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block mb-2">
                        Encerramentos (Endings)
                      </span>
                      <div className="space-y-1.5">
                        {themes.endings.map((ed, i) => {
                          const matchedMedia = mediaThemes.find((m) => m.themeType === 'ED' && m.sequence === i + 1) || mediaThemes.find((m) => m.themeType === 'ED');
                          return (
                            <div
                              key={`ed-${i}`}
                              className="p-3 rounded-2xl bg-black border border-white/10 flex items-center justify-between gap-3 hover:border-rose-500/40 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="px-2 py-0.5 rounded-md bg-black text-rose-300 text-[10px] font-black shrink-0 border border-rose-500/30">
                                  ED {i + 1}
                                </span>
                                <span className="text-xs text-slate-200 font-medium truncate">{ed}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {matchedMedia?.videoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveMediaUrl(matchedMedia.videoUrl || null)}
                                    className="text-xs text-emerald-300 hover:text-white font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black hover:bg-emerald-600 border border-emerald-500/40 transition-all shadow-sm cursor-pointer"
                                  >
                                    <Play className="w-3 h-3 fill-emerald-400" />
                                    <span>Vídeo HD</span>
                                  </button>
                                )}

                                <a
                                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                                    `${anime.title} ${ed}`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-rose-300 hover:text-white font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black hover:bg-rose-600 border border-white/10 transition-all shadow-sm"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>YouTube</span>
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-black rounded-2xl border border-white/10 text-slate-400 text-xs">
                  Nenhuma música indexada para esta obra no momento.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ONDE ASSISTIR & EXTRAS */}
          {activeTab === 'media' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Film className="w-4 h-4 text-indigo-400" />
                <span>Onde Assistir & Recomendações</span>
              </h4>

              {/* Streaming Links */}
              {streamingLinks.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">Plataformas de Streaming:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {streamingLinks.map((st, idx) => (
                      <a
                        key={idx}
                        href={st.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-2xl bg-black hover:border-indigo-500/50 border border-white/10 flex items-center justify-between transition-all group shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-black border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                            ▶
                          </div>
                          <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {st.name}
                          </span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Recomendações */}
              {recommendations.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 block">Quem assistiu também curtiu:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        onClick={() => {
                          if (onOpenAnimeDetail) {
                            onOpenAnimeDetail({
                              id: `preview_${rec.id}`,
                              userId: 'preview',
                              title: rec.title,
                              coverUrl: rec.imageUrl,
                              status: 'plan_to_watch',
                              season: 1,
                              currentSeasonName: 'Temporada 1',
                              seasons: [{ id: '1', name: 'Temporada 1', order: 1 }],
                              currentEpisode: 0,
                              notes: '',
                              mal_id: rec.id,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            });
                          }
                        }}
                        className="p-2 rounded-2xl bg-black border border-white/10 hover:border-indigo-500/60 transition-all cursor-pointer group flex flex-col justify-between gap-1.5"
                      >
                        <div className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-black shadow-md">
                          <img
                            src={rec.imageUrl}
                            alt={rec.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 truncate" title={rec.title}>
                          {rec.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* ============================================================
            MODAL FOOTER
           ============================================================ */}
        <div className="px-4 sm:px-6 py-3.5 bg-black border-t border-white/10 flex items-center justify-between shrink-0">
          {!isReadOnly && onDelete ? (
            <button
              type="button"
              id="btn-delete-from-detail-footer"
              onClick={() => {
                onClose();
                onDelete(anime);
              }}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-black border border-rose-500/30 hover:border-rose-500/60 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Anime</span>
            </button>
          ) : isPreviewOrReadOnly && onAddFromExplorer ? (
            <button
              type="button"
              id="btn-add-from-detail-footer"
              onClick={() => {
                onAddFromExplorer({
                  title: anime.title,
                  japaneseTitle: anime.japaneseTitle,
                  coverUrl: anime.coverUrl,
                  synopsis: anime.synopsis,
                  genres: anime.genres,
                  studio: anime.studio,
                  format: anime.format,
                  source: anime.source,
                  releaseYear: anime.releaseYear,
                  trailerUrl: anime.trailerUrl,
                  totalEpisodes: anime.totalEpisodes,
                  broadcastDay: anime.broadcastDay,
                  mal_id: anime.mal_id,
                });
                onClose();
              }}
              className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl font-bold transition-all shadow-md cursor-pointer border border-indigo-400/40"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>Adicionar à Lista</span>
            </button>
          ) : (
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <span>WAnime List</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-black border border-white/10 hover:border-white/25 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
