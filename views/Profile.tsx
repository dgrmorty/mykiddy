
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { 
    Award, Zap, Crown, Fingerprint, ChevronRight, Edit2, Save, X, Loader2, Camera, Target, 
    LogOut, AlertTriangle, Trophy, Medal
} from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { SKILL_DATA } from '../constants';
import { supabase, uploadFile } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useContentContext } from '../contexts/ContentContext';

interface ProfileProps {
  user: User;
}

export const Profile: React.FC<ProfileProps> = ({ user: initialUser }) => {
  const { user, refreshUser, signOut } = useAuth();
  const { resetNavigation } = useContentContext();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const { showToast } = useToast();
  
  // Используем актуального пользователя из контекста, а не из пропсов
  const currentUser = user.id !== 'guest' ? user : initialUser;
  
  const [editName, setEditName] = useState(currentUser.name);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(currentUser.name);
    setEditAvatar(currentUser.avatar);
  }, [currentUser]);

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar, xp, level')
        .order('xp', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (data) {
        setLeaderboard(data.map(u => ({
          id: u.id,
          email: '',
          name: u.name || 'Анонимный',
          role: 'Student' as any,
          avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=random`,
          level: u.level || 1,
          xp: u.xp || 0,
          isApproved: true
        })));
      }
    } catch (error: any) {
      console.error('[Profile] Leaderboard fetch error:', error);
      showToast('Ошибка загрузки лидерборда', 'error');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (isLeaderboardOpen) {
      fetchLeaderboard();
    }
  }, [isLeaderboardOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!validMimes.includes(file.type) && !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
        showToast('Используйте изображение: JPG, PNG, GIF или WEBP', 'error');
        e.target.value = '';
        return;
    }
    setUploading(true);
    try {
        const publicUrl = await uploadFile(file, 'avatars');
        
        if (publicUrl) {
            setEditAvatar(publicUrl);
            showToast('Фотография профиля загружена', 'success');
        } else {
            showToast('Ошибка загрузки изображения', 'error');
        }
    } catch (err) {
        showToast('Сервис хранилища недоступен', 'error');
    } finally {
        setUploading(false);
    }
  };

  const handleSave = async () => {
      if (saving || uploading) return;
      setSaving(true);
      try {
          const updateData: any = {
              name: editName,
              avatar: editAvatar
          };
          
          // Сначала проверяем, существует ли профиль
          const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', currentUser.id)
              .single();
          
          // Если профиля нет, создаем его
          if (!existingProfile) {
              const { error: insertError } = await supabase
                  .from('profiles')
                  .insert({
                      id: currentUser.id,
                      email: currentUser.email,
                      name: editName,
                      avatar: editAvatar,
                      role: 'Student',
                      level: 1,
                      xp: 0
                  });
              
              if (insertError) {
                  console.error('[Profile] Insert error:', insertError);
                  throw insertError;
              }
          } else {
              // Обновляем существующий профиль
              const { data, error } = await supabase
                  .from('profiles')
                  .update(updateData)
                  .eq('id', currentUser.id)
                  .select();

              if (error) {
                  console.error('[Profile] Update error:', error);
                  throw error;
              }
              
              if (!data || data.length === 0) {
                  throw new Error('Профиль не найден или нет прав на обновление');
              }
          }
          
          await refreshUser();
          setIsEditing(false);
          showToast('Изменения сохранены', 'success');
      } catch (error: any) {
          console.error('[Profile] Save error:', error);
          // Преобразуем технические ошибки в понятные сообщения
          let userMessage = 'Не удалось сохранить изменения';
          if (error?.message?.includes('row-level security') || error?.message?.includes('RLS')) {
            userMessage = 'Недостаточно прав для выполнения операции';
          } else if (error?.message?.includes('permission') || error?.message?.includes('доступ')) {
            userMessage = 'Недостаточно прав для выполнения операции';
          } else if (error?.message?.includes('not found') || error?.message?.includes('не найден')) {
            userMessage = 'Профиль не найден';
          }
          showToast(userMessage, 'error');
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
      window.location.hash = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="animate-slide-up space-y-10 pb-20">
      <section className="relative h-72 md:h-80 w-full rounded-[3rem] overflow-hidden shadow-2xl group transition-all">
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
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-white/10 relative z-10 shadow-2xl overflow-hidden bg-black">
                         <img 
                            src={editAvatar || currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(editName || currentUser.name || 'U')}&background=random`} 
                            className="w-full h-full object-cover"
                            alt="Avatar" 
                        />
                        {(uploading || saving) && (
                             <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
                                <Loader2 className="animate-spin text-kiddy-cherry" size={32} />
                             </div>
                        )}
                    </div>
                    
                    {isEditing && !uploading && !saving && (
                         <div 
                            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-100 transition-opacity" 
                            onClick={() => fileInputRef.current?.click()}
                         >
                            <Camera className="text-white" size={24} />
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={handleFileChange}
                            />
                         </div>
                    )}
                    
                    {!isEditing && (
                        <div className="absolute -bottom-1 -right-1 bg-white text-black text-[10px] font-bold px-3 py-1 rounded-full border border-black z-20 shadow-lg">
                            LVL {currentUser.level}
                        </div>
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
                            <button onClick={handleSave} disabled={saving || uploading} className="p-3 bg-kiddy-cherry rounded-xl text-white hover:bg-kiddy-cherryHover transition-all shadow-lg shadow-kiddy-cherry/20">
                                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-2 bg-kiddy-surfaceElevated/80 border-white/[0.08] backdrop-blur-xl p-10 flex flex-col justify-between" noPadding>
            <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="text-white font-bold text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                    <Target size={16} className="text-kiddy-cherry" />
                    Матрица компетенций
                </h3>
            </div>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={SKILL_DATA}>
                        <PolarGrid stroke="#18181b" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }} />
                        <Radar name="Уровень" dataKey="A" stroke="#be123c" fill="#be123c" fillOpacity={0.4} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        <Card className="bg-kiddy-surfaceElevated/80 border-white/[0.08] p-10 flex flex-col justify-between" noPadding>
            <div>
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                    <Zap className="text-yellow-500" size={24} />
                </div>
                <h3 className="text-kiddy-textMuted font-bold text-[10px] uppercase tracking-[0.3em] mb-1">Очки опыта</h3>
                <div className="text-4xl font-display font-bold text-white mb-4 italic">{currentUser.xp.toLocaleString()} <span className="text-xs text-zinc-700 not-italic">XP</span></div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-kiddy-textMuted">
                    <span>До следующего уровня</span>
                    <span>{Math.min(100, ((currentUser.xp % 100) / 100) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1 w-full bg-kiddy-surfaceHighlight rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-kiddy-cherry to-kiddy-cherryHover shadow-[0_0_15px_rgba(190,18,60,0.5)] transition-all duration-1000" 
                        style={{ width: `${Math.min(100, ((currentUser.xp % 100) / 100) * 100)}%` }} 
                    />
                </div>
            </div>
        </Card>

        <Card className="bg-kiddy-surfaceElevated/80 border-white/[0.08] p-10 flex flex-col justify-between" noPadding>
            <div>
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                    <Award className="text-kiddy-cherry" size={24} />
                </div>
                <h3 className="text-kiddy-textMuted font-bold text-[10px] uppercase tracking-[0.3em] mb-1">Рейтинг в академии</h3>
                <div className="text-4xl font-display font-bold text-white italic">#{Math.max(1, 100 - currentUser.level)}</div>
            </div>
            <button 
              onClick={() => setIsLeaderboardOpen(true)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-kiddy-cherry hover:text-white transition-colors group"
            >
                Таблица лидеров <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </Card>
      </div>

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
                                  className={`p-4 rounded-xl border transition-all ${
                                      isCurrentUser
                                          ? 'bg-kiddy-cherry/10 border-kiddy-cherry/50 shadow-lg shadow-kiddy-cherry/10'
                                          : 'bg-kiddy-surfaceDark/80 border-white/[0.08] hover:border-zinc-700'
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
