import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Card } from '../components/ui/Card';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
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
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { name: name || 'Ученик', role: 'Student' } }
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Неверный email или пароль' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-display font-bold text-white tracking-tight">Kiddy <span className="text-kiddy-primary">OS</span></h1>
                <p className="text-zinc-600 mt-2 uppercase text-[10px] font-bold tracking-[0.3em]">Идентификация в системе</p>
            </div>
            <Card className="bg-zinc-950 border-zinc-800 shadow-2xl p-8">
                <form onSubmit={handleAuth} className="space-y-5">
                    {isSignUp && (
                        <div className="relative">
                            <User className="absolute left-4 top-3.5 text-zinc-600" size={18} />
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black border border-zinc-800 focus:border-kiddy-primary text-white pl-11 pr-4 py-3 rounded-xl outline-none text-sm transition-all" placeholder="Ваше Имя" />
                        </div>
                    )}
                    <div className="relative">
                        <Mail className="absolute left-4 top-3.5 text-zinc-600" size={18} />
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="w-full bg-black border border-zinc-800 focus:border-kiddy-primary text-white pl-11 pr-4 py-3 rounded-xl outline-none text-sm transition-all" 
                            placeholder="Электронная почта" 
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
                    {error && <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-500 text-xs text-center font-bold">{error}</div>}
                    <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-kiddy-primary to-rose-700 text-white font-bold py-4 rounded-xl mt-4 hover:shadow-[0_0_20px_rgba(190,18,60,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <>{isSignUp ? 'Создать аккаунт' : 'Войти в систему'} <ArrowRight size={18} /></>}
                    </button>
                </form>
                <div className="mt-8 text-center">
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-zinc-600 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
                        {isSignUp ? 'Уже есть доступ? Войти' : 'Нет ключа доступа? Регистрация'}
                    </button>
                </div>
            </Card>
        </div>
    </div>
  );
};