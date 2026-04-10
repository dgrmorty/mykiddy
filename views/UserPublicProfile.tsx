import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { AvatarImage } from '../components/AvatarImage';
import { BadgeOrb } from '../components/BadgeOrb';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../services/supabase';
import { Role, COURSE_YEAR_LABELS } from '../types';
import { useFriendships, friendshipStateForPair } from '../hooks/useFriendships';
import { useBadgeProgress } from '../hooks/useBadgeProgress';
import { useContent } from '../hooks/useContent';
import { useSkillData } from '../hooks/useSkillData';
import { BADGE_CATALOG, getBadgeById } from '../data/badgeCatalog';
import { levelFromXp } from '../progression';
import {
  ChevronLeft,
  Loader2,
  UserPlus,
  UserCheck,
  Clock,
  XCircle,
  Users,
  Award,
  Target,
  BookOpen,
  Check,
  Lock,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { fetchUserShowcasePosts, mediaPublicUrl, deleteShowcasePost, type ShowcasePostRow } from '../services/projectShowcaseService';
import { showcasePostBody, type PhraseSelections, type MediaItem } from '../data/projectShowcaseCatalog';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

interface PublicProfileRow {
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

export const UserPublicProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [showcasePosts, setShowcasePosts] = useState<ShowcasePostRow[]>([]);
  const [loadingShowcase, setLoadingShowcase] = useState(false);
  const [deletingShowcaseId, setDeletingShowcaseId] = useState<string | null>(null);

  const myId = user.id !== 'guest' ? user.id : undefined;
  const { rows, loading: loadingFriends, sendRequest, accept, remove } = useFriendships(myId);
  const { stats: badgeStats, loading: loadingBadges, equippedIds } = useBadgeProgress(userId, { publicView: true });
  const { courses, loading: loadingCourses, loadError: coursesError } = useContent(userId);
  const skillData = useSkillData(courses);

  const lessonTotals = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const c of courses) {
      for (const m of c.modules) {
        for (const l of m.lessons) {
          total++;
          if (l.isCompleted) done++;
        }
      }
    }
    return { total, done };
  }, [courses]);

  useEffect(() => {
    if (!userId) {
      setLoadError(true);
      setLoadingProfile(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      setLoadError(false);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar, xp, level, role')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data || !isStudentRole(data.role)) {
        setProfile(null);
        setLoadError(true);
      } else {
        setProfile(data as PublicProfileRow);
      }
      setLoadingProfile(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || loadError) {
      setShowcasePosts([]);
      setLoadingShowcase(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingShowcase(true);
      try {
        const list = await fetchUserShowcasePosts(userId);
        if (!cancelled) setShowcasePosts(list);
      } catch {
        if (!cancelled) setShowcasePosts([]);
      } finally {
        if (!cancelled) setLoadingShowcase(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, loadError]);

  const canUseFriends = user.role === Role.STUDENT && myId;
  const isAdminViewer = user.role === Role.ADMIN && user.id !== 'guest';

  const handleDeleteShowcasePost = async (postId: string) => {
    if (!isAdminViewer) return;
    if (!window.confirm('Удалить этот пост с витрины? Действие нельзя отменить.')) return;
    setDeletingShowcaseId(postId);
    try {
      await deleteShowcasePost(postId);
      showToast('Пост удалён', 'success');
      setShowcasePosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      showToast('Не удалось удалить пост', 'error');
    } finally {
      setDeletingShowcaseId(null);
    }
  };

  const pairState = useMemo(() => {
    if (!myId || !userId) return { row: null, label: 'none' as const };
    return friendshipStateForPair(rows, myId, userId);
  }, [rows, myId, userId]);

  if (user.id === 'guest') {
    return <Navigate to="/" replace />;
  }

  if (userId && userId === user.id) {
    return <Navigate to="/profile" replace />;
  }

  const handleAddFriend = async () => {
    if (!userId || !canUseFriends) return;
    setActionBusy(true);
    const { error } = await sendRequest(userId);
    setActionBusy(false);
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') showToast('Заявка уже есть', 'error');
      else showToast('Не удалось отправить заявку', 'error');
    } else showToast('Заявка отправлена', 'success');
  };

  const handleAccept = async () => {
    if (!pairState.row) return;
    setActionBusy(true);
    const { error } = await accept(pairState.row.id);
    setActionBusy(false);
    if (error) showToast('Не удалось принять заявку', 'error');
    else showToast('Теперь вы в друзьях', 'success');
  };

  const handleRemove = async () => {
    if (!pairState.row) return;
    setActionBusy(true);
    const { error } = await remove(pairState.row.id);
    setActionBusy(false);
    if (error) showToast('Не удалось обновить', 'error');
    else showToast('Готово', 'success');
  };

  const xp = profile?.xp ?? 0;
  const level = levelFromXp(xp);
  const statsReady = profile && !loadingBadges;
  const showProgressSection = statsReady && !loadingCourses;

  return (
    <div className="space-y-8 pb-20">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-kiddy-textMuted text-sm font-bold hover:text-white transition-colors"
      >
        <ChevronLeft size={18} /> Назад
      </button>

      {loadingProfile ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-kiddy-cherry" size={40} />
        </div>
      ) : loadError || !profile ? (
        <Card className="p-10 text-center">
          <p className="text-white font-bold text-lg mb-2">Профиль недоступен</p>
          <p className="text-kiddy-textMuted text-sm mb-6">Такого ученика нет или у вас нет доступа к этой странице.</p>
          <button
            type="button"
            onClick={() => navigate('/community')}
            className="text-kiddy-cherry text-sm font-bold hover:underline"
          >
            К каталогу учеников →
          </button>
        </Card>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-kiddy-surfaceElevated/80 p-8 md:p-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-20%,rgba(230,0,43,0.12),transparent)]" />
            <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-kiddy-cherry/20 blur-2xl scale-110" />
                <div className="relative h-44 w-44 md:h-48 md:w-48">
                  {equippedIds
                    .filter((id): id is string => Boolean(id && getBadgeById(id)))
                    .map((id, i, placed) => {
                      const n = placed.length;
                      const cx = 88;
                      const r = 76;
                      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
                      const left = cx + r * Math.cos(angle) - 17;
                      const top = cx + r * Math.sin(angle) - 17;
                      const b = getBadgeById(id)!;
                      return (
                        <div key={`${id}-${i}`} className="absolute z-20" style={{ left, top, width: 34, height: 34 }}>
                          <BadgeOrb tier={b.tier} icon={b.icon} size={34} />
                        </div>
                      );
                    })}
                  <div className="absolute left-1/2 top-1/2 z-10 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-2 border-white/10 bg-zinc-950 shadow-2xl md:h-32 md:w-32">
                    <AvatarImage
                      src={
                        profile.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'U')}&background=random`
                      }
                      name={profile.name || 'У'}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black px-3 py-1 text-[10px] font-bold text-white">
                    LVL {level}
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left min-w-0">
                <p className="text-kiddy-cherry text-[10px] font-bold uppercase tracking-[0.35em] mb-2">Ученик</p>
                <h1 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight italic mb-4 break-words">
                  {profile.name || 'Ученик'}
                </h1>
                <p className="text-kiddy-textMuted text-sm font-mono mb-2">
                  {xp.toLocaleString()} <span className="text-kiddy-textSecondary">XP</span>
                </p>
                {statsReady && badgeStats?.leaderboardRank != null && (
                  <p className="text-kiddy-textMuted text-xs mb-6">
                    Место в рейтинге: <span className="font-bold text-white">#{badgeStats.leaderboardRank}</span>
                  </p>
                )}
                {!statsReady && (
                  <div className="mb-6 flex justify-center md:justify-start">
                    <Loader2 className="animate-spin text-kiddy-cherry/80" size={22} />
                  </div>
                )}

                {!loadingFriends && canUseFriends && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    {pairState.label === 'none' && (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={handleAddFriend}
                        className="inline-flex items-center gap-2 rounded-xl bg-kiddy-cherry px-5 py-3 text-sm font-bold text-white shadow-lg shadow-kiddy-cherry/20 transition-all hover:bg-kiddy-cherryHover disabled:opacity-50"
                      >
                        {actionBusy ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                        В друзья
                      </button>
                    )}
                    {pairState.label === 'outgoing' && (
                      <span className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200">
                        <Clock size={16} /> Заявка отправлена
                      </span>
                    )}
                    {pairState.label === 'incoming' && pairState.row && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={handleAccept}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {actionBusy ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
                          Принять
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={handleRemove}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-kiddy-textMuted hover:text-white disabled:opacity-50"
                        >
                          <XCircle size={18} /> Отклонить
                        </button>
                      </>
                    )}
                    {pairState.label === 'friends' && (
                      <>
                        <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200">
                          <Users size={16} /> У вас в друзьях
                        </span>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={handleRemove}
                          className="text-xs font-bold uppercase tracking-widest text-kiddy-textMuted hover:text-kiddy-cherry transition-colors"
                        >
                          Убрать из друзей
                        </button>
                      </>
                    )}
                  </div>
                )}

                {!canUseFriends && user.role !== Role.STUDENT && (
                  <p className="text-kiddy-textMuted text-xs max-w-md">
                    Добавлять в друзья могут только ученики. Вы можете просматривать профили одноклассников.
                  </p>
                )}
              </div>
            </div>
          </section>

          {statsReady && badgeStats && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="border-white/[0.06]" noPadding>
                <div className="flex items-center gap-3 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04]">
                    <BookOpen className="text-kiddy-cherry" size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">Уроки</p>
                    <p className="font-display text-2xl font-bold text-white">
                      {badgeStats.lessonsCompleted}
                      {lessonTotals.total > 0 && (
                        <span className="text-base font-semibold text-kiddy-textMuted"> / {lessonTotals.total}</span>
                      )}
                    </p>
                    <p className="text-kiddy-textMuted text-xs mt-0.5">завершено в каталоге</p>
                  </div>
                </div>
              </Card>
              <Card className="border-white/[0.06]" noPadding>
                <div className="flex items-center gap-3 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04]">
                    <Award className="text-amber-400/90" size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">Домашки</p>
                    <p className="font-display text-2xl font-bold text-white">{badgeStats.homeworkSubmitted}</p>
                    <p className="text-kiddy-textMuted text-xs mt-0.5">сдано через платформу</p>
                  </div>
                </div>
              </Card>
              <Card className="border-white/[0.06]" noPadding>
                <div className="flex items-center gap-3 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04]">
                    <Target className="text-emerald-400/90" size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">Рейтинг</p>
                    <p className="font-display text-2xl font-bold text-white">
                      {badgeStats.leaderboardRank != null ? `#${badgeStats.leaderboardRank}` : '—'}
                    </p>
                    <p className="text-kiddy-textMuted text-xs mt-0.5">по XP в школе</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {showProgressSection && coursesError && (
            <p className="text-kiddy-textMuted text-sm text-center">Курсы временно не загрузились — прогресс по модулям скрыт.</p>
          )}

          {showProgressSection && courses.length > 0 && (
            <Card className="border-white/[0.08] bg-kiddy-surfaceElevated/80 p-8 md:p-10" noPadding>
              <div className="mb-8 flex items-center gap-3 px-8 pt-8 md:px-10 md:pt-10">
                <Target size={18} className="text-kiddy-cherry" />
                <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white">Матрица компетенций</h3>
              </div>
              <div className="h-64 w-full px-4 pb-8 md:px-8">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                    <PolarGrid stroke="#18181b" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }} />
                    <Radar name="Уровень" dataKey="A" stroke="#be123c" fill="#be123c" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {(loadingShowcase || showcasePosts.length > 0) && (
            <section>
              <h3 className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-white">
                <Sparkles size={16} className="text-kiddy-cherry" />
                Витрина
              </h3>
              {loadingShowcase ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-kiddy-cherry/80" size={28} />
                </div>
              ) : (
                <div className="space-y-4">
                  {showcasePosts.map((post) => {
                    const text = showcasePostBody((post.phrase_selections || {}) as PhraseSelections);
                    const media = (post.media || []) as MediaItem[];
                    const statusLabel =
                      post.status === 'approved'
                        ? null
                        : post.status === 'pending'
                          ? 'На проверке'
                          : 'Нужны правки';
                    return (
                      <Card key={post.id} className="border-white/[0.08] bg-kiddy-surfaceElevated/60 p-5">
                        {(statusLabel || isAdminViewer) && (
                        <div
                          className={`mb-3 flex flex-wrap items-center gap-2 ${statusLabel ? 'justify-between' : 'justify-end'}`}
                        >
                          {statusLabel && (
                            <span className="inline-block rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
                              {statusLabel}
                            </span>
                          )}
                          {isAdminViewer && (
                            <button
                              type="button"
                              disabled={deletingShowcaseId === post.id}
                              onClick={() => void handleDeleteShowcasePost(post.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            >
                              {deletingShowcaseId === post.id ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              Удалить
                            </button>
                          )}
                        </div>
                        )}
                        <p className="text-sm text-kiddy-textSecondary leading-relaxed whitespace-pre-wrap">{text}</p>
                        {post.status === 'rejected' && post.reject_reason && (
                          <p className="mt-2 text-xs text-kiddy-textMuted border-l-2 border-kiddy-cherry/40 pl-3">
                            Комментарий наставника: {post.reject_reason}
                          </p>
                        )}
                        {media.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {media.map((m, i) =>
                              m.kind === 'video' ? (
                                <video
                                  key={i}
                                  src={mediaPublicUrl(m.path)}
                                  className="max-h-48 rounded-xl border border-white/10"
                                  controls
                                  muted
                                />
                              ) : (
                                <img
                                  key={i}
                                  src={mediaPublicUrl(m.path)}
                                  alt=""
                                  className="max-h-48 rounded-xl border border-white/10 object-cover"
                                />
                              ),
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {showProgressSection && courses.length > 0 && (
            <section>
              <h3 className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-white">
                <BookOpen size={16} className="text-kiddy-cherry" />
                Прогресс по курсам
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {courses.map((course) => (
                  <Card key={course.id} className="border-white/[0.06] p-5">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <h4 className="font-bold text-white leading-snug">{course.title}</h4>
                      <span className="shrink-0 rounded-full border border-white/[0.08] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-kiddy-textMuted">
                        {COURSE_YEAR_LABELS[course.yearTier]}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">
                      <span>Прогресс</span>
                      <span className="text-white">{course.progress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-kiddy-surfaceHighlight">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-kiddy-cherry to-kiddy-cherryHover transition-all duration-500"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {statsReady && badgeStats && (
            <section>
              <h3 className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-white">
                <Award size={16} className="text-kiddy-cherry" />
                Достижения
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {BADGE_CATALOG.map((b) => {
                  const unlocked = b.isUnlocked(badgeStats);
                  const prog = b.progress(badgeStats);
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                        unlocked
                          ? 'border-white/[0.08] bg-kiddy-surfaceElevated/80'
                          : 'border-white/[0.04] bg-kiddy-surfaceElevated/40 opacity-75'
                      }`}
                    >
                      <BadgeOrb tier={b.tier} icon={b.icon} size={44} locked={!unlocked} />
                      <div className="min-w-0 flex-1">
                        <span className={`font-bold text-sm ${unlocked ? 'text-white' : 'text-kiddy-textMuted'}`}>{b.title}</span>
                        <p className="mt-0.5 text-xs text-kiddy-textMuted">{b.requirement}</p>
                        {!unlocked && (
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-kiddy-cherry/60 transition-all duration-500"
                              style={{ width: `${prog * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {unlocked ? (
                        <Check size={16} className="shrink-0 text-emerald-400" />
                      ) : (
                        <Lock size={14} className="shrink-0 text-kiddy-textMuted" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
