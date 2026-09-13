import React from 'react';
import { 
  Tv, 
  Newspaper, 
  Calendar, 
  User,
  Flame,
  Camera,
  Share2
} from 'lucide-react';

export type MainNavTab = 'list' | 'news' | 'schedule' | 'community' | 'achievements' | 'stats';

interface AppNavigationProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  airingTodayCount?: number;
  totalAnimesCount?: number;
  unlockedAchievementsCount?: number;
  totalAchievementsCount?: number;
  onOpenImageSearch?: () => void;
  onOpenSocialCard?: () => void;
  hasNewScheduleEpisodes?: boolean;
  hasUnreadNews?: boolean;
}

export const AppNavigation: React.FC<AppNavigationProps> = ({
  activeTab,
  onSelectTab,
  airingTodayCount = 0,
  totalAnimesCount = 0,
  onOpenImageSearch,
  onOpenSocialCard,
  hasNewScheduleEpisodes = false,
  hasUnreadNews = false,
}) => {
  // 4 Abas Essenciais: Lista, Agenda, Notícias, Perfil
  const navItems = [
    {
      id: 'list' as MainNavTab,
      label: 'Minha Lista',
      mobileLabel: 'Lista',
      icon: Tv,
      badge: totalAnimesCount > 0 ? totalAnimesCount : undefined,
      color: 'indigo',
    },
    {
      id: 'schedule' as MainNavTab,
      label: 'Agenda de Lançamentos',
      mobileLabel: 'Agenda',
      icon: Calendar,
      badge: hasNewScheduleEpisodes && airingTodayCount > 0 ? `${airingTodayCount}` : undefined,
      badgeIcon: hasNewScheduleEpisodes && airingTodayCount > 0 ? Flame : undefined,
      color: 'amber',
    },
    {
      id: 'news' as MainNavTab,
      label: 'Notícias & Feed',
      mobileLabel: 'Notícias',
      icon: Newspaper,
      badgeDot: hasUnreadNews,
      color: 'rose',
    },
    {
      id: 'community' as MainNavTab,
      label: 'Meu Perfil Otaku',
      mobileLabel: 'Perfil',
      icon: User,
      badgeDot: false,
      color: 'amber',
    },
  ];

  return (
    <>
      {/* DESKTOP & TABLET: Horizontal App Bar Navigation */}
      <nav 
        id="desktop-main-navigation" 
        className="hidden md:block w-full bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-1.5 shadow-xl shadow-black/40"
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const BadgeIcon = item.badgeIcon;

              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/90'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110 text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>

                  {/* Badge or Dot Indicator */}
                  {item.badge && (
                    <span 
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold flex items-center gap-0.5 shrink-0 ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : item.id === 'schedule' && airingTodayCount > 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {BadgeIcon && <BadgeIcon className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
                      <span>{item.badge}</span>
                    </span>
                  )}

                  {item.badgeDot && !item.badge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  )}

                  {/* Active bottom glow line */}
                  {isActive && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-400 rounded-full blur-[1px]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Tools shortcuts in desktop bar */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800 shrink-0">
            {onOpenImageSearch && (
              <button
                type="button"
                id="btn-nav-search-image"
                onClick={onOpenImageSearch}
                title="Identificar Anime por Imagem / Screenshot"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden lg:inline">Achar Cena</span>
              </button>
            )}

            {onOpenSocialCard && (
              <button
                type="button"
                id="btn-nav-social-card"
                onClick={onOpenSocialCard}
                title="Gerar Card para Instagram Stories e Feed"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden lg:inline">Gerar Card</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* MOBILE: Bottom Fixed Touch Navigation Bar */}
      <div 
        id="mobile-bottom-navigation" 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 pb-safe shadow-2xl"
      >
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const BadgeIcon = item.badgeIcon;

            return (
              <button
                key={`mobile-${item.id}`}
                id={`mobile-nav-tab-${item.id}`}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all duration-150 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'text-indigo-400 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Active Indicator Top Highlight */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-300 rounded-full" />
                )}

                <div className="relative">
                  <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-105 text-indigo-400' : 'text-slate-400'}`} />

                  {item.badge && item.id === 'schedule' && airingTodayCount > 0 && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[8px] font-black leading-none flex items-center">
                      {airingTodayCount}
                    </span>
                  )}

                  {item.badgeDot && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 border border-black animate-pulse" />
                  )}
                </div>

                <span className={`text-[8.5px] mt-0.5 leading-none truncate max-w-[50px] ${isActive ? 'text-indigo-300 font-bold' : 'text-slate-400'}`}>
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

