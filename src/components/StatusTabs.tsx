import React from 'react';
import { Play, Clock, Bookmark, CheckCircle2, Pause, XCircle, Ban, Layers } from 'lucide-react';
import type { AnimeStatus } from '../types';
import { HorizontalScrollContainer } from './HorizontalScrollContainer';

export type FilterStatus = 'all' | AnimeStatus;

interface StatusTabsProps {
  currentFilter: FilterStatus;
  onSelectFilter: (filter: FilterStatus) => void;
  counts: Record<FilterStatus, number>;
}

const TABS: { id: FilterStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'Todos', icon: Layers },
  { id: 'watching', label: 'Assistindo', icon: Play },
  { id: 'waiting_new_episodes', label: 'Esperando novos eps', icon: Clock },
  { id: 'plan_to_watch', label: 'Quero assistir', icon: Bookmark },
  { id: 'completed', label: 'Terminados', icon: CheckCircle2 },
  { id: 'paused', label: 'Pausados', icon: Pause },
  { id: 'dropped', label: 'Abandonados', icon: XCircle },
  { id: 'cancelled', label: 'Cancelados', icon: Ban },
];

export const StatusTabs: React.FC<StatusTabsProps> = ({
  currentFilter,
  onSelectFilter,
  counts,
}) => {
  return (
    <div className="w-full pb-1">
      <HorizontalScrollContainer id="status-tabs-container" scrollStep={140} autoCenterOnClick={true}>
        {TABS.map((tab) => {
          const isActive = currentFilter === tab.id;
          const Icon = tab.icon;
          const count = counts[tab.id] || 0;

          return (
            <button
              key={tab.id}
              id={`tab-filter-${tab.id}`}
              onClick={() => onSelectFilter(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer select-none shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? 'bg-indigo-700/80 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </HorizontalScrollContainer>
    </div>
  );
};
