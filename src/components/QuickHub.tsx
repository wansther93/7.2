import React from 'react';
import { 
  Newspaper, 
  Calendar, 
  Trophy, 
  BarChart3, 
  Award,
  Flame
} from 'lucide-react';

interface QuickHubProps {
  onOpenNewsModal?: () => void;
  onOpenScheduleModal?: (tab?: 'schedule' | 'season') => void;
  onOpenAchievements?: () => void;
  onOpenStats?: () => void;
  airingTodayCount?: number;
  totalAnimesCount?: number;
}

export const QuickHub: React.FC<QuickHubProps> = ({
  onOpenNewsModal,
  onOpenScheduleModal,
  onOpenAchievements,
  onOpenStats,
  airingTodayCount = 0,
}) => {
  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 shadow-lg">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* 1. Notícias */}
        {onOpenNewsModal && (
          <button
            type="button"
            id="hub-btn-news"
            onClick={onOpenNewsModal}
            className="group relative flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-rose-500/20 hover:border-rose-500/50 transition-all cursor-pointer shadow-sm hover:shadow-rose-950/30 text-left active:scale-[0.98]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-md shadow-rose-600/30 shrink-0 group-hover:scale-105 transition-transform">
              <Newspaper className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white group-hover:text-rose-300 transition-colors truncate">
                  Notícias
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">Feed & Trailers</p>
            </div>
          </button>
        )}

        {/* 2. Lançamentos & Guia da Temporada */}
        {onOpenScheduleModal && (
          <button
            type="button"
            id="hub-btn-schedule"
            onClick={() => onOpenScheduleModal('schedule')}
            className="group relative flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-amber-500/20 hover:border-amber-500/50 transition-all cursor-pointer shadow-sm hover:shadow-amber-950/30 text-left active:scale-[0.98]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/30 shrink-0 group-hover:scale-105 transition-transform font-bold">
              <Calendar className="w-4 h-4 text-slate-950" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors truncate">
                  Lançamentos
                </span>
                {airingTodayCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/30 flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5" />
                    {airingTodayCount}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate">Calendário & Guia</p>
            </div>
          </button>
        )}

        {/* 3. Conquistas & Insígnias */}
        {onOpenAchievements && (
          <button
            type="button"
            id="hub-btn-achievements"
            onClick={onOpenAchievements}
            className="group relative flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-amber-600/20 hover:border-amber-500/50 transition-all cursor-pointer shadow-sm hover:shadow-amber-950/30 text-left active:scale-[0.98]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center text-white shadow-md shadow-amber-600/30 shrink-0 group-hover:scale-105 transition-transform">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors truncate">
                  Conquistas
                </span>
                <Award className="w-3 h-3 text-amber-400" />
              </div>
              <p className="text-[10px] text-slate-400 truncate">Insígnias & Tiers</p>
            </div>
          </button>
        )}

        {/* 4. Estatísticas */}
        {onOpenStats && (
          <button
            type="button"
            id="hub-btn-stats"
            onClick={onOpenStats}
            className="group relative flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer shadow-sm hover:shadow-purple-950/30 text-left active:scale-[0.98]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30 shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs sm:text-sm font-black text-white group-hover:text-purple-300 transition-colors truncate">
                Estatísticas
              </span>
              <p className="text-[10px] text-slate-400 truncate">Gráficos & Dados</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
