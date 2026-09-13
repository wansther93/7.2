import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Globe, 
  Lock, 
  ExternalLink, 
  QrCode, 
  Eye, 
  Tv, 
  Film, 
  Star, 
  Layers, 
  ShieldCheck,
  User as UserIcon,
  Search
} from 'lucide-react';
import type { Anime } from '../types';
import type { UserProfile } from '../services/profileService';
import { saveUserProfile } from '../services/profileService';
import { copyToClipboard } from '../lib/clipboard';

interface ShareListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  avatarUrl?: string;
  animes: Anime[];
  userProfile?: UserProfile | null;
  onProfileUpdated?: (profile: UserProfile) => void;
  onOpenProfileSettings?: () => void;
}

export const ShareListModal: React.FC<ShareListModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  avatarUrl,
  animes,
  userProfile,
  onProfileUpdated,
  onOpenProfileSettings,
}) => {
  const [isPublic, setIsPublic] = useState<boolean>(userProfile?.isPublicList ?? true);
  const [copied, setCopied] = useState(false);
  const [copiedCustom, setCopiedCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedShareTab, setSelectedShareTab] = useState<'link' | 'qr' | 'preview'>('link');

  const usernameSlug = (userProfile?.publicUsername || userName || 'perfil')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

  // URL compartilhável direta e funcional (igual à do botão 'Abrir Lista em Nova Aba')
  const shareDirectUrl = `${window.location.origin}/?user=${encodeURIComponent(userId)}`;

  useEffect(() => {
    if (isOpen && userProfile) {
      setIsPublic(userProfile.isPublicList !== false);
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const handleCopyLink = async (url: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleTogglePublic = async (newVal: boolean) => {
    setIsPublic(newVal);
    setSaving(true);
    try {
      const updated = await saveUserProfile(userId, {
        isPublicList: newVal,
        publicUsername: userProfile?.publicUsername || userName,
        publicBio: userProfile?.publicBio || '',
      });
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
    } catch (error) {
      console.error('Erro ao atualizar privacidade da lista:', error);
    } finally {
      setSaving(false);
    }
  };

  // Estatísticas rápidas da lista
  const totalAnimes = animes.length;
  const completedCount = animes.filter((a) => a.status === 'completed').length;
  const watchingCount = animes.filter((a) => a.status === 'watching').length;
  const planCount = animes.filter((a) => a.status === 'plan_to_watch').length;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareDirectUrl)}&bgcolor=0f172a&color=6366f1&margin=2`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Perfil & Lista Pública</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Link Público
                </span>
              </h3>
              <p className="text-xs text-slate-400">Compartilhe sua coleção e progresso de animes com amigos</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-share-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Privacy Switch Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Status da Visibilidade Pública</span>
                {saving && <span className="text-[10px] text-indigo-400 animate-pulse">Salvando...</span>}
              </div>
              <p className="text-xs text-slate-400">
                {isPublic 
                  ? 'Qualquer amigo com seu link pode visualizar sua lista e progresso (somente leitura, sem poder editar).'
                  : 'Sua lista está privada. Amigos com o link não poderão ver seus animes.'}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0">
              <button
                type="button"
                id="btn-set-public-list"
                onClick={() => handleTogglePublic(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isPublic 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Pública</span>
              </button>
              <button
                type="button"
                id="btn-set-private-list"
                onClick={() => handleTogglePublic(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  !isPublic 
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Privada</span>
              </button>
            </div>
          </div>

          {/* Share Tabs: Link Copiável | QR Code | Pré-visualização */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              id="tab-share-link"
              onClick={() => setSelectedShareTab('link')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedShareTab === 'link'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Link de Compartilhamento</span>
            </button>

            <button
              type="button"
              id="tab-share-qr"
              onClick={() => setSelectedShareTab('qr')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedShareTab === 'qr'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>

            <button
              type="button"
              id="tab-share-preview"
              onClick={() => setSelectedShareTab('preview')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedShareTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Como amigos verão</span>
            </button>
          </div>

          {/* TAB 1: Link direto e botões de compartilhamento */}
          {selectedShareTab === 'link' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Link de Compartilhamento Direto */}
              <div className="space-y-2 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Link do Perfil Público</span>
                  </label>
                  {onOpenProfileSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenProfileSettings();
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 cursor-pointer"
                    >
                      Alterar Nick / Perfil
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500 transition-colors">
                  <input
                    type="text"
                    readOnly
                    value={shareDirectUrl}
                    className="flex-1 bg-transparent text-xs text-indigo-300 font-mono px-2 py-1 outline-none select-all font-bold"
                  />
                  <button
                    type="button"
                    id="btn-copy-share-direct-link"
                    onClick={() => handleCopyLink(shareDirectUrl)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Ideal para compartilhar em redes sociais, bio do Instagram, Discord ou enviar para amigos.
                </p>
              </div>

              {/* Botões de Envio Rápido (WhatsApp & Abrir em nova aba) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🎬 Olá! Confira minha lista de animes e progresso:\n${shareDirectUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-sm hover:border-emerald-400 active:scale-95"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>Enviar no WhatsApp</span>
                </a>

                <a
                  href={shareDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <ExternalLink className="w-4 h-4 text-indigo-400" />
                  <span>Abrir Lista em Nova Aba</span>
                </a>
              </div>

              {/* Dica de Segurança e Modo Somente Leitura */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-slate-400 text-xs">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-200 font-semibold">100% Seguro:</strong> Quem abrir este link poderá navegar pelos seus animes, ver notas, estatísticas e conquistas, mas <span className="text-amber-300">não poderá editar ou apagar nada</span> da sua conta.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: QR Code */}
          {selectedShareTab === 'qr' && (
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 animate-in fade-in duration-150 text-center">
              <div className="p-3 bg-slate-900 border-2 border-indigo-500/40 rounded-2xl shadow-xl">
                <img
                  src={qrCodeUrl}
                  alt={`QR Code para ${shareDirectUrl}`}
                  className="w-48 h-48 rounded-xl object-contain"
                />
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="text-xs font-bold text-white">Escaneie com a câmera do celular</p>
                <p className="text-[11px] text-slate-400">
                  Ideal para mostrar na tela para amigos apontarem a câmera e abrirem sua lista instantaneamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyLink(shareDirectUrl)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          )}

          {/* TAB 3: Pré-visualização do Perfil */}
          {selectedShareTab === 'preview' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-3.5 pb-3 border-b border-slate-800">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center border-2 border-indigo-400 shrink-0 shadow-lg">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{userName}</h4>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold shrink-0">
                      Perfil Público
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {totalAnimes} {totalAnimes === 1 ? 'anime na coleção' : 'animes na coleção'}
                  </p>
                </div>
              </div>

              {/* Resumo da Coleção */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-base font-black text-emerald-400 block">{completedCount}</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Concluídos</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-base font-black text-indigo-400 block">{watchingCount}</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Assistindo</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-base font-black text-amber-400 block">{planCount}</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Planejados</span>
                </div>
              </div>

              <div className="text-center pt-2">
                <a
                  href={shareDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-4"
                >
                  <span>Testar e abrir página pública do amigo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate text-slate-300 font-mono text-[11px]">{shareDirectUrl}</span>
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
