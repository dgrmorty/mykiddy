import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { levelFromXp } from '../progression';
import { useToast } from '../contexts/ToastContext';
import { Role } from '../types';
import { useFriendships, otherPartyId, type FriendshipRow } from '../hooks/useFriendships';
import { Loader2, Search, Users, Inbox, UserCheck, ChevronRight, UserPlus, X, Clock } from 'lucide-react';
import { presenceFromLastSeen } from '../utils/presence';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);

const StudentIsland = ({ student, isFriend, hasOutgoing, canFriend, onAdd, onClick, busyId }: any) => {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const details = detailsRef.current;
      if (!el || !details) return;

      gsap.killTweensOf([el, details]);

      if (expanded) {
        gsap.set(details, { display: 'flex', pointerEvents: 'auto' });
        gsap.to(el, {
          height: 120,
          borderRadius: 28,
          backgroundColor: '#111111',
          duration: 0.6,
          ease: 'elastic.out(1, 0.75)',
          overwrite: 'auto',
        });
        gsap.to(details, {
          opacity: 1,
          y: 0,
          duration: 0.28,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      } else {
        gsap.to(details, {
          opacity: 0,
          y: -10,
          duration: 0.12,
          ease: 'power2.in',
          overwrite: 'auto',
          onComplete: () => {
            gsap.set(details, { display: 'none', y: -10, pointerEvents: 'none' });
          },
        });
        gsap.to(el, {
          height: 64,
          borderRadius: 32,
          backgroundColor: '#000000',
          duration: 0.35,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      }
    },
    { scope: ref, dependencies: [expanded] },
  );

  const lvl = levelFromXp(student.xp ?? 0);
  const presence = presenceFromLastSeen(student.last_seen_at);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={onClick}
      className="relative overflow-hidden cursor-pointer border border-white/10 shadow-island bg-black student-island"
      style={{ height: 64, borderRadius: 32 }}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex h-[64px] items-center gap-3 px-2">
        <UserAvatar user={{ id: student.id, name: student.name || 'Ученик', avatar: student.avatar || '' }} size="md" presence={presence} />
        <span className="truncate text-sm font-bold text-white">{student.name || 'Ученик'}</span>
      </div>
      <div
        ref={detailsRef}
        className="st-details pointer-events-none absolute bottom-0 left-0 right-0 flex h-[56px] items-end justify-between px-5 pb-4 opacity-0"
        style={{ display: 'none' }}
      >
        <div className="flex flex-col">
          <span className="text-zinc-400 text-xs font-bold">Ур. {lvl}</span>
          <span className="text-zinc-500 text-[10px] uppercase tracking-widest">{(student.xp ?? 0).toLocaleString()} XP</span>
        </div>
        {canFriend && !isFriend && !hasOutgoing && (
          <button
            disabled={busyId === student.id}
            onClick={(e) => { e.stopPropagation(); onAdd(student.id); }}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
          >
            {busyId === student.id ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} В друзья
          </button>
        )}
        {canFriend && hasOutgoing && (
          <span className="text-amber-400/90 text-xs font-bold flex items-center gap-1.5"><Clock size={14} /> Ждём</span>
        )}
        {isFriend && (
          <span className="text-emerald-400/90 text-xs font-bold flex items-center gap-1.5"><UserCheck size={14} /> Друзья</span>
        )}
      </div>
    </div>
  );
}

interface StudentRow {
  id: string;
  name: string | null;
  avatar: string | null;
  xp: number | null;
  level: number | null;
  role: string | null;
  last_seen_at?: string | null;
}

function isStudentRole(role: string | null | undefined): boolean {
  return (role || '').toLowerCase() === 'student';
}

type TabKey = 'all' | 'requests' | 'friends';

export const Community: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /** Витрина только на главной; старые ссылки ?v=showcase сбрасываем. */
  useEffect(() => {
    if (searchParams.get('v') === 'showcase') {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { user } = useAuth();
  const { showToast } = useToast();
  const myId = user.id !== 'guest' ? user.id : undefined;
  const { rows: friendRows, loading: loadingFriends, sendRequest, accept, remove } = useFriendships(myId);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<TabKey>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadStudentsErrorToastShown = useRef(false);
  const studentsGridRef = useRef<HTMLDivElement>(null);
  const studentsAnimatedKeyRef = useRef<string | null>(null);

  const loadStudents = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoadingStudents(true);
    try {
      const { data, error } = await supabase.rpc('list_community_students');
      if (error) throw error;
      const list = ((data as StudentRow[] | null) || []).filter((r) => isStudentRole(r.role));
      setStudents(list);
      loadStudentsErrorToastShown.current = false;
    } catch (e) {
      console.warn('[Community] list_community_students:', e);
      if (!silent) setStudents([]);
      if (!silent && !loadStudentsErrorToastShown.current) {
        loadStudentsErrorToastShown.current = true;
        showToast('Не удалось загрузить список', 'error');
      }
    } finally {
      if (!silent) setLoadingStudents(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    const id = window.setInterval(() => void loadStudents({ silent: true }), 45_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadStudents({ silent: true });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
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

  useGSAP(
    () => {
      if (loadingStudents || filteredStudents.length === 0 || tab !== 'all') return;
      const key = `${tab}:${filteredStudents.map((s) => s.id).join(',')}`;
      if (studentsAnimatedKeyRef.current === key) return;
      studentsAnimatedKeyRef.current = key;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.student-island',
          { autoAlpha: 0, y: 18, scale: 0.97 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.55,
            stagger: 0.04,
            ease: 'power3.out',
            overwrite: 'auto',
          },
        );
      });
      return () => mm.revert();
    },
    { scope: studentsGridRef, dependencies: [loadingStudents, filteredStudents, tab] },
  );

  const studentById = useMemo(() => {
    const m = new Map<string, StudentRow>();
    students.forEach((s) => m.set(s.id, s));
    return m;
  }, [students]);

  const resolvePeer = (id: string) => {
    const s = studentById.get(id);
    return {
      name: s?.name || 'Ученик',
      avatar: s?.avatar || '',
      xp: s?.xp ?? 0,
      level: levelFromXp(s?.xp ?? 0),
      lastSeenAt: s?.last_seen_at ?? null,
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
        tab === key ? 'bg-white text-black shadow-premium' : 'text-kiddy-textMuted hover:text-white bg-white/[0.04]'
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
    const presence = presenceFromLastSeen(p.lastSeenAt);
    return (
      <div
        key={row.id}
        className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.1]"
        style={{ animation: `fade-in-up 0.45s ease both`, animationDelay: `${i * 0.04}s` }}
      >
        <button type="button" onClick={() => navigate(`/users/${other}`)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <UserAvatar
            user={{
              id: other,
              name: p.name || 'Ученик',
              avatar: p.avatar || '',
            }}
            size="lg"
            presence={presence}
          />
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
        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.35em]">Ученики</p>
        <h1 className="font-display text-3xl font-bold italic tracking-tight text-white md:text-4xl">Резиденты</h1>
        <p className="max-w-xl text-sm text-kiddy-textMuted">
          Профили одноклассников, друзья и заявки. Лента проектов — на{' '}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-bold text-white underline decoration-white/40 underline-offset-2 hover:text-zinc-300"
          >
            главной
          </button>
          .
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
              className="input-premium w-full py-3.5 pl-12 pr-4 text-sm outline-none"
            />
          </div>

          {loadingStudents ? (
            <div className="py-12">
              <AnimatedEmptyState message="Ищем учеников" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState 
              title="Никого не нашли" 
              description="Попробуйте изменить запрос поиска" 
              icon={<Search size={40} strokeWidth={1} />}
            />
          ) : (
            <div ref={studentsGridRef} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredStudents.map((s) => {
                const hasOutgoing = canFriend && friendRows.some((r) => r.requester_id === myId && r.addressee_id === s.id && r.status === 'pending');
                const isFriend = friendRows.some((r) => r.status === 'accepted' && ((r.requester_id === myId && r.addressee_id === s.id) || (r.addressee_id === myId && r.requester_id === s.id)));
                return (
                  <StudentIsland
                    key={s.id}
                    student={s}
                    isFriend={isFriend}
                    hasOutgoing={hasOutgoing}
                    canFriend={canFriend}
                    onAdd={handleQuickAdd}
                    onClick={() => navigate(`/users/${s.id}`)}
                    busyId={busyId}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'requests' && (
        <section className="stagger-3 space-y-8">
          {loadingFriends ? (
            <div className="py-10">
              <AnimatedEmptyState message="Загружаем заявки" />
            </div>
          ) : (
            <>
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
                  <Inbox size={16} className="text-white" /> К вам
                </h2>
                {incoming.length === 0 ? (
                  <EmptyState 
                    title="Нет заявок" 
                    description="У вас пока нет входящих заявок в друзья" 
                    icon={<Inbox size={40} strokeWidth={1} />}
                  />
                ) : (
                  <div className="space-y-3">
                    {incoming.map((row, i) => {
                      const other = row.requester_id;
                      const p = resolvePeer(other);
                      const presence = presenceFromLastSeen(p.lastSeenAt);
                      return (
                        <div
                          key={row.id}
                          className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-kiddy-surfaceElevated/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                          style={{ animation: `fade-in-up 0.45s ease both`, animationDelay: `${i * 0.05}s` }}
                        >
                          <button type="button" onClick={() => navigate(`/users/${other}`)} className="flex min-w-0 items-center gap-3 text-left">
                            <UserAvatar
                              user={{
                                id: other,
                                name: p.name || 'Ученик',
                                avatar: p.avatar || '',
                              }}
                              size="md"
                              presence={presence}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-white">{p.name}</p>
                              <p className="text-xs text-kiddy-textMuted">Хочет дружить</p>
                            </div>
                          </button>
                          <div className="flex shrink-0 gap-2">
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
                              {busyId === row.id ? <Loader2 size={16} className="mx-2 animate-spin" /> : 'Принять'}
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
                  <Users size={16} className="text-white" /> От вас
                </h2>
                {outgoing.length === 0 ? (
                  <EmptyState 
                    title="Нет заявок" 
                    description="Вы еще никому не отправляли заявки в друзья" 
                    icon={<UserPlus size={40} strokeWidth={1} />}
                  />
                ) : (
                  <div className="space-y-3">
                    {outgoing.map((row) => {
                      const other = row.addressee_id;
                      const p = resolvePeer(other);
                      const presence = presenceFromLastSeen(p.lastSeenAt);
                      return (
                        <div
                          key={row.id}
                          className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <button type="button" onClick={() => navigate(`/users/${other}`)} className="flex min-w-0 items-center gap-3 text-left">
                            <UserAvatar
                              user={{
                                id: other,
                                name: p.name || 'Ученик',
                                avatar: p.avatar || '',
                              }}
                              size="md"
                              presence={presence}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-white">{p.name}</p>
                              <p className="text-xs text-kiddy-textMuted">Ожидает ответа</p>
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
                            className="shrink-0 text-xs font-bold uppercase tracking-widest text-kiddy-textMuted hover:text-white disabled:opacity-50"
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
            <div className="py-10">
              <AnimatedEmptyState message="Загружаем друзей" />
            </div>
          ) : friends.length === 0 ? (
            <EmptyState 
              title="Нет друзей" 
              description="Пока нет друзей — загляните во «Все» и отправьте заявку." 
              icon={<Users size={40} strokeWidth={1} />}
            />
          ) : (
            <div className="space-y-2">{friends.map((row, i) => renderFriendRow(row, i))}</div>
          )}
        </section>
      )}
    </div>
  );
};
