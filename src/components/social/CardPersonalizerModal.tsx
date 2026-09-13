import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Palette,
  Shield,
  Heart,
  Award,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  Quote,
  Star,
  Tv,
  HelpCircle
} from 'lucide-react';
import type { Anime } from '../../types';
import type { 
  UserProfile, 
  ProfileCardTheme, 
  OtakuArchetype, 
  HonorPillar 
} from '../../services/profileService';
import { 
  PROFILE_THEMES, 
  ARCHETYPES, 
  HONOR_PILLAR_LABELS,
  ThemeConfig,
  ArchetypeConfig
} from './socialThemes';
import { PRESET_HONORARY_TITLES } from '../OtakuPassport';
import type { Achievement } from '../../services/achievementService';

interface CardPersonalizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  animes: Anime[];
  achievements: Achievement[];
  onSave: (updated: Partial<UserProfile>) => Promise<void>;
}

export const CardPersonalizerModal: React.FC<CardPersonalizerModalProps> = ({
  isOpen,
  onClose,
  profile,
  animes,
  achievements,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'archetype' | 'pillars' | 'badges' | 'identity'>('theme');
  const [selectedTheme, setSelectedTheme] = useState<ProfileCardTheme>(profile?.cardTheme || 'cyberpunk');
  const [selectedArchetype, setSelectedArchetype] = useState<OtakuArchetype>(profile?.archetype || 'noble_heart');
  const [honoraryTitle, setHonoraryTitle] = useState(profile?.honoraryTitle || 'Veterano Shounen');
  const [bio, setBio] = useState(profile?.publicBio || '');
  const [quote, setQuote] = useState(profile?.quote || '');
  const [bannerUrl, setBannerUrl] = useState(profile?.customBannerUrl || '');
  const [featuredBadges, setFeaturedBadges] = useState<string[]>(profile?.featuredBadges || []);

  // Quinteto de Honra
  const [pillars, setPillars] = useState<HonorPillar[]>(() => {
    if (profile?.honorPillars && profile.honorPillars.length > 0) {
      return profile.honorPillars;
    }
    // Preenche com os primeiros favoritos se existirem
    const defaultPillars: HonorPillar[] = [];
    const topRated = [...animes].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
    topRated.forEach((a, idx) => {
      defaultPillars.push({
        animeId: String(a.id || a.title),
        animeTitle: a.title,
        coverUrl: a.coverUrl,
        label: HONOR_PILLAR_LABELS[idx] || 'Favorito de Honra',
        rating: a.rating,
      });
    });
    return defaultPillars;
  });

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const currentTheme = PROFILE_THEMES[selectedTheme];

  const handleToggleBadge = (badgeId: string) => {
    if (featuredBadges.includes(badgeId)) {
      setFeaturedBadges(featuredBadges.filter((id) => id !== badgeId));
    } else {
      if (featuredBadges.length >= 3) {
        // Substitui o primeiro
        setFeaturedBadges([...featuredBadges.slice(1), badgeId]);
      } else {
        setFeaturedBadges([...featuredBadges, badgeId]);
      }
    }
  };

  const handleUpdatePillar = (index: number, updates: Partial<HonorPillar>) => {
    const updated = [...pillars];
    updated[index] = { ...updated[index], ...updates };
    setPillars(updated);
  };

  const handleSelectAnimeForPillar = (index: number, animeTitle: string) => {
    const matched = animes.find((a) => a.title === animeTitle);
    if (!matched) return;
    handleUpdatePillar(index, {
      animeId: String(matched.id || matched.title),
      animeTitle: matched.title,
      coverUrl: matched.coverUrl,
      rating: matched.rating,
    });
  };

  const handleRemovePillar = (index: number) => {
    setPillars(pillars.filter((_, i) => i !== index));
  };

  const handleAddPillarSlot = () => {
    if (pillars.length >= 5) return;
    const nextLabel = HONOR_PILLAR_LABELS[pillars.length] || 'Anime de Destaque';
    const unusedAnime = animes.find(a => !pillars.some(p => p.animeTitle === a.title)) || animes[0];
    if (unusedAnime) {
      setPillars([
        ...pillars,
        {
          animeId: String(unusedAnime.id || unusedAnime.title),
          animeTitle: unusedAnime.title,
          coverUrl: unusedAnime.coverUrl,
          label: nextLabel,
          rating: unusedAnime.rating,
        }
      ]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        cardTheme: selectedTheme,
        archetype: selectedArchetype,
        honoraryTitle,
        publicBio: bio,
        quote,
        customBannerUrl: bannerUrl || undefined,
        featuredBadges,
        honorPillars: pillars,
      });
      onClose();
    } catch (e) {
      console.error('Erro ao salvar personalizações do passaporte:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        id="card-personalizer-modal"
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* TOPO DO MODAL COM PRÉVIA SUTIL DO TEMA */}
        <div className={`relative p-5 sm:p-6 bg-gradient-to-r ${currentTheme.bgGradient} border-b border-slate-800/80`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${currentTheme.badgeBg} border shadow-lg`}>
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  Ateliê do Passaporte Otaku
                </h3>
                <p className="text-xs text-slate-400">
                  Enfeite sua ficha, escolha sua aura de colecionador e forje sua lenda
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Abas de Configuração */}
          <div className="flex items-center gap-2 mt-5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('theme')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'theme'
                  ? 'bg-white text-slate-950 font-black shadow-md'
                  : 'bg-slate-900/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              Aura & Tema Visual
            </button>
            <button
              onClick={() => setActiveTab('archetype')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'archetype'
                  ? 'bg-white text-slate-950 font-black shadow-md'
                  : 'bg-slate-900/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              Arquétipo de Afinidade
            </button>
            <button
              onClick={() => setActiveTab('pillars')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'pillars'
                  ? 'bg-white text-slate-950 font-black shadow-md'
                  : 'bg-slate-900/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              Quinteto de Honra ({pillars.length}/5)
            </button>
            <button
              onClick={() => setActiveTab('badges')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'badges'
                  ? 'bg-white text-slate-950 font-black shadow-md'
                  : 'bg-slate-900/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              Insígnias em Destaque ({featuredBadges.length}/3)
            </button>
            <button
              onClick={() => setActiveTab('identity')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'identity'
                  ? 'bg-white text-slate-950 font-black shadow-md'
                  : 'bg-slate-900/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              Título & Frase
            </button>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL SCROLLÁVEL */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* 1. SELEÇÃO DE TEMA E AURA */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-200 text-sm mb-1">
                  Escolha o Estilo do Seu Card de Colecionador
                </h4>
                <p className="text-xs text-slate-400">
                  O tema altera as bordas luminosas, gradientes de fundo, brilho do avatar e o clima geral do seu perfil público.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(PROFILE_THEMES).map((t) => {
                  const isSelected = selectedTheme === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTheme(t.id)}
                      className={`cursor-pointer relative p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? `bg-slate-900/90 ${t.cardBorder} shadow-lg ${t.glowClass}`
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-black ${isSelected ? t.textColor : 'text-slate-200'}`}>
                          {t.name}
                        </span>
                        {isSelected && (
                          <span className={`p-1 rounded-lg ${t.badgeBg} border`}>
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {t.tagline}
                      </p>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/60">
                        <span
                          className="w-4 h-4 rounded-full border border-black/50"
                          style={{ backgroundColor: t.primaryColor }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/50"
                          style={{ backgroundColor: t.accentColor }}
                        />
                        <span className="text-[10px] text-slate-500 font-mono ml-auto">
                          Aura Visual
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  URL da Imagem de Banner de Fundo (Opcional)
                </label>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://... (deixe em branco para usar o banner padrão do tema)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* 2. ARQUÉTIPO DE AFINIDADE */}
          {activeTab === 'archetype' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-200 text-sm mb-1">
                  Qual Selo Representa Sua Essência de Espectador?
                </h4>
                <p className="text-xs text-slate-400">
                  O arquétipo estampa um brasão exclusivo no topo do seu card, revelando sua filosofia e gêneros favoritos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(ARCHETYPES).map((arch) => {
                  const Icon = arch.icon;
                  const isSelected = selectedArchetype === arch.id;
                  return (
                    <div
                      key={arch.id}
                      onClick={() => setSelectedArchetype(arch.id)}
                      className={`cursor-pointer relative p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-slate-900/90 border-amber-500/60 shadow-lg shadow-amber-500/20'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${arch.badgeGradient} text-white shadow-md flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="font-black text-sm text-slate-100">
                              {arch.title}
                            </h5>
                            {isSelected && (
                              <span className="p-1 rounded-lg bg-amber-500 text-slate-950 font-bold">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-amber-400 font-semibold mt-0.5">
                            {arch.subtitle}
                          </p>
                          <p className="text-xs text-slate-400 italic mt-1 line-clamp-2">
                            "{arch.mantra}"
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {arch.affinityGenres.map((g, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. O QUINTETO DE HONRA */}
          {activeTab === 'pillars' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm mb-1">
                    Os 5 Pilares do Seu Gosto Pessoal
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ao invés de um genérico "Top 5", dê um significado emocional para cada anime primordial do seu passaporte.
                  </p>
                </div>
                {pillars.length < 5 && (
                  <button
                    onClick={handleAddPillarSlot}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Pilar
                  </button>
                )}
              </div>

              {pillars.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs">
                  Você ainda não definiu nenhum anime no Quinteto de Honra. Clique no botão acima para escolher!
                </div>
              ) : (
                <div className="space-y-3">
                  {pillars.map((pillar, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                    >
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        {pillar.coverUrl ? (
                          <img
                            src={pillar.coverUrl}
                            alt={pillar.animeTitle}
                            className="w-12 h-16 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                            <Tv className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                        {/* Selecionar Anime */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Obra Selecionada
                          </label>
                          <select
                            value={pillar.animeTitle}
                            onChange={(e) => handleSelectAnimeForPillar(idx, e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                          >
                            {animes.map((a) => (
                              <option key={a.id || a.title} value={a.title}>
                                {a.title} {a.rating ? `(★ ${a.rating})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Rótulo Emocional */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Rótulo de Honra
                          </label>
                          <select
                            value={pillar.label}
                            onChange={(e) => handleUpdatePillar(idx, { label: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
                          >
                            {HONOR_PILLAR_LABELS.map((lbl) => (
                              <option key={lbl} value={lbl}>
                                {lbl}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemovePillar(idx)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors self-end sm:self-center"
                        title="Remover slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. INSÍGNIAS EM DESTAQUE */}
          {activeTab === 'badges' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-200 text-sm mb-1">
                  Vitrine de Conquistas Incrustada
                </h4>
                <p className="text-xs text-slate-400">
                  Escolha até 3 das suas insígnias desbloqueadas para brilharem com destaque no centro da sua ficha.
                </p>
              </div>

              {achievements.filter((a) => a.isUnlocked).length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs">
                  Você ainda não desbloqueou nenhuma conquista. Continue assistindo e avaliando animes para forjar suas primeiras medalhas!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievements
                    .filter((a) => a.isUnlocked)
                    .map((badge) => {
                      const isEquipped = featuredBadges.includes(badge.id);
                      return (
                        <div
                          key={badge.id}
                          onClick={() => handleToggleBadge(badge.id)}
                          className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                            isEquipped
                              ? 'bg-amber-950/30 border-amber-500/60 shadow-md shadow-amber-500/10'
                              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                            {badge.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs text-slate-200 truncate">
                              {badge.title}
                            </h5>
                            <p className="text-[11px] text-slate-400 truncate">
                              {badge.description}
                            </p>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                              Tier {badge.tier}
                            </span>
                          </div>
                          <div className="flex-shrink-0">
                            {isEquipped ? (
                              <span className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black">
                                Equipado
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 hover:text-slate-300">
                                Equipar
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* 5. TÍTULO HONORÁRIO E FRASE */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Título Honorário
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  {PRESET_HONORARY_TITLES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setHonoraryTitle(t)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-left truncate transition-all ${
                        honoraryTitle === t
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={honoraryTitle}
                  onChange={(e) => setHonoraryTitle(e.target.value)}
                  placeholder="Ou digite seu próprio título épico..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Biografia do Passaporte
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={280}
                  placeholder="Fale um pouco sobre o que você busca nos animes, suas manias e jornada..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
                <span className="text-[10px] text-slate-500 block text-right">
                  {bio.length}/280
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Frase de Efeito / Citação Favorita
                </label>
                <input
                  type="text"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder="Ex: 'Se você não arriscar, não poderá criar um futuro.' — Luffy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DE AÇÃO */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            id="btn-save-passport-settings"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Gravando no Passaporte...' : 'Salvar Personalizações'}
          </button>
        </div>
      </div>
    </div>
  );
};
