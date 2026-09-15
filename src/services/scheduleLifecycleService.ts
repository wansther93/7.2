/**
 * Motor de Ciclo de Vida Automatizado da Agenda (WAnimeList)
 *
 * 1. Transição Automática:
 *    - Obras de "Próxima Temporada" que atingem a data de estreia migram automaticamente para "Em Exibição".
 *    - Obras em "Em Exibição" que transmitem o último episódio da temporada saem automaticamente do calendário semanal.
 *    - Novas produções cadastradas nas APIs entram automaticamente em "Próxima Temporada".
 *
 * 2. Previsão de Lançamento 100% Fiel às APIs:
 *    - Dia + Mês + Ano: "12 de Outubro de 2026"
 *    - Mês + Ano: "Outubro de 2026"
 *    - Estação + Ano: "Temporada de Outono de 2026"
 *    - Apenas Ano: "Previsão: 2026"
 *    - Sem data confirmada: "Aguardando data oficial de estreia"
 */

import type { ScheduleAnimeItem } from './jikanService';
import { formatAiringAtToBrazil } from './jikanService';

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const SEASON_TRANSLATION_MAP: Record<string, string> = {
  WINTER: 'Inverno',
  SPRING: 'Primavera',
  SUMMER: 'Verão',
  FALL: 'Outono',
  winter: 'Inverno',
  spring: 'Primavera',
  summer: 'Verão',
  fall: 'Outono',
};

/**
 * Formata de maneira estrita a previsão de estreia com base única e exclusivamente
 * nos dados fornecidos pelas APIs oficiais, sem dedução ou especulação.
 */
export function formatUpcomingReleaseForecast(
  startDate?: { year?: number; month?: number; day?: number } | null,
  season?: string | null,
  year?: number | null
): { text: string; hasConfirmedDate: boolean; precision: 'day' | 'month' | 'season' | 'year' | 'unknown' } {
  // 1. Data completa: Dia, Mês e Ano
  if (startDate?.year && startDate?.month && startDate?.day) {
    const monthIndex = startDate.month - 1;
    const monthName = MONTHS_PT[monthIndex] || String(startDate.month);
    return {
      text: `${String(startDate.day).padStart(2, '0')} de ${monthName} de ${startDate.year}`,
      hasConfirmedDate: true,
      precision: 'day',
    };
  }

  // 2. Data parcial: Mês e Ano
  if (startDate?.year && startDate?.month) {
    const monthIndex = startDate.month - 1;
    const monthName = MONTHS_PT[monthIndex] || String(startDate.month);
    return {
      text: `${monthName} de ${startDate.year}`,
      hasConfirmedDate: true,
      precision: 'month',
    };
  }

  // 3. Estação do Ano e Ano (ex.: Outono de 2026)
  if (season && (year || startDate?.year)) {
    const finalYear = year || startDate?.year;
    const seasonPt = SEASON_TRANSLATION_MAP[season.toUpperCase()] || season;
    return {
      text: `Temporada de ${seasonPt} de ${finalYear}`,
      hasConfirmedDate: true,
      precision: 'season',
    };
  }

  // 4. Apenas o Ano
  if (year || startDate?.year) {
    const finalYear = year || startDate?.year;
    return {
      text: `Previsão: ${finalYear}`,
      hasConfirmedDate: true,
      precision: 'year',
    };
  }

  // 5. Sem previsão definida ainda pelas produtoras nas APIs
  return {
    text: 'Aguardando data oficial de estreia',
    hasConfirmedDate: false,
    precision: 'unknown',
  };
}

/**
 * Verifica se um anime encerrou sua temporada de exibição (deve sair do calendário semanal).
 */
export function hasAnimeConcludedSeason(item: ScheduleAnimeItem): boolean {
  if (!item) return false;

  const statusLower = (item.status || '').toLowerCase();
  if (statusLower.includes('finished') || statusLower.includes('completed') || statusLower === 'released') {
    return true;
  }

  // Se a API indicar que já exibiu o último episódio previsto
  if (item.episodes && item.episodes > 0 && item.nextEpisode) {
    // Se o próximo episódio for maior que o total de episódios, já acabou
    if (item.nextEpisode.episode > item.episodes) {
      return true;
    }
  }

  return false;
}

