import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Modal } from './ui/Modal';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const { refreshUser } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { name: name || 'Ученик', role: 'Student' } }
        });
        if (error) throw error;
        // При регистрации ждем немного, чтобы сессия установилась
        if (data?.session) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // При логине ждем немного, чтобы сессия установилась
        if (data?.session) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      // Обновляем состояние пользователя
      try {
        await refreshUser();
      } catch (e) {
        console.warn("[AuthModal] Refresh user failed, but continuing:", e);
      }
      
      // Даем время AuthContext обновить состояние
      setTimeout(() => {
        onSuccess();
      }, 300);
    } catch (err: any) {
      console.error("[AuthModal] Auth error:", err);
      // Преобразуем технические ошибки в понятные сообщения
      let userMessage = 'Произошла ошибка. Попробуйте еще раз';
      if (err.message === 'Invalid login credentials' || err.message?.includes('Invalid')) {
        userMessage = 'Неверный email или пароль';
      } else if (err.message?.includes('Email') && err.message?.includes('already')) {
        userMessage = 'Пользователь с таким email уже существует';
      } else if (err.message?.includes('password') || err.message?.includes('Password')) {
        userMessage = 'Пароль слишком короткий (минимум 6 символов)';
      } else if (err.message?.includes('email') || err.message?.includes('Email')) {
        userMessage = 'Неверный формат email';
      } else if (err.message?.includes('Database error') || err.message?.includes('saving new user')) {
        userMessage = 'Не удалось создать аккаунт. Попробуйте позже';
      }
      setError(userMessage);
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="max-w-md">
        <div className="p-10 flex flex-col h-full">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-white tracking-tight mb-2">
                    {isSignUp ? 'Регистрация' : 'Авторизация'}
                </h2>
                <p className="text-zinc-600 uppercase text-[10px] font-bold tracking-[0.3em]">Идентификация в системе</p>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                    <div className="relative">
                        <User className="absolute left-4 top-3.5 text-zinc-600" size={18} />
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black border border-zinc-800 focus:border-kiddy-primary text-white pl-11 pr-4 py-3 rounded-xl outline-none text-sm transition-all" placeholder="Имя" />
                    </div>
                )}
                <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-zinc-600" size={18} />
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full bg-black border border-zinc-800 focus:border-kiddy-primary text-white pl-11 pr-4 py-3 rounded-xl outline-none text-sm transition-all" 
                        placeholder="Email" 
                    />
                </div>
                <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-zinc-600" size={18} />
                    <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full bg-black border border-zinc-800 focus:border-kiddy-primary text-white pl-11 pr-10 py-3 rounded-xl outline-none text-sm transition-all" 
                        placeholder="Пароль" 
                    />
                    <button
                        type="button"
                        className="absolute right-3 top-2.5 text-zinc-600 hover:text-zinc-300 p-1 rounded-lg"
                        onMouseDown={() => setShowPassword(true)}
                        onMouseUp={() => setShowPassword(false)}
                        onMouseLeave={() => setShowPassword(false)}
                        onTouchStart={() => setShowPassword(true)}
                        onTouchEnd={() => setShowPassword(false)}
                        aria-label="Показать пароль"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                {error && <div className="p-3 bg-red-950/20 text-red-500 text-xs text-center border border-red-900/30 rounded-lg font-bold">{error}</div>}
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-kiddy-primary to-rose-700 text-white font-bold py-4 rounded-xl mt-4 hover:shadow-[0_0_20px_rgba(190,18,60,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <>{isSignUp ? 'Создать' : 'Войти'} <ArrowRight size={18} /></>}
                </button>
            </form>
            <div className="mt-8 text-center">
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-zinc-600 hover:text-white text-[10px] font-bold uppercase tracking-widest">
                    {isSignUp ? 'Уже есть аккаунт?' : 'Создать новый аккаунт'}
                </button>
            </div>
        </div>
    </Modal>
  );
};