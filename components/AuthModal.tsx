import React, { useState, useRef } from 'react';
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

/** Сообщение пользователю по ошибке OAuth (частые случаи Supabase / Google). */
function describeGoogleOAuthError(err: { message?: string } | null): string {
  const msg = (err?.message || '').toLowerCase();
  if (!msg) return 'Не удалось войти через Google. Попробуйте ещё раз.';
  if (/provider|not enabled|invalid client|client_id/.test(msg)) {
    return 'Вход через Google не настроен: в Supabase → Authentication → Providers включи Google и укажи Client ID и Client Secret из Google Cloud.';
  }
  if (/redirect|url|uri/.test(msg)) {
    return 'Неверный адрес редиректа: в Supabase → URL Configuration добавь URL сайта; в Google Cloud — Redirect URI вида https://<project>.supabase.co/auth/v1/callback.';
  }
  if (msg.length < 220) return err?.message || 'Ошибка Google OAuth.';
  return 'Не удалось войти через Google. Открой консоль браузера (F12) для подробностей.';
}

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  /** Синхронная защита от двойного сабмита до срабатывания setState(loading) */
  const authInFlightRef = useRef(false);

  const handleGoogleLogin = async () => {
    if (authInFlightRef.current || loading) return;
    authInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Всегда корень SPA — тот же URL должен быть в Supabase → Authentication → Redirect URLs
          redirectTo: `${window.location.origin}/`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (err) {
        console.error('[AuthModal] signInWithOAuth error', err);
        setError(describeGoogleOAuthError(err));
        return;
      }
      // При успехе браузер уходит на Google, дальше этот код часто не выполняется
    } catch (e: unknown) {
      console.error('[AuthModal] Google OAuth exception', e);
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : '';
      setError(describeGoogleOAuthError(msg ? { message: msg } : null));
    } finally {
      setLoading(false);
      authInFlightRef.current = false;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authInFlightRef.current || loading) return;
    authInFlightRef.current = true;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === 'forgot') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });
        if (err) throw err;
        setSuccess('Проверьте почту — мы отправили ссылку для сброса пароля.');
        return;
      }
      if (mode === 'signup') {
        const pwError = validatePassword(password);
        if (pwError) {
          setError(pwError);
          return;
        }
        if (!name.trim() || !name.trim().includes(' ')) {
          setError('Укажите имя и фамилию через пробел');
          return;
        }
        const { data, error: err } = await supabase.auth.signUp({
          email, password,
          options: { data: { name: name.trim(), role: 'Student', is_approved: true } },
        });
        if (err) throw err;
        if (data?.user && !data.session) {
          setSuccess('Проверьте почту — мы отправили письмо для подтверждения. После подтверждения введите пароль ниже.');
          setTimeout(() => {
            setMode('login');
            setSuccess('Почта подтверждена? Введите пароль и нажмите «Войти».');
          }, 4000);
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      try { await refreshUser(); } catch {}
      setTimeout(onSuccess, 300);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'Invalid login credentials' || msg.includes('Invalid')) setError('Неверный email или пароль');
      else if (msg.includes('Email') && msg.includes('already')) setError('Пользователь с таким email уже существует');
      else if (msg.includes('password') || msg.includes('Password')) setError('Пароль: минимум 8 символов, буквы и цифры');
      else if (msg.includes('email') || msg.includes('Email')) setError('Неверный формат email');
      else setError('Произошла ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
      authInFlightRef.current = false;
    }
  };

  const switchMode = (m: 'login' | 'signup' | 'forgot') => {
    setMode(m);
    setError(null);
    setSuccess(null);
  };

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="max-w-[420px]">
      <div className="p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-kiddy-cherryGlow rounded-full blur-[80px] opacity-30 pointer-events-none animate-glow-pulse" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-kiddy-cherry/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="mb-8 text-center relative z-10">
          <h2 className="font-display font-bold text-4xl text-white tracking-tighter mb-3">
            {mode === 'forgot' ? 'Сброс пароля' : mode === 'signup' ? 'Регистрация' : 'Вход'}
          </h2>
          <p className="text-sm text-kiddy-textSecondary">
            {mode === 'forgot' ? 'Введите email — отправим ссылку' : 'Для доступа к платформе «Дети В ТОПЕ»'}
          </p>
        </div>

        <div className="space-y-4 relative z-10">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white text-zinc-800 font-bold text-sm hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-spring disabled:opacity-50 shadow-lg shadow-white/10"
          >
            {loading && mode === 'login' && !email ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                Войти через Google
              </>
            )}
          </button>

          <div className="flex items-center gap-4 my-2">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-kiddy-textMuted font-medium">или</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            {mode === 'signup' && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-kiddy-textMuted group-focus-within:text-white transition-colors" size={20} strokeWidth={2} />
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Имя и Фамилия" required />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-kiddy-textMuted group-focus-within:text-white transition-colors" size={20} strokeWidth={2} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="Электронная почта" required />
            </div>

            {mode !== 'forgot' && (
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-kiddy-textMuted group-focus-within:text-white transition-colors" size={20} strokeWidth={2} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                  placeholder={mode === 'signup' ? 'Пароль (мин. 8 символов, буквы и цифры)' : 'Пароль'}
                  required
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

            {mode === 'login' && (
              <p className="text-right">
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-kiddy-textMuted hover:text-white transition-colors">
                  Забыли пароль?
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p className="text-right">
                <button type="button" onClick={() => switchMode('login')} className="text-xs text-kiddy-textMuted hover:text-white transition-colors">
                  Вернуться к входу
                </button>
              </p>
            )}

            {error && (
              <div className="animate-reveal-up py-3 px-4 rounded-xl bg-kiddy-cherryDim border border-kiddy-cherry/20 text-sm text-kiddy-cherry font-medium text-center">
                {error}
              </div>
            )}
            {success && (
              <div className="animate-reveal-up py-3 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 font-medium text-center">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-cta w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                mode === 'forgot' ? 'Отправить ссылку' : mode === 'signup' ? 'Создать аккаунт' : 'Войти'
              )}
            </button>
          </form>

          <p className="text-center relative z-10 pt-2">
            <button type="button" onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')} className="text-sm font-medium text-kiddy-textSecondary hover:text-white transition-colors">
              {mode === 'signup' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
            </button>
          </p>
        </div>
      </div>
    </Modal>
  );
};
