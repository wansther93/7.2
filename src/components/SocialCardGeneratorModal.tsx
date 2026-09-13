import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Palette,
  Layout,
  Trophy,
  Flame,
  Star,
  Tv,
  Award,
  Clock,
  Share2,
  Smartphone,
  Monitor,
  Square
} from 'lucide-react';
import type { Anime } from '../types';
import type { UserProfile } from '../services/profileService';
import { calculateOtakuLevel } from '../services/xpService';
import { getAnimeWatchedEpisodes, calculateUserAchievements } from '../services/achievementService';

interface SocialCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  animes: Anime[];
  userProfile: UserProfile | null;
  userName: string;
  avatarUrl?: string;
  unlockedAchievementsCount?: number;
  initialCardType?: CardType;
}

export type CardType = 'top5' | 'stats' | 'watching' | 'achievements';
export type CardTheme = 'cyber_indigo' | 'neon_tokyo' | 'emerald_abyss' | 'amber_gold' | 'void_dark';
export type CardFormat = 'story' | 'post' | 'square'; // 9:16 (Story) | 16:9 (Discord/Post) | 1:1 (Feed/Square)

interface ThemeColors {
  name: string;
  bgGrad: [string, string, string];
  accent: string;
  accentSecondary: string;
  badgeBg: string;
  cardBg: string;
  cardBorder: string;
  glowColor: string;
}

const THEMES: Record<CardTheme, ThemeColors> = {
  cyber_indigo: {
    name: 'Cyber Indigo',
    bgGrad: ['#070a14', '#0f172a', '#1e1b4b'],
    accent: '#6366f1',
    accentSecondary: '#38bdf8',
    badgeBg: 'rgba(99, 102, 241, 0.2)',
    cardBg: 'rgba(15, 23, 42, 0.65)',
    cardBorder: 'rgba(99, 102, 241, 0.25)',
    glowColor: 'rgba(99, 102, 241, 0.15)',
  },
  neon_tokyo: {
    name: 'Neon Tokyo',
    bgGrad: ['#0d0414', '#1f082b', '#3b0724'],
    accent: '#f43f5e',
    accentSecondary: '#fb7185',
    badgeBg: 'rgba(244, 63, 94, 0.2)',
    cardBg: 'rgba(31, 8, 43, 0.65)',
    cardBorder: 'rgba(244, 63, 94, 0.25)',
    glowColor: 'rgba(244, 63, 94, 0.15)',
  },
  emerald_abyss: {
    name: 'Emerald Abyss',
    bgGrad: ['#02140e', '#062d22', '#064e3b'],
    accent: '#10b981',
    accentSecondary: '#34d399',
    badgeBg: 'rgba(16, 185, 129, 0.2)',
    cardBg: 'rgba(6, 45, 34, 0.65)',
    cardBorder: 'rgba(16, 185, 129, 0.25)',
    glowColor: 'rgba(16, 185, 129, 0.15)',
  },
  amber_gold: {
    name: 'Imperial Gold',
    bgGrad: ['#120c02', '#261704', '#451a03'],
    accent: '#f59e0b',
    accentSecondary: '#fbbf24',
    badgeBg: 'rgba(245, 158, 11, 0.2)',
    cardBg: 'rgba(38, 23, 4, 0.65)',
    cardBorder: 'rgba(245, 158, 11, 0.25)',
    glowColor: 'rgba(245, 158, 11, 0.15)',
  },
  void_dark: {
    name: 'Dark Void',
    bgGrad: ['#030712', '#0b0f19', '#111827'],
    accent: '#94a3b8',
    accentSecondary: '#cbd5e1',
    badgeBg: 'rgba(148, 163, 184, 0.15)',
    cardBg: 'rgba(15, 23, 42, 0.75)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    glowColor: 'rgba(255, 255, 255, 0.05)',
  },
};

