/**
 * Serviço de Resolução de Status Agregador de Animes e Franquias
 *
 * Princípio Fundamental: Nosso aplicativo é um AGREGADOR DE OBRAS, não um repositório isolado
 * de temporadas únicas como o MAL.
 *
 * Regras de Status:
 * 1. Em Exibição (releasing): O anime ou sua temporada atual está lançando novos episódios semanalmente.
 *    Possui dia e horário de transmissão no fuso horário do Brasil.
 * 2. Próxima Temporada Confirmada / Em Breve (upcoming): A obra tem continuação/sequel confirmada
 *    (ex: One Punch Man 3ª Temp, Jujutsu Kaisen 3ª Temp, etc.). Exibe previsão de lançamento ou informa
 *    que está em produção aguardando data oficial. NUNCA exibe como "Finalizado" e NUNCA exibe dia falso (Segunda-feira).
 * 3. Já Finalizado (finished): Todas as temporadas da obra foram lançadas e concluídas, sem sequências anunciadas.
 */

import { getFranchiseRootTitle } from './franchiseService';

export interface AnimeAggregatedStatus {
  state: 'releasing' | 'upcoming' | 'finished';
  isCurrentlyAiring: boolean;
  isUpcoming: boolean;
  isFinished: boolean;
  broadcastDay?: string | null;
  broadcastTime?: string | null;
  airingCountdownText?: string | null;
  upcomingTitle?: string | null;
  upcomingDate?: string | null;
  statusBadgeLabel: string;
  statusDescription: string;
  totalAggregateEpisodes?: number | null;
  bannerUrl?: string | null;
}

const SEASON_MAP_PT: Record<string, string> = {
  WINTER: 'Inverno',
  SPRING: 'Primavera',
  SUMMER: 'Verão',
  FALL: 'Outono',
};

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Traduz dias da semana em inglês para o português formal do Brasil
 */
export function translateBroadcastDay(day?: string | null): string | null {
  if (!day) return null;
  const trimmed = day.trim();
  const lower = trimmed.toLowerCase();

  const map: Record<string, string> = {
    sunday: 'Domingo',
    sundays: 'Domingo',
    monday: 'Segunda-feira',
    mondays: 'Segunda-feira',
    tuesday: 'Terça-feira',
    tuesdays: 'Terça-feira',
    wednesday: 'Quarta-feira',
    wednesdays: 'Quarta-feira',
    thursday: 'Quinta-feira',
    thursdays: 'Quinta-feira',
    friday: 'Sexta-feira',
    fridays: 'Sexta-feira',
    saturday: 'Sábado',
    saturdays: 'Sábado',
  };

  if (map[lower]) return map[lower];

  if (lower.includes('segunda')) return 'Segunda-feira';
  if (lower.includes('terça') || lower.includes('terca')) return 'Terça-feira';
  if (lower.includes('quarta')) return 'Quarta-feira';
  if (lower.includes('quinta')) return 'Quinta-feira';
  if (lower.includes('sexta')) return 'Sexta-feira';
  if (lower.includes('sábado') || lower.includes('sabado')) return 'Sábado';
  if (lower.includes('domingo')) return 'Domingo';

  if (lower === 'outros' || lower === 'em breve') return null;

  return trimmed;
}

/**
 * Formata data de previsão de lançamento diretamente dos metadados da API
 */
export function formatUpcomingReleaseDate(node?: {
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  seasonYear?: number | null;
  season?: string | null;
}): string {
  if (!node) return 'Aguardando data oficial de estreia';

  const year = node.startDate?.year || node.seasonYear;
  const month = node.startDate?.month;
  const day = node.startDate?.day;
  const season = node.season ? SEASON_MAP_PT[node.season.toUpperCase()] : null;

  if (day && month && year) {
    return `${day} de ${MONTH_NAMES_PT[month - 1]} de ${year}`;
  }
  if (month && year) {
    return `${MONTH_NAMES_PT[month - 1]} de ${year}`;
  }
  if (season && year) {
    return `Temporada de ${season} de ${year}`;
  }
  if (year) {
    return `Previsão: ${year}`;
  }

  return 'Aguardando data oficial de estreia';
}

