import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Role } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { AvatarImage } from '../components/AvatarImage';
import { Modal } from '../components/ui/Modal';
import {
  Crown,
  ChevronRight,
  Edit2,
  Check,
  X,
  Loader2,
  LogOut,
  AlertTriangle,
  Trophy,
  Medal,
  ChevronDown,
  Settings2,
} from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useContentContext } from '../contexts/ContentContext';
import { useContent } from '../hooks/useContent';
import { useSkillData } from '../hooks/useSkillData';
import { useBadgeProgress } from '../hooks/useBadgeProgress';
import { BadgeOrb } from '../components/BadgeOrb';
import { BADGE_CATALOG } from '../data/badgeCatalog';
import { levelFromXp, xpLevelProgressPercent } from '../progression';
import { AnimatedIcon } from '../components/ui/AnimatedIcon';
import { BadgePickerModal } from '../components/BadgePickerModal';
import { clearAllOnboardingKeys } from '../data/onboardingTour';
import { ShowcaseSubmitIsland } from '../components/ShowcaseSubmitIsland';
import {
  AVATAR_BOY_PATH,
  AVATAR_GIRL_PATH,
  defaultAvatarUrlForUserId,
  isBundledSchoolAvatar,
  resolveBundledOrDefault,
} from '../data/defaultAvatars';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);
interface ProfileProps {
  user: User;
}

