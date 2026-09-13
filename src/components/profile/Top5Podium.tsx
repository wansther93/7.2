import React, { useState } from 'react';
import { Crown, Star, Edit3, Plus, Trophy, ImageOff } from 'lucide-react';
import type { Anime } from '../../types';

interface Top5PodiumProps {
  animes: Anime[];
  isEditable?: boolean;
  onEdit?: () => void;
  onSelectAnime?: (anime: Anime) => void;
}

export const Top5Podium: React.FC<Top5PodiumProps> = ({
  animes,
  isEditable = false,
  onEdit,
  onSelectAnime,
}) => {
  // Ordenamento do Pódio Olímpico (Ordem visual: 4º, 2º, 1º, 3º, 5º)
  const podiumSlots = [
    { rank: 4, label: '4º', index: 3, scaleClass: 'scale-90 opacity-90', borderClass: 'border-white/15' },
    { rank: 2, label: '2º', index: 1, scaleClass: 'scale-95 opacity-95', borderClass: 'border-slate-300/60 shadow-lg shadow-slate-400/10' },
    { rank: 1, label: '1º', index: 0, scaleClass: 'scale-105 z-20', isFirst: true, borderClass: 'border-amber-400 shadow-xl shadow-amber-500/25 ring-2 ring-amber-400/40' },
    { rank: 3, label: '3º', index: 2, scaleClass: 'scale-95 opacity-95', borderClass: 'border-amber-600/60 shadow-lg shadow-amber-600/10' },
    { rank: 5, label: '5º', index: 4, scaleClass: 'scale-90 opacity-90', borderClass: 'border-white/15' },
  ];

  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (animeId: string) => {
    setImageErrors((prev) => ({ ...prev, [animeId]: true }));
  };

  return (
    <div className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Luz ambiente dourada suave no centro superior */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Cabeçalho do Pódio */}
      <div className="flex items-center justify-between gap-3 mb-6 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
            <Trophy className="w-4 h-4 fill-slate-950" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              Top 5 Animes Favoritos
            </h3>
            <p className="text-[11px] text-slate-400">
              O pódio de honra dos animes mais marcantes da sua jornada
            </p>
          </div>
        </div>

        {isEditable && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-slate-200 text-xs font-semibold transition-all cursor-pointer select-none active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Gerenciar Top 5</span>
            <span className="sm:hidden">Editar</span>
          </button>
        )}
      </div>

      {/* Container de 5 Colunas Fixo e Fluido (Aspect 2:3, Sem Scroll Horizontal) */}
      <div className="w-full pt-8 sm:pt-10 pb-2 overflow-visible">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 md:gap-3 w-full items-end">
          {podiumSlots.map((slot) => {
            const anime = animes[slot.index];
            const isWinner = slot.isFirst;
            const hasError = anime ? imageErrors[anime.id] : false;

            return (
              <div
                key={`podium-slot-${slot.rank}`}
                className={`flex flex-col items-center justify-end w-full transition-all duration-300 ${slot.scaleClass} relative group`}
              >
                {/* Coroa Dourada Reluzente no 1º Lugar com espaço reservado para não ser cortada */}
                {isWinner && (
                  <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 flex items-center justify-center z-30 pointer-events-none">
                    <div className="relative animate-bounce duration-1000">
                      <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
                    </div>
                  </div>
                )}

                {anime ? (
                  /* Card Proporcional com Aspect Ratio 2:3 e Arte Bem Visível */
                  <div
                    onClick={() => onSelectAnime && onSelectAnime(anime)}
                    title={anime.title}
                    className={`w-full aspect-[2/3] rounded-xl sm:rounded-2xl relative overflow-hidden flex flex-col justify-between p-2 sm:p-2.5 text-center transition-all duration-300 ${
                      onSelectAnime ? 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl' : ''
                    } ${slot.borderClass}`}
                  >
                    {/* Tag da Nota Centralizada no Topo da Capa (sem colidir com o pedestal) */}
                    <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[8px] sm:text-[10px] font-black shadow-lg">
                      <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-300 text-amber-300" />
                      <span>{anime.rating ? Number(anime.rating).toFixed(1) : '—'}</span>
                    </div>

                    {/* Imagem de Capa sem Esticar nem Cortar */}
                    {anime.coverUrl && !hasError ? (
                      <img
                        src={anime.coverUrl}
                        alt={anime.title}
                        referrerPolicy="no-referrer"
                        onError={() => handleImageError(anime.id)}
                        className="absolute inset-0 w-full h-full object-cover object-center brightness-95 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center p-1 sm:p-2 text-slate-500">
                        <ImageOff className="w-4 h-4 sm:w-6 sm:h-6 mb-1 opacity-50" />
                        <span className="text-[8px] sm:text-[10px] text-center line-clamp-2">{anime.title}</span>
                      </div>
                    )}

                    {/* Gradiente Escuro na Base para Contraste e Legibilidade do Título */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />

                    {/* Espaço reservado superior para a tag de nota */}
                    <div className="h-5 pointer-events-none" />

                    {/* Título do Anime no Rodapé do Poster com boa leitura */}
                    <div className="relative z-10 w-full flex flex-col items-center text-center pb-2 sm:pb-3">
                      <span className="text-[10px] sm:text-xs md:text-[13px] font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
                        {anime.title}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Slot Vazio com Design Limpo e Chamada para Ação */
                  <button
                    type="button"
                    onClick={onEdit}
                    disabled={!isEditable}
                    className={`w-full aspect-[2/3] rounded-xl sm:rounded-2xl border-2 border-dashed border-white/15 bg-black/40 hover:bg-white/[0.04] hover:border-amber-400/60 flex flex-col items-center justify-center p-1 sm:p-2 text-center transition-all ${
                      isEditable ? 'cursor-pointer' : 'cursor-default opacity-40'
                    }`}
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/5 flex items-center justify-center mb-1 text-slate-400 group-hover:text-amber-400">
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[9px] sm:text-[11px] font-bold text-slate-300">
                      {slot.label}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-slate-500 mt-0.5">
                      {isEditable ? '+ Add' : 'Vazio'}
                    </span>
                  </button>
                )}

                {/* Pedestal Estilizado com o Número do Rank */}
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl -mt-3 sm:-mt-4 relative z-20 flex items-center justify-center font-black text-[10px] sm:text-xs md:text-sm shadow-xl ${
                    isWinner
                      ? 'bg-gradient-to-b from-amber-300 to-yellow-500 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/40'
                      : slot.rank === 2
                      ? 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-950 ring-2 ring-slate-300 shadow-slate-400/30'
                      : slot.rank === 3
                      ? 'bg-gradient-to-b from-amber-600 to-orange-700 text-white ring-2 ring-amber-600 shadow-orange-500/30'
                      : 'bg-black/90 text-slate-300 border border-white/20'
                  }`}
                >
                  {slot.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
