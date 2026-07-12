import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationSummary } from '../contexts/NotificationContext';
import { useFriendships, friendshipStateForPair } from '../hooks/useFriendships';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../services/supabase';
import { Loader2, Bell, UserPlus, UserCheck, Inbox, ShieldAlert, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';
import { AvatarImage } from '../components/AvatarImage';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

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
  const { showToast } = useToast();
  const { rows: friendRows, accept: acceptFriend, remove: removeFriend } = useFriendships(user.id !== 'guest' ? user.id : undefined);
  const [rows, setRows] = useState<ActivityNotificationRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actors, setActors] = useState<
    Record<
      string,
      {
        name: string | null;
        avatar: string | null;
        xp: number | null;
        role: string | null;
      }
    >
  >({});
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLUListElement>(null);
  const listAnimatedKeyRef = useRef<string | null>(null);

  useGSAP(
    () => {
      if (loading || rows.length === 0) return;
      const key = rows.map((r) => r.id).join(',');
      if (listAnimatedKeyRef.current === key) return;
      listAnimatedKeyRef.current = key;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.notif-item',
          { autoAlpha: 0, y: 16, scale: 0.98 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.55,
            stagger: 0.045,
            ease: 'power3.out',
            overwrite: 'auto',
          },
        );
      });
      return () => mm.revert();
    },
    { scope: listRef, dependencies: [loading, rows] },
  );

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
          .select('id, name, avatar, xp, role')
          .in('id', ids);
        const map: Record<
          string,
          {
            name: string | null;
            avatar: string | null;
            xp: number | null;
            role: string | null;
          }
        > = {};
        (profs || []).forEach(
          (p: {
            id: string;
            name: string | null;
            avatar: string | null;
            xp: number | null;
            role: string | null;
          }) => {
            map[p.id] = {
              name: p.name,
              avatar: p.avatar,
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
      navigate('/');
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
            className="btn-secondary shrink-0 px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
          >
            Прочитать все
          </button>
        )}
      </header>

      {loading ? (
        <div className="py-16">
          <AnimatedEmptyState message="Загружаем уведомления" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Пока тихо"
          description="Здесь появятся заявки в друзья, статус проекта на витрине и напоминания для наставников."
          icon={<Inbox size={36} strokeWidth={1.25} className="text-kiddy-textMuted" />}
        />
      ) : (
        <ul ref={listRef} className="space-y-3">
          {rows.map((row) => {
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
            let showFriendButtons = false;
            let friendshipRowId: string | null = null;

            if (row.kind === 'friend_request') {
              Icon = UserPlus;
              title = `${name} хочет добавиться в друзья`;
              if (row.actor_id) {
                const fState = friendshipStateForPair(friendRows, user.id, row.actor_id);
                if (fState.label === 'incoming' && fState.row) {
                  showFriendButtons = true;
                  friendshipRowId = fState.row.id;
                }
              }
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
              <li key={row.id} className="notif-item">
                <button
                  type="button"
                  onClick={() => void handleOpen(row)}
                  className={`flex w-full items-start gap-4 rounded-[2rem] border p-4 text-left shadow-island transition-all duration-400 ease-spring sm:items-center sm:p-5 ${
                    unread
                      ? 'border-white/20 bg-white/[0.06] ring-1 ring-white/10'
                      : 'border-white/10 bg-black hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="relative shrink-0">
                    {actorIsStudent ? (
                      <UserAvatar
                        user={{
                          id: row.actor_id || '',
                          name,
                          avatar: act?.avatar || '',
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
                    
                    {showFriendButtons && friendshipRowId && (
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          disabled={busyId === friendshipRowId}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setBusyId(friendshipRowId);
                            const { error } = await acceptFriend(friendshipRowId);
                            setBusyId(null);
                            if (error) showToast('Ошибка', 'error');
                            else {
                              showToast('Заявка принята', 'success');
                              void markRead(row.id);
                            }
                          }}
                          className="rounded-xl bg-white text-black px-4 py-2 text-xs font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50"
                        >
                          {busyId === friendshipRowId ? <Loader2 size={14} className="animate-spin" /> : 'Принять'}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === friendshipRowId}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setBusyId(friendshipRowId);
                            const { error } = await removeFriend(friendshipRowId);
                            setBusyId(null);
                            if (error) showToast('Ошибка', 'error');
                            else {
                              showToast('Заявка отклонена', 'success');
                              void markRead(row.id);
                            }
                          }}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                  {unread && !showFriendButtons && (
                    <span className="mt-1 shrink-0 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black sm:mt-0">
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
            События создаются автоматически. Открытие отмечает уведомление прочитанным. Заявки в друзья по-прежнему можно обработать в разделе «Ученики» → вкладка «Заявки».
          </p>
        </div>
      </Card>
    </div>
  );
};
