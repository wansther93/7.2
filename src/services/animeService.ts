import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import type { Anime, AnimeFormData, AnimeSeasonOrArc, EpisodeHistoryEntry } from '../types';

const COLLECTION_NAME = 'animes';

/**
 * Remove recursivamente todas as propriedades com valor 'undefined' de qualquer objeto ou array
 * para garantir que o Firestore nunca rejeite a escrita com 'Unsupported field value: undefined'.
 */
export const sanitizeForFirestore = <T>(data: T): T => {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj as T;
  }
  return data;
};

/**
 * Garante que a lista de temporadas/arcos seja higienizada, sem duplicações e com IDs estritamente únicos.
 */
export const formatSeasonsData = (
  rawSeasons: any,
  fallbackSeasonName: string = 'Temporada 1',
  fallbackTotalEpisodes: number | null = null
): AnimeSeasonOrArc[] => {
  if (!Array.isArray(rawSeasons) || rawSeasons.length === 0) {
    return [
      {
        id: `sec_1_${Date.now()}`,
        name: (fallbackSeasonName || 'Temporada 1').trim(),
        totalEpisodes: fallbackTotalEpisodes ? Number(fallbackTotalEpisodes) : null,
        order: 1,
        isWatched: false,
      },
    ];
  }

  const seenIds = new Set<string>();
  const seenMalIds = new Set<number>();
  const seenCanonicalTitles = new Set<string>();
  const cleanList: AnimeSeasonOrArc[] = [];

  rawSeasons.forEach((s: any, idx: number) => {
    if (!s || typeof s !== 'object') return;

    // Deduplica se o mesmo mal_id canônico ou título oficial aparecer mais de uma vez
    const malId = typeof s.mal_id === 'number' && s.mal_id > 0 ? s.mal_id : undefined;
    if (malId) {
      if (seenMalIds.has(malId)) return;
      seenMalIds.add(malId);
    }

    const canonicalNorm = (s.canonicalTitle || '').toLowerCase().trim();
    if (canonicalNorm && !malId) {
      if (seenCanonicalTitles.has(canonicalNorm)) return;
      seenCanonicalTitles.add(canonicalNorm);
    }

    let seasonId = s.id ? String(s.id).trim() : '';
    // Garante que o ID de cada elemento seja 100% único, prevenindo colisões (ex: "sec-4")
    if (!seasonId || seenIds.has(seasonId)) {
      seasonId = `sec_${idx + 1}_${malId || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }
    seenIds.add(seasonId);

    const seasonItem: AnimeSeasonOrArc = {
      id: seasonId,
      name: s.name ? String(s.name).trim() : `Temporada ${cleanList.length + 1}`,
      order: cleanList.length + 1,
      isWatched: Boolean(s.isWatched),
      totalEpisodes: s.totalEpisodes !== undefined && s.totalEpisodes !== null ? Number(s.totalEpisodes) : null,
      releaseYear: s.releaseYear !== undefined && s.releaseYear !== null ? Number(s.releaseYear) : null,
      status: s.status ? String(s.status) : null,
    };

    if (s.canonicalTitle) {
      seasonItem.canonicalTitle = String(s.canonicalTitle).trim();
    }
    if (malId !== undefined && malId !== null) {
      seasonItem.mal_id = malId;
    }
    if (s.type) {
      seasonItem.type = s.type;
    }

    cleanList.push(seasonItem);
  });

  if (cleanList.length === 0) {
    cleanList.push({
      id: `sec_1_${Date.now()}`,
      name: (fallbackSeasonName || 'Temporada 1').trim(),
      totalEpisodes: fallbackTotalEpisodes ? Number(fallbackTotalEpisodes) : null,
      order: 1,
      isWatched: false,
    });
  }

  return cleanList;
};

/**
 * Escuta ou busca a lista de animes de um usuário público (somente leitura para amigos)
 */
export const getPublicUserAnimes = async (userId: string): Promise<Anime[]> => {
  const animesRef = collection(db, COLLECTION_NAME);
  const q = query(animesRef, where('userId', '==', userId));

  try {
    const snapshot = await getDocs(q);
    const items: Anime[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const numSeason = Number(data.season) || 1;
      const currentName = data.currentSeasonName || `Temporada ${numSeason}`;
      const seasonsList = formatSeasonsData(data.seasons, currentName, data.totalEpisodes);

      const seasonNum = Number(data.season) || 1;
      const seasonName =
        data.currentSeasonName || (seasonsList[0]?.name || `Temporada ${seasonNum}`);

      const history: EpisodeHistoryEntry[] = Array.isArray(data.history)
        ? data.history.map((h: any) => ({
            id: h.id || `hist-${Date.now()}`,
            episode: Number(h.episode) || 0,
            seasonName: h.seasonName || seasonName,
            timestamp: h.timestamp || new Date().toISOString(),
            notes: h.notes ? String(h.notes) : undefined,
          }))
        : [];

      items.push({
        id: docSnap.id,
        userId: data.userId,
        title: data.title || '',
        japaneseTitle: data.japaneseTitle || '',
        coverUrl: data.coverUrl || null,
        bannerUrl: data.bannerUrl || null,
        synopsis: data.synopsis || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        season: seasonNum,
        currentSeasonName: seasonName,
        seasons: seasonsList,
        currentEpisode: Number(data.currentEpisode) || 0,
        totalEpisodes: data.totalEpisodes ? Number(data.totalEpisodes) : null,
        notes: data.notes || '',
        status: data.status || 'watching',
        rating: data.rating !== undefined && data.rating !== null ? Number(data.rating) : null,
        studio: data.studio || null,
        format: data.format || null,
        releaseYear: data.releaseYear ? Number(data.releaseYear) : null,
        source: data.source || null,
        broadcastDay: data.broadcastDay || null,
        structureMode: data.structureMode || null,
        mal_id: data.mal_id !== undefined && data.mal_id !== null ? Number(data.mal_id) : null,
        franchiseIds: Array.isArray(data.franchiseIds) ? data.franchiseIds : [],
        franchiseTitle: data.franchiseTitle || null,
        latestAiredEpisode: data.latestAiredEpisode !== undefined && data.latestAiredEpisode !== null ? Number(data.latestAiredEpisode) : null,
        airingStatus: data.airingStatus || null,
        trailerUrl: data.trailerUrl || null,
        history,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });

    return items;
  } catch (error) {
    console.error('Erro ao buscar lista pública de animes:', error);
    return [];
  }
};
export const subscribeToUserAnimes = (
  userId: string,
  onUpdate: (animes: Anime[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const animesRef = collection(db, COLLECTION_NAME);
  const q = query(animesRef, where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Anime[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // Formatar e compatibilizar temporadas/arcos sem duplicações e com IDs únicos
        const numSeason = Number(data.season) || 1;
        const currentName = data.currentSeasonName || `Temporada ${numSeason}`;
        const seasonsList = formatSeasonsData(data.seasons, currentName, data.totalEpisodes);

        const seasonNum = Number(data.season) || 1;
        const seasonName =
          data.currentSeasonName || (seasonsList[0]?.name || `Temporada ${seasonNum}`);

        // Histórico de episódios
        const history: EpisodeHistoryEntry[] = Array.isArray(data.history)
          ? data.history.map((h: any) => {
              const entry: EpisodeHistoryEntry = {
                id: h.id || `hist-${Date.now()}`,
                episode: Number(h.episode) || 0,
                seasonName: h.seasonName || seasonName,
                timestamp: h.timestamp || new Date().toISOString(),
              };
              if (h.notes) entry.notes = String(h.notes);
              return entry;
            })
          : [];

        items.push({
          id: docSnap.id,
          userId: data.userId,
          title: data.title || '',
          japaneseTitle: data.japaneseTitle || '',
          coverUrl: data.coverUrl || null,
          bannerUrl: data.bannerUrl || null,
          synopsis: data.synopsis || null,
          genres: Array.isArray(data.genres) ? data.genres : [],
          season: seasonNum,
          currentSeasonName: seasonName,
          seasons: seasonsList,
          currentEpisode: Number(data.currentEpisode) || 0,
          totalEpisodes: data.totalEpisodes ? Number(data.totalEpisodes) : null,
          notes: data.notes || '',
          status: data.status || 'watching',
          rating: data.rating !== undefined && data.rating !== null ? Number(data.rating) : null,
          broadcastDay: data.broadcastDay || null,
          structureMode: data.structureMode || null,
          mal_id: data.mal_id !== undefined && data.mal_id !== null ? Number(data.mal_id) : null,
          franchiseIds: Array.isArray(data.franchiseIds) ? data.franchiseIds : [],
          franchiseTitle: data.franchiseTitle || null,
          latestAiredEpisode: data.latestAiredEpisode !== undefined && data.latestAiredEpisode !== null ? Number(data.latestAiredEpisode) : null,
          airingStatus: data.airingStatus || null,
          studio: data.studio || null,
          format: data.format || null,
          releaseYear: data.releaseYear ? Number(data.releaseYear) : null,
          source: data.source || null,
          trailerUrl: data.trailerUrl || null,
          history,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });

      // Ordenar inicialmente por data de atualização mais recente
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Erro ao sincronizar animes do Firestore:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
      } catch (formattedError) {
        if (onError && formattedError instanceof Error) onError(formattedError);
      }
    }
  );
};

/**
 * Adiciona um novo anime vinculado exclusivamente ao usuário
 */
export const addAnime = async (userId: string, formData: AnimeFormData): Promise<string> => {
  const animesRef = collection(db, COLLECTION_NAME);
  const now = new Date().toISOString();

  // Lista de temporadas/arcos higienizada e com IDs únicos garantidos
  const formattedSeasons = formatSeasonsData(
    formData.seasons,
    formData.currentSeasonName || `Temporada ${formData.season || 1}`,
    formData.totalEpisodes || null
  );

  const initialHistory: EpisodeHistoryEntry[] = [];
  if (formData.currentEpisode > 0) {
    initialHistory.push({
      id: `hist-${Date.now()}`,
      episode: formData.currentEpisode,
      seasonName: formData.currentSeasonName || 'Temporada 1',
      timestamp: now,
    });
  }

  const rawPayload: Record<string, any> = {
    userId,
    title: formData.title.trim(),
    japaneseTitle: (formData.japaneseTitle || '').trim(),
    coverUrl: (formData.coverUrl || '').trim() || null,
    bannerUrl: (formData.bannerUrl || '').trim() || null,
    synopsis: (formData.synopsis || '').trim() || null,
    genres: Array.isArray(formData.genres) ? formData.genres : [],
    studio: (formData.studio || '').trim() || null,
    format: (formData.format || '').trim() || null,
    source: (formData.source || '').trim() || null,
    releaseYear: formData.releaseYear ? Number(formData.releaseYear) : null,
    trailerUrl: (formData.trailerUrl || '').trim() || null,
    season: Math.max(1, Number(formData.season) || 1),
    currentSeasonName: (formData.currentSeasonName || formattedSeasons[0]?.name || 'Temporada 1').trim(),
    seasons: formattedSeasons,
    currentEpisode: Math.max(0, Number(formData.currentEpisode) || 0),
    totalEpisodes: formData.totalEpisodes ? Math.max(1, Number(formData.totalEpisodes)) : null,
    notes: (formData.notes || '').trim(),
    status: formData.status || 'watching',
    rating: formData.rating !== undefined && formData.rating !== null ? Number(formData.rating) : null,
    broadcastDay: (formData.broadcastDay || '').trim() || null,
    structureMode: formData.structureMode || (formattedSeasons.some((s) => s.type === 'arc' || s.name.toLowerCase().includes('arco')) ? 'arcs' : 'seasons'),
    mal_id: formData.mal_id !== undefined && formData.mal_id !== null ? Number(formData.mal_id) : null,
    franchiseIds: Array.isArray(formData.franchiseIds) ? formData.franchiseIds : [],
    franchiseTitle: (formData.franchiseTitle || '').trim() || null,
    latestAiredEpisode: formData.latestAiredEpisode !== undefined && formData.latestAiredEpisode !== null ? Number(formData.latestAiredEpisode) : null,
    airingStatus: (formData.airingStatus || '').trim() || null,
    history: initialHistory,
    createdAt: now,
    updatedAt: now,
  };

  const sanitizedPayload = sanitizeForFirestore(rawPayload);

  try {
    const newDoc = await addDoc(animesRef, sanitizedPayload);
    return newDoc.id;
  } catch (error) {
    console.error('Erro ao adicionar anime no Firestore:', error);
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
};

/**
 * Atualiza os dados de um anime existente
 */
export const updateAnime = async (
  animeId: string,
  updatedData: Partial<AnimeFormData> & {
    notes?: string;
    seasons?: AnimeSeasonOrArc[];
    history?: EpisodeHistoryEntry[];
  }
): Promise<void> => {
  const animeRef = doc(db, COLLECTION_NAME, animeId);
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (updatedData.title !== undefined) updatePayload.title = updatedData.title.trim();
  if (updatedData.japaneseTitle !== undefined) updatePayload.japaneseTitle = (updatedData.japaneseTitle || '').trim();
  if (updatedData.coverUrl !== undefined) updatePayload.coverUrl = (updatedData.coverUrl || '').trim() || null;
  if (updatedData.bannerUrl !== undefined) updatePayload.bannerUrl = (updatedData.bannerUrl || '').trim() || null;
  if (updatedData.synopsis !== undefined) updatePayload.synopsis = (updatedData.synopsis || '').trim() || null;
  if (updatedData.genres !== undefined) updatePayload.genres = updatedData.genres;
  if (updatedData.studio !== undefined) updatePayload.studio = (updatedData.studio || '').trim() || null;
  if (updatedData.format !== undefined) updatePayload.format = (updatedData.format || '').trim() || null;
  if (updatedData.source !== undefined) updatePayload.source = (updatedData.source || '').trim() || null;
  if (updatedData.releaseYear !== undefined) updatePayload.releaseYear = updatedData.releaseYear ? Number(updatedData.releaseYear) : null;
  if (updatedData.trailerUrl !== undefined) updatePayload.trailerUrl = (updatedData.trailerUrl || '').trim() || null;
  if (updatedData.season !== undefined) updatePayload.season = Math.max(1, Number(updatedData.season) || 1);
  if (updatedData.currentSeasonName !== undefined) updatePayload.currentSeasonName = updatedData.currentSeasonName.trim();
  if (updatedData.seasons !== undefined) {
    updatePayload.seasons = formatSeasonsData(
      updatedData.seasons,
      updatedData.currentSeasonName,
      updatedData.totalEpisodes
    );
  }
  if (updatedData.currentEpisode !== undefined) {
    updatePayload.currentEpisode = Math.max(0, Number(updatedData.currentEpisode) || 0);
  }
  if (updatedData.totalEpisodes !== undefined) {
    updatePayload.totalEpisodes = updatedData.totalEpisodes ? Math.max(1, Number(updatedData.totalEpisodes)) : null;
  }
  if (updatedData.notes !== undefined) updatePayload.notes = updatedData.notes.trim();
  if (updatedData.status !== undefined) updatePayload.status = updatedData.status;
  if (updatedData.rating !== undefined) updatePayload.rating = updatedData.rating !== null ? Number(updatedData.rating) : null;
  if (updatedData.broadcastDay !== undefined) updatePayload.broadcastDay = updatedData.broadcastDay ? updatedData.broadcastDay.trim() : null;
  if (updatedData.structureMode !== undefined) updatePayload.structureMode = updatedData.structureMode || null;
  if (updatedData.mal_id !== undefined) updatePayload.mal_id = updatedData.mal_id !== null ? Number(updatedData.mal_id) : null;
  if (updatedData.franchiseIds !== undefined) updatePayload.franchiseIds = Array.isArray(updatedData.franchiseIds) ? updatedData.franchiseIds : [];
  if (updatedData.franchiseTitle !== undefined) updatePayload.franchiseTitle = (updatedData.franchiseTitle || '').trim() || null;
  if (updatedData.latestAiredEpisode !== undefined) updatePayload.latestAiredEpisode = updatedData.latestAiredEpisode !== null ? Number(updatedData.latestAiredEpisode) : null;
  if (updatedData.airingStatus !== undefined) updatePayload.airingStatus = (updatedData.airingStatus || '').trim() || null;
  if (updatedData.history !== undefined) {
    updatePayload.history = Array.isArray(updatedData.history) ? updatedData.history.slice(0, 10) : [];
  }

  const cleanUpdatePayload = sanitizeForFirestore(updatePayload);

  try {
    await updateDoc(animeRef, cleanUpdatePayload);
  } catch (error) {
    console.error('Erro ao atualizar anime no Firestore:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${animeId}`);
  }
};

/**
 * Remove um anime da coleção do usuário
 */
export const deleteAnime = async (animeId: string): Promise<void> => {
  const animeRef = doc(db, COLLECTION_NAME, animeId);
  try {
    await deleteDoc(animeRef);
  } catch (error) {
    console.error('Erro ao excluir anime no Firestore:', error);
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${animeId}`);
  }
};

/**
 * Incrementa 1 episódio e adiciona no histórico de data/hora
 */
export const incrementEpisode = async (anime: Anime): Promise<void> => {
  const current = Number(anime.currentEpisode) || 0;
  const nextEp = current + 1;
  const animeRef = doc(db, COLLECTION_NAME, anime.id);
  const now = new Date().toISOString();

  const newHistoryEntry: EpisodeHistoryEntry = {
    id: `hist-${Date.now()}`,
    episode: nextEp,
    seasonName: anime.currentSeasonName || 'Temporada 1',
    timestamp: now,
  };

  const rawHistory = [newHistoryEntry, ...(anime.history || [])].slice(0, 10);
  const updatedHistory = rawHistory.map((h) => {
    const item: Record<string, any> = {
      id: h.id || `hist-${Date.now()}`,
      episode: Number(h.episode) || 0,
      seasonName: h.seasonName || 'Temporada 1',
      timestamp: h.timestamp || now,
    };
    if (h.notes) item.notes = String(h.notes);
    return item;
  });

  try {
    await updateDoc(animeRef, {
      currentEpisode: nextEp,
      history: updatedHistory,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Erro ao incrementar episódio no Firestore:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${anime.id}`);
  }
};

