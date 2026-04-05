import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Role } from '../types';
import {
  User as UserIcon,
  Bell,
  Globe,
  Palette,
  Shield,
  KeyRound,
  ChevronRight,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { BadgePickerModal } from '../components/BadgePickerModal';
import { useAuth } from '../contexts/AuthContext';
import { useBadgeProgress } from '../hooks/useBadgeProgress';

export const Settings: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const medalsRef = useRef<HTMLDivElement>(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);

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
        <p className="text-kiddy-textMuted text-sm mt-2">Профиль, медали и предпочтения</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-kiddy-textMuted text-[10px] font-bold uppercase tracking-widest px-1">Профиль</h2>
        <Row
          icon={UserIcon}
          title="Редактировать профиль"
          subtitle="Имя, фото, статистика и рейтинг"
          to="/profile"
        />
        {user.role === Role.ADMIN && (
          <Row icon={Shield} title="Панель управления" subtitle="Курсы, пользователи, расписание" to="/admin" />
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
                До 6 значков вокруг фото — только за достижения
              </p>
            </div>
            <ChevronRight size={18} className="text-kiddy-cherry shrink-0" />
          </button>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-kiddy-textMuted text-[10px] font-bold uppercase tracking-widest px-1">Основные</h2>
        <Row icon={Bell} title="Уведомления" subtitle="Письма о занятиях и напоминания — скоро" dimmed />
        <Row icon={Globe} title="Язык интерфейса" subtitle="Русский — другие языки позже" dimmed />
        <Row icon={Palette} title="Оформление" subtitle="Тёмная тема, размер шрифта — в разработке" dimmed />
        <Row icon={KeyRound} title="Безопасность" subtitle="Смена пароля и сессии — скоро" dimmed />
      </section>

      <Card className="p-6 border-white/[0.06] bg-kiddy-surfaceElevated/40">
        <p className="text-kiddy-textMuted text-xs leading-relaxed">
          <span className="text-white font-semibold">Идеи на будущее:</span> привязка родителя к аккаунту ребёнка,
          экспорт прогресса, push-уведомления в браузере, двухфакторная аутентификация, выбор часового пояса для
          расписания.
        </p>
      </Card>

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
