import React, { useState, useEffect } from 'react';
import { X, Award, Check, Lock, Trophy, Sparkles } from 'lucide-react';
import type { Achievement } from '../../services/achievementService';
import { HexBadge, type BadgeTone } from './HexBadge';

interface BadgesShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  allAchievements: Achievement[];
  currentEquippedIds: string[];
  isEditable?: boolean;
  onSaveEquipped?: (equippedIds: string[]) => Promise<void>;
}

// Mapeia categoria/tier para cor do hexágono
const getBadgeTone = (tier: string): BadgeTone => {
  switch (tier) {
    case 'diamond':
      return 'cyan';
    case 'platinum':
      return 'purple';
    case 'gold':
      return 'gold';
    case 'silver':
      return 'blue';
    default:
      return 'amber';
  }
};

export const BadgesShowcaseModal: React.FC<BadgesShowcaseModalProps> = ({
  isOpen,
  onClose,
  allAchievements,
  currentEquippedIds,
  isEditable = false,
  onSaveEquipped,
}) => {
  const [equippedIds, setEquippedIds] = useState<string[]>(() => {
    return currentEquippedIds.slice(0, 5);
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEquippedIds(currentEquippedIds.slice(0, 5));
    }
  }, [isOpen, currentEquippedIds]);

  if (!isOpen) return null;

  const handleToggleEquip = (achievementId: string) => {
    if (!isEditable) return;

    setEquippedIds((prev) => {
      if (prev.includes(achievementId)) {
        return prev.filter((id) => id !== achievementId);
      }
      if (prev.length >= 5) {
        alert('Você pode equipar no máximo 5 insígnias no seu perfil.');
        return prev;
      }
      return [...prev, achievementId];
    });
  };

  const handleSave = async () => {
    if (!onSaveEquipped) return;
    setIsSaving(true);
    try {
      await onSaveEquipped(equippedIds);
      onClose();
    } catch (e) {
      console.error('Erro ao salvar insígnias equipadas:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const unlockedList = allAchievements.filter((a) => a.isUnlocked);
  const lockedList = allAchievements.filter((a) => !a.isUnlocked);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-black/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">Galeria de Insígnias & Conquistas</h3>
              <p className="text-xs text-slate-400">
                {isEditable
                  ? `Selecione até 5 insígnias para exibir no seu perfil (${equippedIds.length}/5 equipadas)`
                  : `${unlockedList.length} de ${allAchievements.length} insígnias desbloqueadas`}
              </p>
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

        {/* Conteúdo */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Seção dos 5 Slots Equipados no Topo */}
          {isEditable && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-amber-400/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Slots Ativos no Perfil ({equippedIds.length}/5)</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {equippedIds.length === 5 ? 'Todos os slots ocupados' : `Restam ${5 - equippedIds.length} slot(s)`}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((slotIndex) => {
                  const badgeId = equippedIds[slotIndex];
                  const badgeObj = allAchievements.find((a) => a.id === badgeId);

                  if (badgeObj) {
                    return (
                      <div
                        key={`modal-slot-${slotIndex}`}
                        className="p-1.5 rounded-xl bg-black/60 border border-amber-400/50 flex flex-col items-center justify-center text-center relative group"
                      >
                        <HexBadge
                          title={badgeObj.title}
                          icon={badgeObj.icon}
                          tone={getBadgeTone(badgeObj.tier)}
                          isUnlocked={true}
                          size="sm"
                          showSubtitle={false}
                        />
                        <span className="text-[9px] font-bold text-slate-300 truncate w-full mt-1">
                          {badgeObj.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleEquip(badgeObj.id)}
                          className="mt-1 w-full py-0.5 rounded-md bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[8px] font-bold border border-rose-500/30 transition-all cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`modal-slot-empty-${slotIndex}`}
                      className="h-20 rounded-xl border border-dashed border-white/10 bg-black/30 flex flex-col items-center justify-center p-1 text-center text-slate-500 text-[10px]"
                    >
                      <span className="font-bold text-slate-400">#{slotIndex + 1}</span>
                      <span className="text-[8px] text-slate-600 mt-0.5">Vazio</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção de Desbloqueadas */}
          <div>
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Insígnias Desbloqueadas ({unlockedList.length})</span>
            </h4>

            {unlockedList.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Nenhuma insígnia conquistada ainda. Continue assistindo e avaliando seus animes!
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {unlockedList.map((ach) => {
                  const isEquipped = equippedIds.includes(ach.id);
                  const tone = getBadgeTone(ach.tier);

                  return (
                    <div
                      key={ach.id}
                      className={`relative p-3 rounded-2xl border transition-all flex flex-col items-center text-center ${
                        isEquipped
                          ? 'bg-amber-500/10 border-amber-400/80 shadow-md shadow-amber-400/20'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Selo de Equipado */}
                      {isEquipped && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center gap-0.5">
                          <Check className="w-3 h-3" />
                          <span>Equipada</span>
                        </div>
                      )}

                      <HexBadge
                        title={ach.title}
                        subtitle={ach.description}
                        icon={ach.icon}
                        tone={tone}
                        isUnlocked={true}
                        size="md"
                      />

                      <span className="mt-1.5 text-[10px] text-amber-300 font-bold">
                        +{ach.xpReward} XP
                      </span>

                      {/* Botão Explícito de Equipar / Desequipar */}
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => handleToggleEquip(ach.id)}
                          className={`mt-2 w-full py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer active:scale-95 border ${
                            isEquipped
                              ? 'bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border-rose-500/40'
                              : equippedIds.length >= 5
                              ? 'bg-white/5 text-slate-500 border-white/10 cursor-not-allowed'
                              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                          }`}
                        >
                          {isEquipped
                            ? 'Desequipar'
                            : equippedIds.length >= 5
                            ? 'Slots Cheios (5/5)'
                            : 'Equipar'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção de Bloqueadas */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>A Desbloquear ({lockedList.length})</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {lockedList.map((ach) => (
                <div
                  key={ach.id}
                  className="p-3 rounded-2xl border border-white/5 bg-white/[0.01] opacity-50 flex flex-col items-center text-center select-none"
                >
                  <HexBadge
                    title={ach.title}
                    subtitle={ach.description}
                    icon={ach.icon}
                    isUnlocked={false}
                    size="md"
                  />
                  <span className="mt-2 text-[10px] text-slate-500 font-medium">
                    Progresso: {ach.progressLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Fechar
          </button>
          {isEditable && onSaveEquipped && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Seleção'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
