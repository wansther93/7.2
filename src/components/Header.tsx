import React, { useState } from 'react';
import { 
  Tv, 
  Settings, 
  Search, 
  Camera 
} from 'lucide-react';
import type { User } from '../lib/firebase';
import bannerImg from '../assets/images/banner-1.jpg';
import { SettingsModal } from './SettingsModal';

interface HeaderProps {
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
  onOpenCommandPalette?: () => void;
  watchingCount: number;
  totalCount: number;
  otakuLevel?: {
    level: number;
    title?: string;
    rankTitle?: string;
    totalXp: number;
    progressPercent: number;
    currentLevelXp?: number;
    nextLevelXpRequired?: number;
  };
}

export const Header: React.FC<HeaderProps> = ({
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
  onOpenCommandPalette,
  otakuLevel,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const avatarImage = customAvatarUrl || user?.photoURL;

  return (
    <>
      <header className="w-full shadow-2xl bg-black select-none relative">
        {/* Banner Compacto Oficial (~40% de redução na altura) com fusão suave no fundo */}
        <div className="relative w-full h-[56px] sm:h-[68px] md:h-[76px] flex items-center justify-between bg-black overflow-hidden">
          
          {/* Imagem do Banner Centralizada e Proporcional */}
          <div className="absolute inset-0 flex items-center justify-center bg-black pointer-events-none overflow-hidden">
            <img
              src={bannerImg}
              alt="WAnime List Official Banner"
              className="w-full h-full object-contain object-center filter drop-shadow-md select-none"
            />
          </div>

          {/* Gradientes sutis nas bordas laterais para contraste com os controles */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 pointer-events-none" />

          {/* Gradiente inferior suave para fusão fluida com o fundo escuro (sem linhas) */}
          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black to-transparent pointer-events-none" />

          {/* Controles Sobrepostos no Banner */}
          <div className="relative z-10 w-full max-w-6xl mx-auto px-2 sm:px-4 md:px-6 flex items-center justify-between pointer-events-none">
            
            {/* Lado Esquerdo: Avatar Compacto com Tag de Nível e Barra de XP Flutuante */}
            <div className="pointer-events-auto shrink-0 flex items-center gap-2">
              <div className="flex flex-col items-center shrink-0 w-10 sm:w-11 md:w-11">
                <div className="relative w-full aspect-square">
                  <button
                    type="button"
                    id="btn-profile-avatar"
                    onClick={onOpenAvatarModal}
                    title={isGuestMode ? 'Modo Visitante (Demonstração)' : 'Editar perfil & foto'}
                    className="relative group w-full h-full rounded-xl overflow-hidden shrink-0 border-2 border-white/70 hover:border-indigo-400 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-black/90 cursor-pointer transition-all active:scale-95 bg-black/80 backdrop-blur-md"
                  >
                    {avatarImage ? (
                      <img
                        src={avatarImage}
                        alt={user?.displayName || 'Visitante'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Camera className="w-3.5 h-3.5" />
                    </div>

                    {/* Tag de Level (Texto sutil no canto superior esquerdo sem container amarelo pesado) */}
                    {otakuLevel && !isGuestMode && (
                      <div
                        className="absolute top-0.5 left-0.5 z-30 px-0.5 text-[8px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] flex items-center justify-center leading-none pointer-events-none select-none"
                        title={`Nível ${otakuLevel.level}`}
                      >
                        Lv.{otakuLevel.level}
                      </div>
                    )}
                  </button>
                </div>

                {/* Barra de XP e Texto de XP Flutuantes (Limpos, sem fundo cinza) */}
                {isGuestMode ? (
                  <div className="w-full mt-0.5 text-center">
                    <span className="text-[7.5px] text-amber-300 font-bold block leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Visitante</span>
                  </div>
                ) : otakuLevel ? (
                  <div
                    onClick={onOpenAvatarModal}
                    className="w-full mt-0.5 cursor-pointer transition-transform hover:scale-105 flex flex-col items-center justify-center"
                    title={`${otakuLevel.totalXp} XP (${otakuLevel.progressPercent}% para o próximo nível)`}
                  >
                    <span className="text-[8px] font-mono text-amber-300 font-black leading-none tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                      {otakuLevel.totalXp >= 10000 ? `${(otakuLevel.totalXp / 1000).toFixed(1)}k` : `${otakuLevel.totalXp}`}
                    </span>
                    <div className="w-full h-[3px] bg-black/70 rounded-full overflow-hidden mt-0.5 border border-white/25 shadow-xs">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-indigo-400 rounded-full"
                        style={{ width: `${otakuLevel.progressPercent}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Lado Direito: Apenas Login (se visitante) + Atalho de Busca + Botão Engrenagem */}
            <div className="pointer-events-auto shrink-0 flex items-center gap-1.5 sm:gap-2">
              
              {/* Botão de Login Google para Visitantes */}
              {isGuestMode && onLoginGoogle && (
                <button
                  type="button"
                  id="btn-header-login-google"
                  onClick={onLoginGoogle}
                  className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-black text-[10px] sm:text-xs transition-all flex items-center gap-1 shadow-lg cursor-pointer active:scale-95"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="hidden xs:inline">Entrar</span>
                </button>
              )}

              {/* Busca Rápida (Command Palette) em telas maiores */}
              {onOpenCommandPalette && (
                <button
                  type="button"
                  id="btn-header-command-palette"
                  onClick={onOpenCommandPalette}
                  title="Busca Rápida (Ctrl + K / ⌘K)"
                  className="hidden md:flex p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-black/85 hover:bg-slate-900 border border-white/20 hover:border-indigo-400 text-slate-300 hover:text-white backdrop-blur-md transition-all items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer active:scale-95"
                >
                  <Search className="w-3.5 h-3.5 text-indigo-400" />
                  <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400">
                    ⌘K
                  </kbd>
                </button>
              )}

              {/* Botão Único de Configurações (Engrenagem) */}
              <button
                id="btn-header-menu"
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                title="Configurações, Notificações, Backup e Conta"
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-black/85 hover:bg-slate-900 border border-white/20 hover:border-indigo-400 text-white backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-bold shadow-lg cursor-pointer active:scale-95"
              >
                <Settings className="w-4 h-4 text-indigo-400 transition-transform hover:rotate-45" />
                <span className="hidden sm:inline text-xs font-medium">Ajustes</span>
              </button>

            </div>
          </div>
        </div>
      </header>

      {/* Modal Unificado de Configurações */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        isGuestMode={isGuestMode}
        onLoginGoogle={onLoginGoogle}
        customAvatarUrl={customAvatarUrl}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onOpenAvatarModal={onOpenAvatarModal}
        onLogout={onLogout}
        onOpenBackup={onOpenBackup}
        onOpenInstallModal={onOpenInstallModal}
        onOpenShareModal={onOpenShareModal}
        onOpenImageSearch={onOpenImageSearch}
        onOpenSocialCard={onOpenSocialCard}
        otakuLevel={otakuLevel}
      />
    </>
  );
};