/**
 * Verifica se um anime que estava em "Próxima Temporada" já começou a ser exibido no Japão / Brasil
 * e deve migrar imediatamente para a grade semanal de "Em Exibição".
 */
export function hasAnimeStartedBroadcasting(item: ScheduleAnimeItem): boolean {
  if (!item) return false;

  const statusLower = (item.status || '').toLowerCase();
  if (statusLower.includes('releasing') || statusLower.includes('currently airing') || statusLower === 'ongoing') {
    return true;
  }

  // Se tem próximo episódio agendado no ar com timestamp
  if (item.nextEpisode?.airingAt) {
    return true;
  }

  // Se tem data de estreia com dia, mês e ano, e essa data já passou
  if (item.startDate?.year && item.startDate?.month && item.startDate?.day) {
    const premiereDate = new Date(item.startDate.year, item.startDate.month - 1, item.startDate.day);
    const now = new Date();
    // Se a data de estreia é hoje ou no passado, começou a transmissão
    if (now.getTime() >= premiereDate.getTime()) {
      return true;
    }
  }

  return false;
}

export interface ReconciledScheduleResult {
  activeWeekly: ScheduleAnimeItem[];
  cleanUpcoming: ScheduleAnimeItem[];
}

/**
 * Reconcilia o ciclo de vida dos animes entre as listas semanais e futuras:
 * - Filtra os que já encerraram temporada (saem de Em Exibição).
 * - Transfere os que estrearam de Próxima Temporada para Em Exibição na data/dia correto.
 * - Mantém novas obras detectadas pelas APIs em Próxima Temporada.
 */
export function reconcileScheduleLifecycle(
  weeklyList: ScheduleAnimeItem[],
  upcomingList: ScheduleAnimeItem[]
): ReconciledScheduleResult {
  const activeWeeklyMap = new Map<number, ScheduleAnimeItem>();
  const cleanUpcoming: ScheduleAnimeItem[] = [];

  // 1. Processa os itens semanais atuais
  for (const item of weeklyList) {
    // Se já finalizou a temporada, não exibe mais no calendário semanal
    if (hasAnimeConcludedSeason(item)) {
      continue;
    }
    activeWeeklyMap.set(item.id, item);
  }

  // 2. Processa os itens de Próxima Temporada
  for (const item of upcomingList) {
    // Se já começou a ser transmitido, promove para a grade semanal!
    if (hasAnimeStartedBroadcasting(item)) {
      let broadcastDay = item.broadcastDay;
      let broadcastTime = item.broadcastTime;

      // Se tem timestamp do próximo episódio, calcula o dia do Brasil
      if (item.nextEpisode?.airingAt) {
        const formatted = formatAiringAtToBrazil(item.nextEpisode.airingAt);
        broadcastDay = formatted.day;
        broadcastTime = formatted.time || undefined;
      } else if (!broadcastDay || broadcastDay === 'Em breve' || broadcastDay === 'Outros') {
        // Se tem data de estreia precisa, descobre o dia da semana
        if (item.startDate?.year && item.startDate?.month && item.startDate?.day) {
          const d = new Date(item.startDate.year, item.startDate.month - 1, item.startDate.day);
          const daysOfWeekPt = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
          broadcastDay = daysOfWeekPt[d.getDay()] || 'Outros';
        }
      }

      const promotedItem: ScheduleAnimeItem = {
        ...item,
        status: 'Currently Airing',
        broadcastDay: broadcastDay || 'Outros',
        broadcastTime,
      };

      activeWeeklyMap.set(promotedItem.id, promotedItem);
    } else {
      // Se não começou, permanece em Próxima Temporada
      cleanUpcoming.push(item);
    }
  }

  return {
    activeWeekly: Array.from(activeWeeklyMap.values()),
    cleanUpcoming,
  };
}
