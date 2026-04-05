import { useState, useEffect } from 'react';
import { Check, Lock } from 'lucide-react';
import { Modal } from './ui/Modal';
import { BadgeOrb } from './BadgeOrb';
import { BADGE_CATALOG, RING_SLOT_COUNT, type BadgeStats } from '../data/badgeCatalog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stats: BadgeStats | null;
  equippedIds: string[];
  onSave: (ids: string[]) => void;
}

export function BadgePickerModal({ isOpen, onClose, stats, equippedIds, onSave }: Props) {
  const [draft, setDraft] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) setDraft([...equippedIds].slice(0, RING_SLOT_COUNT));
  }, [isOpen, equippedIds]);

  const toggle = (id: string) => {
    const def = BADGE_CATALOG.find((b) => b.id === id);
    if (!def || !stats || !def.isUnlocked(stats)) return;
    setDraft((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= RING_SLOT_COUNT) return prev;
      return [...prev, id];
    });
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="p-8 md:p-10 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-display font-bold text-white">Медали на аватаре</h2>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-kiddy-cherry text-white text-sm font-bold rounded-xl hover:bg-kiddy-cherryHover transition-all"
          >
            Готово
          </button>
        </div>
        <p className="text-kiddy-textMuted text-sm mb-2">
          Выбери до {RING_SLOT_COUNT} полученных значков — они появятся вокруг аватара.
        </p>
        <p className="text-kiddy-textMuted text-xs mb-6">
          Выбрано: {draft.length} / {RING_SLOT_COUNT}
        </p>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
          {BADGE_CATALOG.map((b) => {
            const unlocked = stats ? b.isUnlocked(stats) : false;
            const prog = stats ? b.progress(stats) : 0;
            const selected = draft.includes(b.id);

            return (
              <div
                key={b.id}
                onClick={() => unlocked && toggle(b.id)}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  unlocked ? 'cursor-pointer' : 'opacity-70'
                } ${
                  selected
                    ? 'bg-kiddy-cherry/[0.08] border-kiddy-cherry/30 shadow-lg shadow-kiddy-cherry/10'
                    : 'bg-kiddy-surfaceElevated/80 border-white/[0.06] hover:border-white/[0.1]'
                }`}
              >
                <BadgeOrb tier={b.tier} icon={b.icon} size={48} locked={!unlocked} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${unlocked ? 'text-white' : 'text-kiddy-textMuted'}`}>
                      {b.title}
                    </span>
                    <span className="text-kiddy-textMuted text-xs">{b.subtitle}</span>
                  </div>
                  <p className="text-kiddy-textSecondary text-xs mt-1">{b.requirement}</p>
                  {!unlocked && (
                    <div className="mt-2 h-1 w-full max-w-[200px] bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-kiddy-cherry/60 rounded-full transition-all duration-500"
                        style={{ width: `${prog * 100}%` }}
                      />
                    </div>
                  )}
                </div>
                {unlocked ? (
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                      selected
                        ? 'bg-kiddy-cherry border-kiddy-cherry'
                        : 'border-white/[0.12] bg-transparent'
                    }`}
                  >
                    {selected && <Check size={14} className="text-white" />}
                  </div>
                ) : (
                  <Lock size={16} className="text-kiddy-textMuted shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
