import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { Anime } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  anime: Anime | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  anime,
  onClose,
  onConfirm,
  loading,
}) => {
  if (!isOpen || !anime) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5">
        <div className="flex items-center gap-3 text-rose-400 mb-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Excluir Anime?</h3>
            <p className="text-xs text-slate-400">Esta ação não pode ser desfeita.</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 my-3">
          Tem certeza de que deseja remover <strong className="text-white">"{anime.title}"</strong> da sua lista?
        </p>

        <div className="flex items-center justify-end gap-2 mt-4 pt-2">
          <button
            type="button"
            id="btn-cancel-delete"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="btn-confirm-delete"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-sm shadow-rose-600/30 cursor-pointer"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>Confirmar Exclusão</span>
          </button>
        </div>
      </div>
    </div>
  );
};
