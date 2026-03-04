import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Modal } from './ui/Modal';
import { Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass = "input-premium w-full pl-12 pr-4 py-4 text-sm font-medium";

const MIN_PASSWORD_LENGTH = 8;

function validatePassword(p: string): string | null {
  if (p.length < MIN_PASSWORD_LENGTH) return `Пароль не менее ${MIN_PASSWORD_LENGTH} символов`;
  if (!/[a-zA-Z]/.test(p)) return 'Добавьте буквы в пароль';
  if (!/[0-9]/.test(p)) return 'Добавьте цифры в пароль';
  return null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const { refreshUser } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
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
      if (forgotPassword) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/#/` });
        if (err) throw err;
        setError(null);
        setError('Проверьте почту: мы отправили ссылку для сброса пароля.');
        setForgotPassword(false);
        setLoading(false);
        return;
      }
      if (isSignUp) {
        const pwError = validatePassword(password);
        if (pwError) { setError(pwError); setLoading(false); return; }
        const { data, error: err } = await supabase.auth.signUp({
          email, password, options: { data: { name: name || 'Ученик', role: 'Student' } }
        });
        if (err) throw err;
        if (data?.session) await new Promise(r => setTimeout(r, 500));
        if (data?.user && !data.session) setError('Проверьте почту: письмо с подтверждением отправлено.');
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data?.session) await new Promise(r => setTimeout(r, 500));
      }
      if (!forgotPassword) {
        try { await refreshUser(); } catch (_) {}
        setTimeout(onSuccess, 300);
      }
    } catch (err: any) {
      let userMessage = 'Произошла ошибка. Попробуйте еще раз';
      if (err.message === 'Invalid login credentials' || err.message?.includes('Invalid')) userMessage = 'Неверный email или пароль';
      else if (err.message?.includes('Email') && err.message?.includes('already')) userMessage = 'Пользователь с таким email уже существует';
      else if (err.message?.includes('password') || err.message?.includes('Password')) userMessage = 'Пароль не менее 8 символов, буквы и цифры';
      else if (err.message?.includes('email') || err.message?.includes('Email')) userMessage = 'Неверный формат email';
      else if (err.message?.includes('Database error') || err.message?.includes('saving new user')) userMessage = 'Не удалось создать аккаунт. Попробуйте позже';
      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="max-w-[420px]">
      <div className="p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-kiddy-cherryGlow rounded-full blur-[80px] opacity-30 pointer-events-none" />
        
        <div className="mb-10 text-center relative z-10">
          <h2 className="font-display font-bold text-4xl text-white tracking-tighter mb-3">
            {forgotPassword ? 'Восстановление пароля' : isSignUp ? 'Регистрация' : 'Вход'}
          </h2>
          <p className="text-sm text-kiddy-textSecondary">
            {forgotPassword ? 'Введите email — отправим ссылку для сброса' : 'Для доступа к платформе'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 relative z-10">
          {isSignUp && !forgotPassword && (
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-kiddy-textMuted group-focus-within:text-white transition-colors" size={20} strokeWidth={2} />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ваше Имя" />
            </div>
          )}
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-kiddy-textMuted group-focus-within:text-white transition-colors" size={20} strokeWidth={2} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="Электронная почта" required />
          </div>
          {!forgotPassword && (
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-kiddy-textMuted group-focus-within:text-white transition-colors" size={20} strokeWidth={2} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-12`}
              placeholder={isSignUp ? 'Пароль (не менее 8 символов, буквы и цифры)' : 'Пароль'}
              required={!forgotPassword}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-kiddy-textMuted hover:text-white transition-colors"
              onMouseDown={() => setShowPassword(true)}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              onTouchStart={() => setShowPassword(true)}
              onTouchEnd={() => setShowPassword(false)}
              aria-label="Показать пароль"
            >
              {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
            </button>
          </div>
          )}
          
          {!forgotPassword && !isSignUp && (
            <p className="text-right">
              <button type="button" onClick={() => { setForgotPassword(true); setError(null); }} className="text-xs text-kiddy-textMuted hover:text-white transition-colors">
                Забыли пароль?
              </button>
            </p>
          )}
          {forgotPassword && (
            <p className="text-right">
              <button type="button" onClick={() => setForgotPassword(false)} className="text-xs text-kiddy-textMuted hover:text-white transition-colors">
                Вернуться к входу
              </button>
            </p>
          )}
          
          {error && (
            <div className="animate-reveal-up py-3 px-4 rounded-xl bg-kiddy-cherryDim border border-kiddy-cherry/20 text-sm text-kiddy-cherry font-medium text-center">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="btn-cta w-full flex items-center justify-center gap-2 py-4 mt-8 disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <>{forgotPassword ? 'Отправить ссылку' : isSignUp ? 'Создать аккаунт' : 'Продолжить'}</>}
          </button>
        </form>

        {!forgotPassword && (
        <p className="mt-8 text-center relative z-10">
          <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="text-sm font-medium text-kiddy-textSecondary hover:text-white transition-colors">
            {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
          </button>
        </p>
        )}
      </div>
    </Modal>
  );
};