/**
 * Decrementa 1 episódio
 */
export const decrementEpisode = async (anime: Anime): Promise<void> => {
  const current = Number(anime.currentEpisode) || 0;
  if (current <= 0) return;
  const prevEp = current - 1;
  const animeRef = doc(db, COLLECTION_NAME, anime.id);
  const now = new Date().toISOString();

  try {
    await updateDoc(animeRef, {
      currentEpisode: prevEp,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Erro ao decrementar episódio no Firestore:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${anime.id}`);
  }
};

/**
 * Define o episódio diretamente com registro no histórico
 */
export const setEpisodeDirectly = async (anime: Anime, newEp: number): Promise<void> => {
  const cleanEp = Math.max(0, Number(newEp) || 0);
  const animeRef = doc(db, COLLECTION_NAME, anime.id);
  const now = new Date().toISOString();

  const newHistoryEntry: EpisodeHistoryEntry = {
    id: `hist-${Date.now()}`,
    episode: cleanEp,
    seasonName: anime.currentSeasonName || 'Temporada 1',
    timestamp: now,
  };

  const rawHistory = [newHistoryEntry, ...(anime.history || [])].slice(0, 10);
  const updatedHistory = rawHistory.map((h) => {
    const item: Record<string, any> = {
      id: h.id || `hist-${Date.now()}`,
      episode: Number(h.episode) || 0,
      seasonName: h.seasonName || 'Temporada 1',
      timestamp: h.timestamp || now,
    };
    if (h.notes) item.notes = String(h.notes);
    return item;
  });

  try {
    await updateDoc(animeRef, {
      currentEpisode: cleanEp,
      history: updatedHistory,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Erro ao definir episódio no Firestore:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${anime.id}`);
  }
};

/**
 * Alterna status de "Já assistido" de uma temporada ou arco específico
 */
export const toggleSeasonWatchedStatus = async (
  anime: Anime,
  seasonId: string
): Promise<void> => {
  const currentSeasons = anime.seasons || [];
  const updatedSeasons = currentSeasons.map((s) => {
    if (s.id === seasonId) {
      return { ...s, isWatched: !s.isWatched };
    }
    return s;
  });

  const animeRef = doc(db, COLLECTION_NAME, anime.id);
  try {
    await updateDoc(animeRef, {
      seasons: updatedSeasons,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao alternar status da temporada no Firestore:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${anime.id}`);
  }
};

/**
 * Exporta todos os animes do usuário para arquivo JSON de backup
 */
export const exportAnimesToJson = (animes: Anime[]): void => {
  const dataStr = JSON.stringify(animes, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wanime-list-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Exporta para arquivo CSV (Excel)
 */
export const exportAnimesToCsv = (animes: Anime[]): void => {
  const headers = ['Título', 'Status', 'Temporada/Arco', 'Episódio Atual', 'Total Episódios', 'Nota (1-10)', 'Dia de Lançamento', 'Anotações'];
  const rows = animes.map((a) => [
    `"${(a.title || '').replace(/"/g, '""')}"`,
    `"${a.status}"`,
    `"${(a.currentSeasonName || '').replace(/"/g, '""')}"`,
    a.currentEpisode,
    a.totalEpisodes || '',
    a.rating || '',
    `"${(a.broadcastDay || '').replace(/"/g, '""')}"`,
    `"${(a.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wanime-list-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Importa animes de um arquivo JSON para o usuário atual no Firestore
 */
export const importAnimesFromJson = async (userId: string, jsonString: string): Promise<number> => {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) {
    throw new Error('O arquivo de backup precisa conter uma lista válida de animes.');
  }

  const animesRef = collection(db, COLLECTION_NAME);
  const now = new Date().toISOString();
  let count = 0;

  try {
    for (const item of parsed) {
      if (!item.title) continue;
      const numSeason = Number(item.season) || 1;
      const currentName = (item.currentSeasonName || `Temporada ${numSeason}`).trim();
      const seasonsList = formatSeasonsData(item.seasons, currentName, item.totalEpisodes);

      const docPayload = sanitizeForFirestore({
        userId,
        title: String(item.title).trim(),
        japaneseTitle: (item.japaneseTitle || '').trim(),
        coverUrl: (item.coverUrl || '').trim() || null,
        bannerUrl: (item.bannerUrl || '').trim() || null,
        synopsis: (item.synopsis || '').trim() || null,
        genres: Array.isArray(item.genres) ? item.genres : [],
        studio: (item.studio || '').trim() || null,
        format: (item.format || '').trim() || null,
        source: (item.source || '').trim() || null,
        releaseYear: item.releaseYear ? Number(item.releaseYear) : null,
        trailerUrl: (item.trailerUrl || '').trim() || null,
        season: Math.max(1, numSeason),
        currentSeasonName: currentName,
        seasons: seasonsList,
        currentEpisode: Math.max(0, Number(item.currentEpisode) || 0),
        totalEpisodes: item.totalEpisodes ? Math.max(1, Number(item.totalEpisodes)) : null,
        notes: (item.notes || '').trim(),
        status: item.status || 'watching',
        rating: item.rating ? Number(item.rating) : null,
        broadcastDay: item.broadcastDay || null,
        mal_id: item.mal_id ? Number(item.mal_id) : null,
        franchiseIds: Array.isArray(item.franchiseIds) ? item.franchiseIds : [],
        franchiseTitle: (item.franchiseTitle || '').trim() || null,
        history: Array.isArray(item.history) ? item.history : [],
        createdAt: item.createdAt || now,
        updatedAt: now,
      });

      await addDoc(animesRef, docPayload);
      count++;
    }
  } catch (error) {
    console.error('Erro ao importar animes no Firestore:', error);
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }

  return count;
};

/**
 * Exclui permanentemente todos os animes do usuário no Firestore
 */
export const deleteAllUserAnimes = async (userId: string): Promise<number> => {
  const animesRef = collection(db, COLLECTION_NAME);
  const q = query(animesRef, where('userId', '==', userId));
  
  try {
    const snapshot = await getDocs(q);
    let deletedCount = 0;
    
    // Deleta os documentos
    const deletePromises = snapshot.docs.map(async (docSnap) => {
      await deleteDoc(doc(db, COLLECTION_NAME, docSnap.id));
      deletedCount++;
    });

    await Promise.all(deletePromises);
    return deletedCount;
  } catch (error) {
    console.error('Erro ao excluir todos os animes do usuário:', error);
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
  }
};

