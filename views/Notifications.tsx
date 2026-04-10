import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationSummary } from '../contexts/NotificationContext';
import { supabase } from '../services/supabase';
import { Loader2, Bell, UserPlus, UserCheck, Inbox, ShieldAlert, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';
import { Role } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { AvatarImage } from '../components/AvatarImage';

export type ActivityKind =
  | 'friend_request'
  | 'friend_accepted'
  | 'project_moderation'
  | 'project_approved'
  | 'project_rejected';

export interface ActivityNotificationRow {
  id: string;
  kind: ActivityKind;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
  payload: Record<string, unknown>;
}

function formatActivityRu(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return 'только что';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин. назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч. назад`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} дн. назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const { refreshUnreadCount } = useNotificationSummary();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ActivityNotificationRow[]>([]);
  const [actors, setActors] = useState<
    Record<
      string,
      {
        name: string | null;
        avatar: string | null;
        avatar_accessory?: string | null;
        xp: number | null;
        role: string | null;
      }
    >
  >({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (user.id === 'guest') return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_notifications')
        .select('id, kind, actor_id, read_at, created_at, payload')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(80);
      if (error) throw error;
      const list = (data || []) as ActivityNotificationRow[];
      setRows(list);

      const ids = [...new Set(list.map((r) => r.actor_id).filter(Boolean))] as string[];
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, name, avatar, avatar_accessory, xp, role')
          .in('id', ids);
        const map: Record<
          string,
          {
            name: string | null;
            avatar: string | null;
            avatar_accessory?: string | null;
            xp: number | null;
            role: string | null;
          }
        > = {};
        (profs || []).forEach(
          (p: {
            id: string;
            name: string | null;
            avatar: string | null;
            avatar_accessory?: string | null;
            xp: number | null;
            role: string | null;
          }) => {
            map[p.id] = {
              name: p.name,
              avatar: p.avatar,
              avatar_accessory: p.avatar_accessory,
              xp: p.xp,
              role: p.role,
            };
          },
        );
        setActors(map);
      } else {
        setActors({});
      }
    } catch {
      setRows([]);
      setActors({});
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    await supabase.from('activity_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)));
    void refreshUnreadCount();
  };

  const markAllRead = async () => {
    if (user.id === 'guest') return;
    const { error } = await supabase
      .from('activity_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', user.id)
      .is('read_at', null);
    if (!error) {
      setRows((prev) => prev.map((r) => (r.read_at ? r : { ...r, read_at: new Date().toISOString() })));
      void refreshUnreadCount();
    }
  };

  const handleOpen = async (row: ActivityNotificationRow) => {
    if (!row.read_at) await markRead(row.id);
    if (row.kind === 'friend_request' || row.kind === 'friend_accepted') {
      if (row.actor_id) navigate(`/users/${row.actor_id}`);
      else navigate('/community');
      return;
    }
    if (row.kind === 'project_moderation') {
      navigate('/admin');
      return;
    }
    if (row.kind === 'project_approved' || row.kind === 'project_rejected') {
      navigate('/community?v=showcase');
    }
  };

  const unreadOnPage = rows.filter((r) => !r.read_at).length;

  return (
    <div className="space-y-8 pb-20">
      <header className="stagger-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-kiddy-cherry">Аккаунт</p>
          <h1 className="font-display text-3xl font-bold italic tracking-tight text-white md:text-4xl">Уведомления</h1>
          <p className="mt-2 max-w-xl text-sm text-kiddy-textMuted">
            Заявки в друзья, витрина проектов и ответы наставников по модерации.
          </p>
        </div>
        {unreadOnPage > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="shrink-0 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-kiddy-textMuted transition-colors hover:border-kiddy-cherry/35 hover:text-white"
          >
            Прочитать все
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-kiddy-cherry" size={40} />
        </div>
      ) : rows.length === 0 ? (
        <Card className="flex flex-col items-center p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <Inbox className="text-kiddy-textMuted" size={28} />
          </div>
          <p className="font-bold text-white">Пока тихо</p>
          <p className="mt-2 max-w-sm text-sm text-kiddy-textMuted">
            Здесь появятся заявки в друзья, статус проекта на витрине и напоминания для наставников.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, i) => {
            const act = row.actor_id ? actors[row.actor_id] : null;
            const name = act?.name || 'Ученик';
            const actorIsStudent = (act?.role || '').toLowerCase() === 'student';
            const unread = !row.read_at;
            const reason =
              row.kind === 'project_rejected' && typeof row.payload?.reason === 'string'
                ? row.payload.reason
                : '';
            let Icon: LucideIcon = UserPlus;
            let title = '';
            if (row.kind === 'friend_request') {
              Icon = UserPlus;
              title = `${name} хочет добавиться в друзья`;
            } else if (row.kind === 'friend_accepted') {
              Icon = UserCheck;
              title = `${name} принял(а) вашу заявку в друзья`;
            } else if (row.kind === 'project_moderation') {
              Icon = ShieldAlert;
              title = `${name} прислал(а) проект на витрину`;
            } else if (row.kind === 'project_approved') {
              Icon = CheckCircle2;
              title = `Проект одобрен: ${name}`;
            } else if (row.kind === 'project_rejected') {
              Icon = XCircle;
              title = `Проект нужно доработать (${name})`;
            } else {
              title = 'Уведомление';
            }
            return (
              <li key={row.id} style={{ animation: `fade-in-up 0.45s ease both`, animationDelay: `${Math.min(i, 12) * 0.04}s` }}>
                <button
                  type="button"
                  onClick={() => void handleOpen(row)}
                  className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all sm:items-center sm:p-5 ${
                    unread
                      ? 'border-kiddy-cherry/35 bg-kiddy-cherry/[0.07] shadow-[0_0_0_1px_rgba(230,0,43,0.06)]'
                      : 'border-white/[0.06] bg-kiddy-surfaceElevated/50 hover:border-white/[0.1]'
                  }`}
                >
                  <div className="relative shrink-0">
                    {actorIsStudent ? (
                      <UserAvatar
                        user={{
                          id: row.actor_id || '',
                          name,
                          avatar: act?.avatar || '',
                          avatarAccessory: act?.avatar_accessory ?? 'none',
                        }}
                        size="md"
                      />
                    ) : (
                      <AvatarImage
                        src={act?.avatar || undefined}
                        name={name}
                        alt=""
                        className="h-12 w-12 rounded-xl border border-white/10 object-cover sm:h-14 sm:w-14"
                      />
                    )}
                    <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-black bg-kiddy-base text-kiddy-cherry">
                      <Icon size={14} strokeWidth={2.5} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold leading-snug sm:text-base ${unread ? 'text-white' : 'text-kiddy-textSecondary'}`}>
                      {title}
                    </p>
                    {reason ? (
                      <p className="mt-1 text-xs text-kiddy-textMuted line-clamp-3">{reason}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-kiddy-textMuted">{formatActivityRu(row.created_at)}</p>
                  </div>
                  {unread && (
                    <span className="mt-1 shrink-0 rounded-full bg-kiddy-cherry px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white sm:mt-0">
                      Новое
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Card className="border-white/[0.05] p-6">
        <div className="flex gap-3">
          <Bell className="mt-0.5 shrink-0 text-kiddy-cherry/80" size={18} />
          <p className="text-xs leading-relaxed text-kiddy-textMuted">
            События создаются автоматически. Открытие отмечает уведомление прочитанным. Заявки в друзья по-прежнему можно обработать в «Сообщество» → «Заявки».
          </p>
        </div>
      </Card>
    </div>
  );
};
