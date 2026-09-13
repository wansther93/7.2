import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, 
  Upload, 
  Link2, 
  Camera, 
  RotateCcw, 
  Check, 
  Save, 
  User as UserIcon, 
  Trash2, 
  AlertTriangle, 
  Loader2,
  AtSign,
  FileText,
  Image as ImageIcon,
  Globe,
  Copy,
  Lock,
  Info,
  ShieldCheck,
  AlertCircle,
  Trophy,
  Star,
  Search,
  CheckCircle2
} from 'lucide-react';
import type { User } from '../lib/firebase';
import type { UserProfile } from '../services/profileService';
import type { Anime } from '../types';
import { calculateUserAchievements } from '../services/achievementService';
import { copyToClipboard } from '../lib/clipboard';
import { compressImageFile } from '../lib/imageUtils';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentAvatarUrl?: string;
  userProfile?: UserProfile | null;
  animes?: Anime[];
  onSaveAvatar: (newUrl: string) => Promise<void>;
  onSaveProfile?: (profileData: Partial<UserProfile>) => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}

type ModalTab = 'identity' | 'badges' | 'favorites';

export const AvatarModal: React.FC<AvatarModalProps> = ({
  isOpen,
  onClose,
  user,
  currentAvatarUrl = '',
  userProfile,
  animes = [],
  onSaveAvatar,
  onSaveProfile,
  onDeleteAccount,
}) => {
  const [modalTab, setModalTab] = useState<ModalTab>('identity');
  const [activeAvatarSource, setActiveAvatarSource] = useState<'upload' | 'url'>('upload');
  const [avatarPreview, setAvatarPreview] = useState<string>(currentAvatarUrl || userProfile?.customAvatarUrl || user?.photoURL || '');
  const [bannerPreview, setBannerPreview] = useState<string>(userProfile?.customBannerUrl || '');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [honoraryTitleInput, setHonoraryTitleInput] = useState<string>('');
  const [bioInput, setBioInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [bannerUrlInput, setBannerUrlInput] = useState<string>('');
  const [showBannerConfig, setShowBannerConfig] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados com atualização instantânea (0ms de latência visual)
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [selectedFavorites, setSelectedFavorites] = useState<string[]>([]);
  const [favoriteSearchQuery, setFavoriteSearchQuery] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // Estados de confirmação para Excluir Conta
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Verificação de Desenvolvedor e Bloqueio de 30 dias (Exclusivo lanskyy93@gmail.com)
  const isDeveloper = useMemo(() => {
    const email = (user?.email || userProfile?.email || '').trim().toLowerCase();
    return email === 'lanskyy93@gmail.com';
  }, [user?.email, userProfile]);

  const { isCooldownActive, nextAllowedDate, daysRemaining } = useMemo(() => {
    if (isDeveloper || !userProfile?.usernameLastChangedAt) {
      return { isCooldownActive: false, nextAllowedDate: null, daysRemaining: 0 };
    }
    const lastChanged = new Date(userProfile.usernameLastChangedAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const nextDate = new Date(lastChanged + thirtyDaysMs);
    const now = Date.now();
    const active = now < nextDate.getTime();
    const days = Math.ceil((nextDate.getTime() - now) / (1000 * 60 * 60 * 24));
    return { isCooldownActive: active, nextAllowedDate: nextDate, daysRemaining: Math.max(1, days) };
  }, [isDeveloper, userProfile?.usernameLastChangedAt]);

  // Conquistas desbloqueadas do usuário
  const userAchievements = useMemo(() => {
    return calculateUserAchievements(animes || []);
  }, [animes]);

  useEffect(() => {
    if (isOpen) {
      const avatarVal = currentAvatarUrl || userProfile?.customAvatarUrl || user?.photoURL || '';
      const bannerVal = userProfile?.customBannerUrl || '';
      setAvatarPreview(avatarVal);
      setBannerPreview(bannerVal);
      setUsernameInput(userProfile?.publicUsername || user?.displayName || '');
      setHonoraryTitleInput(userProfile?.honoraryTitle || '');
      setBioInput(userProfile?.publicBio || '');
      setUrlInput(avatarVal.startsWith('data:') ? '' : avatarVal);
      setBannerUrlInput(bannerVal.startsWith('data:') ? '' : bannerVal);
      setSelectedBadges(userProfile?.featuredBadges || []);
      setSelectedFavorites(userProfile?.favoriteAnimeIds || []);
      setSaveSuccess(false);
      setErrorMessage(null);
      setShowDeleteConfirm(false);
      setConfirmText('');
      setDeletingAccount(false);
      setShowBannerConfig(false);
      setFavoriteSearchQuery('');
    }
  }, [isOpen, currentAvatarUrl, user?.photoURL, userProfile, user?.displayName]);

  const cleanUsernameSlug = (usernameInput || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'seunick';
  const shareProfileUrl = `${window.location.origin}/?user=${encodeURIComponent(user?.uid || '')}`;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    try {
      const compressed = await compressImageFile(file, 256, 256, 0.8);
      if (compressed) {
        setAvatarPreview(compressed);
      }
    } catch (err) {
      console.error('Erro ao comprimir imagem de avatar:', err);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido para o banner.');
      return;
    }

    try {
      const compressed = await compressImageFile(file, 900, 450, 0.8);
      if (compressed) {
        setBannerPreview(compressed);
      }
    } catch (err) {
      console.error('Erro ao comprimir banner:', err);
    }
  };

  const handleUrlApply = () => {
    if (urlInput.trim()) {
      setAvatarPreview(urlInput.trim());
    }
  };

  const handleBannerUrlApply = () => {
    if (bannerUrlInput.trim()) {
      setBannerPreview(bannerUrlInput.trim());
    }
  };

  const handleResetToGoogle = () => {
    setAvatarPreview(user?.photoURL || '');
    setUrlInput('');
  };

  const handleCopyCustomLink = async () => {
    const success = await copyToClipboard(shareProfileUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Toggle instantâneo de Insígnias (até 5)
  const handleToggleBadge = (badgeId: string) => {
    setSelectedBadges((prev) => {
      if (prev.includes(badgeId)) {
        return prev.filter((id) => id !== badgeId);
      }
      if (prev.length >= 5) {
        // Substitui a primeira se já tiver 5
        return [...prev.slice(1), badgeId];
      }
      return [...prev, badgeId];
    });
  };

  // Toggle instantâneo de Animes Favoritos (até 5)
  const handleToggleFavorite = (animeId: string) => {
    setSelectedFavorites((prev) => {
      if (prev.includes(animeId)) {
        return prev.filter((id) => id !== animeId);
      }
      if (prev.length >= 5) {
        return [...prev.slice(1), animeId];
      }
      return [...prev, animeId];
    });
  };

  const handleSave = async () => {
    setErrorMessage(null);
    const cleanOriginal = (userProfile?.publicUsername || '').trim().toLowerCase().replace(/^@/, '');
    const cleanNew = (usernameInput || '').trim().toLowerCase().replace(/^@/, '');

    if (cleanNew !== cleanOriginal && isCooldownActive) {
      setErrorMessage(
        `Seu Nick só pode ser alterado uma vez a cada 30 dias. Próxima alteração disponível em: ${nextAllowedDate?.toLocaleDateString('pt-BR')} (restam ${daysRemaining} dias).`
      );
      return;
    }

    setSaving(true);
    try {
      if (onSaveProfile) {
        await onSaveProfile({
          customAvatarUrl: avatarPreview,
          customBannerUrl: bannerPreview,
          publicUsername: usernameInput.trim() || user?.displayName || 'Usuário WAnime',
          publicBio: bioInput.trim(),
          honoraryTitle: honoraryTitleInput.trim(),
          email: user?.email || userProfile?.email || undefined,
          isDeveloperAdmin: isDeveloper,
          featuredBadges: selectedBadges,
          favoriteAnimeIds: selectedFavorites,
        });
      } else {
        await onSaveAvatar(avatarPreview);
      }
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Ocorreu um erro ao salvar o perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAccountDeletion = async () => {
    if (confirmText.trim().toUpperCase() !== 'EXCLUIR') return;
    setDeletingAccount(true);
    try {
      if (onDeleteAccount) {
        await onDeleteAccount();
      }
      onClose();
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      alert('Ocorreu um erro ao excluir a conta. Tente novamente.');
      setDeletingAccount(false);
    }
  };

  // Filtragem de animes para seleção de favoritos
  const filteredAnimesForFavorites = useMemo(() => {
    if (!favoriteSearchQuery.trim()) return animes;
    const q = favoriteSearchQuery.toLowerCase().trim();
    return animes.filter((a) => a.title.toLowerCase().includes(q));
  }, [animes, favoriteSearchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              {showDeleteConfirm ? (
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {showDeleteConfirm ? 'Excluir Conta Permanentemente' : 'Meu Perfil & Identidade'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {showDeleteConfirm
                  ? 'Atenção: Todos os seus dados serão apagados'
                  : 'Personalize seu perfil, insígnias e animes favoritos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Top Tabs (Identidade | Insígnias | Favoritos) */}
        {!showDeleteConfirm && (
          <div className="flex items-center gap-1 px-4 pt-3 pb-2 bg-slate-950/60 border-b border-slate-800/80 text-xs shrink-0 overflow-x-auto no-scrollbar">
            <button
              type="button"
              id="tab-profile-identity"
              onClick={() => setModalTab('identity')}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                modalTab === 'identity'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Identidade</span>
            </button>

            <button
              type="button"
              id="tab-profile-badges"
              onClick={() => setModalTab('badges')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                modalTab === 'badges'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Insígnias ({selectedBadges.length}/3)</span>
            </button>

            <button
              type="button"
              id="tab-profile-favorites"
              onClick={() => setModalTab('favorites')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                modalTab === 'favorites'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Favoritos ({selectedFavorites.length}/5)</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        {showDeleteConfirm ? (
          /* View de Confirmação de Exclusão de Conta */
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Esta ação é definitiva e não pode ser desfeita!</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1 list-disc pl-4">
                <li>Todos os seus animes salvos e listas serão <strong>excluídos permanentemente</strong> do Firestore.</li>
                <li>Seu histórico de episódios, notas, sinopses e preferências serão apagados.</li>
                <li>Caso faça login no futuro com esta mesma conta do Google, você começará do zero como um novo usuário.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Para confirmar, digite a palavra <strong className="text-rose-400 font-black tracking-wider">EXCLUIR</strong> abaixo:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digite EXCLUIR para confirmar"
                className="w-full bg-slate-950 border border-rose-500/40 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmText('');
                }}
                disabled={deletingAccount}
                className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleConfirmAccountDeletion}
                disabled={confirmText.trim().toUpperCase() !== 'EXCLUIR' || deletingAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/30 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Excluindo tudo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Apagar Todos os Dados e Sair</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
            {/* Mensagem de Erro / Alerta */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB 1: IDENTIDADE (Avatar, Banner, Nick, Bio) */}
            {modalTab === 'identity' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Banner & Avatar Combined Preview */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                  {/* Banner Background */}
                  <div className="relative w-full h-24 sm:h-28 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 overflow-hidden">
                    {bannerPreview ? (
                      <img
                        src={bannerPreview}
                        alt="Banner de perfil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
                    )}

                    <button
                      type="button"
                      onClick={() => setShowBannerConfig(!showBannerConfig)}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-black/70 hover:bg-black/90 border border-white/20 text-white text-[10px] font-bold backdrop-blur-md flex items-center gap-1 transition-all cursor-pointer shadow-lg"
                    >
                      <ImageIcon className="w-3 h-3 text-indigo-400" />
                      <span>{showBannerConfig ? 'Ocultar Banner' : 'Editar Capa / Banner'}</span>
                    </button>
                  </div>

                  {/* Avatar Overlay */}
                  <div className="px-4 pb-3 pt-0 flex items-end justify-between relative -mt-9 gap-3">
                    <div className="flex items-end gap-3">
                      <div className="relative group shrink-0">
                        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-3 border-slate-900 bg-slate-900 shadow-2xl flex items-center justify-center">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Foto de perfil"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={() => setAvatarPreview('')}
                            />
                          ) : (
                            <UserIcon className="w-8 h-8 text-slate-500" />
                          )}
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-all cursor-pointer backdrop-blur-xs"
                        >
                          <Camera className="w-4 h-4 mb-0.5" />
                          <span>Trocar</span>
                        </button>
                      </div>

                      <div className="min-w-0 pb-1">
                        <h4 className="text-sm font-black text-white truncate">
                          {usernameInput || user?.displayName || 'Meu Perfil'}
                        </h4>
                        <p className="text-[11px] text-indigo-400 font-mono font-bold flex items-center gap-0.5">
                          <AtSign className="w-3 h-3" />
                          <span>{cleanUsernameSlug}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuração de Banner de Capa */}
                {showBannerConfig && (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Banner / Imagem de Capa do Perfil</span>
                      </label>
                      {bannerPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setBannerPreview('');
                            setBannerUrlInput('');
                          }}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          Remover Banner
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Cole a URL do banner (ex: anime wallpaper)"
                        value={bannerUrlInput}
                        onChange={(e) => setBannerUrlInput(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleBannerUrlApply}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Aplicar
                      </button>
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                      </button>
                    </div>
                    <input
                      ref={bannerFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Nickname / Nome de Usuário */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <AtSign className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Nick de Usuário do Perfil Público</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-normal">Identificador único</span>
                  </div>

                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs text-indigo-400 font-bold">@</span>
                    <input
                      type="text"
                      value={usernameInput}
                      disabled={isCooldownActive}
                      onChange={(e) => {
                        setErrorMessage(null);
                        setUsernameInput(e.target.value.replace(/\s+/g, '-'));
                      }}
                      placeholder="ex: lansky, otaku-master"
                      maxLength={30}
                      className={`w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-950 border text-xs sm:text-sm font-medium outline-none transition-colors ${
                        isCooldownActive
                          ? 'border-slate-800 text-slate-400 cursor-not-allowed opacity-75'
                          : 'border-slate-800 focus:border-indigo-500 text-white'
                      }`}
                    />
                    {isCooldownActive && (
                      <div className="absolute right-3 text-amber-400">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Status do Nick */}
                  {isDeveloper ? (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-[11px] text-purple-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>Conta de Administrador ({user?.email || 'lanskyy93@gmail.com'}): Troca de Nick liberada sem restrição de 30 dias.</span>
                    </div>
                  ) : isCooldownActive ? (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Nick alterado recentemente. Próxima troca disponível em <strong>{nextAllowedDate?.toLocaleDateString('pt-BR')}</strong> (restam {daysRemaining} dias).
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
                      <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Atenção: Nicks são únicos. Ao alterar seu Nick, ele só poderá ser alterado novamente após 30 dias.</span>
                    </div>
                  )}

                  {/* Link Oficial */}
                  <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-indigo-300 font-mono truncate">
                        {shareProfileUrl}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCustomLink}
                      className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-[10px] font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* Título Honorário do Passaporte */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Título Honorário do Passaporte</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Exibido no topo do perfil</span>
                  </label>
                  <input
                    type="text"
                    value={honoraryTitleInput}
                    onChange={(e) => setHonoraryTitleInput(e.target.value)}
                    placeholder="ex: Veterano Shounen, Crítico de Romance, Explorador de Isekai..."
                    maxLength={40}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>

                {/* Bio do Perfil */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Biografia / Recado do Perfil</span>
                  </label>
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Conte sobre seus animes favoritos, seu estilo ou uma frase marcante..."
                    maxLength={200}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white outline-none resize-none placeholder:text-slate-600"
                  />
                  <div className="flex justify-end text-[10px] text-slate-500">
                    {bioInput.length}/200 caracteres
                  </div>
                </div>

                {/* Option Tabs para Avatar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200">Foto de Perfil (Avatar)</label>
                    {user?.photoURL && (
                      <button
                        type="button"
                        onClick={handleResetToGoogle}
                        className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Usar foto Google</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveAvatarSource('upload')}
                      className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        activeAvatarSource === 'upload'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAvatarSource('url')}
                      className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        activeAvatarSource === 'url'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Colar Link (URL)</span>
                    </button>
                  </div>

                  {activeAvatarSource === 'upload' && (
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="avatar-file-input"
                      />
                      <label
                        htmlFor="avatar-file-input"
                        className="w-full py-4 px-3 rounded-xl border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-950/60 hover:bg-slate-950 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                          Clique para escolher imagem do dispositivo
                        </span>
                        <span className="text-[10px] text-slate-500">PNG, JPG, WebP ou GIF</span>
                      </label>
                    </div>
                  )}

                  {activeAvatarSource === 'url' && (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://exemplo.com/avatar.png"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUrlApply();
                          }
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleUrlApply}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </div>

                {/* Excluir Conta Botão */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-300">Excluir Conta</h4>
                      <p className="text-[10px] text-slate-500">Apaga permanentemente todos os animes e dados</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INSÍGNIAS EM DESTAQUE (0ms delay instantâneo) */}
            {modalTab === 'badges' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300">
                    <strong className="text-amber-300 font-bold block mb-0.5">Selecione até 5 Insígnias em Destaque</strong>
                    Clique nas insígnias que você já desbloqueou para fixar nos 5 slots do seu perfil. A seleção é instantânea!
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                  <span>Insígnias Selecionadas ({selectedBadges.length}/5):</span>
                  {selectedBadges.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedBadges([])}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>

                {/* Grid de Insígnias Desbloqueadas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[45vh] overflow-y-auto no-scrollbar pr-1">
                  {userAchievements.achievements.map((item) => {
                    const isUnlocked = item.isUnlocked;
                    const isSelected = selectedBadges.includes(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!isUnlocked}
                        onClick={() => handleToggleBadge(item.id)}
                        className={`text-left p-3 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.98] ${
                          !isUnlocked
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-40 cursor-not-allowed grayscale'
                            : isSelected
                            ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-amber-500 shadow-md shadow-amber-500/20 ring-1 ring-amber-500'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                              : 'bg-slate-900 border-slate-800'
                          }`}>
                            <span>{item.icon || '🏆'}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h5 className={`text-xs font-bold truncate ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                                {item.title}
                              </h5>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md font-bold text-xs animate-in zoom-in-75 duration-150">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : isUnlocked ? (
                            <div className="w-6 h-6 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-500 text-xs">
                              +
                            </div>
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: ANIMES FAVORITOS EM DESTAQUE (0ms delay instantâneo) */}
            {modalTab === 'favorites' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-2.5">
                  <Star className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300">
                    <strong className="text-purple-300 font-bold block mb-0.5">Selecione até 5 Animes Favoritos</strong>
                    Fixe suas obras prediletas no topo do seu perfil para que todos que visitarem vejam o que você mais ama!
                  </div>
                </div>

                {/* Barra de Busca de Favoritos */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar na minha lista para favoritar..."
                    value={favoriteSearchQuery}
                    onChange={(e) => setFavoriteSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none placeholder:text-slate-500"
                  />
                  {favoriteSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setFavoriteSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                  <span>Animes Escolhidos ({selectedFavorites.length}/5):</span>
                  {selectedFavorites.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedFavorites([])}
                      className="text-[11px] text-purple-400 hover:underline cursor-pointer"
                    >
                      Limpar favoritos
                    </button>
                  )}
                </div>

                {/* Lista de Animes para Seleção */}
                <div className="space-y-2 max-h-[45vh] overflow-y-auto no-scrollbar pr-1">
                  {filteredAnimesForFavorites.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      Nenhum anime encontrado na sua lista.
                    </div>
                  ) : (
                    filteredAnimesForFavorites.map((anime) => {
                      const isSelected = selectedFavorites.includes(anime.id);

                      return (
                        <button
                          key={anime.id}
                          type="button"
                          onClick={() => handleToggleFavorite(anime.id)}
                          className={`w-full text-left p-2.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99] ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border-purple-500 shadow-md shadow-purple-500/20 ring-1 ring-purple-500'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-12 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                              {anime.coverUrl ? (
                                <img
                                  src={anime.coverUrl}
                                  alt={anime.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 text-[9px]">
                                  Capa
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <h5 className={`text-xs font-bold truncate ${isSelected ? 'text-purple-300' : 'text-white'}`}>
                                {anime.title}
                              </h5>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>Ep. {anime.currentEpisode}{anime.totalEpisodes ? `/${anime.totalEpisodes}` : ''}</span>
                                {anime.rating && <span className="text-amber-400 font-bold">★ {anime.rating}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md font-bold text-xs animate-in zoom-in-75 duration-150">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-500 text-xs">
                                <Star className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!showDeleteConfirm && (
          <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              id="btn-save-profile-customization"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Perfil Atualizado!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
