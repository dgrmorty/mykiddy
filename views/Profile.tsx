
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { 
    Award, Zap, Settings, Bell, Lock, Crown, Fingerprint, 
    ChevronRight, Edit2, Save, X, Loader2, Camera, Target, 
    LogOut, AlertTriangle 
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
  const { refreshUser, signOut } = useAuth();
  const { resetNavigation } = useContentContext();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { showToast } = useToast();
  
  const [editName, setEditName] = useState(initialUser.name);
  const [editAvatar, setEditAvatar] = useState(initialUser.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(initialUser.name);
    setEditAvatar(initialUser.avatar);
  }, [initialUser]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    try {
        const file = e.target.files[0];
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
          const { error } = await supabase
              .from('profiles')
              .update({
                  name: editName,
                  avatar: editAvatar,
                  updated_at: new Date().toISOString(),
              })
              .eq('id', initialUser.id);

          if (error) throw error;
          await refreshUser();
          setIsEditing(false);
          showToast('Изменения сохранены', 'success');
      } catch (error: any) {
          showToast('Не удалось обновить данные профиля', 'error');
      } finally {
          setSaving(false);
      }
  };

  const handleLogout = async () => {
    resetNavigation();
    await signOut();
    setIsLogoutModalOpen(false);
  };

  return (
    <div className="animate-slide-up space-y-10 pb-20">
      <section className="relative h-72 md:h-80 w-full rounded-[3rem] overflow-hidden shadow-2xl group transition-all">
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent z-10" />
        <img 
          src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:scale-105 transition-transform duration-1000" 
          alt="Banner" 
        />
        
        <div className="relative z-20 h-full flex flex-col justify-center px-8 md:px-16">
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group/avatar">
                    <div className="absolute inset-0 bg-kiddy-primary blur-3xl opacity-20 animate-pulse" />
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-white/10 relative z-10 shadow-2xl overflow-hidden bg-black">
                         <img 
                            src={editAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(editName || 'U')}&background=random`} 
                            className="w-full h-full object-cover"
                            alt="Avatar" 
                        />
                        {(uploading || saving) && (
                             <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
                                <Loader2 className="animate-spin text-kiddy-primary" size={32} />
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
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                         </div>
                    )}
                    
                    {!isEditing && (
                        <div className="absolute -bottom-1 -right-1 bg-white text-black text-[10px] font-bold px-3 py-1 rounded-full border border-black z-20 shadow-lg">
                            LVL {initialUser.level}
                        </div>
                    )}
                </div>

                <div className="flex-1 text-center md:text-left space-y-2 w-full md:w-auto">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                        <Crown className="text-kiddy-primary" size={16} />
                        <span className="text-kiddy-primary text-[10px] font-bold uppercase tracking-[0.4em]">Верифицированный профиль</span>
                    </div>
                    
                    {isEditing ? (
                        <input 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-black/40 border-b-2 border-kiddy-primary text-4xl md:text-6xl font-display font-bold text-white outline-none w-full italic px-4 py-2 rounded-t-xl"
                            placeholder="Имя пользователя"
                            autoFocus
                        />
                    ) : (
                        <h1 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tighter italic">
                            {initialUser.name}
                        </h1>
                    )}

                    <div className="flex flex-col md:flex-row items-center gap-4 text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                        <span className="flex items-center gap-2"><Fingerprint size={12} /> ID: {initialUser.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                </div>

                <div className="absolute top-6 right-6 md:relative md:top-auto md:right-auto md:ml-auto">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditing(false)} disabled={saving} className="p-3 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                            <button onClick={handleSave} disabled={saving || uploading} className="p-3 bg-kiddy-primary rounded-xl text-white hover:bg-rose-600 transition-all shadow-lg shadow-kiddy-primary/20">
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
        <Card className="md:col-span-2 bg-zinc-950/40 border-zinc-800/50 backdrop-blur-xl p-10 flex flex-col justify-between" noPadding>
            <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="text-white font-bold text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                    <Target size={16} className="text-kiddy-primary" />
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

        <Card className="bg-zinc-950/40 border-zinc-800/50 p-10 flex flex-col justify-between" noPadding>
            <div>
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                    <Zap className="text-yellow-500" size={24} />
                </div>
                <h3 className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-1">Очки опыта</h3>
                <div className="text-4xl font-display font-bold text-white mb-4 italic">{initialUser.xp.toLocaleString()} <span className="text-xs text-zinc-700 not-italic">XP</span></div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    <span>До следующего уровня</span>
                    <span>{Math.min(100, (initialUser.xp % 1000) / 10)}%</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-kiddy-primary to-rose-400 shadow-[0_0_15px_rgba(190,18,60,0.5)] transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (initialUser.xp % 1000) / 10)}%` }} 
                    />
                </div>
            </div>
        </Card>

        <Card className="bg-zinc-950/40 border-zinc-800/50 p-10 flex flex-col justify-between" noPadding>
            <div>
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                    <Award className="text-kiddy-primary" size={24} />
                </div>
                <h3 className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-1">Рейтинг в академии</h3>
                <div className="text-4xl font-display font-bold text-white italic">#{Math.max(1, 100 - initialUser.level)}</div>
            </div>
            <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-kiddy-primary hover:text-white transition-colors group">
                Таблица лидеров <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </Card>
      </div>

      {/* Logout Section */}
      <section className="pt-10 border-t border-zinc-900">
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-3 px-8 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-rose-500 hover:border-rose-500/30 transition-all font-bold group"
          >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              Выход из системы
          </button>
      </section>

      {/* Logout Confirmation Modal */}
      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} maxWidth="max-w-md">
          <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
                  <AlertTriangle className="text-rose-500" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-4">Завершить сеанс?</h2>
              <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
                  Вы уверены, что хотите выйти из аккаунта? Вам потребуется снова ввести данные для входа.
              </p>
              <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={() => setIsLogoutModalOpen(false)}
                    className="py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all"
                  >
                      Отмена
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="py-4 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
                  >
                      Выйти
                  </button>
              </div>
          </div>
      </Modal>
    </div>
  );
};
