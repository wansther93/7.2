import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, PlusSquare, CheckCircle2, X, Monitor } from 'lucide-react';

interface InstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess?: () => void;
}

export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess,
}) => {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect if already installed / running in standalone
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          if (onInstallSuccess) onInstallSuccess();
          onClose();
        }
      } catch (err) {
        console.error('Error triggering PWA install prompt:', err);
      } finally {
        setIsInstalling(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-white overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900/80 hover:bg-zinc-800 transition-all cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Instalar Aplicativo Nativo</h3>
            <p className="text-xs text-zinc-400">Tenha o WAnime direto na tela inicial</p>
          </div>
        </div>

        {isStandalone ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 my-4">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <p>Você já está usando o aplicativo instalado como app nativo!</p>
          </div>
        ) : isIOS ? (
          /* iOS Instructions */
          <div className="space-y-4 my-4">
            <div className="p-3.5 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl text-xs text-zinc-300 space-y-3">
              <p className="font-semibold text-indigo-300">Como instalar no iPhone / iPad:</p>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <p>Toque no botão de <strong>Compartilhar</strong> (<Share className="w-3.5 h-3.5 inline mx-0.5 text-indigo-400" />) na barra inferior do Safari.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <p>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-indigo-400" />).</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <p>Toque em <strong>"Adicionar"</strong> no topo. Pronto! O ícone aparecerá no seu celular.</p>
              </div>
            </div>
          </div>
        ) : deferredPrompt ? (
          /* Android / Chrome One-Click Install */
          <div className="space-y-4 my-4">
            <p className="text-sm text-zinc-300">
              Instale agora para abrir em tela cheia, sem barra de navegação, com ícone próprio e carregamento instantâneo.
            </p>
            <button
              type="button"
              id="btn-install-pwa-now"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>{isInstalling ? 'Instalando...' : 'Instalar Agora com 1 Clique'}</span>
            </button>
          </div>
        ) : (
          /* Android / PC Generic Instructions */
          <div className="space-y-4 my-4">
            <div className="p-3.5 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl text-xs text-zinc-300 space-y-3">
              <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Monitor className="w-4 h-4" /> No Android ou Computador (Chrome / Edge):
              </p>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <p>Abra o menu do navegador (os <strong>3 pontinhos</strong> ⋮ no canto superior).</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <p>Clique em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
              </div>
            </div>
          </div>
        )}

        {/* Benefits list */}
        <div className="border-t border-zinc-800/80 pt-3.5 mt-2">
          <ul className="text-[12px] text-zinc-400 space-y-1.5">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Funciona sem barra de endereço (tela cheia)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Acesso rápido direto pelo ícone do seu celular</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sincronizado em tempo real na nuvem</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
