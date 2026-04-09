
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { 
    Award, Zap, Crown, Fingerprint, ChevronRight, Edit2, Check, X, Loader2, Camera, Target, 
    LogOut, AlertTriangle, Trophy, Medal, Lock, Check, Settings2
} from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { supabase, uploadFile } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useContentContext } from '../contexts/ContentContext';
import { useContent } from '../hooks/useContent';
import { useSkillData } from '../hooks/useSkillData';
import { useBadgeProgress } from '../hooks/useBadgeProgress';
import { BadgeOrb } from '../components/BadgeOrb';
import { BADGE_CATALOG, getBadgeById } from '../data/badgeCatalog';
import { levelFromXp, xpLevelProgressPercent } from '../progression';

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
  const [uploading, setUploading] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const currentUser = user.id !== 'guest' ? user : initialUser;

  const badgeUserId = currentUser.id !== 'guest' ? currentUser.id : undefined;
  const { stats: badgeStats, equippedIds, refresh: refreshBadges } = useBadgeProgress(badgeUserId);

  useEffect(() => { refreshBadges(); }, [currentUser.xp, currentUser.level]);
  
  const [editName, setEditName] = useState(currentUser.name);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(currentUser.name);
    setEditAvatar(currentUser.avatar);
  }, [currentUser]);

  const [myRank, setMyRank] = useState<number | null>(null);

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    setMyRank(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar, xp, level')
        .order('xp', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (data) {
        const mapped = data.map((u) => {
          const uxp = u.xp || 0;
          return {
            id: u.id,
            email: '',
            name: u.name || 'Анонимный',
            role: 'Student' as any,
            avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=random`,
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
    if (error?.message?.includes('row-level security') || error?.message?.includes('RLS')) {
      userMessage = 'Недостаточно прав для выполнения операции';
    } else if (error?.message?.includes('permission') || error?.message?.includes('доступ')) {
      userMessage = 'Недостаточно прав для выполнения операции';
    } else if (error?.message?.includes('not found') || error?.message?.includes('не найден')) {
      userMessage = 'Профиль не найден';
    }
    return userMessage;
  };

  const writeProfileToDb = async (name: string, avatar: string) => {
    if (currentUser.id === 'guest') throw new Error('Войдите в аккаунт');
    const updateData = { name, avatar };

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', currentUser.id)
      .single();

    if (!existingProfile) {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: currentUser.id,
        email: currentUser.email,
        name,
        avatar,
        role: 'Student',
        level: 1,
        xp: 0,
      });
      if (insertError) throw insertError;
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Профиль не найден или нет прав на обновление');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUser.id === 'guest') return;
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const looksImage =
      file.type.startsWith('image/') ||
      validMimes.includes(file.type) ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
    if (!looksImage) {
      showToast('Выберите изображение (JPG, PNG, GIF или WEBP)', 'error');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const publicUrl = await uploadFile(file, 'avatars');
      if (!publicUrl) {
        showToast('Ошибка загрузки изображения', 'error');
        return;
      }
      setEditAvatar(publicUrl);
      await writeProfileToDb(editName, publicUrl);
      await refreshUser();
      showToast('Фото сохранено', 'success');
    } catch (err: any) {
      console.error('[Profile] Avatar save error:', err);
      showToast(mapSaveError(err), 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (saving || uploading || currentUser.id === 'guest') return;
    setSaving(true);
    try {
      await writeProfileToDb(editName, editAvatar);
      await refreshUser();
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
    <div className="space-y-10 pb-20">
      <section className="stagger-1 relative h-72 md:h-80 w-full rounded-[3rem] overflow-hidden shadow-2xl group transition-all">
        <div className="absolute inset-0 bg-gradient-to-r from-kiddy-base via-kiddy-base/60 to-transparent z-10" />
        <img 
          src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:scale-105 transition-transform duration-1000" 
          alt="Banner" 
        />
        
        <div className="relative z-20 h-full flex flex-col justify-center px-8 md:px-16">
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group/avatar">
                    <div className="absolute inset-0 bg-kiddy-cherry blur-3xl opacity-20 animate-pulse" />
                    {/* Badge ring */}
                    <div className="relative w-44 h-44 md:w-48 md:h-48">
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
                            <div
                              key={`${id}-${i}`}
                              className="absolute z-20"
                              style={{ left, top, width: 34, height: 34 }}
                            >
                              <BadgeOrb
                                tier={b.tier}
                                icon={b.icon}
                                size={34}
                                onClick={() => badgeUserId && navigate('/settings', { state: { focusMedals: true } })}
                              />
                            </div>
                          );
                        })}
                      {/* Avatar centered — в режиме редактирования не button, иначе disabled блокирует выбор файла */}
                      {isEditing ? (
                        <div className="absolute left-1/2 top-1/2 z-10 h-28 w-28 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-white/10 bg-black shadow-2xl">
                          <img
                            src={
                              editAvatar ||
                              currentUser.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(editName || currentUser.name || 'U')}&background=random`
                            }
                            className="h-full w-full object-cover"
                            alt=""
                          />
                          {(uploading || saving) && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
                              <Loader2 className="animate-spin text-kiddy-cherry" size={32} />
                            </div>
                          )}
                          {!uploading && !saving && (
                            <>
                              <label
                                htmlFor="profile-avatar-input"
                                className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center rounded-full bg-black/45 transition-colors hover:bg-black/55"
                              >
                                <Camera className="pointer-events-none text-white" size={24} aria-hidden />
                                <span className="sr-only">Выбрать фото профиля</span>
                              </label>
                              <input
                                id="profile-avatar-input"
                                ref={fileInputRef}
                                type="file"
                                className="sr-only"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/*"
                                onChange={handleFileChange}
                              />
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate('/settings')}
                          className="absolute left-1/2 top-1/2 z-10 h-28 w-28 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-white/10 bg-black text-left shadow-2xl transition-all hover:border-kiddy-cherry/40 hover:ring-2 hover:ring-kiddy-cherry/20"
                        >
                          <img
                            src={
                              editAvatar ||
                              currentUser.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(editName || currentUser.name || 'U')}&background=random`
                            }
                            className="h-full w-full object-cover"
                            alt=""
                          />
                        </button>
                      )}
                      {!isEditing && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-3 py-1 rounded-full border border-black z-20 shadow-lg">
                          LVL {currentUser.level}
                        </div>
                      )}
                    </div>
                    {badgeUserId && (
                      <button
                        type="button"
                        onClick={() => navigate('/settings', { state: { focusMedals: true } })}
                        className="mt-2 flex items-center gap-1.5 mx-auto text-kiddy-cherry text-xs font-bold hover:underline transition-all"
                      >
                        <Settings2 size={12} /> Настройки и медали
                      </button>
                    )}
                </div>

                <div className="flex-1 text-center md:text-left space-y-2 w-full md:w-auto">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                        <Crown className="text-kiddy-cherry" size={16} />
                        <span className="text-kiddy-cherry text-[10px] font-bold uppercase tracking-[0.4em]">Верифицированный профиль</span>
                    </div>
                    
                    {isEditing ? (
                        <input 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-black/40 border-b-2 border-kiddy-cherry text-4xl md:text-6xl font-display font-bold text-white outline-none w-full italic px-4 py-2 rounded-t-xl"
                            placeholder="Имя пользователя"
                            autoFocus
                        />
                    ) : (
                        <h1 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tighter italic">
                            {currentUser.name}
                        </h1>
                    )}

                    <div className="flex flex-col md:flex-row items-center gap-4 text-kiddy-textMuted font-mono text-[10px] uppercase tracking-widest">
                        <span className="flex items-center gap-2"><Fingerprint size={12} /> ID: {currentUser.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                </div>

                <div className="absolute top-6 right-6 md:relative md:top-auto md:right-auto md:ml-auto">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditing(false)} disabled={saving} className="p-3 bg-kiddy-surfaceHighlight rounded-xl text-kiddy-textSecondary hover:text-white transition-all">
                                <X size={20} />
                            </button>
                            <button
                              type="button"
                              onClick={handleSave}
                              disabled={saving || uploading}
                              className="rounded-xl bg-kiddy-cherry p-3 text-white shadow-lg shadow-kiddy-cherry/20 transition-all hover:bg-kiddy-cherryHover"
                              aria-label="Сохранить имя"
                            >
                              {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={22} strokeWidth={2.5} />}
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="p-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all backdrop-blur-md">
                            <Edit2 size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="stagger-2 md:col-span-2 bg-kiddy-surfaceElevated/80 border-white/[0.08] backdrop-blur-xl p-10 flex flex-col justify-between" noPadding>
            <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="text-white font-bold text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                    <Target size={16} className="text-kiddy-cherry" />
                    Матрица компетенций
                </h3>
            </div>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                        <PolarGrid stroke="#18181b" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }} />
                        <Radar name="Уровень" dataKey="A" stroke="#be123c" fill="#be123c" fillOpacity={0.4} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        <Card className="stagger-3 bg-kiddy-surfaceElevated/80 border-white/[0.08] p-10 flex flex-col justify-between" noPadding>
            <div>
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                    <Zap className="text-yellow-500" size={24} />
                </div>
                <h3 className="text-kiddy-textMuted font-bold text-[10px] uppercase tracking-[0.3em] mb-1">Очки опыта</h3>
                <div className="text-4xl font-display font-bold text-white mb-4 italic">{currentUser.xp.toLocaleString()} <span className="text-xs text-zinc-700 not-italic">XP</span></div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-kiddy-textMuted">
                    <span>До следующего уровня</span>
                    <span>{Math.min(100, xpLevelProgressPercent(currentUser.xp)).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full bg-kiddy-surfaceHighlight rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-kiddy-cherry to-kiddy-cherryHover rounded-full progress-glow transition-all duration-1000" 
                        style={{ width: `${Math.min(100, xpLevelProgressPercent(currentUser.xp))}%` }} 
                    />
                </div>
            </div>
        </Card>

        <Card className="stagger-4 bg-kiddy-surfaceElevated/80 border-white/[0.08] p-10 flex flex-col justify-between" noPadding>
            <div>
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                    <Award className="text-kiddy-cherry" size={24} />
                </div>
                <h3 className="text-kiddy-textMuted font-bold text-[10px] uppercase tracking-[0.3em] mb-1">Рейтинг в академии</h3>
                <div className="text-4xl font-display font-bold text-white italic">#{myRank ?? '—'}</div>
            </div>
            <button 
              onClick={() => setIsLeaderboardOpen(true)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-kiddy-cherry hover:text-white transition-colors group"
            >
                Таблица лидеров <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </Card>
      </div>

      {/* Achievements Section */}
      {badgeUserId && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-bold text-xs uppercase tracking-[0.3em] flex items-center gap-3">
              <Award size={16} className="text-kiddy-cherry" />
              Достижения
            </h3>
            <button type="button" onClick={() => navigate('/settings', { state: { focusMedals: true } })} className="text-kiddy-cherry text-xs font-bold hover:underline transition-all">
              Настроить медали →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BADGE_CATALOG.map((b) => {
              const unlocked = badgeStats ? b.isUnlocked(badgeStats) : false;
              const prog = badgeStats ? b.progress(badgeStats) : 0;
              return (
                <div
                  key={b.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    unlocked
                      ? 'bg-kiddy-surfaceElevated/80 border-white/[0.08]'
                      : 'bg-kiddy-surfaceElevated/40 border-white/[0.04] opacity-70'
                  }`}
                >
                  <BadgeOrb tier={b.tier} icon={b.icon} size={44} locked={!unlocked} />
                  <div className="flex-1 min-w-0">
                    <span className={`font-bold text-sm ${unlocked ? 'text-white' : 'text-kiddy-textMuted'}`}>{b.title}</span>
                    <p className="text-kiddy-textMuted text-xs mt-0.5">{b.requirement}</p>
                    {!unlocked && (
                      <div className="mt-2 h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-kiddy-cherry/60 rounded-full transition-all duration-500" style={{ width: `${prog * 100}%` }} />
                      </div>
                    )}
                  </div>
                  {unlocked ? (
                    <Check size={16} className="text-emerald-400 shrink-0" />
                  ) : (
                    <Lock size={14} className="text-kiddy-textMuted shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Badge Picker Modal */}
      {/* Logout Section */}
      <section className="pt-10 border-t border-zinc-900">
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-3 px-8 py-4 bg-kiddy-surfaceHighlight/50 border border-white/[0.08] rounded-2xl text-kiddy-textMuted hover:text-kiddy-cherry hover:border-kiddy-cherry/30 transition-all font-bold group"
          >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              Выход из системы
          </button>
      </section>

      {/* Leaderboard Modal */}
      <Modal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} maxWidth="max-w-3xl">
          <div className="p-10 flex flex-col h-full">
              <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-kiddy-cherry/10 rounded-2xl flex items-center justify-center border border-kiddy-cherry/20">
                      <Trophy className="text-kiddy-cherry" size={32} />
                  </div>
                  <div>
                      <h2 className="text-3xl font-display font-bold text-white mb-1">Таблица лидеров</h2>
                      <p className="text-kiddy-textMuted text-xs uppercase tracking-widest">Рейтинг по очкам опыта</p>
                  </div>
              </div>
              
              {loadingLeaderboard ? (
                  <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="animate-spin text-kiddy-cherry" size={40} />
                  </div>
              ) : (
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                      {leaderboard.map((user, index) => {
                          const isCurrentUser = user.id === currentUser.id;
                          const rank = index + 1;
                          const medalColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-kiddy-textSecondary' : rank === 3 ? 'text-amber-600' : 'text-zinc-700';
                          
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
                                          ? 'bg-kiddy-cherry/10 border-kiddy-cherry/50 shadow-lg shadow-kiddy-cherry/10'
                                          : 'bg-kiddy-surfaceDark/80 border-white/[0.08] hover:border-zinc-700 cursor-pointer'
                                  }`}
                              >
                                  <div className="flex items-center gap-4">
                                      <div className="flex items-center justify-center w-12">
                                          {rank <= 3 ? (
                                              <Medal className={medalColor} size={24} fill="currentColor" />
                                          ) : (
                                              <span className={`text-sm font-display font-bold ${isCurrentUser ? 'text-kiddy-cherry' : 'text-kiddy-textMuted'}`}>
                                                  #{rank}
                                              </span>
                                          )}
                                      </div>
                                      
                                      <img 
                                          src={user.avatar} 
                                          alt={user.name}
                                          className="w-12 h-12 rounded-full border-2 border-white/[0.08] object-cover"
                                      />
                                      
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                              <h4 className={`font-bold text-sm truncate ${isCurrentUser ? 'text-kiddy-cherry' : 'text-white'}`}>
                                                  {user.name}
                                              </h4>
                                              {isCurrentUser && (
                                                  <span className="px-2 py-0.5 bg-kiddy-cherry/20 text-kiddy-cherry text-[9px] font-bold rounded uppercase">
                                                      Вы
                                                  </span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-4 mt-1">
                                              <span className="text-kiddy-textMuted text-xs">Уровень {user.level}</span>
                                              <span className="text-kiddy-textMuted text-xs">•</span>
                                              <span className="text-kiddy-textMuted text-xs">{user.xp.toLocaleString()} XP</span>
                                          </div>
                                      </div>
                                      
                                      <div className="text-right">
                                          <div className={`text-2xl font-display font-bold ${isCurrentUser ? 'text-kiddy-cherry' : 'text-kiddy-textSecondary'}`}>
                                              {user.xp.toLocaleString()}
                                          </div>
                                          <div className="text-[9px] text-kiddy-textMuted uppercase tracking-widest">Очков</div>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                      
                      {leaderboard.length > 0 && !leaderboard.some(u => u.id === currentUser.id) && myRank && (
                        <>
                          <div className="flex items-center gap-2 py-2 px-4">
                            <div className="flex-1 h-px bg-white/[0.06]" />
                            <span className="text-[10px] text-kiddy-textMuted font-bold uppercase tracking-widest">Ваша позиция</span>
                            <div className="flex-1 h-px bg-white/[0.06]" />
                          </div>
                          <div className="p-4 rounded-xl border bg-kiddy-cherry/10 border-kiddy-cherry/50 shadow-lg shadow-kiddy-cherry/10">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-12">
                                <span className="text-sm font-display font-bold text-kiddy-cherry">#{myRank}</span>
                              </div>
                              <img src={currentUser.avatar} alt={currentUser.name} className="w-12 h-12 rounded-full border-2 border-kiddy-cherry/30 object-cover" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm truncate text-kiddy-cherry">{currentUser.name}</h4>
                                  <span className="px-2 py-0.5 bg-kiddy-cherry/20 text-kiddy-cherry text-[9px] font-bold rounded uppercase">Вы</span>
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-kiddy-textMuted text-xs">Уровень {currentUser.level}</span>
                                  <span className="text-kiddy-textMuted text-xs">•</span>
                                  <span className="text-kiddy-textMuted text-xs">{currentUser.xp.toLocaleString()} XP</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-display font-bold text-kiddy-cherry">{currentUser.xp.toLocaleString()}</div>
                                <div className="text-[9px] text-kiddy-textMuted uppercase tracking-widest">Очков</div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {leaderboard.length === 0 && (
                          <div className="text-center py-20">
                              <Trophy className="text-zinc-800 mx-auto mb-4" size={48} />
                              <p className="text-kiddy-textMuted text-sm font-bold uppercase tracking-widest">Лидерборд пуст</p>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} maxWidth="max-w-md">
          <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-kiddy-cherryDim rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
                  <AlertTriangle className="text-kiddy-cherry" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-4">Завершить сеанс?</h2>
              <p className="text-kiddy-textMuted text-sm mb-10 leading-relaxed">
                  Вы уверены, что хотите выйти из аккаунта? Вам потребуется снова ввести данные для входа.
              </p>
              <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={() => setIsLogoutModalOpen(false)}
                    className="py-4 bg-kiddy-surfaceHighlight text-white font-bold rounded-xl hover:bg-kiddy-surfaceHighlight transition-all"
                  >
                      Отмена
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="py-4 bg-kiddy-cherry text-white font-bold rounded-xl hover:bg-kiddy-cherryHover transition-all shadow-lg shadow-kiddy-cherry/20"
                  >
                      Выйти
                  </button>
              </div>
          </div>
      </Modal>
    </div>
  );
};
