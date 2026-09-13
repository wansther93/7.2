import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Search,
  Link2,
  Film,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Copy,
  ExternalLink,
  Plus,
  Tv,
  HelpCircle,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import {
  searchAnimeByImageFile,
  searchAnimeByImageUrl,
  formatTime,
  TraceMoeMatch,
} from '../services/traceMoeService';
import type { Anime } from '../types';

interface ImageAnimeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAnimeForAdd?: (animeTitle: string) => void;
  onOpenDetails?: (animeTitle: string) => void;
}

export const ImageAnimeSearchModal: React.FC<ImageAnimeSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectAnimeForAdd,
  onOpenDetails,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TraceMoeMatch[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suporte a colar print da área de transferência (Ctrl + V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setSelectedImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSearch = async () => {
    setError(null);
    setResults([]);

    if (activeTab === 'upload') {
      if (!selectedFile) {
        setError('Por favor, selecione ou cole uma imagem para pesquisar.');
        return;
      }
      setLoading(true);
      try {
        const matches = await searchAnimeByImageFile(selectedFile);
        if (matches.length === 0) {
          setError('Nenhum anime correspondente foi encontrado para esta imagem.');
        } else {
          setResults(matches);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao identificar anime por imagem.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!imageUrlInput.trim()) {
        setError('Por favor, digite ou cole a URL direta de uma imagem.');
        return;
      }
      setLoading(true);
      try {
        const matches = await searchAnimeByImageUrl(imageUrlInput.trim());
        if (matches.length === 0) {
          setError('Nenhum anime correspondente foi encontrado para esta URL.');
        } else {
          setResults(matches);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao identificar anime pela URL informada.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCopyInfo = (match: TraceMoeMatch, index: number) => {
    const title = match.title?.romaji || match.title?.english || match.filename;
    const text = `Anime: ${title} | Episódio: ${match.episode || 'N/A'} | Minuto: ${formatTime(match.from)}`;
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Qual é esse Anime? (Busca por Imagem)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  trace.moe
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Envie um print ou screenshot para descobrir o anime, episódio e minuto exato da cena.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Tabs: Upload vs URL */}
          <div className="flex gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Enviar Imagem ou Colar (Ctrl+V)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('url');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Link de Imagem</span>
            </button>
          </div>

          {/* Upload Area */}
          {activeTab === 'upload' ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-950/40 scale-[0.99]'
                  : selectedImagePreview
                  ? 'border-indigo-500/40 bg-slate-950/60 hover:border-indigo-400'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {selectedImagePreview ? (
                <div className="space-y-3">
                  <div className="relative inline-block max-h-48 rounded-2xl overflow-hidden border border-indigo-500/30 shadow-lg">
                    <img
                      src={selectedImagePreview}
                      alt="Preview da cena"
                      className="max-h-48 w-auto object-contain mx-auto"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      Trocar Imagem
                    </div>
                  </div>
                  <p className="text-xs text-indigo-300 font-medium">
                    {selectedFile?.name} (Clique para trocar ou aperte Ctrl+V com novo print)
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Arraste ou clique para selecionar uma imagem
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Dica: Você pode tirar um print da cena e simplesmente apertar <strong className="text-indigo-300">Ctrl + V</strong> nesta tela!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>URL Direta da Imagem / Screenshot</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://exemplo.com/cena-de-anime.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              type="button"
              id="btn-search-trace-moe"
              onClick={handleSearch}
              disabled={loading || (activeTab === 'upload' && !selectedFile) || (activeTab === 'url' && !imageUrlInput.trim())}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analisando frames da cena...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Identificar Cena de Anime</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-2.5 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Search className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Resultados Encontrados ({results.length})</span>
                </h4>
                <span className="text-[11px] text-slate-400">Ordenado por similaridade</span>
              </div>

              <div className="space-y-3">
                {results.slice(0, 5).map((match, idx) => {
                  const bestTitle = match.title?.romaji || match.title?.english || match.title?.native || match.filename;
                  const similarityPercent = (match.similarity * 100).toFixed(1);
                  const isHighMatch = match.similarity >= 0.85;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        idx === 0
                          ? 'bg-indigo-950/30 border-indigo-500/40 shadow-lg shadow-indigo-950/50'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Video / Snapshot Preview */}
                        <div className="sm:w-48 shrink-0 space-y-1.5">
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                            {match.videoUrl ? (
                              <video
                                src={match.videoUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={match.imageUrl}
                                alt={bestTitle}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>{formatTime(match.from)}</span>
                            <span>{formatTime(match.to)}</span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 space-y-2.5 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h5 className="text-sm font-bold text-white truncate hover:text-indigo-300 transition-colors">
                                {bestTitle}
                              </h5>
                              {match.title?.english && match.title.english !== bestTitle && (
                                <p className="text-xs text-slate-400 truncate">
                                  {match.title.english}
                                </p>
                              )}
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 flex items-center gap-1 ${
                                isHighMatch
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{similarityPercent}%</span>
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1">
                              <Film className="w-3 h-3 text-indigo-400" />
                              <span>Episódio: <strong>{match.episode || 'Filme / Especial'}</strong></span>
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-400" />
                              <span>Momento: <strong>{formatTime(match.from)}</strong></span>
                            </span>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {onSelectAnimeForAdd && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onSelectAnimeForAdd(bestTitle);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Adicionar à Lista</span>
                              </button>
                            )}

                            {onOpenDetails && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenDetails(bestTitle);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Tv className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Ver Detalhes</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCopyInfo(match, idx)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border border-slate-800"
                            >
                              {copiedId === idx ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedId === idx ? 'Copiado!' : 'Copiar Info'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Alimentado por trace.moe & AniList • 100% Gratuito
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