export const Profile: React.FC<ProfileProps> = ({ user: initialUser }) => {
  const { user, refreshUser, signOut } = useAuth();
  const { resetNavigation } = useContentContext();
  const { courses } = useContent(user?.id !== 'guest' ? user?.id : undefined);
  const skillData = useSkillData(courses);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [editName, setEditName] = useState(() => (user.id !== 'guest' ? user : initialUser).name);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  
  const currentUser = user.id !== 'guest' ? user : initialUser;

  const badgeUserId = currentUser.id !== 'guest' ? currentUser.id : undefined;
  const { stats: badgeStats, equippedIds, setEquipped, refresh: refreshBadges } = useBadgeProgress(badgeUserId);

  useEffect(() => { refreshBadges(); }, [currentUser.xp, currentUser.level]);

  useEffect(() => {
    if (location.hash !== '#showcase-submit') return;
    const t = window.setTimeout(() => {
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      const el = document.getElementById(desktop ? 'showcase-submit-desktop' : 'showcase-submit-mobile');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  useEffect(() => {
    if (location.hash !== '#showcase-submit') return;
    if (currentUser.role !== Role.STUDENT || currentUser.id === 'guest') return;
    setShowcaseOpen(true);
  }, [location.hash, currentUser.role, currentUser.id]);

  useEffect(() => {
    setEditName(currentUser.name);
  }, [currentUser]);

  const profileAvatarSrc = resolveBundledOrDefault(currentUser.id, currentUser.avatar);
  const effectiveBundledAvatar = resolveBundledOrDefault(currentUser.id, currentUser.avatar);

  const saveBundledAvatar = async (path: typeof AVATAR_BOY_PATH | typeof AVATAR_GIRL_PATH) => {
    if (currentUser.id === 'guest') return;
    setAvatarSaving(true);
    try {
      const displayName = (currentUser.name || 'Ученик').trim();
      const { error } = await supabase.rpc('update_own_profile_patch', {
        p_name: displayName,
        p_avatar: path,
      });
      if (error) throw error;
      await refreshUser();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        await supabase.auth.updateUser({
          data: { ...meta, name: displayName, avatar: path },
        });
      }
      showToast('Персонаж обновлён', 'success');
    } catch {
      showToast('Не удалось сохранить', 'error');
    } finally {
      setAvatarSaving(false);
    }
  };

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

  const [isAvatarPickerExpanded, setIsAvatarPickerExpanded] = useState(false);
  const avatarPickerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!avatarPickerRef.current) return;
    const ctx = gsap.context(() => {
      if (isAvatarPickerExpanded) {
        gsap.to(avatarPickerRef.current, { height: 'auto', opacity: 1, duration: 0.6, ease: 'expo.out', marginTop: 16 });
      } else {
        gsap.to(avatarPickerRef.current, { height: 0, opacity: 0, duration: 0.4, ease: 'expo.out', marginTop: 0 });
      }
    }, avatarPickerRef);
    return () => ctx.revert();
  }, [isAvatarPickerExpanded]);

  const [myRank, setMyRank] = useState<number | null>(null);

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    setMyRank(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar, xp, level, role')
        .order('xp', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (data) {
        const mapRole = (r: string | null | undefined): Role => {
          const x = (r || '').toLowerCase();
          if (x === 'admin') return Role.ADMIN;
          if (x === 'teacher') return Role.TEACHER;
          if (x === 'parent') return Role.PARENT;
          return Role.STUDENT;
        };
        const mapped = data.map((u) => {
          const uxp = u.xp || 0;
          return {
            id: u.id,
            email: '',
            name: u.name || 'Анонимный',
            role: mapRole(u.role as string | null),
            avatar: resolveBundledOrDefault(u.id, u.avatar),
            level: levelFromXp(uxp),
            xp: uxp,
            isApproved: true,
          };
        });
        setLeaderboard(mapped);

        const inList = mapped.findIndex(u => u.id === currentUser.id);
        if (inList !== -1) {
          setMyRank(inList + 1);
        } else {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .gt('xp', currentUser.xp);
          setMyRank(count != null ? count + 1 : null);
        }
      }
    } catch (error: any) {
      console.error('[Profile] Leaderboard fetch error:', error);
      showToast('Ошибка загрузки лидерборда', 'error');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (currentUser.id && currentUser.id !== 'guest' && myRank === null) {
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gt('xp', currentUser.xp)
        .then(({ count }) => { if (count != null) setMyRank(count + 1); });
    }
  }, [currentUser.id, currentUser.xp]);

  useEffect(() => {
    if (isLeaderboardOpen) {
      fetchLeaderboard();
    }
  }, [isLeaderboardOpen]);

  const mapSaveError = (error: any): string => {
    let userMessage = 'Не удалось сохранить изменения';
    const msg = String(error?.message || error?.details || '');
    if (msg.toLowerCase().includes('empty name')) {
      userMessage = 'Введите имя';
    } else if (msg.includes('row-level security') || msg.includes('RLS')) {
      userMessage = 'Недостаточно прав для выполнения операции';
    } else if (msg.includes('permission') || msg.includes('доступ')) {
      userMessage = 'Недостаточно прав для выполнения операции';
    } else if (msg.includes('not found') || msg.includes('не найден')) {
      userMessage = 'Профиль не найден';
    }
    return userMessage;
  };

  const writeProfileToDb = async (name: string) => {
    if (currentUser.id === 'guest') throw new Error('Войдите в аккаунт');
    const trimName = name.trim();
    if (!trimName) throw new Error('empty name');
    const avatar = isBundledSchoolAvatar(currentUser.avatar)
      ? currentUser.avatar.trim()
      : defaultAvatarUrlForUserId(currentUser.id);

    const { error } = await supabase.rpc('update_own_profile_patch', {
      p_name: trimName,
      p_avatar: avatar,
    });
    if (error) throw error;
  };

  const handleSave = async () => {
    if (saving || currentUser.id === 'guest') return;
    setSaving(true);
    try {
      await writeProfileToDb(editName);
      await refreshUser();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        await supabase.auth.updateUser({ data: { ...meta, name: editName.trim() } });
      }
      setIsEditing(false);
      showToast('Изменения сохранены', 'success');
    } catch (error: any) {
      console.error('[Profile] Save error:', error);
      showToast(mapSaveError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      resetNavigation();
      setIsLogoutModalOpen(false);
      await signOut();
      // Перенаправление произойдет автоматически через AuthContext
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* ========================================= */}
      {/* MOBILE VIEW (from previous commit)        */}
      {/* ========================================= */}
      <div className="md:hidden space-y-6 pb-24 max-md:pb-28">
        {/* Sticky Header Island */}
        <section className="sticky top-4 z-40 mx-auto w-full max-w-3xl rounded-[2.5rem] bg-black/80 backdrop-blur-2xl border border-white/10 shadow-island p-4 transition-all animate-slide-up">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {isEditing ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/20 bg-zinc-800">
                  <img src={profileAvatarSrc} className="h-full w-full object-cover scale-110" alt="" />
                  {saving && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><Loader2 className="animate-spin text-white" size={16} /></div>}
                </div>
              ) : (
                <div className="relative shrink-0">
                  <UserAvatar user={currentUser} size="lg" />
                  <div className="absolute -bottom-1 -right-1 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-black z-20">
                    LVL {currentUser.level}
                  </div>
                </div>
              )}
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Crown className="text-white shrink-0" size={12} />
                  <span className="text-zinc-400 text-[9px] font-bold uppercase tracking-[0.2em] truncate">Верифицирован</span>
                </div>
                {isEditing ? (
                  <input 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-white/10 border border-white/20 text-lg font-display font-bold text-white outline-none w-full px-3 py-1 rounded-xl focus:border-white/40 transition-colors"
                    placeholder="Имя пользователя"
                    autoFocus
                  />
                ) : (
                  <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight truncate">
                    {currentUser.name}
                  </h1>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} disabled={saving} className="p-2.5 bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                  <button onClick={handleSave} disabled={saving} className="p-2.5 bg-white rounded-xl text-black shadow-premium hover:bg-zinc-200 transition-colors">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={2.5} />}
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors">
                  <Edit2 size={18} />
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Avatar Picker Island */}
          {currentUser.id !== 'guest' && (
            <div className="w-full rounded-[2rem] border border-white/10 bg-black p-5 shadow-island animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <button 
                onClick={() => setIsAvatarPickerExpanded(!isAvatarPickerExpanded)}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:text-white text-zinc-500 transition-colors">
                    <AnimatedIcon name="user" size={20} active={isAvatarPickerExpanded} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-zinc-300 transition-colors">Внешность</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">Сменить персонажа</p>
                  </div>
                </div>
                <ChevronDown size={20} className={`text-zinc-500 transition-transform duration-500 ${isAvatarPickerExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              <div ref={avatarPickerRef} className="overflow-hidden h-0 opacity-0">
                <p className="mb-4 text-xs text-zinc-400">Выберите персонажа, он сразу сохранится в профиле.</p>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    disabled={avatarSaving}
                    onClick={() => void saveBundledAvatar(AVATAR_BOY_PATH)}
                    className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-zinc-800 transition-all disabled:opacity-50 ${
                      effectiveBundledAvatar === AVATAR_BOY_PATH
                        ? 'border-white ring-2 ring-white/30'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img src={AVATAR_BOY_PATH} alt="" className="h-full w-full scale-110 object-cover" />
                  </button>
                  <button
                    type="button"
                    disabled={avatarSaving}
                    onClick={() => void saveBundledAvatar(AVATAR_GIRL_PATH)}
                    className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-zinc-800 transition-all disabled:opacity-50 ${
                      effectiveBundledAvatar === AVATAR_GIRL_PATH
                        ? 'border-white ring-2 ring-white/30'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img src={AVATAR_GIRL_PATH} alt="" className="h-full w-full scale-110 object-cover" />
                  </button>
                  {avatarSaving && <Loader2 className="animate-spin text-white" size={22} />}
                </div>
              </div>
            </div>
          )}

          {/* Stats Island (XP, Rank, Matrix) */}
          <div className="w-full rounded-[2rem] border border-white/10 bg-black p-5 shadow-island animate-slide-up" style={{ animationDelay: '0.2s' }}>
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
                    {currentUser.xp.toLocaleString()} XP • Ранг #{myRank ?? '—'}
                  </p>
                </div>
              </div>
              <ChevronDown size={20} className={`text-zinc-500 transition-transform duration-500 ${isStatsExpanded ? 'rotate-180' : ''}`} />
            </button>

            <div ref={statsRef} className="overflow-hidden h-0 opacity-0">
              <div className="grid grid-cols-2 gap-4 mb-6 mt-6">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Опыт</p>
                  <p className="text-2xl font-display font-bold text-white">{currentUser.xp.toLocaleString()}</p>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold uppercase text-zinc-400">
                      <span>До след. уровня</span>
                      <span>{Math.min(100, xpLevelProgressPercent(currentUser.xp)).toFixed(0)}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, xpLevelProgressPercent(currentUser.xp))}%` }} />
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Рейтинг</p>
                    <p className="text-2xl font-display font-bold text-white">#{myRank ?? '—'}</p>
                  </div>
                  <button 
                    onClick={() => setIsLeaderboardOpen(true)}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white hover:text-zinc-300 transition-colors group/btn w-fit"
                  >
                    Лидерборд <ChevronRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4 text-center">Матрица компетенций</p>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={skillData}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10, fontWeight: 600 }} />
                      <Radar name="Уровень" dataKey="A" stroke="#fff" fill="#fff" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Island */}
          {badgeUserId && (
            <div className="w-full rounded-[2rem] border border-white/10 bg-black p-5 shadow-island animate-slide-up" style={{ animationDelay: '0.3s' }}>
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
                      {BADGE_CATALOG.filter(b => badgeStats && b.isUnlocked(badgeStats)).length} / {BADGE_CATALOG.length} открыто
                    </p>
                  </div>
                </div>
                <ChevronDown size={20} className={`text-zinc-500 transition-transform duration-500 ${isBadgesExpanded ? 'rotate-180' : ''}`} />
              </button>

              <div ref={badgesRef} className="overflow-hidden h-0 opacity-0">
                <div className="flex justify-end mb-4 mt-4">
                  <button type="button" onClick={() => setBadgeModalOpen(true)} className="text-white text-[10px] uppercase tracking-widest font-bold hover:text-zinc-300 transition-colors flex items-center gap-1">
                    Настроить витрину <ChevronRight size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BADGE_CATALOG.map((b) => {
                    const unlocked = badgeStats ? b.isUnlocked(badgeStats) : false;
                    const prog = badgeStats ? b.progress(badgeStats) : 0;
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

          {/* Showcase Submit Island */}
          {currentUser.role === Role.STUDENT && currentUser.id !== 'guest' && (
            <ShowcaseSubmitIsland
              open={showcaseOpen}
              onOpenChange={setShowcaseOpen}
              anchorId="showcase-submit-mobile"
              className="animate-slide-up"
            />
          )}

          {/* Settings Section */}
          {currentUser.id !== 'guest' && (
            <div className="pt-4 animate-slide-up" style={{ animationDelay: '0.45s' }}>
              <button 
                onClick={() => {
                  clearAllOnboardingKeys(currentUser.id);
                  window.location.reload();
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white/5 border border-white/10 text-white rounded-[2rem] font-bold hover:bg-white/10 transition-all group"
              >
                <Settings2 size={18} className="group-hover:rotate-45 transition-transform" />
                Гид по разделам
              </button>
            </div>
          )}

          {/* Logout Section */}
          <div className="pt-4 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <button 
              onClick={() => setIsLogoutModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-kiddy-cherry/10 border border-kiddy-cherry/20 text-kiddy-cherry rounded-[2rem] font-bold hover:bg-kiddy-cherry/20 transition-all group"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              Выход из системы
            </button>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* DESKTOP VIEW (from current commit)        */}
      {/* ========================================= */}
      <div className="hidden md:block space-y-8 pb-20 max-w-4xl mx-auto">
        {/* Profile Header Card */}
        <section className="relative w-full rounded-[3rem] bg-white/5 border border-white/10 shadow-premium p-8 md:p-12 overflow-hidden animate-slide-up">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="relative shrink-0">
              <UserAvatar user={currentUser} size="xl" />
              <div className="absolute -bottom-2 -right-2 bg-white text-black text-xs font-bold px-2.5 py-1 rounded-full border-2 border-black z-20 shadow-lg">
                LVL {currentUser.level}
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Crown className="text-white shrink-0" size={14} />
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.3em]">Верифицирован</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight mb-2">
                {currentUser.name}
              </h1>
              <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
                ID: {currentUser.id.substring(0, 8)}
              </p>
            </div>

            <div className="shrink-0 w-full md:w-auto mt-4 md:mt-0">
              <button 
                onClick={() => setIsEditing(true)} 
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-white text-black rounded-2xl font-bold hover:bg-zinc-200 transition-all active:scale-[0.98]"
              >
                <Edit2 size={18} />
                Редактировать профиль
              </button>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <div className="rounded-[2rem] bg-white/5 border border-white/10 shadow-premium p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <AnimatedIcon name="zap" size={24} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Опыт</p>
                  <p className="text-3xl font-display font-bold text-white">{currentUser.xp.toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <span>До след. уровня</span>
                  <span>{Math.min(100, xpLevelProgressPercent(currentUser.xp)).toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, xpLevelProgressPercent(currentUser.xp))}%` }} />
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
                  <p className="text-3xl font-display font-bold text-white">#{myRank ?? '—'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsLeaderboardOpen(true)}
                className="flex items-center justify-between w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <span className="text-xs font-bold uppercase tracking-widest text-white">Лидерборд</span>
                <ChevronRight size={16} className="text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white/5 border border-white/10 shadow-premium p-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Матрица компетенций</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={skillData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10, fontWeight: 600 }} />
                  <Radar name="Уровень" dataKey="A" stroke="#fff" fill="#fff" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Achievements Section */}
        {badgeUserId && (
          <section className="rounded-[2rem] bg-white/5 border border-white/10 shadow-premium p-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <AnimatedIcon name="sparkle" size={24} />
                </div>
              <div>
                <h3 className="text-lg font-bold text-white">Достижения</h3>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                  {BADGE_CATALOG.filter(b => badgeStats && b.isUnlocked(badgeStats)).length} / {BADGE_CATALOG.length} открыто
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setBadgeModalOpen(true)} className="text-zinc-400 text-xs font-bold hover:text-white transition-colors flex items-center gap-1">
              Настроить <ChevronRight size={14} />
            </button>
          </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BADGE_CATALOG.map((b) => {
                const unlocked = badgeStats ? b.isUnlocked(badgeStats) : false;
                const prog = badgeStats ? b.progress(badgeStats) : 0;
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

        {/* Showcase Submit Island */}
        {currentUser.role === Role.STUDENT && currentUser.id !== 'guest' && (
          <ShowcaseSubmitIsland
            open={showcaseOpen}
            onOpenChange={setShowcaseOpen}
            anchorId="showcase-submit-desktop"
            className="animate-slide-up"
          />
        )}

        {/* Settings Section */}
        {currentUser.id !== 'guest' && (
          <div className="pt-4 animate-slide-up" style={{ animationDelay: '0.55s' }}>
            <button 
              onClick={() => {
                clearAllOnboardingKeys(currentUser.id);
                window.location.reload();
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-white/5 border border-white/10 text-white rounded-[2rem] font-bold hover:bg-white/10 transition-all group"
            >
              <Settings2 size={20} className="group-hover:rotate-45 transition-transform" />
              Гид по разделам
            </button>
          </div>
        )}

        {/* Logout Section */}
        <div className="pt-4 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-5 bg-kiddy-cherry/10 border border-kiddy-cherry/20 text-kiddy-cherry rounded-[2rem] font-bold hover:bg-kiddy-cherry/20 transition-all group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            Выход из системы
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditing} onClose={() => !saving && setIsEditing(false)} maxWidth="max-w-md">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-display font-bold text-white">Редактировать профиль</h2>
            <button onClick={() => setIsEditing(false)} disabled={saving} className="text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Имя пользователя</label>
              <input 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white text-lg font-bold px-4 py-4 rounded-2xl focus:border-white/30 focus:bg-white/10 transition-all outline-none"
                placeholder="Твое имя"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Внешность</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  disabled={avatarSaving}
                  onClick={() => void saveBundledAvatar(AVATAR_BOY_PATH)}
                  className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-zinc-800 transition-all disabled:opacity-50 ${
                    effectiveBundledAvatar === AVATAR_BOY_PATH
                      ? 'border-white ring-2 ring-white/30'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={AVATAR_BOY_PATH} alt="" className="h-full w-full scale-110 object-cover" />
                </button>
                <button
                  type="button"
                  disabled={avatarSaving}
                  onClick={() => void saveBundledAvatar(AVATAR_GIRL_PATH)}
                  className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-zinc-800 transition-all disabled:opacity-50 ${
                    effectiveBundledAvatar === AVATAR_GIRL_PATH
                      ? 'border-white ring-2 ring-white/30'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={AVATAR_GIRL_PATH} alt="" className="h-full w-full scale-110 object-cover" />
                </button>
                {avatarSaving && <div className="h-24 w-24 flex items-center justify-center"><Loader2 className="animate-spin text-white" size={24} /></div>}
              </div>
            </div>

            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="w-full flex items-center justify-center gap-2 py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all mt-4"
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Leaderboard Modal */}
      <Modal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} maxWidth="max-w-3xl">
          <div className="p-10 flex flex-col h-full">
              <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                      <Trophy className="text-white" size={32} />
                  </div>
                  <div>
                      <h2 className="text-3xl font-display font-bold text-white mb-1">Таблица лидеров</h2>
                      <p className="text-zinc-500 text-xs uppercase tracking-widest">Рейтинг по очкам опыта</p>
                  </div>
              </div>
              
              {loadingLeaderboard ? (
                  <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" size={40} />
                  </div>
              ) : (
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                      {leaderboard.map((user, index) => {
                          const isCurrentUser = user.id === currentUser.id;
                          const rank = index + 1;
                          const medalColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-zinc-400' : rank === 3 ? 'text-amber-600' : 'text-zinc-700';
                          
                          return (
                              <div
                                  key={user.id}
                                  role={isCurrentUser ? undefined : 'button'}
                                  tabIndex={isCurrentUser ? undefined : 0}
                                  onClick={isCurrentUser ? undefined : () => navigate(`/users/${user.id}`)}
                                  onKeyDown={
                                    isCurrentUser
                                      ? undefined
                                      : (e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            navigate(`/users/${user.id}`);
                                          }
                                        }
                                  }
                                  className={`p-4 rounded-xl border transition-all text-left w-full ${
                                      isCurrentUser
                                          ? 'bg-white/10 border-white/50 shadow-premium'
                                          : 'bg-[#0a0a0a] border-white/[0.08] hover:border-zinc-700 cursor-pointer'
                                  }`}
                              >
                                  <div className="flex items-center gap-4">
                                      <div className="flex items-center justify-center w-12">
                                          {rank <= 3 ? (
                                              <Medal className={medalColor} size={24} fill="currentColor" />
                                          ) : (
                                              <span className={`text-sm font-display font-bold ${isCurrentUser ? 'text-white' : 'text-zinc-500'}`}>
                                                  #{rank}
                                              </span>
                                          )}
                                      </div>
                                      
                                      {user.role === Role.STUDENT ? (
                                        <UserAvatar user={user} size="md" />
                                      ) : (
                                        <AvatarImage
                                          src={user.avatar}
                                          name={user.name}
                                          alt=""
                                          className="h-12 w-12 rounded-full border-2 border-white/[0.08] object-cover"
                                        />
                                      )}
                                      
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                              <h4 className={`font-bold text-sm truncate ${isCurrentUser ? 'text-white' : 'text-zinc-300'}`}>
                                                  {user.name}
                                              </h4>
                                              {isCurrentUser && (
                                                  <span className="px-2 py-0.5 bg-white/20 text-white text-[9px] font-bold rounded uppercase">
                                                      Вы
                                                  </span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-4 mt-1">
                                              <span className="text-zinc-500 text-xs">Уровень {user.level}</span>
                                              <span className="text-zinc-500 text-xs">•</span>
                                              <span className="text-zinc-500 text-xs">{user.xp.toLocaleString()} XP</span>
                                          </div>
                                      </div>
                                      
                                      <div className="text-right">
                                          <div className={`text-2xl font-display font-bold ${isCurrentUser ? 'text-white' : 'text-zinc-400'}`}>
                                              {user.xp.toLocaleString()}
                                          </div>
                                          <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Очков</div>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                      
                      {leaderboard.length > 0 && !leaderboard.some(u => u.id === currentUser.id) && myRank && (
                        <>
                          <div className="flex items-center gap-2 py-2 px-4">
                            <div className="flex-1 h-px bg-white/[0.06]" />
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Ваша позиция</span>
                            <div className="flex-1 h-px bg-white/[0.06]" />
                          </div>
                          <div className="p-4 rounded-xl border bg-white/10 border-white/50 shadow-premium">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-12">
                                <span className="text-sm font-display font-bold text-white">#{myRank}</span>
                              </div>
                              {currentUser.role === Role.STUDENT ? (
                                <UserAvatar user={currentUser} size="md" />
                              ) : (
                                <AvatarImage
                                  src={currentUser.avatar}
                                  name={currentUser.name}
                                  alt=""
                                  className="h-12 w-12 rounded-full border-2 border-white/30 object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm truncate text-white">{currentUser.name}</h4>
                                  <span className="px-2 py-0.5 bg-white/20 text-white text-[9px] font-bold rounded uppercase">Вы</span>
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-zinc-500 text-xs">Уровень {currentUser.level}</span>
                                  <span className="text-zinc-500 text-xs">•</span>
                                  <span className="text-zinc-500 text-xs">{currentUser.xp.toLocaleString()} XP</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-display font-bold text-white">{currentUser.xp.toLocaleString()}</div>
                                <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Очков</div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {leaderboard.length === 0 && (
                          <div className="text-center py-20">
                              <Trophy className="text-zinc-800 mx-auto mb-4" size={48} />
                              <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Лидерборд пуст</p>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} maxWidth="max-w-md">
          <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/20">
                  <AlertTriangle className="text-white" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-4">Завершить сеанс?</h2>
              <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
                  Вы уверены, что хотите выйти из аккаунта? Вам потребуется снова ввести данные для входа.
              </p>
              <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={() => setIsLogoutModalOpen(false)}
                    className="py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
                  >
                      Отмена
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all shadow-premium"
                  >
                      Выйти
                  </button>
              </div>
          </div>
      </Modal>

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
    </>
  );
};
