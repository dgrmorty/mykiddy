import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { ProgrammerAvatar } from '../components/ProgrammerAvatar';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Role } from '../types';
import { supabase } from '../services/supabase';
import {
  AVATAR_SLOT_ORDER,
  SLOT_LABELS,
  itemsForSlot,
  sanitizeEquipForSave,
  type AvatarEquipMap,
  type AvatarSlotId,
} from '../data/avatarCatalog';
import { Loader2, Lock, Sparkles, Check } from 'lucide-react';

export const AvatarCustomizerSection: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [equip, setEquip] = useState<AvatarEquipMap>(() => sanitizeEquipForSave(user.avatarCosmetic, user.level));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEquip(sanitizeEquipForSave(user.avatarCosmetic, user.level));
  }, [user.id, user.level, user.avatarCosmetic]);

  if (user.role !== Role.STUDENT || user.id === 'guest') return null;

  const preview = sanitizeEquipForSave(equip, user.level);

  const pick = (slot: AvatarSlotId, itemId: string) => {
    const def = itemsForSlot(slot).find((i) => i.id === itemId);
    if (!def || def.minLevel > user.level) return;
    setEquip((prev) => sanitizeEquipForSave({ ...prev, [slot]: itemId }, user.level));
  };

  const save = async () => {
    const clean = sanitizeEquipForSave(equip, user.level);
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ avatar_cosmetic: clean }).eq('id', user.id);
      if (error) throw error;
      showToast('Персонаж сохранён', 'success');
      await refreshUser();
      setEquip(clean);
    } catch (e) {
      console.error(e);
      showToast('Не удалось сохранить', 'error');
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    JSON.stringify(preview) !== JSON.stringify(sanitizeEquipForSave(user.avatarCosmetic, user.level));

  return (
    <section className="stagger-3">
      <Card className="border-kiddy-cherry/20 bg-kiddy-surfaceElevated/80 p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-kiddy-cherry/30 bg-kiddy-cherry/10 text-kiddy-cherry">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white md:text-xl">Персонаж-программист</h3>
              <p className="text-xs text-kiddy-textMuted">
                Новые вещи открываются с уровнем. Фото профиля выше можно оставить для себя — в ленте школы для учеников показывается персонаж.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-xs font-mono text-kiddy-textSecondary">
            Уровень <span className="font-bold text-white">{user.level}</span>
          </div>
        </div>

        <div className="mb-8 flex justify-center rounded-2xl border border-white/[0.06] bg-black/40 py-8">
          <ProgrammerAvatar equip={preview} size={120} />
        </div>

        <div className="space-y-6">
          {AVATAR_SLOT_ORDER.map((slot) => {
            const items = itemsForSlot(slot);
            const current = preview[slot];
            return (
              <div key={slot}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">
                  {SLOT_LABELS[slot]}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((it) => {
                    const locked = it.minLevel > user.level;
                    const active = current === it.id;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        disabled={locked}
                        onClick={() => pick(slot, it.id)}
                        className={`relative flex min-w-[100px] flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-left transition-all ${
                          active
                            ? 'border-kiddy-cherry/60 bg-kiddy-cherry/15 text-white'
                            : locked
                              ? 'cursor-not-allowed border-white/[0.05] bg-white/[0.02] text-kiddy-textMuted opacity-60'
                              : 'border-white/[0.08] bg-white/[0.04] text-kiddy-textSecondary hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {locked && (
                          <span className="absolute right-1 top-1 text-amber-500/90" title={`С уровня ${it.minLevel}`}>
                            <Lock size={12} strokeWidth={2.5} />
                          </span>
                        )}
                        <span className="text-xs font-bold leading-tight">{it.label}</span>
                        <span className="text-[9px] text-kiddy-textMuted">
                          {it.minLevel <= 1 ? 'с 1 ур.' : `с ${it.minLevel} ур.`}
                        </span>
                        {active && <Check size={14} className="text-kiddy-cherry" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-white/[0.06] pt-6">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => void save()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-kiddy-cherry px-6 py-3 text-sm font-bold text-white shadow-lg shadow-kiddy-cherry/20 transition-all hover:bg-kiddy-cherryHover disabled:opacity-40"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : null}
            Сохранить персонажа
          </button>
        </div>
      </Card>
    </section>
  );
};
