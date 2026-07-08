import React, { useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Modal } from './ui/Modal';
import { Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAuthRedirectOrigin } from '../config';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass = "w-full rounded-2xl bg-[#111] border border-white/10 pl-12 pr-12 py-4 text-sm text-white placeholder:text-zinc-500 focus:border-white/30 focus:bg-[#1a1a1a] transition-colors outline-none";
const MIN_PASSWORD_LENGTH = 8;

function validatePassword(p: string): string | null {
  if (p.length < MIN_PASSWORD_LENGTH) return `Пароль не менее ${MIN_PASSWORD_LENGTH} символов`;
  if (!/[a-zA-Z]/.test(p)) return 'Добавьте буквы в пароль';
  if (!/[0-9]/.test(p)) return 'Добавьте цифры в пароль';
  return null;
}

function normalizeEmail(raw: string): string {
  return (raw || '').trim().toLowerCase();
}

function describeGoogleOAuthError(err: { message?: string } | null): string {
  const msg = (err?.message || '').toLowerCase();
  if (!msg) return 'Не удалось войти через Google. Попробуйте ещё раз.';
  if (/provider|not enabled|invalid client|client_id/.test(msg)) {
    return 'Вход через Google не настроен: в Supabase → Authentication → Providers включи Google и укажи Client ID и Client Secret из Google Cloud.';
  }
  if (/redirect|url|uri/.test(msg)) {
    return 'Неверный адрес редиректа: проверь Redirect URLs для detivtope.online и Railway в Supabase, а в Google Cloud — URI вида https://<project>.supabase.co/auth/v1/callback.';
  }
  if (msg.length < 220) return err?.message || 'Ошибка Google OAuth.';
  return 'Не удалось войти через Google. Открой консоль браузера (F12) для подробностей.';
}

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#ffffff"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#ffffff"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#ffffff"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ffffff"/>
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
  const [pendingConfirm, setPendingConfirm] = useState<{ email: string; password: string } | null>(null);
  
  const authInFlightRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewsRef = useRef<Record<string, HTMLDivElement | null>>({});

  useGSAP(() => {
    const currentView = viewsRef.current[mode];
    if (!currentView || !containerRef.current) return;

    // Animate container height
    gsap.to(containerRef.current, {
      height: currentView.offsetHeight,
      duration: 0.6,
      ease: 'elastic.out(1, 0.75)'
    });

    // Animate sliding views
    const modes = ['login', 'signup', 'forgot'];
    const currentIndex = modes.indexOf(mode);

    Object.keys(viewsRef.current).forEach((key) => {
      const view = viewsRef.current[key];
      if (!view) return;
      
      const viewIndex = modes.indexOf(key);
      
      if (key === mode) {
        gsap.to(view, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out', pointerEvents: 'auto' });
      } else {
        const dir = viewIndex < currentIndex ? -40 : 40;
        gsap.to(view, { x: dir, opacity: 0, duration: 0.4, ease: 'power2.inOut', pointerEvents: 'none' });
      }
    });
  }, [mode, error, success, pendingConfirm]);

  const handleGoogleLogin = async () => {
    if (authInFlightRef.current || loading) return;
    authInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getAuthRedirectOrigin()}/`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (err) {
        setError(describeGoogleOAuthError(err));
        return;
      }
    } catch (e: unknown) {
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
      const emailNormalized = normalizeEmail(email);
      if (mode === 'forgot') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(emailNormalized, {
          redirectTo: `${getAuthRedirectOrigin()}/`,
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
          email: emailNormalized, password,
          options: {
            data: { name: name.trim(), role: 'Student', is_approved: true },
            emailRedirectTo: `${getAuthRedirectOrigin()}/auth/confirmed`,
          },
        });
        if (err) throw err;
        if (data?.user && !data.session) {
          setPendingConfirm({ email: emailNormalized, password });
          setSuccess(
            'Письмо отправлено. Откройте почту и нажмите «Подтвердить». ' +
              'Если подтверждали на другом устройстве — вернитесь сюда и нажмите «Я подтвердил — войти».',
          );
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: emailNormalized, password });
        if (err) throw err;
      }
      try { await refreshUser(); } catch {}
      setTimeout(onSuccess, 300);
    } catch (err: any) {
      const status = (err as any)?.status ?? (err as any)?.code;
      const msg = String(err?.message || '');
      const msgLower = msg.toLowerCase();

      if (status === 429 || msgLower.includes('too many') || msgLower.includes('rate limit')) {
        setError('Слишком много попыток. Подождите пару минут.');
      } else if (msg === 'Invalid login credentials' || msg.includes('Invalid')) {
        setError('Неверный email или пароль');
      } else if (msgLower.includes('email') && msgLower.includes('confirm')) {
        setError('Почта не подтверждена. Откройте письмо и нажмите «Подтвердить».');
      } else if (msg.includes('Email') && msg.includes('already')) {
        setError('Пользователь с таким email уже существует');
      } else if (msg.includes('password') || msg.includes('Password')) {
        setError('Пароль: минимум 8 символов, буквы и цифры');
      } else if (msgLower.includes('invalid') && msgLower.includes('email')) {
        setError('Неверный формат email');
      } else {
        setError('Произошла ошибка. Попробуйте ещё раз.');
      }
    } finally {
      setLoading(false);
      authInFlightRef.current = false;
    }
  };

  const handleConfirmedClick = async () => {
    if (!pendingConfirm || authInFlightRef.current || loading) return;
    authInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: pendingConfirm.email,
        password: pendingConfirm.password,
      });
      if (err) throw err;
      try { await refreshUser(); } catch {}
      setPendingConfirm(null);
      setTimeout(onSuccess, 200);
    } catch (e: any) {
      const msg = String(e?.message || '').toLowerCase();
      if (msg.includes('confirm') && msg.includes('email')) {
        setError('Почта ещё не подтверждена. Откройте письмо и нажмите «Подтвердить».');
      } else {
        setError('Не удалось войти. Убедитесь, что почта подтверждена, и попробуйте ещё раз.');
      }
    } finally {
      setLoading(false);
      authInFlightRef.current = false;
    }
  };

  const switchMode = (m: 'login' | 'signup' | 'forgot') => {
    setMode(m);
    setError(null);
    setSuccess(null);
    setPendingConfirm(null);
  };

  const renderForm = (currentMode: 'login' | 'signup' | 'forgot') => (
    <div 
      ref={el => viewsRef.current[currentMode] = el} 
      className="absolute top-0 left-0 w-full p-7 md:p-9 opacity-0 pointer-events-none"
    >
      <div className="text-center mb-8">
        <h2 className="mb-3 font-display text-4xl font-extrabold tracking-tighter text-white md:text-[2.6rem]">
          {currentMode === 'forgot' ? 'Сброс пароля' : currentMode === 'signup' ? 'Регистрация' : 'Вход'}
        </h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          {currentMode === 'forgot'
            ? 'Восстановление доступа.'
            : 'С возвращением.'}
        </p>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
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
          <span className="text-xs text-zinc-500 font-medium">или</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          {currentMode === 'signup' && (
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={20} strokeWidth={2} />
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Имя и Фамилия" required />
            </div>
          )}

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={20} strokeWidth={2} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="Электронная почта" required />
          </div>

          {currentMode !== 'forgot' && (
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={20} strokeWidth={2} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
                placeholder={currentMode === 'signup' ? 'Пароль (мин. 8 символов)' : 'Пароль'}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-white transition-colors"
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

          {currentMode === 'login' && (
            <p className="text-right">
              <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-zinc-500 hover:text-white transition-colors">
                Забыли пароль?
              </button>
            </p>
          )}
          {currentMode === 'forgot' && (
            <p className="text-right">
              <button type="button" onClick={() => switchMode('login')} className="text-xs text-zinc-500 hover:text-white transition-colors">
                Вернуться к входу
              </button>
            </p>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm font-semibold text-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-center text-sm font-semibold text-green-200">
              {success}
            </div>
          )}

          {currentMode === 'signup' && pendingConfirm && (
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmedClick}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-white transition-all hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Я подтвердил — войти'}
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-black transition-all hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
              currentMode === 'forgot' ? 'Отправить ссылку' : currentMode === 'signup' ? 'Создать аккаунт' : 'Войти'
            )}
          </button>
        </form>

        <p className="text-center pt-2">
          <button type="button" onClick={() => switchMode(currentMode === 'signup' ? 'login' : 'signup')} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            {currentMode === 'signup' ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт'}
          </button>
        </p>
      </div>
    </div>
  );

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      maxWidth="max-w-[440px]"
      panelClassName="shadow-island !rounded-[2.5rem] !bg-black"
    >
      <div className="relative overflow-hidden w-full" ref={containerRef} style={{ height: 500 }}>
        {renderForm('login')}
        {renderForm('signup')}
        {renderForm('forgot')}
      </div>
    </Modal>
  );
};
