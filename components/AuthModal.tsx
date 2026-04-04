import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Modal } from './ui/Modal';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (err) throw err;
    } catch (err: any) {
      setError('Не удалось войти через Google. Попробуйте ещё раз.');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="max-w-[420px]">
      <div className="p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-kiddy-cherryGlow rounded-full blur-[80px] opacity-30 pointer-events-none" />

        <div className="mb-10 text-center relative z-10">
          <h2 className="font-display font-bold text-4xl text-white tracking-tighter mb-3">
            Вход
          </h2>
          <p className="text-sm text-kiddy-textSecondary">
            Для доступа к платформе «Дети В ТОПЕ»
          </p>
        </div>

        <div className="space-y-4 relative z-10">
          {error && (
            <div className="animate-reveal-up py-3 px-4 rounded-xl bg-kiddy-cherryDim border border-kiddy-cherry/20 text-sm text-kiddy-cherry font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white text-zinc-800 font-bold text-sm hover:bg-zinc-100 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                Войти через Google
              </>
            )}
          </button>

          <p className="text-xs text-kiddy-textMuted text-center mt-6">
            Нажимая «Войти», вы принимаете условия использования платформы
          </p>
        </div>
      </div>
    </Modal>
  );
};
