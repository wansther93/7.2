import React from 'react';
import { Lock, X, Tv, ShieldCheck, Cloud, ArrowRight } from 'lucide-react';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginGoogle: () => void;
  title?: string;
  description?: string;
  actionName?: string;
}

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  isOpen,
  onClose,
  onLoginGoogle,
  title = 'Crie sua conta para continuar',
  description = 'O modo visitante é apenas demonstrativo para conhecer a interface. Para adicionar animes à sua lista, salvar seu progresso na nuvem, dar notas, personalizar seu perfil e interagir com a comunidade, faça login com sua Conta Google.',
  actionName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-750 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-lg">
          <Lock className="w-6 h-6" />
        </div>

        {/* Action Badge if specified */}
        {actionName && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold mb-2.5">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Ação restrita: {actionName}</span>
          </div>
        )}

        {/* Title & Desc */}
        <h3 className="text-lg font-black text-white tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
          {description}
        </p>

        {/* Benefits List */}
        <div className="space-y-2.5 p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl mb-6 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Sincronização em nuvem e backup automático</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Tv className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Controle total de episódios, notas e arcos</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Perfil público e mural da comunidade</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLoginGoogle();
            }}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-950 font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer"
          >
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
            <span className="text-xs sm:text-sm font-bold">Entrar com Conta Google</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-center text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Continuar explorando como visitante
          </button>
        </div>
      </div>
    </div>
  );
};
