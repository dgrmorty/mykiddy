import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { AvatarImage } from '../components/AvatarImage';
import { BadgeOrb } from '../components/BadgeOrb';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../services/supabase';
import { Role, COURSE_YEAR_LABELS } from '../types';
import { useFriendships, friendshipStateForPair, type FriendshipRow } from '../hooks/useFriendships';
import { useBadgeProgress } from '../hooks/useBadgeProgress';
import { useContent } from '../hooks/useContent';
import { BADGE_CATALOG } from '../data/badgeCatalog';
import { levelFromXp, xpLevelProgressPercent } from '../progression';
import { AnimatedIcon } from '../components/ui/AnimatedIcon';
import {
  ChevronLeft,
  Loader2,
  UserPlus,
  UserCheck,
  Clock,
  XCircle,
  Users,
  Crown,
  Check,
  Sparkles,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { fetchUserShowcasePosts, mediaPublicUrl, deleteShowcasePost, type ShowcasePostRow } from '../services/projectShowcaseService';
import { showcasePostBody, type PhraseSelections, type MediaItem } from '../data/projectShowcaseCatalog';
import { resolveBundledOrDefault } from '../data/defaultAvatars';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

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
  const { stats: badgeStats, loading: loadingBadges } = useBadgeProgress(userId, { publicView: true });
  const { courses, loading: loadingCourses } = useContent(userId);

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
      const { data, error } = await supabase.rpc('get_public_student_profile', { p_id: userId });
      const row = Array.isArray(data) ? data[0] : data;
      if (cancelled) return;
      if (error || !row || !isStudentRole(row.role)) {
        setProfile(null);
        setLoadError(true);
      } else {
        setProfile(row as PublicProfileRow);
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

  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!statsRef.current) return;
    const ctx = gsap.context(() => {
      if (isStatsExpanded) {
        gsap.to(statsRef.current, { height: 'auto', opacity: 1, duration: 0.6, ease: 'expo.out', marginTop: 16 });
      } else {
        gsap.to(statsRef.current, { height: 0, opacity: 0, duration: 0.4, ease: 'expo.out', marginTop: 0 });
      }
    }, statsRef);
    return () => ctx.revert();
  }, [isStatsExpanded]);

  const [isBadgesExpanded, setIsBadgesExpanded] = useState(false);
  const badgesRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!badgesRef.current) return;
    const ctx = gsap.context(() => {
      if (isBadgesExpanded) {
        gsap.to(badgesRef.current, { height: 'auto', opacity: 1, duration: 0.6, ease: 'expo.out', marginTop: 16 });
      } else {
        gsap.to(badgesRef.current, { height: 0, opacity: 0, duration: 0.4, ease: 'expo.out', marginTop: 0 });
      }
    }, badgesRef);
    return () => ctx.revert();
  }, [isBadgesExpanded]);

  const [isCoursesExpanded, setIsCoursesExpanded] = useState(false);
  const coursesRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!coursesRef.current) return;
    const ctx = gsap.context(() => {
      if (isCoursesExpanded) {
        gsap.to(coursesRef.current, { height: 'auto', opacity: 1, duration: 0.6, ease: 'expo.out', marginTop: 16 });
      } else {
        gsap.to(coursesRef.current, { height: 0, opacity: 0, duration: 0.4, ease: 'expo.out', marginTop: 0 });
      }
    }, coursesRef);
    return () => ctx.revert();
  }, [isCoursesExpanded]);

  const [userFriendships, setUserFriendships] = useState<FriendshipRow[]>([]);
  const [loadingUserFriends, setLoadingUserFriends] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoadingUserFriends(true);
      try {
        const { data, error } = await supabase
          .from('friendships')
          .select('*')
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
          .eq('status', 'accepted');
        if (error) throw error;
        if (!cancelled) setUserFriendships((data as FriendshipRow[]) || []);
      } catch {
        if (!cancelled) setUserFriendships([]);
      } finally {
        if (!cancelled) setLoadingUserFriends(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const [communityStudents, setCommunityStudents] = useState<any[]>([]);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('list_community_students');
        if (error) throw error;
        if (!cancelled) setCommunityStudents(data || []);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const userFriendsList = useMemo(() => {
    if (!communityStudents.length || !userFriendships.length) return [];
    const friendIds = new Set(userFriendships.map(r => r.requester_id === userId ? r.addressee_id : r.requester_id));
    return communityStudents.filter(s => friendIds.has(s.id));
  }, [communityStudents, userFriendships, userId]);

  const [isFriendsExpanded, setIsFriendsExpanded] = useState(false);
  const userFriendsRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!userFriendsRef.current) return;
    const ctx = gsap.context(() => {
      if (isFriendsExpanded) {
        gsap.to(userFriendsRef.current, { height: 'auto', opacity: 1, duration: 0.6, ease: 'expo.out', marginTop: 16 });
      } else {
        gsap.to(userFriendsRef.current, { height: 0, opacity: 0, duration: 0.4, ease: 'expo.out', marginTop: 0 });
      }
    }, userFriendsRef);
    return () => ctx.revert();
  }, [isFriendsExpanded]);

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

  const renderFriendButtons = () => {
    if (!canUseFriends && !isAdminViewer) return null;
    if (loadingFriends) return <Loader2 className="animate-spin text-white" size={18} />;
    
    if (canUseFriends) {
      if (pairState.label === 'none') {
        return (
          <button
            type="button"
            disabled={actionBusy}
            onClick={handleAddFriend}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2.5 text-xs font-bold shadow-premium transition-all hover:bg-zinc-200 disabled:opacity-50"
          >
            {actionBusy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            В друзья
          </button>
        );
      }
      if (pairState.label === 'outgoing') {
        return (
          <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-400">
            <Clock size={16} /> Заявка отправлена
          </span>
        );
      }
      if (pairState.label === 'incoming' && pairState.row) {
        return (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleAccept}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2.5 text-xs font-bold shadow-premium hover:bg-zinc-200 disabled:opacity-50"
            >
              {actionBusy ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
              Принять
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleRemove}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-50"
            >
              <XCircle size={16} />
            </button>
          </div>
        );
      }
      if (pairState.label === 'friends') {
        return (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400">
              <Users size={16} /> В друзьях
            </span>
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleRemove}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-kiddy-cherry transition-colors"
            >
              Удалить
            </button>
          </div>
        );
      }
    }
    return null;
  };

  if (loadingProfile) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="space-y-8 pb-20 max-w-4xl mx-auto">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 text-sm font-bold hover:text-white transition-colors">
          <ChevronLeft size={18} /> Назад
        </button>
        <div className="rounded-[2rem] bg-white/5 border border-white/10 shadow-premium p-10 text-center">
          <p className="text-white font-bold text-lg mb-2">Профиль недоступен</p>
          <p className="text-zinc-500 text-sm mb-6">Такого ученика нет или у вас нет доступа к этой странице.</p>
          <button type="button" onClick={() => navigate('/community')} className="text-white text-sm font-bold hover:underline">
            К каталогу учеников →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ========================================= */}
      {/* MOBILE VIEW                               */}
      {/* ========================================= */}
      <div className="md:hidden space-y-6 pb-24 max-md:pb-28">
        <div className="px-4">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 text-sm font-bold hover:text-white transition-colors pt-4">
            <ChevronLeft size={18} /> Назад
          </button>
        </div>

        {/* Sticky Header Island */}
        <section className="sticky top-4 z-40 mx-auto w-full max-w-3xl rounded-[2.5rem] bg-black/80 backdrop-blur-2xl border border-white/10 shadow-island p-4 transition-all animate-slide-up">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <AvatarImage
                  src={resolveBundledOrDefault(profile.id, profile.avatar)}
                  name={profile.name || 'У'}
                  alt=""
                  className="h-14 w-14 rounded-full border border-white/20 object-cover"
                />
                <div className="absolute -bottom-1 -right-1 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-black z-20">
                  LVL {level}
                </div>
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Crown className="text-white shrink-0" size={12} />
                  <span className="text-zinc-400 text-[9px] font-bold uppercase tracking-[0.2em] truncate">Ученик</span>
                </div>
                <h1 className="text-xl font-display font-bold text-white tracking-tight truncate">
                  {profile.name}
                </h1>
              </div>
            </div>
            <div className="shrink-0">
              {renderFriendButtons()}
            </div>
          </div>
        </section>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Stats Island */}
          <div className="w-full rounded-[2rem] border border-white/10 bg-black p-5 shadow-island animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <button 
              onClick={() => setIsStatsExpanded(!isStatsExpanded)}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-white text-zinc-500 transition-colors">
                  <AnimatedIcon name="zap" size={20} active={isStatsExpanded} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-zinc-300 transition-colors">Статистика</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">
                    {xp.toLocaleString()} XP • Ранг #{badgeStats?.leaderboardRank ?? '—'}
                  </p>
                </div>
              </div>
              <ChevronDown size={20} className={`text-zinc-500 transition-transform duration-500 ${isStatsExpanded ? 'rotate-180' : ''}`} />
            </button>

            <div ref={statsRef} className="overflow-hidden h-0 opacity-0">
              <div className="grid grid-cols-2 gap-4 mb-6 mt-6">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Опыт</p>
                  <p className="text-2xl font-display font-bold text-white">{xp.toLocaleString()}</p>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400">
                      <span>Прогресс</span>
                      <span>{Math.min(100, xpLevelProgressPercent(xp)).toFixed(0)}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, xpLevelProgressPercent(xp))}%` }} />
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Рейтинг</p>
                    <p className="text-2xl font-display font-bold text-white">#{badgeStats?.leaderboardRank ?? '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Island */}
          {statsReady && badgeStats && (
            <div className="w-full rounded-[2rem] border border-white/10 bg-black p-5 shadow-island animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <button 
                onClick={() => setIsBadgesExpanded(!isBadgesExpanded)}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-white text-zinc-500 transition-colors">
                    <AnimatedIcon name="sparkle" size={20} active={isBadgesExpanded} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-zinc-300 transition-colors">Достижения</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">
                      {BADGE_CATALOG.filter(b => b.isUnlocked(badgeStats)).length} / {BADGE_CATALOG.length} открыто
                    </p>
                  </div>
                </div>
                <ChevronDown size={20} className={`text-zinc-500 transition-transform duration-500 ${isBadgesExpanded ? 'rotate-180' : ''}`} />
              </button>

              <div ref={badgesRef} className="overflow-hidden h-0 opacity-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {BADGE_CATALOG.map((b) => {
                    const unlocked = b.isUnlocked(badgeStats);
                    const prog = b.progress(badgeStats);
                    return (
                      <div
                        key={b.id}
                        className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${
                          unlocked ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5 opacity-50'
                        }`}
                      >
                        <BadgeOrb tier={b.tier} icon={b.icon} size={40} locked={!unlocked} />
                        <div className="flex-1 min-w-0">
                          <span className={`font-bold text-sm truncate block ${unlocked ? 'text-white' : 'text-zinc-500'}`}>{b.title}</span>
                          <p className="text-zinc-500 text-[10px] mt-0.5 leading-tight">{b.requirement}</p>
                          {!unlocked && (
                            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${prog * 100}%` }} />
                            </div>
                          )}
                        </div>
                        {unlocked && <Check size={14} className="text-white shrink-0 mr-1" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Courses Island */}
          {showProgressSection && courses.length > 0 && (
            <div className="w-full rounded-[2rem] border border-white/10 bg-black p-5 shadow-island animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <button 
                onClick={() => setIsCoursesExpanded(!isCoursesExpanded)}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-white text-zinc-500 transition-colors">
                    <AnimatedIcon name="book" size={20} active={isCoursesExpanded} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-zinc-300 transition-colors">Прогресс по курсам</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">
                      {courses.length} курсов
                    </p>
                  </div>
                </div>
                <ChevronDown size={20} className={`text-zinc-500 transition-transform duration-500 ${isCoursesExpanded ? 'rotate-180' : ''}`} />
              </button>

              <div ref={coursesRef} className="overflow-hidden h-0 opacity-0">
                <div className="grid grid-cols-1 gap-4 mt-4">
                  {courses.map((course) => (
                    <div key={course.id} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <h4 className="font-bold text-white text-sm leading-snug">{course.title}</h4>
                        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                          {COURSE_YEAR_LABELS[course.yearTier]}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        <span>Прогресс</span>
                        <span className="text-white">{course.progress}%</span>
                      </div>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-white transition-all duration-500"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Friends Island */}
          {!loadingUserFriends && userFriendsList.length > 0 && (
            <div className="w-full rounded-[2rem] border border-white/10 bg-black p-5 shadow-island animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <button 
                onClick={() => setIsFriendsExpanded(!isFriendsExpanded)}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-white text-zinc-500 transition-colors">
                    <AnimatedIcon name="usersGroup" size={20} active={isFriendsExpanded} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-zinc-300 transition-colors">Друзья</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">
                      {userFriendsList.length} друзей
                    </p>
                  </div>
                </div>
                <ChevronDown size={20} className={`text-zinc-500 transition-transform duration-500 ${isFriendsExpanded ? 'rotate-180' : ''}`} />
              </button>

              <div ref={userFriendsRef} className="overflow-hidden h-0 opacity-0">
                <div className="grid grid-cols-1 gap-3 mt-4">
                  {userFriendsList.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => navigate(`/users/${friend.id}`)}
                      className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-colors text-left"
                    >
                      <AvatarImage
                        src={resolveBundledOrDefault(friend.id, friend.avatar)}
                        name={friend.name || 'Ученик'}
                        alt=""
                        className="h-10 w-10 rounded-full border border-white/10 object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-sm truncate">{friend.name}</p>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">Ур. {levelFromXp(friend.xp || 0)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Showcase Section */}
          {(loadingShowcase || showcasePosts.length > 0) && (
            <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <h3 className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-white px-2">
                <Sparkles size={16} className="text-white" />
                Витрина
              </h3>
              {loadingShowcase ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-white" size={28} />
                </div>
              ) : (
                <div className="space-y-4">
                  {showcasePosts.map((post) => {
                    const text = showcasePostBody((post.phrase_selections || {}) as PhraseSelections);
                    const media = (post.media || []) as MediaItem[];
                    return (
                      <div key={post.id} className="rounded-[2rem] bg-white/5 border border-white/10 shadow-premium p-6">
                        {isAdminViewer && (
                          <div className="mb-4 flex justify-end">
                            <button
                              type="button"
                              disabled={deletingShowcaseId === post.id}
                              onClick={() => void handleDeleteShowcasePost(post.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                            >
                              {deletingShowcaseId === post.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                              Удалить
                            </button>
                          </div>
                        )}
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{text}</p>
                        {media.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {media.map((m, i) =>
                              m.kind === 'video' ? (
                                <video key={i} src={mediaPublicUrl(m.path)} className="max-h-48 rounded-xl border border-white/10" controls muted />
                              ) : (
                                <img key={i} src={mediaPublicUrl(m.path)} alt="" className="max-h-48 rounded-xl border border-white/10 object-cover" />
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* ========================================= */}
      {/* DESKTOP VIEW                                */}
      {/* ========================================= */}
      <div className="hidden md:block space-y-8 pb-20 max-w-4xl mx-auto">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 text-sm font-bold hover:text-white transition-colors pt-4">
          <ChevronLeft size={18} /> Назад
        </button>

        {/* Profile Header Card */}
        <section className="relative w-full rounded-[3rem] bg-white/5 border border-white/10 shadow-premium p-8 md:p-12 overflow-hidden animate-slide-up">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="relative shrink-0">
              <AvatarImage
                src={resolveBundledOrDefault(profile.id, profile.avatar)}
                name={profile.name || 'У'}
                alt=""
                className="h-32 w-32 rounded-full border-2 border-white/20 object-cover shadow-2xl"
              />
              <div className="absolute -bottom-2 -right-2 bg-white text-black text-xs font-bold px-2.5 py-1 rounded-full border-2 border-black z-20 shadow-lg">
                LVL {level}
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Crown className="text-white shrink-0" size={14} />
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.3em]">Ученик</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight mb-2">
                {profile.name}
              </h1>
            </div>

            <div className="shrink-0 w-full md:w-auto mt-4 md:mt-0">
              {renderFriendButtons()}
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-[2rem] bg-white/5 border border-white/10 shadow-premium p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <AnimatedIcon name="zap" size={24} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Опыт</p>
                  <p className="text-3xl font-display font-bold text-white">{xp.toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <span>Прогресс уровня</span>
                  <span>{Math.min(100, xpLevelProgressPercent(xp)).toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, xpLevelProgressPercent(xp))}%` }} />
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white/5 border border-white/10 shadow-premium p-8 flex flex-col justify-between animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <AnimatedIcon name="user" size={24} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Рейтинг</p>
                  <p className="text-3xl font-display font-bold text-white">#{badgeStats?.leaderboardRank ?? '—'}</p>
                </div>
              </div>
            </div>
        </section>

        {/* Achievements Section */}
        {statsReady && badgeStats && (
          <section className="rounded-[2rem] bg-white/5 border border-white/10 shadow-premium p-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                <AnimatedIcon name="sparkle" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Достижения</h3>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                  {BADGE_CATALOG.filter(b => b.isUnlocked(badgeStats)).length} / {BADGE_CATALOG.length} открыто
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BADGE_CATALOG.map((b) => {
                const unlocked = b.isUnlocked(badgeStats);
                const prog = b.progress(badgeStats);
                return (
                  <div
                    key={b.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      unlocked ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5 opacity-50'
                    }`}
                  >
                    <BadgeOrb tier={b.tier} icon={b.icon} size={48} locked={!unlocked} />
                    <div className="flex-1 min-w-0">
                      <span className={`font-bold text-sm truncate block ${unlocked ? 'text-white' : 'text-zinc-500'}`}>{b.title}</span>
                      <p className="text-zinc-500 text-[10px] mt-1 leading-tight">{b.requirement}</p>
                      {!unlocked && (
                        <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${prog * 100}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Courses Section */}
        {showProgressSection && courses.length > 0 && (
          <section className="rounded-[2rem] bg-white/5 border border-white/10 shadow-premium p-8 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                <AnimatedIcon name="book" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Прогресс по курсам</h3>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                  {courses.length} курсов
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {courses.map((course) => (
                <div key={course.id} className="bg-white/5 rounded-2xl p-6 border border-white/5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                    <h4 className="font-bold text-white leading-snug">{course.title}</h4>
                    <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      {COURSE_YEAR_LABELS[course.yearTier]}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <span>Прогресс</span>
                    <span className="text-white">{course.progress}%</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

              {/* Friends Section */}
              {!loadingUserFriends && userFriendsList.length > 0 && (
                <section className="rounded-[2rem] bg-white/5 border border-white/10 shadow-premium p-8 animate-slide-up" style={{ animationDelay: '0.6s' }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                      <AnimatedIcon name="usersGroup" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Друзья</h3>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                        {userFriendsList.length} друзей
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userFriendsList.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => navigate(`/users/${friend.id}`)}
                        className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-colors text-left"
                      >
                        <AvatarImage
                          src={resolveBundledOrDefault(friend.id, friend.avatar)}
                          name={friend.name || 'Ученик'}
                          alt=""
                          className="h-12 w-12 rounded-full border border-white/10 object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-sm truncate">{friend.name}</p>
                          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">Ур. {levelFromXp(friend.xp || 0)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Showcase Section */}
              {(loadingShowcase || showcasePosts.length > 0) && (
                <section className="animate-slide-up" style={{ animationDelay: '0.7s' }}>
            <h3 className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-white px-2">
              <Sparkles size={16} className="text-white" />
              Витрина
            </h3>
            {loadingShowcase ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-white" size={28} />
              </div>
            ) : (
              <div className="space-y-4">
                {showcasePosts.map((post) => {
                  const text = showcasePostBody((post.phrase_selections || {}) as PhraseSelections);
                  const media = (post.media || []) as MediaItem[];
                  return (
                    <div key={post.id} className="rounded-[2rem] bg-white/5 border border-white/10 shadow-premium p-8">
                      {isAdminViewer && (
                        <div className="mb-4 flex justify-end">
                          <button
                            type="button"
                            disabled={deletingShowcaseId === post.id}
                            onClick={() => void handleDeleteShowcasePost(post.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                          >
                            {deletingShowcaseId === post.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                            Удалить
                          </button>
                        </div>
                      )}
                      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{text}</p>
                      {media.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-3">
                          {media.map((m, i) =>
                            m.kind === 'video' ? (
                              <video key={i} src={mediaPublicUrl(m.path)} className="max-h-64 rounded-xl border border-white/10" controls muted />
                            ) : (
                              <img key={i} src={mediaPublicUrl(m.path)} alt="" className="max-h-64 rounded-xl border border-white/10 object-cover" />
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
};