export const SocialCardGeneratorModal: React.FC<SocialCardGeneratorModalProps> = ({
  isOpen,
  onClose,
  animes,
  userName,
  unlockedAchievementsCount = 0,
  initialCardType = 'top5',
}) => {
  const [cardType, setCardType] = useState<CardType>(initialCardType);
  const [cardTheme, setCardTheme] = useState<CardTheme>('cyber_indigo');
  const [cardFormat, setCardFormat] = useState<CardFormat>('post'); // Padrão: Post 16:9 Discord
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && initialCardType) {
      setCardType(initialCardType);
    }
  }, [isOpen, initialCardType]);

  const otakuLevel = calculateOtakuLevel(animes, unlockedAchievementsCount);

  // Top animes favoritos (ordenados por nota do usuário)
  const topAnimes = [...animes]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  const watchingAnimes = animes.filter((a) => a.status === 'watching').slice(0, 5);
  const completedCount = animes.filter((a) => a.status === 'completed').length;
  const totalEpisodes = animes.reduce((acc, a) => acc + getAnimeWatchedEpisodes(a), 0);
  const { achievements, totalUnlocked, totalAchievements } = calculateUserAchievements(animes);

  // Renderiza o card no Canvas HTML5 com layout adaptativo por formato
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resoluções de alta fidelidade
    let width = 1200;
    let height = 675;

    if (cardFormat === 'story') {
      width = 1080;
      height = 1920;
    } else if (cardFormat === 'square') {
      width = 1080;
      height = 1080;
    }

    canvas.width = width;
    canvas.height = height;

    const theme = THEMES[cardTheme];

    // 1. Fundo Gradiente Rico
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, theme.bgGrad[0]);
    bgGrad.addColorStop(0.5, theme.bgGrad[1]);
    bgGrad.addColorStop(1, theme.bgGrad[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Ambient Radial Glows nos cantos
    const rad1 = ctx.createRadialGradient(width * 0.2, height * 0.15, 10, width * 0.2, height * 0.15, width * 0.5);
    rad1.addColorStop(0, theme.glowColor);
    rad1.addColorStop(1, 'transparent');
    ctx.fillStyle = rad1;
    ctx.fillRect(0, 0, width, height);

    const rad2 = ctx.createRadialGradient(width * 0.8, height * 0.85, 10, width * 0.8, height * 0.85, width * 0.5);
    rad2.addColorStop(0, theme.glowColor);
    rad2.addColorStop(1, 'transparent');
    ctx.fillStyle = rad2;
    ctx.fillRect(0, 0, width, height);

    // 3. Grid de pontos sutis tecnológicos
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    const step = cardFormat === 'story' ? 50 : 40;
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        if ((x + y) % (step * 2) === 0) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4. Borda externa elegante do card
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 3;
    roundRect(ctx, 16, 16, width - 32, height - 32, 28);
    ctx.stroke();

    // 5. Renderização delegada por formato
    if (cardFormat === 'post') {
      renderPostLayout(ctx, width, height, theme);
    } else if (cardFormat === 'square') {
      renderSquareLayout(ctx, width, height, theme);
    } else {
      renderStoryLayout(ctx, width, height, theme);
    }

  }, [isOpen, cardType, cardTheme, cardFormat, animes, userName, otakuLevel, unlockedAchievementsCount, totalUnlocked, totalAchievements, achievements]);

  // ==========================================
  // FORMATO 1: POST / DISCORD / TWITTER (16:9)
  // Layout em 2 colunas para NUNCA encavalar texto
  // ==========================================
  const renderPostLayout = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: ThemeColors
  ) => {
    // Top Bar (y: 35 - 80)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WANIME LIST', 50, 68);

    ctx.fillStyle = theme.accentSecondary;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('• SOCIAL OTAKU CARD', 240, 68);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('wanimelist.com.br', width - 50, 68);
    ctx.textAlign = 'left';

    // Linha divisória suave
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 88);
    ctx.lineTo(width - 50, 88);
    ctx.stroke();

    // COLUNA ESQUERDA: Perfil & Identidade do Usuário (x: 50, w: 320, h: 515)
    const leftX = 50;
    const leftY = 108;
    const leftW = 320;
    const leftH = 515;

    // Card de perfil
    ctx.fillStyle = theme.cardBg;
    roundRect(ctx, leftX, leftY, leftW, leftH, 20);
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Avatar Badge
    const avatarCenterX = leftX + leftW / 2;
    const avatarCenterY = leftY + 70;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, 44, 0, Math.PI * 2);
    ctx.fillStyle = theme.badgeBg;
    ctx.fill();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Iniciais do usuário no avatar
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    const initials = userName.slice(0, 2).toUpperCase();
    ctx.fillText(initials, avatarCenterX, avatarCenterY + 12);

    // Nome do Usuário
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    const displayUser = userName.length > 18 ? userName.slice(0, 16) + '...' : userName;
    ctx.fillText(displayUser, avatarCenterX, leftY + 145);

    // Pill de Nível Otaku
    const pillW = 220;
    const pillH = 34;
    const pillX = avatarCenterX - pillW / 2;
    const pillY = leftY + 162;
    ctx.fillStyle = theme.badgeBg;
    roundRect(ctx, pillX, pillY, pillW, pillH, 12);
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.stroke();

    ctx.fillStyle = theme.accentSecondary;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`Nível ${otakuLevel.level} • Rank ${otakuLevel.rankCode}`, avatarCenterX, pillY + 23);

    // Mini Estatísticas na coluna esquerda
    const statsList = [
      { label: 'Total de Animes', val: `${animes.length} títulos` },
      { label: 'Episódios Vistos', val: `${totalEpisodes.toLocaleString('pt-BR')} eps` },
      { label: 'Horas Assistidas', val: `~${Math.round(totalEpisodes * 23.5 / 60)}h` },
      { label: 'Conquistas', val: `${totalUnlocked} de ${totalAchievements}` },
    ];

    statsList.forEach((st, i) => {
      const sy = leftY + 225 + i * 58;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      roundRect(ctx, leftX + 16, sy, leftW - 32, 48, 12);
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '12px sans-serif';
      ctx.fillText(st.label, leftX + 28, sy + 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(st.val, leftX + 28, sy + 38);
    });

    // Tag do Card Type no rodapé da coluna esquerda
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 13px sans-serif';
    const typeLabel = cardType === 'top5' ? '★ TOP 5 FAVORITOS' : cardType === 'stats' ? '📊 ESTATÍSTICAS' : cardType === 'achievements' ? '🏆 CONQUISTAS' : '🔥 ASSISTINDO AGORA';
    ctx.fillText(typeLabel, avatarCenterX, leftY + leftH - 18);
    ctx.textAlign = 'left';

    // COLUNA DIREITA: Conteúdo Dinâmico (x: 390, w: 760, h: 515)
    const rightX = 390;
    const rightY = 108;
    const rightW = width - rightX - 50;

    if (cardType === 'top5') {
      const items = topAnimes.length > 0 ? topAnimes : animes.slice(0, 5);
      const rowH = 88;
      const gap = 14;

      items.forEach((item, index) => {
        const ry = rightY + index * (rowH + gap);

        // Fundo do card do anime
        ctx.fillStyle = theme.cardBg;
        roundRect(ctx, rightX, ry, rightW, rowH, 16);
        ctx.fill();
        ctx.strokeStyle = index === 0 ? theme.accent : theme.cardBorder;
        ctx.lineWidth = index === 0 ? 2 : 1;
        ctx.stroke();

        // Badge de Posição (#1 a #5)
        const rankColors = ['#fbbf24', '#cbd5e1', '#d97706', '#818cf8', '#64748b'];
        ctx.fillStyle = rankColors[index] || '#64748b';
        roundRect(ctx, rightX + 16, ry + 16, 56, 56, 12);
        ctx.fill();

        ctx.fillStyle = index === 0 || index === 1 ? '#090d16' : '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`#${index + 1}`, rightX + 44, ry + 51);
        ctx.textAlign = 'left';

        // Título do Anime (com corte seguro)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 21px sans-serif';
        const titleStr = item.title.length > 38 ? item.title.slice(0, 35) + '...' : item.title;
        ctx.fillText(titleStr, rightX + 88, ry + 38);

        // Linha de Metadados (separada e espaçada)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '15px sans-serif';
        const ratingText = item.rating ? `⭐ Nota: ${item.rating}/10` : 'Assistido';
        const epText = `Progresso: ${item.currentEpisode}/${item.totalEpisodes || '?'} eps`;
        ctx.fillText(`${ratingText}    •    ${epText}`, rightX + 88, ry + 68);

        // Tag de Status na direita
        const statusText = item.status === 'completed' ? 'Concluído' : item.status === 'watching' ? 'Assistindo' : 'Lista';
        ctx.fillStyle = item.status === 'completed' ? '#34d399' : theme.accentSecondary;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(statusText, rightX + rightW - 24, ry + 51);
        ctx.textAlign = 'left';
      });

    } else if (cardType === 'stats') {
      // 6 Bento Cards em Grid 2x3 para Stats
      const totalMinutes = Math.round(totalEpisodes * 23.5);
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const timeStr = days > 0 ? `${days}d ${hours}h` : `${hours}h`;

      const statsItems = [
        { label: 'Tempo Assistido Total', val: timeStr, sub: `~${Math.round(totalMinutes / 60).toLocaleString('pt-BR')} horas acumuladas`, icon: '⏳' },
        { label: 'Episódios Totais', val: totalEpisodes.toLocaleString('pt-BR'), sub: 'episódios concluídos', icon: '📺' },
        { label: 'Animes Concluídos', val: completedCount.toString(), sub: 'séries e filmes finalizados', icon: '🏆' },
        { label: 'Catálogo Pessoal', val: animes.length.toString(), sub: 'títulos registrados na conta', icon: '🎬' },
        { label: 'Conquistas Desbloqueadas', val: `${totalUnlocked} / ${totalAchievements}`, sub: `${Math.round((totalUnlocked / (totalAchievements || 1)) * 100)}% de maestria`, icon: '🎖️' },
        { label: 'Experiência & XP', val: `${otakuLevel.totalXp} XP`, sub: `Nível ${otakuLevel.level} • ${otakuLevel.rankTitle}`, icon: '⚡' },
      ];

      const bentoW = (rightW - 16) / 2;
      const bentoH = 155;
      const gapY = 16;

      statsItems.forEach((st, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const bx = rightX + col * (bentoW + 16);
        const by = rightY + row * (bentoH + gapY);

        ctx.fillStyle = theme.cardBg;
        roundRect(ctx, bx, by, bentoW, bentoH, 18);
        ctx.fill();
        ctx.strokeStyle = theme.cardBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Ícone e Categoria
        ctx.font = '26px sans-serif';
        ctx.fillText(st.icon, bx + 20, by + 40);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '14px sans-serif';
        ctx.fillText(st.label, bx + 58, by + 37);

        // Grande Número de Destaque
        ctx.fillStyle = theme.accentSecondary;
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(st.val, bx + 20, by + 86);

        // Subtítulo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '13px sans-serif';
        ctx.fillText(st.sub, bx + 20, by + 122);
      });

    } else if (cardType === 'achievements') {
      const unlockedList = achievements.filter((a) => a.isUnlocked);
      const items = unlockedList.length > 0 ? unlockedList.slice(0, 5) : achievements.slice(0, 5);
      const rowH = 88;
      const gap = 14;

      items.forEach((item, index) => {
        const ry = rightY + index * (rowH + gap);

        ctx.fillStyle = theme.cardBg;
        roundRect(ctx, rightX, ry, rightW, rowH, 16);
        ctx.fill();
        ctx.strokeStyle = item.isUnlocked ? theme.accent : theme.cardBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Ícone da Conquista
        ctx.fillStyle = item.isUnlocked ? theme.badgeBg : 'rgba(255, 255, 255, 0.05)';
        roundRect(ctx, rightX + 16, ry + 16, 56, 56, 12);
        ctx.fill();

        ctx.font = '30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.icon, rightX + 44, ry + 53);
        ctx.textAlign = 'left';

        // Título da Conquista
        ctx.fillStyle = item.isUnlocked ? '#ffffff' : '#94a3b8';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(item.title, rightX + 88, ry + 38);

        // Descrição
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '14px sans-serif';
        const descStr = item.description.length > 48 ? item.description.slice(0, 45) + '...' : item.description;
        ctx.fillText(descStr, rightX + 88, ry + 66);

        // Status
        ctx.fillStyle = item.isUnlocked ? '#34d399' : '#64748b';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(item.isUnlocked ? '✓ DESBLOQUEADA' : '🔒 BLOQUEADA', rightX + rightW - 20, ry + 51);
        ctx.textAlign = 'left';
      });

    } else {
      // Watching
      const items = watchingAnimes.length > 0 ? watchingAnimes : animes.slice(0, 5);
      const rowH = 88;
      const gap = 14;

      items.forEach((item, index) => {
        const ry = rightY + index * (rowH + gap);

        ctx.fillStyle = theme.cardBg;
        roundRect(ctx, rightX, ry, rightW, rowH, 16);
        ctx.fill();
        ctx.strokeStyle = theme.cardBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Ícone Episódio
        ctx.fillStyle = theme.badgeBg;
        roundRect(ctx, rightX + 16, ry + 16, 56, 56, 12);
        ctx.fill();
        ctx.strokeStyle = theme.accent;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EP', rightX + 44, ry + 40);
        ctx.fillStyle = theme.accentSecondary;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(item.currentEpisode.toString(), rightX + 44, ry + 62);
        ctx.textAlign = 'left';

        // Título do Anime
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 21px sans-serif';
        const titleStr = item.title.length > 34 ? item.title.slice(0, 31) + '...' : item.title;
        ctx.fillText(titleStr, rightX + 88, ry + 38);

        // Barra de Progresso Elegante
        const progW = 280;
        const progH = 10;
        const progX = rightX + 88;
        const progY = ry + 52;
        const total = item.totalEpisodes || 12;
        const percent = Math.min(1, Math.max(0, item.currentEpisode / total));

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        roundRect(ctx, progX, progY, progW, progH, 5);
        ctx.fill();

        if (percent > 0) {
          ctx.fillStyle = theme.accent;
          roundRect(ctx, progX, progY, progW * percent, progH, 5);
          ctx.fill();
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${item.currentEpisode} de ${item.totalEpisodes || '?'} eps`, progX + progW + 16, progY + 9);

        // Status
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('EM ANDAMENTO', rightX + rightW - 20, ry + 51);
        ctx.textAlign = 'left';
      });
    }
  };

  // ==========================================
  // FORMATO 2: QUADRADO (1:1 - 1080x1080)
  // Perfeito para Feed Instagram e WhatsApp
  // ==========================================
  const renderSquareLayout = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: ThemeColors
  ) => {
    // Header Unificado (y: 40 - 150)
    ctx.fillStyle = theme.cardBg;
    roundRect(ctx, 45, 40, width - 90, 110, 20);
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('WANIME LIST', 75, 90);

    ctx.fillStyle = theme.accentSecondary;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`• ${userName} • Nível ${otakuLevel.level} (${otakuLevel.rankTitle})`, 75, 122);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '18px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('wanimelist.com.br', width - 75, 105);
    ctx.textAlign = 'left';

    // Subtítulo do Card
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    const catTitle = cardType === 'top5' ? '⭐ MEUS ANIMES FAVORITOS (TOP 5)' : cardType === 'stats' ? '📊 RESUMO DAS MINHAS ESTATÍSTICAS' : cardType === 'achievements' ? '🏆 MINHAS CONQUISTAS & INSÍGNIAS' : '🔥 ANIMES EM ANDAMENTO';
    ctx.fillText(catTitle, 50, 195);

    const startY = 220;
    const availableH = height - startY - 70;

    if (cardType === 'top5') {
      const items = topAnimes.length > 0 ? topAnimes : animes.slice(0, 5);
      const rowH = 135;
      const gap = 20;

      items.forEach((item, index) => {
        const ry = startY + index * (rowH + gap);

        ctx.fillStyle = theme.cardBg;
        roundRect(ctx, 45, ry, width - 90, rowH, 20);
        ctx.fill();
        ctx.strokeStyle = index === 0 ? theme.accent : theme.cardBorder;
        ctx.lineWidth = index === 0 ? 2 : 1;
        ctx.stroke();

        // Rank Badge
        const rankColors = ['#fbbf24', '#cbd5e1', '#d97706', '#818cf8', '#64748b'];
        ctx.fillStyle = rankColors[index] || '#64748b';
        roundRect(ctx, 70, ry + 25, 75, 85, 16);
        ctx.fill();

        ctx.fillStyle = index === 0 || index === 1 ? '#090d16' : '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`#${index + 1}`, 107, ry + 78);
        ctx.textAlign = 'left';

        // Título (Linha 1)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px sans-serif';
        const titleStr = item.title.length > 34 ? item.title.slice(0, 31) + '...' : item.title;
        ctx.fillText(titleStr, 170, ry + 56);

        // Detalhes (Linha 2 - ZERO Sobreposição)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '20px sans-serif';
        const rat = item.rating ? `⭐ Nota: ${item.rating}/10` : 'Assistido';
        const eps = `Episódios: ${item.currentEpisode}/${item.totalEpisodes || '?'}`;
        ctx.fillText(`${rat}    •    ${eps}`, 170, ry + 98);
      });

    } else if (cardType === 'stats') {
      const totalMinutes = Math.round(totalEpisodes * 23.5);
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const timeStr = days > 0 ? `${days}d ${hours}h` : `${hours}h`;

      const statsItems = [
        { label: 'Tempo Assistido Total', val: timeStr, sub: `~${Math.round(totalMinutes / 60).toLocaleString('pt-BR')} horas totais`, icon: '⏳' },
        { label: 'Episódios Vistos', val: `${totalEpisodes.toLocaleString('pt-BR')}`, sub: 'episódios assistidos', icon: '📺' },
        { label: 'Animes Concluídos', val: `${completedCount}`, sub: 'títulos finalizados', icon: '🏆' },
        { label: 'Catálogo Pessoal', val: `${animes.length}`, sub: 'animes registrados', icon: '🎬' },
        { label: 'Conquistas', val: `${totalUnlocked} / ${totalAchievements}`, sub: 'insígnias desbloqueadas', icon: '🎖️' },
        { label: 'Nível & XP', val: `Nível ${otakuLevel.level}`, sub: `${otakuLevel.totalXp} XP acumulados`, icon: '⚡' },
      ];

      const bW = (width - 90 - 20) / 2;
      const bH = 220;
      const gapY = 20;

      statsItems.forEach((st, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const bx = 45 + col * (bW + 20);
        const by = startY + row * (bH + gapY);

        ctx.fillStyle = theme.cardBg;
        roundRect(ctx, bx, by, bW, bH, 20);
        ctx.fill();
        ctx.strokeStyle = theme.cardBorder;
        ctx.stroke();

        ctx.font = '36px sans-serif';
        ctx.fillText(st.icon, bx + 24, by + 50);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '18px sans-serif';
        ctx.fillText(st.label, bx + 76, by + 46);

        ctx.fillStyle = theme.accentSecondary;
        ctx.font = 'bold 42px sans-serif';
        ctx.fillText(st.val, bx + 24, by + 125);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.font = '16px sans-serif';
        ctx.fillText(st.sub, bx + 24, by + 175);
      });

    } else {
      // Watching ou Achievements no quadrado
      const items = cardType === 'watching' ? (watchingAnimes.length > 0 ? watchingAnimes : animes.slice(0, 5)) : achievements.slice(0, 5);
      const rowH = 135;
      const gap = 20;

      items.forEach((item: any, index: number) => {
        const ry = startY + index * (rowH + gap);

        ctx.fillStyle = theme.cardBg;
        roundRect(ctx, 45, ry, width - 90, rowH, 20);
        ctx.fill();
        ctx.strokeStyle = theme.cardBorder;
        ctx.stroke();

        ctx.font = '40px sans-serif';
        ctx.fillText(cardType === 'watching' ? '📺' : (item.icon || '🎖️'), 75, ry + 82);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px sans-serif';
        const titleStr = (item.title || '').length > 34 ? item.title.slice(0, 31) + '...' : item.title;
        ctx.fillText(titleStr, 150, ry + 56);

        ctx.fillStyle = theme.accentSecondary;
        ctx.font = '19px sans-serif';
        const subStr = cardType === 'watching' 
          ? `Progresso: Episódio ${item.currentEpisode} de ${item.totalEpisodes || '?'}`
          : (item.description || 'Conquista WAnime');
        ctx.fillText(subStr, 150, ry + 98);
      });
    }

    // Rodapé
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WAnime List • Compartilhe sua jornada com a comunidade em wanimelist.com.br', width / 2, height - 30);
    ctx.textAlign = 'left';
  };

  // ==========================================
  // FORMATO 3: STORIES / TIKTOK (9:16 - 1080x1920)
  // Layout vertical imersivo com espaçamento generoso
  // ==========================================
  const renderStoryLayout = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: ThemeColors
  ) => {
    // Top Bar (y: 80 - 130)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('WANIME LIST', 60, 110);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '22px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('wanimelist.com.br', width - 60, 110);
    ctx.textAlign = 'left';

    // Header Hero Card do Usuário (y: 150 - 350)
    ctx.fillStyle = theme.cardBg;
    roundRect(ctx, 60, 150, width - 120, 190, 24);
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Avatar Circle
    const avX = 145;
    const avY = 245;
    ctx.beginPath();
    ctx.arc(avX, avY, 55, 0, Math.PI * 2);
    ctx.fillStyle = theme.badgeBg;
    ctx.fill();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(userName.slice(0, 2).toUpperCase(), avX, avY + 15);

    // Nome e Nível (x: 230)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    const displayUser = userName.length > 18 ? userName.slice(0, 16) + '...' : userName;
    ctx.fillText(displayUser, 230, 225);

    ctx.fillStyle = theme.accentSecondary;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`Nível ${otakuLevel.level} • ${otakuLevel.rankTitle}`, 230, 275);

    // Mini pill na direita
    ctx.fillStyle = theme.badgeBg;
    roundRect(ctx, width - 260, 215, 140, 50, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${animes.length} ANIMES`, width - 190, 247);
    ctx.textAlign = 'left';

    // Título da Seção
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    const titleHeader = cardType === 'top5' ? '⭐ TOP 5 ANIMES FAVORITOS' : cardType === 'stats' ? '📊 ESTATÍSTICAS DA JORNADA' : cardType === 'achievements' ? '🏆 CONQUISTAS & INSÍGNIAS' : '🔥 ASSISTINDO NO MOMENTO';
    ctx.fillText(titleHeader, 60, 410);

    const startY = 450;

    if (cardType === 'top5') {
      const items = topAnimes.length > 0 ? topAnimes : animes.slice(0, 5);
      const rowH = 220;
      const gap = 30;

      items.forEach((item, index) => {
        const ry = startY + index * (rowH + gap);

        ctx.fillStyle = theme.cardBg;
        roundRect(ctx, 60, ry, width - 120, rowH, 22);
        ctx.fill();
        ctx.strokeStyle = index === 0 ? theme.accent : theme.cardBorder;
        ctx.lineWidth = index === 0 ? 2.5 : 1;
        ctx.stroke();

        // Badge de Rank
        const rankColors = ['#fbbf24', '#cbd5e1', '#d97706', '#818cf8', '#64748b'];
        ctx.fillStyle = rankColors[index] || '#64748b';
        roundRect(ctx, 90, ry + 35, 90, 150, 18);
        ctx.fill();

        ctx.fillStyle = index === 0 || index === 1 ? '#090d16' : '#ffffff';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`#${index + 1}`, 135, ry + 125);
        ctx.textAlign = 'left';

        // Título do Anime
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 34px sans-serif';
        const titleStr = item.title.length > 28 ? item.title.slice(0, 26) + '...' : item.title;
        ctx.fillText(titleStr, 210, ry + 80);

        // Metadados com espaçamento vertical correto
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = '26px sans-serif';
        const ratingStr = item.rating ? `⭐ Nota: ${item.rating}/10` : 'Assistido';
        const epStr = `Episódios: ${item.currentEpisode}/${item.totalEpisodes || '?'}`;
        ctx.fillText(`${ratingStr}   •   ${epStr}`, 210, ry + 140);
      });

    } else if (cardType === 'stats') {
      const totalMinutes = Math.round(totalEpisodes * 23.5);
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const timeStr = days > 0 ? `${days}d ${hours}h (~${Math.round(totalMinutes / 60).toLocaleString('pt-BR')}h)` : `${hours}h`;

      const statsItems = [
        { label: 'Tempo Assistido Total', val: timeStr, icon: '⏳' },
        { label: 'Episódios Concluídos', val: `${totalEpisodes.toLocaleString('pt-BR')} eps`, icon: '📺' },
        { label: 'Animes Finalizados', val: `${completedCount} títulos`, icon: '🏆' },
        { label: 'Total no Catálogo', val: `${animes.length} animes`, icon: '🎬' },
        { label: 'Conquistas Desbloqueadas', val: `${totalUnlocked} de ${totalAchievements}`, icon: '🎖️' },
        { label: 'Experiência & Nível', val: `Nível ${otakuLevel.level} (${otakuLevel.totalXp} XP)`, icon: '⚡' },
      ];

      const rowH = 185;
      const gap = 25;

      statsItems.forEach((st, idx) => {
        const ry = startY + idx * (rowH + gap);

        ctx.fillStyle = theme.cardBg;
        roundRect(ctx, 60, ry, width - 120, rowH, 22);
        ctx.fill();
        ctx.strokeStyle = theme.cardBorder;
        ctx.stroke();

        ctx.font = '50px sans-serif';
        ctx.fillText(st.icon, 100, ry + 110);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '24px sans-serif';
        ctx.fillText(st.label, 190, ry + 75);

        ctx.fillStyle = theme.accentSecondary;
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText(st.val, 190, ry + 138);
      });

    } else {
      // Watching ou Achievements no Story
      const items = cardType === 'watching' ? (watchingAnimes.length > 0 ? watchingAnimes : animes.slice(0, 5)) : achievements.slice(0, 5);
      const rowH = 220;
      const gap = 30;

      items.forEach((item: any, index: number) => {
        const ry = startY + index * (rowH + gap);

        ctx.fillStyle = theme.cardBg;
        roundRect(ctx, 60, ry, width - 120, rowH, 22);
        ctx.fill();
        ctx.strokeStyle = theme.cardBorder;
        ctx.stroke();

        ctx.font = '55px sans-serif';
        ctx.fillText(cardType === 'watching' ? '📺' : (item.icon || '🎖️'), 100, ry + 125);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 34px sans-serif';
        const titleStr = (item.title || '').length > 28 ? item.title.slice(0, 26) + '...' : item.title;
        ctx.fillText(titleStr, 190, ry + 80);

        ctx.fillStyle = theme.accentSecondary;
        ctx.font = '26px sans-serif';
        const subStr = cardType === 'watching' 
          ? `Episódio ${item.currentEpisode} de ${item.totalEpisodes || '?'}`
          : (item.description || 'Conquista WAnime');
        ctx.fillText(subStr, 190, ry + 140);
      });
    }

    // Rodapé do Story
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WAnime List • O Seu Portal Definitivo de Animes', width / 2, height - 70);
    ctx.textAlign = 'left';
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `wanime-${userName.toLowerCase()}-${cardType}-${cardFormat}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Erro ao baixar imagem:', e);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.warn('Clipboard write failed, downloading instead:', err);
          handleDownload();
        }
      });
    } catch (e) {
      console.error('Erro ao copiar imagem:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Gerador de Cards para Redes Sociais</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  HD 1080p / 1200p
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Compartilhe seus animes favoritos, estatísticas e conquistas em alta resolução com design anti-sobreposição.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Options (Left column) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Formato da Imagem (3 Opções Específicas) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-indigo-400" />
                <span>Formato de Postagem</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCardFormat('post')}
                  className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    cardFormat === 'post'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-4 h-4 text-indigo-400" />
                  <span>Post / Discord</span>
                  <span className="text-[9.5px] text-slate-400 font-mono">16:9 Banner</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCardFormat('square')}
                  className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    cardFormat === 'square'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Square className="w-4 h-4 text-amber-400" />
                  <span>Feed / Whats</span>
                  <span className="text-[9.5px] text-slate-400 font-mono">1:1 Quadrada</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCardFormat('story')}
                  className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    cardFormat === 'story'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-rose-400" />
                  <span>Stories / Reels</span>
                  <span className="text-[9.5px] text-slate-400 font-mono">9:16 Vertical</span>
                </button>
              </div>
            </div>

            {/* Tipo de Conteúdo */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Conteúdo do Card</span>
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'top5' as CardType, label: '⭐ Top 5 Animes Favoritos' },
                  { id: 'stats' as CardType, label: '📊 Estatísticas (Tempo & Episódios)' },
                  { id: 'achievements' as CardType, label: '🏆 Quadro de Conquistas & Insígnias' },
                  { id: 'watching' as CardType, label: '🔥 Animes em Andamento' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCardType(t.id)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                      cardType === t.id
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cores e Temas */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tema & Estilo Visual</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(THEMES).map(([key, th]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCardTheme(key as CardTheme)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      cardTheme === key
                        ? 'border-white text-white shadow-md bg-white/10'
                        : 'border-slate-800 text-slate-400 hover:text-white bg-slate-950'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: th.accent }} />
                    <span>{th.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Canvas Live Preview (Right column) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="max-h-[420px] w-full flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl border border-slate-800 bg-black/50 p-2">
              <canvas
                ref={canvasRef}
                className="max-h-[400px] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2.5">
              Dimensões de renderização: {cardFormat === 'story' ? '1080 x 1920 (9:16)' : cardFormat === 'square' ? '1080 x 1080 (1:1)' : '1200 x 675 (16:9)'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-download-social-card"
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Gerando...' : 'Baixar Imagem (PNG)'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado para Clipboard!' : 'Copiar Imagem'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
