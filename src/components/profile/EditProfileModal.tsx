import React, { useState, useMemo } from 'react';
import {
  X,
  Camera,
  Image,
  User,
  AtSign,
  Crown,
  Check,
  Lock,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Palette,
  Eye,
  FileText
} from 'lucide-react';
import type { UserProfile } from '../../services/profileService';
import type { Anime } from '../../types';
import { getUserUnlockedTitles } from '../../services/titleService';
import { compressImageFile } from '../../lib/imageUtils';
import { auth } from '../../lib/firebase';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  userAnimes: Anime[];
  onSave: (updated: Partial<UserProfile>) => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  userAnimes,
  onSave,
  onDeleteAccount,
}) => {
  const [displayName, setDisplayName] = useState(profile?.publicUsername || '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(profile?.customAvatarUrl || '');
  const [customBannerUrl, setCustomBannerUrl] = useState(profile?.customBannerUrl || '');
  const [bio, setBio] = useState(profile?.publicBio || '');
  const [selectedTitle, setSelectedTitle] = useState(profile?.honoraryTitle || '');
  const [isTitleAccordionOpen, setIsTitleAccordionOpen] = useState(false);
  const [isPublicList, setIsPublicList] = useState(profile?.isPublicList !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincroniza campos quando o modal é aberto ou o perfil é carregado
  React.useEffect(() => {
    if (isOpen) {
      setDisplayName(profile?.publicUsername || '');
      setCustomAvatarUrl(profile?.customAvatarUrl || '');
      setCustomBannerUrl(profile?.customBannerUrl || '');
      setBio(profile?.publicBio || '');
      setSelectedTitle(profile?.honoraryTitle || '');
      setIsPublicList(profile?.isPublicList !== false);
      setErrorMessage(null);
    }
  }, [isOpen, profile]);

  // Verificação de Desenvolvedor / Administrador exclusiva por e-mail oficial
  const isDeveloper = useMemo(() => {
    const email = (auth.currentUser?.email || profile?.email || '').trim().toLowerCase();
    return email === 'lanskyy93@gmail.com';
  }, [profile]);

  // Lista de títulos desbloqueados com base no progresso real de animes
  const { unlockedTitles, lockedTitles } = React.useMemo(() => {
    return getUserUnlockedTitles(userAnimes);
  }, [userAnimes]);

  if (!isOpen) return null;

  // Lida com upload de avatar via input file com compressão automática
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 256, 256, 0.8);
        if (compressed) {
          setCustomAvatarUrl(compressed);
        }
      } catch (err) {
        console.error('Erro ao processar imagem de avatar:', err);
      }
    }
  };

  // Lida com upload de banner via input file com compressão automática
  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 900, 450, 0.8);
        if (compressed) {
          setCustomBannerUrl(compressed);
        }
      } catch (err) {
        console.error('Erro ao processar imagem de capa:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);
    try {
      await onSave({
        publicUsername: displayName.trim(),
        customAvatarUrl: customAvatarUrl.trim() || undefined,
        customBannerUrl: customBannerUrl.trim() || undefined,
        publicBio: bio.trim(),
        honoraryTitle: selectedTitle.trim() || undefined,
        isPublicList,
      });
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      setErrorMessage(err?.message || 'Erro ao salvar perfil. Por favor, tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-black/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Topo do Modal */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-black text-white">Editar Perfil Otaku</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário de Edição */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Mensagem de Erro se houver */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ========================================== */}
          {/* SEÇÃO 1: IDENTIDADE VISUAL (CAPA & AVATAR) */}
          {/* ========================================== */}
          <div className="space-y-2.5 p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>Identidade Visual</span>
              </label>
              <span className="text-[10px] text-slate-400">Compressão automática otimizada</span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-slate-950 h-36 sm:h-44 group shadow-lg">
              {/* Banner */}
              {customBannerUrl ? (
                <img
                  src={customBannerUrl}
                  alt="Banner preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-center text-slate-500 text-xs">
                  Sem capa personalizada (padrão escuro)
                </div>
              )}
              <div className="absolute inset-0 bg-black/35 pointer-events-none" />

              {/* Ações da Capa: Upload Limpo e Remover */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                {customBannerUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomBannerUrl('')}
                    title="Remover capa e voltar ao padrão"
                    className="px-2.5 py-1.5 rounded-xl bg-black/75 hover:bg-red-950/80 border border-white/20 hover:border-red-500/50 text-slate-300 hover:text-red-300 text-xs font-bold flex items-center gap-1 cursor-pointer backdrop-blur-md transition-all shadow-md active:scale-95"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Remover</span>
                  </button>
                )}
                <label className="px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 border border-white/20 hover:border-amber-400/60 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition-all shadow-md active:scale-95">
                  <Image className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trocar Capa</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Avatar Sobreposto com Botão de Foto */}
              <div className="absolute bottom-2.5 left-3.5 flex items-center gap-3">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-amber-400/80 shadow-2xl overflow-hidden bg-slate-950 group/avatar">
                  {customAvatarUrl ? (
                    <img
                      src={customAvatarUrl}
                      alt="Avatar preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User className="w-7 h-7" />
                    </div>
                  )}

                  {/* Botão de Câmera no Avatar */}
                  <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer text-white backdrop-blur-[2px]">
                    <Camera className="w-5 h-5 text-amber-400" />
                    <span className="text-[9px] font-bold mt-0.5">Trocar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="px-2.5 py-1 rounded-xl bg-black/75 hover:bg-black/95 border border-white/20 hover:border-amber-400/60 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer backdrop-blur-md transition-all shadow-sm active:scale-95 w-fit">
                    <Camera className="w-3 h-3 text-amber-400" />
                    <span>Trocar Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                  {customAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setCustomAvatarUrl('')}
                      title="Restaurar foto padrão"
                      className="px-2 py-0.5 rounded-lg bg-black/70 hover:bg-red-950/80 border border-white/15 hover:border-red-500/40 text-slate-300 hover:text-red-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all w-fit"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>Padrão</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* SEÇÃO 2: INFORMAÇÕES BÁSICAS */}
          {/* ========================================== */}
          <div className="space-y-2 p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Informações Básicas</span>
              </label>
              {isDeveloper && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-300 text-[10px] font-black uppercase shadow-sm">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  <span>DEV / ADMIN</span>
                </div>
              )}
            </div>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                maxLength={30}
                placeholder="Seu nome ou nick público"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          {/* ========================================== */}
          {/* SEÇÃO 3: TÍTULO DE HONRA (ACCORDION COMPACTO) */}
          {/* ========================================== */}
          <div className="space-y-2 p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Título de Honra do Perfil</span>
              </label>
              <span className="text-[11px] text-amber-400 font-semibold">
                {unlockedTitles.length} desbloqueados
              </span>
            </div>

            {/* Cabeçalho do Acordeão com o Título Ativo */}
            <button
              type="button"
              onClick={() => setIsTitleAccordionOpen((prev) => !prev)}
              className="w-full p-3 rounded-xl bg-black/60 hover:bg-black/80 border border-white/10 hover:border-amber-400/50 flex items-center justify-between gap-2 transition-all cursor-pointer select-none shadow-sm text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {selectedTitle || 'Viajante dos Animes'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Ativo
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {unlockedTitles.find((t) => t.title === selectedTitle)?.description ||
                      'Clique para escolher outro título conquistado'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 text-slate-400">
                <span className="text-[10px] hidden sm:inline text-slate-400">
                  {isTitleAccordionOpen ? 'Recolher' : 'Alterar'}
                </span>
                {isTitleAccordionOpen ? (
                  <ChevronUp className="w-4 h-4 text-amber-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {/* Conteúdo Expansível do Acordeão */}
            {isTitleAccordionOpen && (
              <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                <p className="text-[11px] text-slate-400">
                  Selecione um título conquistado pelo seu progresso para ostentar no perfil:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {unlockedTitles.map((t) => {
                    const isSelected = selectedTitle === t.title;
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedTitle(t.title);
                          setIsTitleAccordionOpen(false);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{t.icon}</span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate">{t.title}</span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {t.description}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                    );
                  })}

                  {/* Títulos Bloqueados como inspiração */}
                  {lockedTitles.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl border border-white/5 bg-white/[0.01] opacity-40 flex items-center gap-2 select-none cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-400 block truncate">
                          {t.title}
                        </span>
                        <span className="text-[9.5px] text-slate-500 block truncate">
                          {t.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========================================== */}
          {/* SEÇÃO 4: BIOGRAFIA / SOBRE VOCÊ */}
          {/* ========================================== */}
          <div className="space-y-1.5 p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Biografia / Sobre você</span>
              </label>
              <span className="text-[10px] text-slate-500">{bio.length}/160</span>
            </div>
            <textarea
              rows={2}
              maxLength={160}
              placeholder="Ex: Animes, boas histórias e grandes emoções..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 resize-none transition-colors"
            />
          </div>

          {/* ========================================== */}
          {/* SEÇÃO 5: VISIBILIDADE & PRIVACIDADE */}
          {/* ========================================== */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Perfil e Coleção Públicos</span>
                <span className="text-[10px] text-slate-400 block">
                  Permite que amigos e membros vejam seu passaporte e animes pelo seu link
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPublicList}
              onChange={(e) => setIsPublicList(e.target.checked)}
              className="w-4 h-4 accent-amber-400 cursor-pointer"
            />
          </div>

          {/* 6. Zona de Exclusão de Conta (Opcional se onDeleteAccount estiver ativo) */}
          {onDeleteAccount && (
            <div className="pt-2 border-t border-white/5">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir minha conta e dados...</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-red-300 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Tem certeza? Esta ação apagará permanentemente sua coleção e perfil.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={async () => {
                        setIsDeleting(true);
                        try {
                          await onDeleteAccount();
                          onClose();
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? 'Excluindo...' : 'Sim, excluir definitivamente'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
