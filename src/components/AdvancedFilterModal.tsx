import React, { useState, useMemo } from 'react';
import { 
  X, 
  Filter, 
  Building2, 
  Tv, 
  Calendar, 
  BookOpen, 
  Star, 
  RotateCcw, 
  Check, 
  Search 
} from 'lucide-react';
import type { Anime } from '../types';

interface AdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  animes: Anime[];
  selectedStudio: string | null;
  onSelectStudio: (studio: string | null) => void;
  selectedFormat: string | null;
  onSelectFormat: (format: string | null) => void;
  selectedYear: number | null;
  onSelectYear: (year: number | null) => void;
  selectedSource: string | null;
  onSelectSource: (source: string | null) => void;
  minRating: number | null;
  onSelectMinRating: (rating: number | null) => void;
  onResetAll: () => void;
  activeFilterCount: number;
}

export const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  isOpen,
  onClose,
  animes,
  selectedStudio,
  onSelectStudio,
  selectedFormat,
  onSelectFormat,
  selectedYear,
  onSelectYear,
  selectedSource,
  onSelectSource,
  minRating,
  onSelectMinRating,
  onResetAll,
  activeFilterCount,
}) => {
  const [studioSearch, setStudioSearch] = useState('');

  // Collect available options with counts
  const { availableStudios, availableFormats, availableYears, availableSources } = useMemo(() => {
    const studioMap: Record<string, number> = {};
    const formatMap: Record<string, number> = {};
    const yearMap: Record<number, number> = {};
    const sourceMap: Record<string, number> = {};

    animes.forEach((a) => {
      if (a.studio && a.studio.trim()) {
        const s = a.studio.trim();
        studioMap[s] = (studioMap[s] || 0) + 1;
      }
      if (a.format && a.format.trim()) {
        const f = a.format.trim();
        formatMap[f] = (formatMap[f] || 0) + 1;
      }
      if (a.releaseYear && a.releaseYear > 1960) {
        yearMap[a.releaseYear] = (yearMap[a.releaseYear] || 0) + 1;
      }
      if (a.source && a.source.trim()) {
        const src = a.source.trim();
        sourceMap[src] = (sourceMap[src] || 0) + 1;
      }
    });

    const studios = Object.entries(studioMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .map(([name, count]) => ({ name, count }));

    const formats = Object.entries(formatMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .map(([name, count]) => ({ name, count }));

    const years = Object.entries(yearMap)
      .map(([yearStr, count]) => ({ year: Number(yearStr), count }))
      .sort((a, b) => b.year - a.year);

    const sources = Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .map(([name, count]) => ({ name, count }));

    return {
      availableStudios: studios,
      availableFormats: formats,
      availableYears: years,
      availableSources: sources,
    };
  }, [animes]);

  const filteredStudios = useMemo(() => {
    if (!studioSearch.trim()) return availableStudios;
    const q = studioSearch.toLowerCase().trim();
    return availableStudios.filter((s) => s.name.toLowerCase().includes(q));
  }, [availableStudios, studioSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Filtros Avançados & Refinados</span>
                {activeFilterCount > 0 && (
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500 text-white font-black">
                    {activeFilterCount} {activeFilterCount === 1 ? 'ativo' : 'ativos'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Filtre por estúdio, formato, ano, origem e nota</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* 1. Estúdio de Animação */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Estúdio de Animação</span>
              </label>
              {selectedStudio && (
                <button
                  type="button"
                  onClick={() => onSelectStudio(null)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            {availableStudios.length > 6 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar estúdio na sua lista..."
                  value={studioSearch}
                  onChange={(e) => setStudioSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => onSelectStudio(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  selectedStudio === null
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                Todos os Estúdios
              </button>

              {filteredStudios.map(({ name, count }) => {
                const isSelected = selectedStudio === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onSelectStudio(isSelected ? null : name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 font-bold shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <span>{name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-indigo-900 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              {availableStudios.length === 0 && (
                <span className="text-xs text-slate-500 py-1">
                  Nenhum estúdio detectado nos animes cadastrados.
                </span>
              )}
            </div>
          </div>

          {/* 2. Formato de Mídia (TV, Filme, OVA, ONA, Especial) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-emerald-400" />
                <span>Formato de Mídia</span>
              </label>
              {selectedFormat && (
                <button
                  type="button"
                  onClick={() => onSelectFormat(null)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onSelectFormat(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  selectedFormat === null
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                Todos os Formatos
              </button>

              {availableFormats.map(({ name, count }) => {
                const isSelected = selectedFormat === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onSelectFormat(isSelected ? null : name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-md shadow-emerald-600/20'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <span>{name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-emerald-900 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Ano de Lançamento */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Ano de Lançamento</span>
              </label>
              {selectedYear && (
                <button
                  type="button"
                  onClick={() => onSelectYear(null)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => onSelectYear(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  selectedYear === null
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-300'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                Todos os Anos
              </button>

              {availableYears.map(({ year, count }) => {
                const isSelected = selectedYear === year;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => onSelectYear(isSelected ? null : year)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <span>{year}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Origem / Fonte da História */}
          {availableSources.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Origem da Obra</span>
                </label>
                {selectedSource && (
                  <button
                    type="button"
                    onClick={() => onSelectSource(null)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onSelectSource(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selectedSource === null
                      ? 'bg-cyan-600 text-white border-cyan-400'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  Todas as Fontes
                </button>

                {availableSources.map(({ name, count }) => {
                  const isSelected = selectedSource === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onSelectSource(isSelected ? null : name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-md shadow-cyan-600/20'
                          : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <span>{name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-cyan-900 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Avaliação Mínima (1 a 10) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Avaliação Mínima (1 a 10)</span>
              </label>
              {minRating !== null && (
                <button
                  type="button"
                  onClick={() => onSelectMinRating(null)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => onSelectMinRating(null)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                  minRating === null
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-300'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                Todas as Notas
              </button>

              {[6, 7, 8, 9, 10].map((score) => {
                const isSelected = minRating === score;
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => onSelectMinRating(isSelected ? null : score)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-300 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <span>{score}{score < 10 ? '+' : ' (Max)'}</span>
                    <Star className={`w-3 h-3 ${isSelected ? 'fill-slate-950 text-slate-950' : 'fill-amber-400 text-amber-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with Reset and Apply Buttons */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onResetAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetar Filtros</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar Filtros</span>
          </button>
        </div>
      </div>
    </div>
  );
};
