import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  FileCode2, 
  Layers, 
  ArrowRightLeft,
  HelpCircle
} from 'lucide-react';
import type { Anime, AnimeFormData } from '../types';
import { exportAnimesToJson, exportAnimesToCsv, importAnimesFromJson, addAnime } from '../services/animeService';
import { parseMyAnimeListXml, parseAniListJson, exportToMyAnimeListXml } from '../services/externalImportExportService';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  animes: Anime[];
  userId: string;
}

type TabType = 'local' | 'external';

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  animes,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('local');
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const malFileInputRef = useRef<HTMLInputElement>(null);
  const anilistFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // --- LOCAL BACKUP ---
  const handleExportJson = () => {
    try {
      exportAnimesToJson(animes);
      setMessage({ text: 'Backup JSON baixado com sucesso!', type: 'success' });
    } catch (e) {
      setMessage({ text: 'Erro ao gerar backup JSON.', type: 'error' });
    }
  };

  const handleExportCsv = () => {
    try {
      exportAnimesToCsv(animes);
      setMessage({ text: 'Planilha CSV exportada com sucesso!', type: 'success' });
    } catch (e) {
      setMessage({ text: 'Erro ao gerar planilha CSV.', type: 'error' });
    }
  };

  const handleLocalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const text = await file.text();
      const count = await importAnimesFromJson(userId, text);
      setMessage({
        text: `Sucesso! ${count} animes foram importados e sincronizados para sua conta.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setMessage({
        text: err.message || 'Erro ao importar backup. Verifique se o arquivo JSON é válido.',
        type: 'error',
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- EXTERNAL PLATFORMS (MAL / ANILIST) ---
  const handleImportMal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const text = await file.text();
      const parsed = parseMyAnimeListXml(text);
      if (parsed.length === 0) {
        throw new Error('Nenhum anime válido encontrado no arquivo XML do MyAnimeList.');
      }

      let count = 0;
      for (const item of parsed) {
        await addAnime(userId, item as AnimeFormData);
        count++;
      }

      setMessage({
        text: `Incrível! ${count} animes importados do MyAnimeList com sucesso para sua conta!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Erro ao importar MAL:', err);
      setMessage({
        text: err.message || 'Erro ao processar arquivo XML do MyAnimeList.',
        type: 'error',
      });
    } finally {
      setImporting(false);
      if (malFileInputRef.current) malFileInputRef.current.value = '';
    }
  };

  const handleImportAniList = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const text = await file.text();
      const parsed = parseAniListJson(text);
      if (parsed.length === 0) {
        throw new Error('Nenhum anime válido encontrado no arquivo JSON do AniList.');
      }

      let count = 0;
      for (const item of parsed) {
        await addAnime(userId, item as AnimeFormData);
        count++;
      }

      setMessage({
        text: `Incrível! ${count} animes importados do AniList com sucesso para sua conta!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Erro ao importar AniList:', err);
      setMessage({
        text: err.message || 'Erro ao processar arquivo JSON do AniList.',
        type: 'error',
      });
    } finally {
      setImporting(false);
      if (anilistFileInputRef.current) anilistFileInputRef.current.value = '';
    }
  };

  const handleExportMal = () => {
    try {
      exportToMyAnimeListXml(animes);
      setMessage({ text: 'Arquivo XML MyAnimeList exportado com sucesso!', type: 'success' });
    } catch (e) {
      setMessage({ text: 'Erro ao gerar arquivo XML do MAL.', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Central de Backup & Migração</h3>
              <p className="text-xs text-slate-400">Exporte, restaure ou migre sua lista de outras plataformas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800/80 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'local'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            💾 Backup Local (WAnime)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('external')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'external'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Migrar MAL / AniList</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {message && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 border ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {activeTab === 'local' ? (
            <>
              {/* Export JSON */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileCode2 className="w-4 h-4 text-indigo-400" />
                    <span>Backup Completo (.JSON)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Salva notas, arcos, capas, histórico e notas de todos os {animes.length} animes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </button>
              </div>

              {/* Export CSV */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Planilha Excel / CSV</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Exporta em formato tabular para abrir no Microsoft Excel ou Google Planilhas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Exportar</span>
                </button>
              </div>

              {/* Import JSON */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Restaurar Backup WAnime (.JSON)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Importa e adiciona todos os animes de um arquivo de backup local salvo anteriormente.
                  </p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleLocalFileChange}
                    className="hidden"
                    id="file-upload-backup"
                  />
                  <label
                    htmlFor="file-upload-backup"
                    className={`px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                      importing ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Importar</span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Info Box */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs flex items-start gap-2.5">
                <ArrowRightLeft className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Migração Direta Sem Perder Nada!</p>
                  <p className="text-[11px] text-indigo-300 mt-0.5">
                    Você pode subir a exportação do MyAnimeList (XML) ou AniList (JSON) e importar todos os seus animes com status, episódios e notas em segundos.
                  </p>
                </div>
              </div>

              {/* Import MyAnimeList XML */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <span>Importar do MyAnimeList (.XML)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Suba o arquivo <code>animelist.xml</code> exportado das configurações do seu perfil no MAL.
                  </p>
                </div>
                <div>
                  <input
                    ref={malFileInputRef}
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    onChange={handleImportMal}
                    className="hidden"
                    id="file-upload-mal"
                  />
                  <label
                    htmlFor="file-upload-mal"
                    className={`px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm ${
                      importing ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Importar MAL</span>
                  </label>
                </div>
              </div>

              {/* Import AniList JSON */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <span>Importar do AniList (.JSON)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Suba o arquivo de exportação export data do AniList em formato JSON.
                  </p>
                </div>
                <div>
                  <input
                    ref={anilistFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportAniList}
                    className="hidden"
                    id="file-upload-anilist"
                  />
                  <label
                    htmlFor="file-upload-anilist"
                    className={`px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm ${
                      importing ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Importar AniList</span>
                  </label>
                </div>
              </div>

              {/* Export to MAL XML format */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Exportar no formato MyAnimeList (.XML)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gera um arquivo compatível para importar sua lista direto no MyAnimeList se desejar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportMal}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Gerar XML</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>Seus dados são criptografados e salvos com segurança</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
