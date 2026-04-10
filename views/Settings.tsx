import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Role } from '../types';
import {
  User as UserIcon,
  Shield,
  ChevronRight,
  Sparkles,
  LogOut,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { onboardingStorageKey } from '../data/onboardingTour';
import {
  AVATAR_ACCESSORY_IDS,
  AVATAR_ACCESSORY_LABELS,
  AVATAR_BOY_PATH,
  AVATAR_GIRL_PATH,
  normalizeAvatarAccessory,
  resolveAvatarDisplayPath,
  resolveBundledOrDefault,
} from '../data/defaultAvatars';
import { BadgePickerModal } from '../components/BadgePickerModal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBadgeProgress } from '../hooks/useBadgeProgress';
import { supabase } from '../services/supabase';

export const Settings: React.FC = () => {
  const { user, signOut, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const medalsRef = useRef<HTMLDivElement>(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const badgeUserId = user.id !== 'guest' ? user.id : undefined;
  const { stats: badgeStats, equippedIds, setEquipped, refresh: refreshBadges } = useBadgeProgress(badgeUserId);

  useEffect(() => {
    const st = location.state as { focusMedals?: boolean } | null;
    if (st?.focusMedals) {
      setBadgeModalOpen(true);
      setTimeout(() => medalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  const effectiveBase = resolveBundledOrDefault(user.id, user.avatar);
  const effectiveAccessory = normalizeAvatarAccessory(user.avatarAccessory);

  const saveBundledAvatar = async (path: typeof AVATAR_BOY_PATH | typeof AVATAR_GIRL_PATH) => {
    if (user.id === 'guest') return;
    setAvatarSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ avatar: path }).eq('id', user.id);
      if (error) throw error;
      await refreshUser();
      showToast('Персонаж обновлён', 'success');
    } catch {
      showToast('Не удалось сохранить', 'error');
    } finally {
      setAvatarSaving(false);
    }
  };

  const saveAccessory = async (next: 'none' | (typeof AVATAR_ACCESSORY_IDS)[number]) => {
    if (user.id === 'guest') return;
    const value = normalizeAvatarAccessory(next);
    setAvatarSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ avatar_accessory: value }).eq('id', user.id);
      if (error) throw error;
      await refreshUser();
      showToast('Аксессуар сохранён', 'success');
    } catch {
      showToast('Не удалось сохранить', 'error');
    } finally {
      setAvatarSaving(false);
    }
  };

  const Row = ({
    icon: Icon,
    title,
    subtitle,
    onClick,
    to,
    dimmed,
  }: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    onClick?: () => void;
    to?: string;
    dimmed?: boolean;
  }) => {
    const inner = (
      <>
        <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
          <Icon size={20} className={dimmed ? 'text-kiddy-textMuted' : 'text-kiddy-cherry'} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className={`font-semibold text-sm ${dimmed ? 'text-kiddy-textMuted' : 'text-white'}`}>{title}</p>
          {subtitle && <p className="text-kiddy-textMuted text-xs mt-0.5">{subtitle}</p>}
        </div>
        {!dimmed && <ChevronRight size={18} className="text-kiddy-textMuted shrink-0" />}
      </>
    );
    const className = dimmed
      ? 'w-full flex items-center gap-4 p-4 rounded-2xl border border-white/[0.04] bg-kiddy-surfaceElevated/30 opacity-80 cursor-not-allowed text-left'
      : 'w-full flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-kiddy-surfaceElevated/60 hover:bg-kiddy-surfaceElevated hover:border-white/[0.1] transition-all text-left group';
    if (to) {
      return (
        <Link to={to} className={className}>
          {inner}
        </Link>
      );
    }
    return (
      <button type="button" disabled={dimmed} onClick={onClick} className={className}>
        {inner}
      </button>
    );
  };

  return (
    <div className="space-y-10 pb-20 max-w-3xl">
      <div>
        <p className="text-kiddy-textMuted text-[10px] font-bold uppercase tracking-[0.3em] mb-2">Аккаунт</p>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">Настройки</h1>
        <p className="text-kiddy-textMuted text-sm mt-2">Профиль и медали</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-kiddy-textMuted text-[10px] font-bold uppercase tracking-widest px-1">Профиль</h2>
        <Row
          icon={UserIcon}
          title="Редактировать профиль"
          subtitle="Имя, статистика и рейтинг"
          to="/profile"
        />
        {user.id !== 'guest' && (
          <div className="space-y-5 rounded-2xl border border-white/[0.08] bg-kiddy-surfaceElevated/60 p-5">
            <div>
              <p className="text-white text-sm font-bold mb-1">Персонаж</p>
              <p className="text-kiddy-textMuted text-xs mb-4">Мальчик или девочка — отдельные картинки; аксессуар тоже отдельный PNG (подменяешь файлы в проекте).</p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  disabled={avatarSaving}
                  onClick={() => void saveBundledAvatar(AVATAR_BOY_PATH)}
                  className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-zinc-600 transition-all disabled:opacity-50 ${
                    effectiveBase === AVATAR_BOY_PATH
                      ? 'border-kiddy-cherry ring-2 ring-kiddy-cherry/30'
                      : 'border-white/[0.1] hover:border-white/25'
                  }`}
                  aria-label="Аватар мальчик"
                >
                  <img
                    src={resolveAvatarDisplayPath(user.id, AVATAR_BOY_PATH, user.avatarAccessory)}
                    alt=""
                    className="h-full w-full origin-center scale-[1.14] object-cover object-center"
                    loading="eager"
                    decoding="async"
                  />
                </button>
                <button
                  type="button"
                  disabled={avatarSaving}
                  onClick={() => void saveBundledAvatar(AVATAR_GIRL_PATH)}
                  className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-zinc-600 transition-all disabled:opacity-50 ${
                    effectiveBase === AVATAR_GIRL_PATH
                      ? 'border-kiddy-cherry ring-2 ring-kiddy-cherry/30'
                      : 'border-white/[0.1] hover:border-white/25'
                  }`}
                  aria-label="Аватар девочка"
                >
                  <img
                    src={resolveAvatarDisplayPath(user.id, AVATAR_GIRL_PATH, user.avatarAccessory)}
                    alt=""
                    className="h-full w-full origin-center scale-[1.14] object-cover object-center"
                    loading="eager"
                    decoding="async"
                  />
                </button>
                {avatarSaving && <Loader2 className="animate-spin text-kiddy-cherry" size={22} />}
              </div>
            </div>
            <div className="border-t border-white/[0.06] pt-5">
              <p className="text-white text-sm font-bold mb-1">Аксессуар</p>
              <p className="text-kiddy-textMuted text-xs mb-3">
                Файлы: <span className="font-mono text-kiddy-textSecondary">public/avatars/student-boy-cap.png</span> и т.д. — замени своими генерациями с теми же именами.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={avatarSaving}
                  onClick={() => void saveAccessory('none')}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                    effectiveAccessory === 'none'
                      ? 'border-kiddy-cherry/60 bg-kiddy-cherry/15 text-white'
                      : 'border-white/[0.1] bg-white/[0.04] text-kiddy-textSecondary hover:border-white/20 hover:text-white'
                  }`}
                >
                  Без
                </button>
                {AVATAR_ACCESSORY_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    disabled={avatarSaving}
                    onClick={() => void saveAccessory(id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                      effectiveAccessory === id
                        ? 'border-kiddy-cherry/60 bg-kiddy-cherry/15 text-white'
                        : 'border-white/[0.1] bg-white/[0.04] text-kiddy-textSecondary hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {AVATAR_ACCESSORY_LABELS[id]}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex h-24 w-24 overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-600">
                <img
                  src={resolveAvatarDisplayPath(user.id, user.avatar, user.avatarAccessory)}
                  alt=""
                  className="h-full w-full origin-center scale-[1.14] object-cover object-center"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        )}
        {user.role === Role.ADMIN && (
          <Row icon={Shield} title="Панель управления" subtitle="Курсы, пользователи, расписание" to="/admin" />
        )}
        {user.id !== 'guest' && (
          <Row
            icon={HelpCircle}
            title="Гид по разделам"
            subtitle="Подсветка меню и короткие подсказки, как при первом входе"
            onClick={() => {
              try {
                localStorage.removeItem(onboardingStorageKey(user.id));
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
          />
        )}
      </section>

      {badgeUserId && (
        <section ref={medalsRef} className="space-y-3" id="medals">
          <h2 className="text-kiddy-textMuted text-[10px] font-bold uppercase tracking-widest px-1">Медали</h2>
          <button
            type="button"
            onClick={() => setBadgeModalOpen(true)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-kiddy-cherry/20 bg-kiddy-cherry/[0.06] hover:border-kiddy-cherry/35 transition-all text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-kiddy-cherry/15 border border-kiddy-cherry/25 flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-kiddy-cherry" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white">Медали на аватаре</p>
              <p className="text-kiddy-textMuted text-xs mt-0.5">
                До 6 значков вокруг аватара — только за достижения
              </p>
            </div>
            <ChevronRight size={18} className="text-kiddy-cherry shrink-0" />
          </button>
        </section>
      )}

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border border-white/[0.08] text-kiddy-textMuted hover:text-kiddy-cherry hover:border-kiddy-cherry/30 transition-all font-bold text-sm"
      >
        <LogOut size={18} />
        Выйти из аккаунта
      </button>

      {badgeUserId && (
        <BadgePickerModal
          isOpen={badgeModalOpen}
          onClose={() => {
            setBadgeModalOpen(false);
            refreshBadges();
          }}
          stats={badgeStats}
          equippedIds={equippedIds}
          onSave={(ids) => {
            setEquipped(ids);
            refreshBadges();
          }}
        />
      )}
    </div>
  );
};
