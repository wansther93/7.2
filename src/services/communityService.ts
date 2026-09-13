/**
 * Serviço Comunitário:
 * 1. Mini-Reviews e Avaliações Comunitárias (Persistência no Firestore + Local Cache)
 * 2. Calculador de Compatibilidade / Afinidade de Gosto entre 2 listas
 */
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { Anime } from '../types';
import { translateSynopsisToPT } from './translationService';

export interface CommunityReview {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  userNick?: string;
  animeId: string | number;
  animeTitle: string;
  animeCoverUrl?: string;
  rating: number; // 1-10
  content: string;
  hasSpoilers: boolean;
  createdAt: string; // ISO string ou timestamp
  likesCount?: number;
  likedBy?: string[];
  source?: 'wanime' | 'anilist';
}

export interface CompatibilityResult {
  scorePercent: number; // 0 - 100%
  levelDescription: string; // ex: "Almas Gêmeas Otaku", "Alta Afinidade", "Gostos Distintos"
  mutualCount: number;
  sharedFavorites: {
    title: string;
    coverUrl?: string;
    userScore: number;
    targetScore: number;
  }[];
  epicDivergences: {
    title: string;
    coverUrl?: string;
    userScore: number;
    targetScore: number;
    diff: number;
  }[];
  crossRecommendations: Anime[];
  commonGenres: {
    genre: string;
    count: number;
  }[];
}

const LOCAL_REVIEWS_KEY = 'wanime_community_reviews_cache';

/**
 * Salva uma nova review ou atualiza existente
 */
