import { getAnimeWatchedEpisodes } from '../services/achievementService';

/**
 * Utilitários para detecção de dia de transmissão de animes
 */

export const isAiringToday = (broadcastDay?: string | null): boolean => {
  if (!broadcastDay) return false;
  const daysMap: { [key: number]: string } = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
  };
  const todayIndex = new Date().getDay();
  const todayName = daysMap[todayIndex];
  return broadcastDay.toLowerCase().includes(todayName.toLowerCase());
};

/**
 * Verifica com rigor se o anime realmente lança episódio hoje na rotina do usuário:
 * - O dia da semana de transmissão corresponde a hoje
 * - O anime NÃO foi finalizado/completado nem dropado pelo usuário
 * - A série oficial não está marcada como Finished Airing/Finalizado
 * - Se os episódios totais já foram todos vistos e não está em espera de novos episódios
 */
export const isAnimeActiveAndAiringToday = (anime?: {
  broadcastDay?: string | null;
  status?: string;
  airingStatus?: string | null;
  currentEpisode?: number;
  totalEpisodes?: number | null;
} | null): boolean => {
  if (!anime || !isAiringToday(anime.broadcastDay)) return false;

  // Animes concluídos ou dropados pelo usuário não devem exibir aviso de lançamento hoje
  if (anime.status === 'completed' || anime.status === 'dropped') {
    return false;
  }

  // Se a série oficial já foi totalmente encerrada no Japão (Finished Airing)
  if (anime.airingStatus) {
    const s = anime.airingStatus.toLowerCase();
    if (s.includes('finish') || s.includes('finaliz') || s.includes('complete')) {
      return false;
    }
  }

  // Se o usuário já assistiu a todos os episódios e o anime não está aguardando nova temporada/episódios
  if (
    typeof anime.totalEpisodes === 'number' &&
    anime.totalEpisodes > 0 &&
    typeof anime.currentEpisode === 'number' &&
    anime.currentEpisode >= anime.totalEpisodes &&
    anime.status !== 'waiting_new_episodes'
  ) {
    return false;
  }

  return true;
};

export const getTodayBroadcastName = (): string => {
  const daysMap: { [key: number]: string } = {
    0: 'Domingo',
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado',
  };
  return daysMap[new Date().getDay()];
};

export interface AirCountdown {
  isToday: boolean;
  isSoon: boolean; // Menos de 6 horas
  formattedCountdown: string; // Ex: "em 02h 45m", "em 2d 04h", "Disponível Hoje"
  label: string;
}

const DAY_INDEX_MAP: Record<string, number> = {
  domingo: 0,
  sunday: 0,
  segunda: 1,
  monday: 1,
  terça: 2,
  terca: 2,
  tuesday: 2,
  quarta: 3,
  wednesday: 3,
  quinta: 4,
  thursday: 4,
  sexta: 5,
  friday: 5,
  sábado: 6,
  sabado: 6,
  saturday: 6,
};

/**
 * Calcula uma contagem regressiva discreta em tempo real para o próximo episódio
 */
export const getAnimeAirCountdown = (
  broadcastDay?: string | null,
  broadcastTime?: string | null
): AirCountdown | null => {
  if (!broadcastDay) return null;

  const cleanDay = broadcastDay.toLowerCase().trim();
  let targetDayIndex: number | undefined;

  for (const [key, idx] of Object.entries(DAY_INDEX_MAP)) {
    if (cleanDay.includes(key)) {
      targetDayIndex = idx;
      break;
    }
  }

  if (targetDayIndex === undefined) return null;

  const now = new Date();
  const currentDayIndex = now.getDay();
  const isToday = currentDayIndex === targetDayIndex;

  // Extrai horas e minutos se informados (ex: "23:00 (JST)" ou "14:30")
  let targetHour = 14; // Default para início da tarde / início de exibição ocidental
  let targetMinute = 0;

  if (broadcastTime) {
    const match = broadcastTime.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      // Se for JST (UTC+9), converte aproximadamente para Horário de Brasília (UTC-3: -12h)
      if (broadcastTime.toLowerCase().includes('jst')) {
        targetHour = (h - 12 + 24) % 24;
      } else {
        targetHour = h;
      }
      targetMinute = m;
    }
  }

  // Cria a data-alvo do próximo episódio
  const targetDate = new Date(now);
  let daysDiff = (targetDayIndex - currentDayIndex + 7) % 7;

  targetDate.setHours(targetHour, targetMinute, 0, 0);

  // Se for hoje mas o horário já passou há mais de 3 horas, o próximo é na semana que vem
  if (daysDiff === 0 && now.getTime() > targetDate.getTime() + 1000 * 60 * 60 * 3) {
    daysDiff = 7;
  }

  targetDate.setDate(targetDate.getDate() + daysDiff);

  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0 && isToday) {
    return {
      isToday: true,
      isSoon: false,
      formattedCountdown: 'Disponível Hoje',
      label: 'Novo Episódio',
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const isSoon = days === 0 && hours < 6;

  let countdownStr = '';
  if (days > 0) {
    countdownStr = `em ${days}d ${hours > 0 ? `${hours}h` : ''}`.trim();
  } else if (hours > 0) {
    countdownStr = `em ${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
  } else {
    countdownStr = `em ${Math.max(1, minutes)}m`;
  }

  return {
    isToday,
    isSoon,
    formattedCountdown: countdownStr,
    label: isToday ? 'Hoje' : broadcastDay.split('-')[0],
  };
};

export interface ViewingStats {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  totalEpisodesWatched: number;
}

/**
 * Calcula tempo assistido baseado em 23.5 minutos médios por episódio assistido
 */
export const calculateViewingStats = (animes: any[]): ViewingStats => {
  let totalEpisodesWatched = 0;

  animes.forEach((anime) => {
    totalEpisodesWatched += getAnimeWatchedEpisodes(anime);
  });

  const totalMinutes = Math.round(totalEpisodesWatched * 23.5);
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingHoursMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingHoursMinutes / 60);
  const minutes = remainingHoursMinutes % 60;

  return {
    days,
    hours,
    minutes,
    totalMinutes,
    totalEpisodesWatched,
  };
};

