import React, { useState } from 'react';
import { X, Search, Crown, Star, Trash2, Check, ArrowRight } from 'lucide-react';
import type { Anime } from '../../types';

interface EditTop5ModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAnimes: Anime[];
  currentTop5Ids: string[];
  onSave: (newTop5Ids: string[]) => Promise<void>;
}

export const EditTop5Modal: React.FC<EditTop5ModalProps> = ({
  isOpen,
  onClose,
  userAnimes,
  currentTop5Ids,
  onSave,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const list = [...currentTop5Ids];
    while (list.length < 5) list.push('');
    return list.slice(0, 5);
  });

  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSelectAnimeForSlot = (animeId: string) => {
    if (activeSlotIndex === null) return;
    setSelectedIds((prev) => {
      const copy = [...prev];
      // Se já estava em outro slot, limpa o outro slot
      const existingIdx = copy.indexOf(animeId);
      if (existingIdx !== -1 && existingIdx !== activeSlotIndex) {
        copy[existingIdx] = '';
      }
      copy[activeSlotIndex] = animeId;
      return copy;
    });
    setActiveSlotIndex(null);
    setSearchQuery('');
  };

  const handleRemoveSlot = (index: number) => {
    setSelectedIds((prev) => {
      const copy = [...prev];
      copy[index] = '';
      return copy;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Salva apenas os IDs válidos preenchidos
      const valid = selectedIds.filter(Boolean);
      await onSave(valid);
      onClose();
    } catch (e) {
      console.error('Erro ao salvar Top 5:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Animes filtrados para escolha
  const filteredAnimes = userAnimes.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0b0e18] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">Editar TOP 5 do Perfil</h3>
              <p className="text-xs text-slate-400">Escolha os 5 animes supremos da sua coleção</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeSlotIndex === null ? (
            /* Lista dos 5 Slots */
            <div className="space-y-2.5">
              {[0, 1, 2, 3, 4].map((index) => {
                const animeId = selectedIds[index];
                const anime = userAnimes.find((a) => a.id === animeId);
                const rank = index + 1;

                return (
                  <div
                    key={`slot-${index}`}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      index === 0
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Número do Pódio */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          index === 0
                            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                            : index === 1
                            ? 'bg-indigo-300 text-slate-950'
                            : index === 2
                            ? 'bg-orange-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        #{rank}
                      </div>

                      {/* Anime Info ou Vazio */}
                      {anime ? (
                        <div className="flex items-center gap-2.5 min-w-0">
                          {anime.coverUrl ? (
                            <img
                              src={anime.coverUrl}
                              alt={anime.title}
                              referrerPolicy="no-referrer"
                              className="w-9 h-12 object-cover rounded-lg shrink-0 border border-white/10"
                            />
                          ) : (
                            <div className="w-9 h-12 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                              Anime
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-white block truncate">
                              {anime.title}
                            </span>
                            <span className="text-[11px] text-amber-400 flex items-center gap-1 font-semibold">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {anime.rating ? Number(anime.rating).toFixed(1) : 'Sem nota'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium italic">
                          Slot vazio — clique em Escolher
                        </span>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 shrink-0">
                      {anime && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(index)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                          title="Remover do slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlotIndex(index);
                          setSearchQuery('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer select-none"
                      >
                        {anime ? 'Trocar' : 'Escolher'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Sub-tela: Selecionar anime da coleção para o Slot */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">
                  Selecione o anime para a posição #{activeSlotIndex + 1}:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSlotIndex(null)}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Voltar
                </button>
              </div>

              {/* Busca */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar na sua coleção..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>

              {/* Lista de animes disponíveis */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {filteredAnimes.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    Nenhum anime encontrado na sua coleção.
                  </p>
                ) : (
                  filteredAnimes.map((anime) => {
                    const isAlreadyPicked = selectedIds.includes(anime.id);

                    return (
                      <div
                        key={anime.id}
                        onClick={() => handleSelectAnimeForSlot(anime.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none ${
                          isAlreadyPicked
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.08] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {anime.coverUrl ? (
                            <img
                              src={anime.coverUrl}
                              alt={anime.title}
                              referrerPolicy="no-referrer"
                              className="w-8 h-10 object-cover rounded-lg shrink-0 border border-white/10"
                            />
                          ) : (
                            <div className="w-8 h-10 rounded-lg bg-slate-800 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">
                              {anime.title}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ⭐ {anime.rating ? Number(anime.rating).toFixed(1) : 'Sem nota'} • {anime.status}
                            </span>
                          </div>
                        </div>

                        {isAlreadyPicked ? (
                          <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30">
                            Já no Top 5
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                            Escolher <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Top 5'}
          </button>
        </div>
      </div>
    </div>
  );
};