export async function submitAnimeReview(reviewData: Omit<CommunityReview, 'id' | 'createdAt'>): Promise<CommunityReview> {
  const reviewId = `${reviewData.userId}_${reviewData.animeId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const nowIso = new Date().toISOString();

  const newReview: CommunityReview = {
    ...reviewData,
    id: reviewId,
    createdAt: nowIso,
    likesCount: 0,
    likedBy: [],
  };

  // Salva no Firestore se o usuário estiver autenticado
  if (db && auth.currentUser) {
    try {
      const reviewDocRef = doc(db, 'anime_reviews', reviewId);
      await setDoc(reviewDocRef, {
        ...newReview,
        createdAt: Timestamp.now(),
      });
    } catch (err) {
      console.warn('Falha ao salvar review no Firestore, salvando localmente:', err);
    }
  }

  // Atualiza cache local
  try {
    const cached = getLocalReviews();
    const filtered = cached.filter((r) => r.id !== reviewId);
    const updated = [newReview, ...filtered];
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (e) {
    console.error('Erro ao gravar cache local de reviews:', e);
  }

  return newReview;
}

/**
 * Exclui uma review comunitária do usuário
 */
export async function deleteCommunityReview(reviewId: string, userId?: string): Promise<boolean> {
  // Remove do Firestore
  if (db && auth.currentUser) {
    try {
      const reviewDocRef = doc(db, 'anime_reviews', reviewId);
      await deleteDoc(reviewDocRef);
    } catch (err) {
      console.warn('Falha ao excluir review do Firestore:', err);
    }
  }

  // Remove do cache local
  try {
    const cached = getLocalReviews();
    const filtered = cached.filter((r) => r.id !== reviewId);
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Erro ao atualizar cache local após exclusão:', e);
  }

  return true;
}

// Cache em memória para resenhas públicas do AniList (para manter o feed sempre vivo sem poluir o Firestore)
let cachedAniListReviews: CommunityReview[] = [];
let lastAniListFetchTime = 0;

/**
 * Busca resenhas reais e públicas diretamente da API GraphQL do AniList
 * (Executado apenas em memória/cache, NUNCA gravado no banco de dados Firestore do projeto)
 */
export async function fetchAniListRecentReviews(): Promise<CommunityReview[]> {
  const now = Date.now();
  if (cachedAniListReviews.length > 0 && now - lastAniListFetchTime < 1000 * 60 * 5) {
    return cachedAniListReviews;
  }

  const query = `
    query {
      Page(page: 1, perPage: 15) {
        reviews(sort: ID_DESC) {
          id
          score
          summary
          body
          createdAt
          user {
            id
            name
            avatar {
              medium
              large
            }
          }
          media {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      console.warn('AniList reviews fetch status:', res.status);
      return cachedAniListReviews;
    }

    const json = await res.json();
    const list = json?.data?.Page?.reviews || [];

    const mapped: CommunityReview[] = await Promise.all(
      list.map(async (item: any) => {
        let rawText = item.summary || item.body || '';
        rawText = rawText
          .replace(/<[^>]*>?/gm, '')
          .replace(/\[spoiler\][\s\S]*?\[\/spoiler\]/gi, '')
          .trim();
        if (rawText.length > 280) {
          rawText = rawText.slice(0, 280) + '...';
        }

        // Tradução automática integral para Português (pt-BR) sem necessidade de clique
        let translatedText = rawText;
        if (rawText && rawText.length > 5) {
          try {
            const pt = await translateSynopsisToPT(rawText);
            if (pt && pt.trim().length > 0) {
              translatedText = pt.trim();
            }
          } catch {
            // fallback gracefully
          }
        }

        const rawScore = typeof item.score === 'number' ? item.score : 80;
        const rating = Math.min(10, Math.max(1, Math.round((rawScore / 10) * 10) / 10));

        const title =
          item.media?.title?.romaji ||
          item.media?.title?.english ||
          item.media?.title?.native ||
          'Anime';

        return {
          id: `anilist_${item.id}`,
          userId: `anilist_user_${item.user?.id || 'anon'}`,
          userDisplayName: item.user?.name || 'AniList Member',
          userNick: item.user?.name ? `@${item.user.name}` : undefined,
          userAvatarUrl: item.user?.avatar?.large || item.user?.avatar?.medium || '',
          animeId: String(item.media?.id || ''),
          animeTitle: title,
          animeCoverUrl: item.media?.coverImage?.large || item.media?.coverImage?.medium || '',
          rating,
          content: translatedText || 'Resenha compartilhada na comunidade global.',
          hasSpoilers: false,
          createdAt: item.createdAt ? new Date(item.createdAt * 1000).toISOString() : new Date().toISOString(),
          likesCount: 0,
          likedBy: [],
          source: 'anilist' as const,
        };
      })
    );

    if (mapped.length > 0) {
      cachedAniListReviews = mapped;
      lastAniListFetchTime = now;
    }

    return cachedAniListReviews;
  } catch (err) {
    console.warn('Erro ao consultar resenhas públicas do AniList:', err);
    return cachedAniListReviews;
  }
}

/**
 * Busca reviews comunitárias recentes (do anime ou globais)
 * Combina resenhas do projeto (Firestore e locais) com resenhas reais do AniList em tempo real
 */
export async function getRecentReviews(animeId?: string | number): Promise<CommunityReview[]> {
  const localList = getLocalReviews();
  let firestoreList: CommunityReview[] = [];

  if (db) {
    try {
      const reviewsCol = collection(db, 'anime_reviews');
      let q = query(reviewsCol, orderBy('createdAt', 'desc'), limit(50));

      if (animeId) {
        q = query(reviewsCol, where('animeId', '==', animeId), limit(30));
      }

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        firestoreList = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdAt =
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString();

          return {
            id: docSnap.id,
            userId: data.userId || '',
            userDisplayName: data.userDisplayName || 'Usuário',
            userAvatarUrl: data.userAvatarUrl || '',
            userNick: data.userNick || '',
            animeId: data.animeId || '',
            animeTitle: data.animeTitle || '',
            animeCoverUrl: data.animeCoverUrl || '',
            rating: data.rating || 0,
            content: data.content || '',
            hasSpoilers: data.hasSpoilers || false,
            createdAt,
            likesCount: data.likesCount || 0,
            likedBy: data.likedBy || [],
            source: 'wanime' as const,
          };
        });
      }
    } catch (err) {
      console.warn('Erro ao ler reviews do Firestore, usando locais:', err);
    }
  }

  // Busca resenhas externas do AniList em tempo real (NÃO gravadas no Firestore)
  let anilistReviews: CommunityReview[] = [];
  try {
    anilistReviews = await fetchAniListRecentReviews();
  } catch (e) {
    console.warn('Falha ao obter resenhas do AniList:', e);
  }

  // Mescla sem fakes: Firestore (projeto) + Local (projeto) + AniList (tempo real)
  const combinedMap = new Map<string, CommunityReview>();
  anilistReviews.forEach((r) => combinedMap.set(r.id, r));
  localList.forEach((r) => combinedMap.set(r.id, { ...r, source: 'wanime' }));
  firestoreList.forEach((r) => combinedMap.set(r.id, { ...r, source: 'wanime' }));

  const merged = Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (animeId) {
    return merged.filter((r) => String(r.animeId) === String(animeId));
  }

  return merged;
}

/**
 * Lê reviews salvas em cache local do próprio usuário
 */
