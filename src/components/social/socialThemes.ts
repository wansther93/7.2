import { 
  Compass, 
  Brain, 
  Flame, 
  Moon, 
  Zap, 
  Coffee, 
  Sparkles,
  Shield,
  Crown,
  Swords,
  Scroll,
  BookOpen
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ProfileCardTheme, OtakuArchetype, HonorPillar } from '../../services/profileService';

export interface ThemeConfig {
  id: ProfileCardTheme;
  name: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  badgeBg: string;
  cardBorder: string;
  glowClass: string;
  bgGradient: string;
  bannerPlaceholder: string;
  auraRings: string;
  textColor: string;
}

export const PROFILE_THEMES: Record<ProfileCardTheme, ThemeConfig> = {
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Neo-Tokyo Cyber',
    tagline: 'Luzes de neon, circuitos e a velocidade das noites de Tóquio',
    primaryColor: '#06b6d4', // Cyan
    accentColor: '#ec4899', // Pink
    badgeBg: 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300',
    cardBorder: 'border-cyan-500/40 hover:border-cyan-400',
    glowClass: 'shadow-cyan-500/20 shadow-xl',
    bgGradient: 'from-slate-950 via-cyan-950/30 to-slate-950',
    bannerPlaceholder: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    auraRings: 'ring-cyan-400/50 shadow-cyan-500/50',
    textColor: 'text-cyan-400',
  },
  shrine: {
    id: 'shrine',
    name: 'Santuário Espiritual',
    tagline: 'Tradição, flores de cerejeira e serenidade mística',
    primaryColor: '#f472b6', // Sakura Rose
    accentColor: '#fbbf24', // Amber/Gold
    badgeBg: 'bg-pink-950/70 border-pink-500/40 text-pink-300',
    cardBorder: 'border-pink-500/40 hover:border-pink-400',
    glowClass: 'shadow-pink-500/20 shadow-xl',
    bgGradient: 'from-stone-950 via-pink-950/25 to-stone-950',
    bannerPlaceholder: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80',
    auraRings: 'ring-pink-400/50 shadow-pink-500/50',
    textColor: 'text-pink-400',
  },
  dark_fantasy: {
    id: 'dark_fantasy',
    name: 'Fantasia Sombria',
    tagline: 'Lâminas forjadas, escuridão ancestral e pactos lendários',
    primaryColor: '#e11d48', // Crimson
    accentColor: '#f59e0b', // Gold
    badgeBg: 'bg-red-950/70 border-red-500/40 text-red-300',
    cardBorder: 'border-red-500/40 hover:border-red-400',
    glowClass: 'shadow-red-500/20 shadow-xl',
    bgGradient: 'from-zinc-950 via-red-950/25 to-zinc-950',
    bannerPlaceholder: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    auraRings: 'ring-red-400/50 shadow-red-500/50',
    textColor: 'text-red-400',
  },
  adventure: {
    id: 'adventure',
    name: 'Aventura Shounen',
    tagline: 'Vontade indomável, mares abertos e laços inquebráveis',
    primaryColor: '#f97316', // Orange
    accentColor: '#eab308', // Yellow
    badgeBg: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
    cardBorder: 'border-amber-500/40 hover:border-amber-400',
    glowClass: 'shadow-amber-500/20 shadow-xl',
    bgGradient: 'from-slate-950 via-amber-950/25 to-slate-950',
    bannerPlaceholder: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    auraRings: 'ring-amber-400/50 shadow-amber-500/50',
    textColor: 'text-amber-400',
  },
  cosmic: {
    id: 'cosmic',
    name: 'Nebulosa Cósmica',
    tagline: 'Horizontes infinitos, estrelas distantes e mistérios profundos',
    primaryColor: '#8b5cf6', // Purple
    accentColor: '#38bdf8', // Sky
    badgeBg: 'bg-purple-950/70 border-purple-500/40 text-purple-300',
    cardBorder: 'border-purple-500/40 hover:border-purple-400',
    glowClass: 'shadow-purple-500/20 shadow-xl',
    bgGradient: 'from-slate-950 via-purple-950/25 to-slate-950',
    bannerPlaceholder: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    auraRings: 'ring-purple-400/50 shadow-purple-500/50',
    textColor: 'text-purple-400',
  },
};

export interface ArchetypeConfig {
  id: OtakuArchetype;
  title: string;
  subtitle: string;
  mantra: string;
  affinityGenres: string[];
  icon: LucideIcon;
  badgeGradient: string;
}

export const ARCHETYPES: Record<OtakuArchetype, ArchetypeConfig> = {
  strategist: {
    id: 'strategist',
    title: 'O Estrategista',
    subtitle: 'Mente Analítica & Xadrez Mental',
    mantra: 'A vitória pertence àquele que prevê dez passos à frente.',
    affinityGenres: ['Psicológico', 'Mistério', 'Suspense', 'Sci-Fi'],
    icon: Brain,
    badgeGradient: 'from-cyan-500 to-blue-600',
  },
  nomad: {
    id: 'nomad',
    title: 'O Nômade de Mundos',
    subtitle: 'Explorador de Reinos & Isekai',
    mantra: 'Nenhuma realidade é suficiente para conter minha curiosidade.',
    affinityGenres: ['Isekai', 'Fantasia', 'Aventura', 'Magia'],
    icon: Compass,
    badgeGradient: 'from-emerald-500 to-teal-600',
  },
  noble_heart: {
    id: 'noble_heart',
    title: 'O Coração Nobre',
    subtitle: 'Superação & Vontade Inabalável',
    mantra: 'Meus amigos são o motivo pelo qual jamais recuarei.',
    affinityGenres: ['Shounen', 'Ação', 'Esportes', 'Drama'],
    icon: Flame,
    badgeGradient: 'from-amber-500 to-orange-600',
  },
  night_philosopher: {
    id: 'night_philosopher',
    title: 'O Filósofo Noturno',
    subtitle: 'Profundidade & Existencialismo',
    mantra: 'Entre as luzes da cidade e o silêncio da noite, busco o significado.',
    affinityGenres: ['Seinen', 'Drama', 'Cyberpunk', 'Filosófico'],
    icon: Moon,
    badgeGradient: 'from-indigo-500 to-purple-700',
  },
  chaos_hunter: {
    id: 'chaos_hunter',
    title: 'O Caçador do Caos',
    subtitle: 'Adrenalina & Intensidade Pura',
    mantra: 'Prefiro a tempestade ao tédio de um mar calmo.',
    affinityGenres: ['Sobrenatural', 'Terror', 'Ação Brutal', 'Mecha'],
    icon: Zap,
    badgeGradient: 'from-rose-500 to-red-600',
  },
  peace_guardian: {
    id: 'peace_guardian',
    title: 'O Guardião da Calmaria',
    subtitle: 'Cotidiano Acolhedor & Sentimentos',
    mantra: 'A verdadeira obra de arte está nos pequenos detalhes do dia a dia.',
    affinityGenres: ['Slice of Life', 'Romance', 'Comédia', 'Música'],
    icon: Coffee,
    badgeGradient: 'from-pink-500 to-rose-400',
  },
};

export const HONOR_PILLAR_LABELS = [
  'A Obra-Prima Inabalável',
  'O Anime do Meu Conforto',
  'O Que Mais Me Fez Chorar',
  'O Clássico que Me Criou',
  'Minha Obsessão Atual',
  'A Minha Joia Escondida',
  'Maior Surpresa da Vida',
  'A Melhor Trilha Sonora',
  'Mestre dos Plot Twists',
  'A Animação Suprema',
] as const;
