import type { Anime } from '../types';
import { isAiringToday, isAnimeActiveAndAiringToday } from '../lib/dateUtils';

const STORAGE_KEY_NOTIFICATION_ENABLED = 'wanime_episode_notifications_enabled';
const STORAGE_KEY_LAST_NOTIFIED = 'wanime_last_notified_date';

/**
 * Verifica se a API de Notificações do Navegador está disponível
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Retorna o status de permissão atual: 'default' | 'granted' | 'denied'
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Solicita permissão ao usuário para emitir notificações
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    // Compatibilidade com navegadores modernos (Promise) e legado (callback)
    if (typeof Notification.requestPermission === 'function') {
      let result: NotificationPermission = 'default';
      const promise = Notification.requestPermission((perm) => {
        result = perm;
      });

      if (promise && typeof promise.then === 'function') {
        const perm = await promise;
        result = perm;
      }

      const isGranted = result === 'granted';
      if (isGranted) {
        setEpisodeNotificationEnabled(true);
      }
      return result;
    }
    return Notification.permission;
  } catch (err) {
    console.error('Erro ao solicitar permissão de notificações:', err);
    return Notification.permission;
  }
}

/**
 * Envia uma notificação web de teste imediata
 */
export function sendTestNotification(): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification('🔔 WAnime List - Notificações Ativadas!', {
      body: 'Perfeito! Você receberá avisos quando seus animes favoritos lançarem novos episódios.',
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'wanime-test-notification',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.error('Erro ao enviar notificação de teste:', err);
    return false;
  }
}

/**
 * Verifica se o usuário ativou o recebimento de notificações nas preferências
 */
export function isEpisodeNotificationEnabled(): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  const val = localStorage.getItem(STORAGE_KEY_NOTIFICATION_ENABLED);
  // Default to true se a permissão já foi concedida
  return val === null ? true : val === 'true';
}

/**
 * Salva a preferência de ativação
 */
export function setEpisodeNotificationEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_NOTIFICATION_ENABLED, enabled ? 'true' : 'false');
}

/**
 * Verifica os animes que lançam hoje e envia a notificação web discreta do dia
 */
export function checkAndNotifyTodayEpisodes(userAnimes: Anime[]): {
  notified: boolean;
  titles: string[];
} {
  if (!isNotificationSupported() || !isEpisodeNotificationEnabled()) {
    return { notified: false, titles: [] };
  }

  if (Notification.permission !== 'granted') {
    return { notified: false, titles: [] };
  }

  // Identifica animes ativos do usuário que lançam hoje
  const airingToday = userAnimes.filter((a) => isAnimeActiveAndAiringToday(a));

  if (airingToday.length === 0) {
    return { notified: false, titles: [] };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const lastNotifiedDate = localStorage.getItem(STORAGE_KEY_LAST_NOTIFIED);

  // Evita spam: notifica apenas 1 vez por dia
  if (lastNotifiedDate === todayStr) {
    return { notified: false, titles: airingToday.map((a) => a.title) };
  }

  const titles = airingToday.map((a) => a.title);
  const titlesSummary = titles.length <= 2 
    ? titles.join(' e ') 
    : `${titles[0]}, ${titles[1]} e mais ${titles.length - 2}`;

  try {
    const notification = new Notification('✨ Episódios de Hoje Lançando!', {
      body: `Hoje é dia de novos episódios de: ${titlesSummary}. Acompanhe seu progresso!`,
      icon: airingToday[0]?.coverUrl || '/icon.png',
      badge: '/icon.png',
      tag: `anime-today-${todayStr}`,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    localStorage.setItem(STORAGE_KEY_LAST_NOTIFIED, todayStr);
    return { notified: true, titles };
  } catch (err) {
    console.error('Falha ao disparar Web Notification:', err);
    return { notified: false, titles };
  }
}
