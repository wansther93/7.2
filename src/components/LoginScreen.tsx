import React, { useState } from 'react';
import { 
  Tv, 
  ShieldCheck, 
  Zap, 
  AlertCircle, 
  Layers, 
  Image as ImageIcon,
  Copy,
  Check,
  Eye,
  ExternalLink
} from 'lucide-react';
import { loginWithGoogle } from '../lib/firebase';
import { copyToClipboard } from '../lib/clipboard';

interface LoginScreenProps {
  onEnterGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onEnterGuest }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  const parseAuthError = (err: any): string => {
    const code = err?.code || '';
    const message = err?.message || '';

    if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
      setIsUnauthorizedDomain(true);
      return `O domínio atual (${currentHostname}) precisa ser adicionado à lista de domínios autorizados no Firebase Console (Authentication > Configurações > Domínios autorizados).`;
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'A janela de login com o Google foi fechada antes de concluir.';
    }
    if (code === 'auth/popup-blocked') {
      return 'O navegador bloqueou a janela pop-up do Google. Por favor, permita pop-ups para este site ou abra o app em uma nova aba.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Falha na conexão do pop-up de login. Caso esteja em visualização incorporada (iframe), clique no botão abaixo para abrir em uma nova aba!';
    }
    return message || 'Não foi possível concluir o login com o Google. Tente novamente.';
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    setIsUnauthorizedDomain(false);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Erro ao fazer login com o Google:', err);
      setErrorMsg(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setErrorMsg(null);
    if (onEnterGuest) {
      onEnterGuest();
    }
  };

  const handleCopyDomain = async () => {
    if (!currentHostname) return;
    const ok = await copyToClipboard(currentHostname);
    if (ok) {
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 3000);
    }
  };

  const handleOpenInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
      {/* Top background accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-indigo-600/15 blur-[130px] pointer-events-none rounded-full" />

      {/* Main Container */}
      <div className="w-full max-w-md my-auto relative z-10 flex flex-col items-center">
        {/* App Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-4 ring-4 ring-indigo-500/20">
          <Tv className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-center tracking-tight text-white mb-2">
          WAnime List
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm text-center max-w-xs mb-6">
          Seu organizador definitivo de animes, temporadas, arcos e episódios com sincronização em nuvem.
        </p>

        {/* Unauthorized Domain Resolution Banner */}
        {isUnauthorizedDomain && (
          <div className="w-full mb-5 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-3">
            <div className="flex items-start gap-2.5 text-amber-300 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>Domínio não autorizado no Google Auth</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              O Firebase Auth requer que o domínio atual seja incluído na lista de domínios autorizados do seu projeto Firebase para liberar o login Google:
            </p>
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-[11px] text-amber-200">
              <span className="truncate">{currentHostname}</span>
              <button
                id="btn-copy-domain"
                type="button"
                onClick={handleCopyDomain}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors font-sans text-[11px] font-bold cursor-pointer"
              >
                {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDomain ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <p><strong>Passo a passo no Firebase:</strong></p>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-300 pl-1">
                <li>Abra o <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-2.5 h-2.5" /></a></li>
                <li>Vá em <strong>Authentication</strong> &gt; aba <strong>Settings (Configurações)</strong></li>
                <li>Clique em <strong>Authorized domains (Domínios autorizados)</strong> &gt; <strong>Adicionar domínio</strong> e cole o link acima.</li>
              </ol>
            </div>
          </div>
        )}

        {/* General Error Message */}
        {errorMsg && !isUnauthorizedDomain && (
          <div className="w-full mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
            {isInsideIframe && (
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="self-start mt-1 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer border border-rose-500/30"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir App em Nova Aba</span>
              </button>
            )}
          </div>
        )}

        {/* Login Card */}
        <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/50">
          <div className="space-y-3.5 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5 border border-indigo-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-200">Temporadas & Arcos de Anime</h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Gerencie arcos (ex: Arco de Alabasta, Wano) ou temporadas numéricas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0 mt-0.5 border border-purple-500/20">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-200">Capas e Sinopses Automáticas</h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Busca de dados gratuita, capas em alta definição e tradução.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-200">100% Privado por Usuário</h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sua conta Google isola sua lista de animes com segurança na nuvem.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5 border border-amber-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-200">Gratuito para Sempre (R$ 0,00)</h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sem taxas, sem planos pagos, sem limites escondidos.
                </p>
              </div>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            id="btn-login-google"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-950 font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer mb-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            )}
            <span className="text-xs sm:text-sm font-semibold">
              {loading ? 'Conectando ao Google...' : 'Entrar com Conta Google'}
            </span>
          </button>

          {isInsideIframe && (
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60 mb-3"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Abrir em Nova Aba (Evita bloqueios de pop-up)</span>
            </button>
          )}

          {/* Visitor Mode Button */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              id="btn-login-guest"
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 active:scale-[0.99] text-slate-300 hover:text-white font-medium py-3 px-4 rounded-xl transition-all border border-slate-700/60 cursor-pointer text-xs group disabled:opacity-50"
            >
              <Eye className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>Explorar como Visitante (Modo Demonstração)</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-1.5">
              Conheça a interface, lançamentos, notícias e estatísticas sem precisar fazer login.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-500 relative z-10">
        WAnime List • Seu anime tracker na nuvem com custo zero.
      </footer>
    </div>
  );
};