/**
 * Resolve o Status Agregador dinamicamente a partir dos dados em tempo real da API
 * (AniList / Jikan), sem nenhuma tabela inventada ou regras fixas manuais.
 */
export function resolveAnimeAggregatedStatus(params: {
  title: string;
  rawApiStatus?: string | null;
  broadcastDay?: string | null;
  broadcastTime?: string | null;
  userTrackerStatus?: string | null;
  nextEpisode?: { airingAt: number; episode: number } | null;
  apiRelations?: Array<{
    relationType?: string;
    node?: {
      id?: number | null;
      idMal?: number | null;
      status?: string;
      format?: string | null;
      title?: { romaji?: string; english?: string; native?: string };
      seasonYear?: number | null;
      season?: string | null;
      startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
      nextAiringEpisode?: { airingAt: number; episode: number } | null;
      bannerImage?: string | null;
    };
  }> | null;
  totalEpisodes?: number | null;
  bannerUrl?: string | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  season?: string | null;
  seasonYear?: number | null;
}): AnimeAggregatedStatus {
  const {
    rawApiStatus,
    broadcastDay,
    broadcastTime,
    nextEpisode,
    apiRelations,
    totalEpisodes,
    bannerUrl,
    startDate,
    season,
    seasonYear,
  } = params;

  const rawClean = (rawApiStatus || '').toLowerCase().trim();

  // 1. Checar se a própria mídia ou alguma relação direta está em exibição ativa (RELEASING)
  const isDirectlyReleasing =
    rawClean === 'releasing' ||
    rawClean === 'currently airing' ||
    rawClean === 'airing' ||
    Boolean(nextEpisode?.airingAt);

  let relationReleasingNode: any = null;
  let relationUpcomingNode: any = null;
  let relationBanner: string | null = bannerUrl || null;

  const ALLOWED_RELATION_FORMATS = new Set([
    'TV',
    'TV_SHORT',
    'MOVIE',
    'OVA',
    'ONA',
    'SPECIAL',
  ]);

  if (apiRelations && apiRelations.length > 0) {
    for (const rel of apiRelations) {
      const node = rel.node;
      if (!node) continue;
      if (node.bannerImage && !relationBanner) {
        relationBanner = node.bannerImage;
      }
      const nodeFormat = (node.format || '').toUpperCase();
      if (nodeFormat && !ALLOWED_RELATION_FORMATS.has(nodeFormat)) {
        continue; // Ignora Mangá, Light Novel, Música, etc.
      }

      const nodeStatus = (node.status || '').toUpperCase();
      const isSequelOrSide =
        !rel.relationType ||
        ['SEQUEL', 'PARENT_STORY', 'SIDE_STORY', 'ALTERNATIVE_SETTING', 'MAIN'].includes(
          rel.relationType.toUpperCase()
        );

      if (isSequelOrSide) {
        if (nodeStatus === 'RELEASING' || node.nextAiringEpisode?.airingAt) {
          relationReleasingNode = node;
        } else if (nodeStatus === 'NOT_YET_RELEASED') {
          if (!relationUpcomingNode) {
            relationUpcomingNode = node;
          }
        }
      }
    }
  }

  // --- CASO 1: EM EXIBIÇÃO ATIVA (Semanal) ---
  if (isDirectlyReleasing || relationReleasingNode) {
    let activeDay = translateBroadcastDay(broadcastDay);
    let activeTime = broadcastTime;

    // Se temos o timestamp exato do próximo episódio da API, calcular o dia no Brasil (America/Sao_Paulo)
    const activeNext = nextEpisode || relationReleasingNode?.nextAiringEpisode;
    if (activeNext?.airingAt) {
      try {
        const airingDate = new Date(activeNext.airingAt * 1000);
        const formatter = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const parts = formatter.formatToParts(airingDate);
        const weekdayPart = parts.find((p) => p.type === 'weekday')?.value;
        const hourPart = parts.find((p) => p.type === 'hour')?.value;
        const minutePart = parts.find((p) => p.type === 'minute')?.value;

        if (weekdayPart) {
          const capDay = weekdayPart.charAt(0).toUpperCase() + weekdayPart.slice(1);
          activeDay = capDay.includes('feira') ? capDay : `${capDay}-feira`;
          if (capDay === 'Sábado' || capDay === 'Domingo') activeDay = capDay;
        }
        if (hourPart && minutePart) {
          activeTime = `${hourPart}:${minutePart}`;
        }
      } catch (e) {
        console.warn('Erro ao formatar data de exibição da API:', e);
      }
    }

    const cleanDay = activeDay && activeDay !== 'Outros' && activeDay !== 'Em breve' ? activeDay : 'Semanalmente';

    return {
      state: 'releasing',
      isCurrentlyAiring: true,
      isUpcoming: false,
      isFinished: false,
      broadcastDay: cleanDay,
      broadcastTime: activeTime || null,
      statusBadgeLabel: 'Em Exibição',
      statusDescription: `Novos episódios transmitidos ${cleanDay}${activeTime ? ` às ${activeTime}` : ''}.`,
      totalAggregateEpisodes: totalEpisodes,
      bannerUrl: relationBanner,
    };
  }

  // --- CASO 2: PRÓXIMA TEMPORADA CONFIRMADA / NÃO LANÇADA ---
  const isUpcomingApi =
    relationUpcomingNode ||
    rawClean === 'not_yet_released' ||
    rawClean === 'not yet aired' ||
    rawClean === 'upcoming' ||
    rawClean === 'to be aired';

  if (isUpcomingApi) {
    const upcomingTitle =
      relationUpcomingNode?.title?.romaji ||
      relationUpcomingNode?.title?.english ||
      (relationUpcomingNode ? 'Próxima Temporada' : params.title);

    const dateNode = relationUpcomingNode || {
      startDate,
      seasonYear: seasonYear || (startDate?.year ?? undefined),
      season,
    };
    const upcomingDate = formatUpcomingReleaseDate(dateNode);

    return {
      state: 'upcoming',
      isCurrentlyAiring: false,
      isUpcoming: true,
      isFinished: false,
      broadcastDay: null,
      broadcastTime: null,
      upcomingTitle,
      upcomingDate,
      statusBadgeLabel: 'Próxima Temporada Confirmada',
      statusDescription: 'Continuação ou nova temporada confirmada pelas fontes oficiais da produção.',
      totalAggregateEpisodes: totalEpisodes,
      bannerUrl: relationBanner,
    };
  }

  // --- CASO 3: ANIME JÁ FINALIZADO ---
  const isFinishedApi =
    rawClean === 'finished' ||
    rawClean === 'finished airing' ||
    rawClean === 'completed';

  if (isFinishedApi) {
    return {
      state: 'finished',
      isCurrentlyAiring: false,
      isUpcoming: false,
      isFinished: true,
      broadcastDay: null,
      broadcastTime: null,
      statusBadgeLabel: 'Já Finalizado',
      statusDescription: totalEpisodes
        ? `Obra completamente concluída com ${totalEpisodes} episódios.`
        : 'Obra concluída.',
      totalAggregateEpisodes: totalEpisodes,
      bannerUrl: relationBanner,
    };
  }

  // Fallback padrão se não for finalizado nem tiver transmissão confirmada
  const fallbackDate = formatUpcomingReleaseDate({
    startDate,
    seasonYear: seasonYear || (startDate?.year ?? undefined),
    season,
  });

  return {
    state: 'upcoming',
    isCurrentlyAiring: false,
    isUpcoming: true,
    isFinished: false,
    broadcastDay: null,
    broadcastTime: null,
    upcomingTitle: params.title || 'Em Produção',
    upcomingDate: fallbackDate,
    statusBadgeLabel: fallbackDate !== 'Aguardando data oficial de estreia' ? 'Próxima Temporada Confirmada' : 'Aguardando Lançamento',
    statusDescription: 'Aguardando confirmação oficial dos produtores sobre novas informações.',
    totalAggregateEpisodes: totalEpisodes,
    bannerUrl: relationBanner,
  };
}
