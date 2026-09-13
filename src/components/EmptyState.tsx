import React from 'react';
import { Tv2, Plus } from 'lucide-react';
import type { FilterStatus } from './StatusTabs';

interface EmptyStateProps {
  currentFilter: FilterStatus;
  searchQuery: string;
  onAddNew: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  currentFilter,
  searchQuery,
  onAddNew,
}) => {
  if (searchQuery) {
    return (
      <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
          <Tv2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Nenhum anime encontrado</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          Não encontramos nenhum anime com o termo "{searchQuery}". Verifique a digitação ou tente outro nome.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800/80 rounded-2xl">
      <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 mb-3.5 shadow-sm">
        <Tv2 className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
        {currentFilter === 'all'
          ? 'Sua lista de animes está vazia'
          : 'Nenhum anime nesta categoria'}
      </h3>
      <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
        {currentFilter === 'all'
          ? 'Cadastre o primeiro anime que você está assistindo para nunca mais esquecer a temporada ou episódio!'
          : 'Nenhum anime encontrado com este status. Você pode adicionar um novo ou alterar o filtro.'}
      </p>

      <button
        id="btn-empty-state-add"
        onClick={onAddNew}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Adicionar Anime Agora</span>
      </button>
    </div>
  );
};