function getLocalReviews(): CommunityReview[] {
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (raw) {
      const parsed: CommunityReview[] = JSON.parse(raw);
      return parsed
        .map((p) => ({ ...p, source: 'wanime' as const }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (e) {
    // fallback
  }

  return [];
}

/**
 * Calcula a Afinidade / Compatibilidade entre duas listas de animes
 */
export function calculateCompatibilityScore(
  myList: Anime[],
  friendList: Anime[]
): CompatibilityResult {
  if (!myList.length || !friendList.length) {
    return {
      scorePercent: 50,
      levelDescription: 'Sem dados suficientes para cálculo exato',
      mutualCount: 0,
      sharedFavorites: [],
      epicDivergences: [],
      crossRecommendations: [],
      commonGenres: [],
    };
  }

  const friendMap = new Map<string, Anime>();
  for (const a of friendList) {
    const key = (a.title || '').trim().toLowerCase();
    friendMap.set(key, a);
    if (a.id) friendMap.set(String(a.id), a);
  }

  const mutuals: { myAnime: Anime; friendAnime: Anime }[] = [];
  const sharedFavorites: CompatibilityResult['sharedFavorites'] = [];
  const epicDivergences: CompatibilityResult['epicDivergences'] = [];
  let scoreDiffSum = 0;
  let scorePairsCount = 0;

  const myTitleSet = new Set<string>();

  for (const myAnime of myList) {
    const keyTitle = (myAnime.title || '').trim().toLowerCase();
    if (keyTitle) myTitleSet.add(keyTitle);
    const matched = friendMap.get(keyTitle) || (myAnime.id ? friendMap.get(String(myAnime.id)) : undefined);

    if (matched) {
      mutuals.push({ myAnime, friendAnime: matched });

      if (myAnime.rating && matched.rating) {
        const diff = Math.abs(myAnime.rating - matched.rating);
        scoreDiffSum += diff;
        scorePairsCount++;

        if (myAnime.rating >= 8 && matched.rating >= 8) {
          sharedFavorites.push({
            title: myAnime.title,
            coverUrl: myAnime.coverUrl || matched.coverUrl,
            userScore: myAnime.rating,
            targetScore: matched.rating,
          });
        }

        // Divergências Épicas: diferença de 3 ou mais pontos nas notas!
        if (diff >= 3) {
          epicDivergences.push({
            title: myAnime.title,
            coverUrl: myAnime.coverUrl || matched.coverUrl,
            userScore: myAnime.rating,
            targetScore: matched.rating,
            diff,
          });
        }
      }
    }
  }

  // Recomendações Cruzadas: Animes do amigo com nota alta (>= 8) que NÃO estão na lista do usuário
  const crossRecommendations = friendList
    .filter((a) => {
      const titleKey = (a.title || '').trim().toLowerCase();
      const isNotInMyList = !myTitleSet.has(titleKey);
      const isHighRating = (a.rating || 0) >= 8 || a.status === 'completed';
      return isNotInMyList && isHighRating;
    })
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 6);

  // Cálculo de afinidade de gêneros
  const myGenreCounts = new Map<string, number>();
  for (const a of myList) {
    for (const g of a.genres || []) {
      myGenreCounts.set(g, (myGenreCounts.get(g) || 0) + 1);
    }
  }

  const commonGenresMap = new Map<string, number>();
  for (const a of friendList) {
    for (const g of a.genres || []) {
      if (myGenreCounts.has(g)) {
        commonGenresMap.set(g, (commonGenresMap.get(g) || 0) + 1);
      }
    }
  }

  const commonGenres = Array.from(commonGenresMap.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Score base: overlap proporcional + concordância de notas
  const overlapRatio = Math.min(1, mutuals.length / Math.max(5, Math.min(myList.length, friendList.length)));
  let ratingHarmony = 0.8;
  if (scorePairsCount > 0) {
    const avgDiff = scoreDiffSum / scorePairsCount; // ex: 0 a 10
    ratingHarmony = Math.max(0.2, 1 - avgDiff / 10);
  }

  let finalScore = Math.round((overlapRatio * 0.5 + ratingHarmony * 0.5) * 100);
  finalScore = Math.max(15, Math.min(99, finalScore));

  let levelDescription = 'Gostos Ecléticos e Distintos';
  if (finalScore >= 85) levelDescription = '🔥 Almas Gêmeas Otaku!';
  else if (finalScore >= 70) levelDescription = '✨ Alta Afinidade de Gosto';
  else if (finalScore >= 50) levelDescription = '⚡ Boa Conexão de Interesses';

  return {
    scorePercent: finalScore,
    levelDescription,
    mutualCount: mutuals.length,
    sharedFavorites: sharedFavorites.slice(0, 6),
    epicDivergences: epicDivergences.slice(0, 6),
    crossRecommendations,
    commonGenres,
  };
}
