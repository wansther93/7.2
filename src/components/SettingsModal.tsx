import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  User as UserIcon, 
  Camera, 
  Bell, 
  BellRing, 
  BellOff, 
  LogOut, 
  Sun, 
  Moon, 
  Share2, 
  DownloadCloud, 
  Smartphone, 
  Send, 
  Image, 
  CheckCircle2, 
  AlertCircle, 
  Lock,
  ChevronRight,
  Shield,
  HelpCircle
} from 'lucide-react';
import type { User } from '../lib/firebase';
import {
  getNotificationPermission,
  requestNotificationPermission,
  isEpisodeNotificationEnabled,
  setEpisodeNotificationEnabled,
  sendTestNotification
} from '../services/notificationService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isGuestMode?: boolean;
  onLoginGoogle?: () => void;
  customAvatarUrl?: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenAvatarModal: () => void;
  onLogout: () => void;
  onOpenBackup: () => void;
  onOpenInstallModal?: () => void;
  onOpenShareModal?: () => void;
  onOpenImageSearch?: () => void;
  onOpenSocialCard?: () => void;
  otakuLevel?: {
    level: number;
    title?: string;
    totalXp: number;
    progressPercent: number;
  };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  isGuestMode = false,
  onLoginGoogle,
  customAvatarUrl,
  theme = 'dark',
  onToggleTheme,
  onOpenAvatarModal,
  onLogout,
  onOpenBackup,
  onOpenInstallModal,
  onOpenShareModal,
  onOpenImageSearch,
  onOpenSocialCard,
  otakuLevel,
}) => {
  const [notifEnabled, setNotifEnabled] = useState(() => isEpisodeNotificationEnabled());
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [testSuccess, setTestSuccess] = useState(false);
  const [showNotifDetails, setShowNotifDetails] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotifEnabled(isEpisodeNotificationEnabled());
      setPermissionStatus(getNotificationPermission());
      setTestSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermissionStatus(perm);
    if (perm === 'granted') {
      setEpisodeNotificationEnabled(true);
      setNotifEnabled(true);
      sendTestNotification();
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 3000);
    }
  };

  const handleToggleNotif = () => {
    if (notifEnabled) {
      setEpisodeNotificationEnabled(false);
      setNotifEnabled(false);
    } else {
      if (getNotificationPermission() === 'granted') {
        setEpisodeNotificationEnabled(true);
        setNotifEnabled(true);
      } else {
        handleRequestPermission();
      }
    }
  };

  const handleSendTest = () => {
    const ok = sendTestNotification();
    if (ok) {
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 3000);
    }
  };

  const avatarImage = customAvatarUrl || user?.photoURL;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#0a0a0e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Compacto */}
        <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
              Configurações & Ajustes
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Compacto, sem scroll */}
        <div className="p-3.5 space-y-2.5 text-xs">
          
          {/* SEÇÃO 1: PERFIL & CONTA */}
          <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5 text-indigo-300">
                <UserIcon className="w-3 h-3 text-indigo-400" />
                Perfil & Conta
              </span>
              {otakuLevel && !isGuestMode && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  Nível {otakuLevel.level} ({otakuLevel.totalXp} XP)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/20 bg-indigo-950">
                {avatarImage ? (
                  <img src={avatarImage} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-indigo-300 font-bold">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'W'}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="font-bold text-white block truncate text-xs">
                  {isGuestMode ? 'Modo Visitante' : user?.displayName || 'Usuário Otaku'}
                </span>
                <span className="text-[9.5px] text-slate-400 block truncate">
                  {isGuestMode ? 'Demonstração local' : user?.email || 'Sincronizado na nuvem'}
                </span>
              </div>

              {isGuestMode && onLoginGoogle ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLoginGoogle();
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-black text-[10.5px] transition-all cursor-pointer shrink-0 shadow-md"
                >
                  Entrar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAvatarModal();
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[10.5px] font-bold transition-colors cursor-pointer shrink-0 border border-white/10 flex items-center gap-1"
                >
                  <Camera className="w-3 h-3 text-pink-400" />
                  <span>Foto</span>
                </button>
              )}
            </div>

            {/* Linha de Notificações de Episódios */}
            <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border ${
                  notifEnabled ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-white/5'
                }`}>
                  {notifEnabled ? <BellRing className="w-3 h-3 text-amber-400" /> : <BellOff className="w-3 h-3" />}
                </div>
                <span className="font-bold text-white text-[10.5px] truncate">Avisos de Episódios</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {notifEnabled && (
                  <button
                    type="button"
                    onClick={handleSendTest}
                    title="Testar notificação"
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer transition-colors"
                  >
                    <Send className="w-2.5 h-2.5 text-indigo-400" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleToggleNotif}
                  className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black transition-all cursor-pointer ${
                    notifEnabled
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {notifEnabled ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            </div>
            {testSuccess && (
              <p className="text-[9.5px] text-emerald-400 font-bold text-center">
                ✓ Notificação enviada!
              </p>
            )}
          </div>

          {/* SEÇÃO 2: RECURSOS RÁPIDOS */}
          <div className="bg-[#111116] border border-white/[0.06] rounded-2xl p-2.5 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
              Recursos & Ferramentas
            </span>

            <div className="grid grid-cols-2 gap-1.5">
              {/* Instalar Aplicativo (PWA) */}
              {onOpenInstallModal && (
                <button
                  type="button"
                  id="btn-settings-install-pwa"
                  onClick={() => {
                    onClose();
                    onOpenInstallModal();
                  }}
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 transition-all text-left cursor-pointer shadow-xs col-span-2"
                >
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-[10.5px] font-bold truncate">Instalar Aplicativo (PWA)</span>
                </button>
              )}

              {/* Tema */}
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 transition-all text-left cursor-pointer"
                >
                  {theme === 'light' ? <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  <span className="text-[10.5px] font-bold truncate">Tema {theme === 'light' ? 'Claro' : 'Escuro'}</span>
                </button>
              )}

              {/* Compartilhar Lista */}
              {onOpenShareModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenShareModal();
                  }}
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 transition-all text-left cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[10.5px] font-bold truncate">Compartilhar</span>
                </button>
              )}

              {/* Identificar Cena (Trace.moe) */}
              {onOpenImageSearch && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenImageSearch();
                  }}
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 transition-all text-left cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[10.5px] font-bold truncate">Achar Cena</span>
                </button>
              )}

              {/* Gerar Card Social */}
              {onOpenSocialCard && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSocialCard();
                  }}
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 transition-all text-left cursor-pointer"
                >
                  <Image className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="text-[10.5px] font-bold truncate">Card Social</span>
                </button>
              )}
            </div>
          </div>

          {/* SEÇÃO 3: BACKUP & CONTA */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* Backup & Migração */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBackup();
              }}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#111116] hover:bg-white/5 border border-white/5 transition-all cursor-pointer text-slate-200"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-bold text-[10.5px]">Backup / Sync</span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold transition-all cursor-pointer text-[10.5px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isGuestMode ? 'Sair do Convidado' : 'Desconectar'}</span>
            </button>
          </div>

        </div>

        {/* Footer Compacto */}
        <div className="px-4 py-2 border-t border-white/[0.08] bg-black/50 flex items-center justify-between text-[9.5px] text-slate-400">
          <span>WAnime List</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer text-[10.5px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
