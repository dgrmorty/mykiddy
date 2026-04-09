import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { AvatarImage } from '../components/AvatarImage';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { levelFromXp } from '../progression';
import { useToast } from '../contexts/ToastContext';
import { Role } from '../types';
import { useFriendships, otherPartyId, type FriendshipRow } from '../hooks/useFriendships';
import { Loader2, Search, Users, Inbox, UserCheck, ChevronRight, UserPlus, X, Clock } from 'lucide-react';

interface StudentRow {
  id: string;
  name: string | null;
  avatar: string | null;
  xp: number | null;
  level: number | null;
  role: string | null;
}

function isStudentRole(role: string | null | undefined): boolean {
  return (role || '').toLowerCase() === 'student';
}

type TabKey = 'all' | 'requests' | 'friends';

export const Community: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const myId = user.id !== 'guest' ? user.id : undefined;
  const { rows: friendRows, loading: loadingFriends, sendRequest, accept, remove } = useFriendships(myId);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<TabKey>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar, xp, level, role')
        .order('name', { ascending: true });
      if (error) throw error;
      const list = (data || []).filter((r) => isStudentRole(r.role)) as StudentRow[];
      setStudents(list);
    } catch {
      setStudents([]);
      showToast('Не удалось загрузить список', 'error');
    } finally {
      setLoadingStudents(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const incoming = useMemo(
    () => friendRows.filter((r) => r.status === 'pending' && r.addressee_id === myId),
    [friendRows, myId],
  );
  const outgoing = useMemo(
    () => friendRows.filter((r) => r.status === 'pending' && r.requester_id === myId),
    [friendRows, myId],
  );
  const friends = useMemo(() => friendRows.filter((r) => r.status === 'accepted'), [friendRows]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = students.filter((s) => s.id !== myId);
    if (q) list = list.filter((s) => (s.name || '').toLowerCase().includes(q));
    return list;
  }, [students, query, myId]);

  const studentById = useMemo(() => {
    const m = new Map<string, StudentRow>();
    students.forEach((s) => m.set(s.id, s));
    return m;
  }, [students]);

  const resolvePeer = (id: string) => {
    const s = studentById.get(id);
    return {
      name: s?.name || 'Ученик',
      avatar: s?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s?.name || 'U')}&background=random`,
      xp: s?.xp ?? 0,
      level: levelFromXp(s?.xp ?? 0),
    };
  };

  const canFriend = user.role === Role.STUDENT && myId;

  const incomingCount = incoming.length;

  const handleQuickAdd = async (targetId: string) => {
    if (!canFriend) return;
    setBusyId(targetId);
    const { error } = await sendRequest(targetId);
    setBusyId(null);
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') showToast('Заявка уже отправлена', 'error');
      else showToast('Ошибка', 'error');
    } else showToast('Заявка отправлена', 'success');
  };

  const tabBtn = (key: TabKey, label: string, badge?: number) => (
    <button
      key={key}
      type="button"
      onClick={() => setTab(key)}
      className={`relative rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${
        tab === key ? 'bg-kiddy-cherry text-white shadow-lg shadow-kiddy-cherry/20' : 'text-kiddy-textMuted hover:text-white bg-white/[0.04]'
      }`}
    >
      {label}
      {badge != null && badge > 0 && (
        <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-white/20 px-1 text-[10px]">
          {badge}
        </span>
      )}
    </button>
  );

  const renderFriendRow = (row: FriendshipRow, i: number) => {
    const other = otherPartyId(row, myId!);
    const p = resolvePeer(other);
    return (
      <div
        key={row.id}
        className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.1]"
        style={{ animation: `fade-in-up 0.45s ease both`, animationDelay: `${i * 0.04}s` }}
      >
        <button type="button" onClick={() => navigate(`/users/${other}`)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <AvatarImage src={p.avatar} name={p.name} alt="" className="h-12 w-12 shrink-0 rounded-full border border-white/10 object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-white">{p.name}</p>
            <p className="text-kiddy-textMuted text-xs">
              Ур. {p.level} · {p.xp.toLocaleString()} XP
            </p>
          </div>
        </button>
        <ChevronRight className="shrink-0 text-kiddy-textMuted" size={18} />
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="stagger-1 space-y-2">
        <p className="text-kiddy-cherry text-[10px] font-bold uppercase tracking-[0.35em]">Сообщество</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight italic">Ученики школы</h1>
        <p className="text-kiddy-textMuted text-sm max-w-xl">
          Смотрите профили одноклассников, отправляйте заявки в друзья и принимайте входящие — как в соцсети, но только для нашей айтишколы.
        </p>
      </header>

      <div className="stagger-2 flex flex-wrap gap-2">
        {tabBtn('all', 'Все')}
        {tabBtn('requests', 'Заявки', incomingCount)}
        {tabBtn('friends', 'Друзья')}
      </div>

      {tab === 'all' && (
        <section className="stagger-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kiddy-textMuted" size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени…"
              className="w-full rounded-2xl border border-white/[0.08] bg-kiddy-surfaceElevated/80 py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-kiddy-textMuted outline-none focus:border-kiddy-cherry/40"
            />
          </div>

          {loadingStudents ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-kiddy-cherry" size={40} />
            </div>
          ) : filteredStudents.length === 0 ? (
            <Card className="p-10 text-center text-kiddy-textMuted text-sm">Никого не нашли</Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredStudents.map((s, i) => {
                const avatarUrl =
                  s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'U')}&background=random`;
                const lvl = levelFromXp(s.xp ?? 0);
                const hasOutgoing =
                  canFriend && friendRows.some((r) => r.requester_id === myId && r.addressee_id === s.id && r.status === 'pending');
                const isFriend = friendRows.some(
                  (r) => r.status === 'accepted' && ((r.requester_id === myId && r.addressee_id === s.id) || (r.addressee_id === myId && r.requester_id === s.id)),
                );
                const actionClass =
                  'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-300 whitespace-nowrap';

                return (
                  <Card
                    key={s.id}
                    hoverEffect
                    className="flex flex-col gap-3 p-4 sm:gap-3.5 sm:p-5"
                    style={{ animation: `fade-in-up 0.5s ease both`, animationDelay: `${0.05 + i * 0.04}s` }}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/users/${s.id}`)}
                      className="flex w-full min-w-0 items-center gap-3 text-left sm:gap-4"
                    >
                      <AvatarImage
                        src={avatarUrl}
                        name={s.name || ''}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-2xl border border-white/[0.08] object-cover sm:h-14 sm:w-14"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-bold text-white leading-snug text-balance [overflow-wrap:anywhere]">
                          {s.name || 'Ученик'}
                        </p>
                        <p className="text-kiddy-textMuted text-xs mt-0.5">
                          Ур. {lvl} · {(s.xp ?? 0).toLocaleString()} XP
                        </p>
                      </div>
                    </button>
                    {canFriend && !isFriend && !hasOutgoing && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleQuickAdd(s.id);
                          }}
                          className={`group ${actionClass} border-kiddy-cherry/40 bg-kiddy-cherry/[0.14] text-white hover:border-kiddy-cherry hover:bg-kiddy-cherry hover:shadow-[0_0_24px_-4px_rgba(230,0,43,0.45)] disabled:pointer-events-none disabled:opacity-45`}
                        >
                          {busyId === s.id ? (
                            <Loader2 size={16} className="animate-spin text-kiddy-cherry group-hover:text-white" />
                          ) : (
                            <UserPlus size={16} className="text-kiddy-cherry transition-colors group-hover:text-white" />
                          )}
                          В друзья
                        </button>
                      </div>
                    )}
                    {canFriend && hasOutgoing && (
                      <div className="flex justify-end">
                        <span
                          className={`${actionClass} cursor-default border-amber-500/20 bg-amber-500/[0.08] text-amber-100/95`}
                        >
                          <Clock size={15} className="shrink-0 opacity-90" />
                          Ждём ответ
                        </span>
                      </div>
                    )}
                    {isFriend && (
                      <div className="flex justify-end">
                        <span
                          className={`${actionClass} cursor-default border-emerald-500/25 bg-emerald-500/[0.1] text-emerald-100/95`}
                        >
                          <UserCheck size={15} className="shrink-0 opacity-90" />
                          Друзья
                        </span>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'requests' && (
        <section className="stagger-3 space-y-8">
          {loadingFriends ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-kiddy-cherry" size={36} />
            </div>
          ) : (
            <>
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
                  <Inbox size={16} className="text-kiddy-cherry" /> К вам
                </h2>
                {incoming.length === 0 ? (
                  <p className="text-kiddy-textMuted text-sm py-4">Нет входящих заявок</p>
                ) : (
                  <div className="space-y-3">
                    {incoming.map((row, i) => {
                      const other = row.requester_id;
                      const p = resolvePeer(other);
                      return (
                        <div
                          key={row.id}
                          className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-kiddy-surfaceElevated/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                          style={{ animation: `fade-in-up 0.45s ease both`, animationDelay: `${i * 0.05}s` }}
                        >
                          <button type="button" onClick={() => navigate(`/users/${other}`)} className="flex items-center gap-3 text-left min-w-0">
                            <AvatarImage src={p.avatar} name={p.name} alt="" className="h-11 w-11 rounded-full border border-white/10 object-cover shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{p.name}</p>
                              <p className="text-kiddy-textMuted text-xs">Хочет дружить</p>
                            </div>
                          </button>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={async () => {
                                setBusyId(row.id);
                                const { error } = await accept(row.id);
                                setBusyId(null);
                                if (error) showToast('Не удалось принять', 'error');
                                else showToast('Заявка принята', 'success');
                              }}
                              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              {busyId === row.id ? <Loader2 size={16} className="animate-spin mx-2" /> : 'Принять'}
                            </button>
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={async () => {
                                setBusyId(row.id);
                                const { error } = await remove(row.id);
                                setBusyId(null);
                                if (error) showToast('Ошибка', 'error');
                              }}
                              className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-kiddy-textMuted hover:text-white disabled:opacity-50"
                            >
                              <X size={16} className="inline" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
                  <Users size={16} className="text-kiddy-cherry" /> От вас
                </h2>
                {outgoing.length === 0 ? (
                  <p className="text-kiddy-textMuted text-sm py-4">Нет исходящих заявок</p>
                ) : (
                  <div className="space-y-3">
                    {outgoing.map((row, i) => {
                      const other = row.addressee_id;
                      const p = resolvePeer(other);
                      return (
                        <div
                          key={row.id}
                          className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <button type="button" onClick={() => navigate(`/users/${other}`)} className="flex items-center gap-3 text-left min-w-0">
                            <AvatarImage src={p.avatar} name={p.name} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{p.name}</p>
                              <p className="text-kiddy-textMuted text-xs">Ожидает ответа</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={async () => {
                              setBusyId(row.id);
                              const { error } = await remove(row.id);
                              setBusyId(null);
                              if (error) showToast('Ошибка', 'error');
                              else showToast('Заявка отменена', 'success');
                            }}
                            className="text-xs font-bold uppercase tracking-widest text-kiddy-textMuted hover:text-kiddy-cherry shrink-0 disabled:opacity-50"
                          >
                            Отменить
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'friends' && (
        <section className="stagger-3">
          {loadingFriends ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-kiddy-cherry" size={36} />
            </div>
          ) : friends.length === 0 ? (
            <Card className="p-10 text-center">
              <Users className="mx-auto mb-4 text-kiddy-textMuted" size={40} />
              <p className="text-kiddy-textMuted text-sm">Пока нет друзей — загляните во «Все» и отправьте заявку.</p>
            </Card>
          ) : (
            <div className="space-y-2">{friends.map((row, i) => renderFriendRow(row, i))}</div>
          )}
        </section>
      )}
    </div>
  );
};
