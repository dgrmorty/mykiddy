import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AuthConfirmed: React.FC = () => {
  const navigate = useNavigate();
  const { user, isGuest, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isGuest) {
      navigate('/profile', { replace: true });
    }
  }, [isGuest, isLoading, navigate]);

  return (
    <div className="flex min-h-[min(520px,80vh)] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
        Почта подтверждена
      </h1>
      <p className="max-w-md text-sm font-medium text-kiddy-textSecondary leading-relaxed">
        Если вы открыли письмо на этом устройстве — сейчас мы автоматически войдём в ваш аккаунт и откроем профиль.
      </p>
      {!isLoading && isGuest && (
        <div className="mt-2 max-w-md rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-kiddy-textMuted">
          Похоже, сессия ещё не подхватилась. Вернитесь в приложение и нажмите «Я подтвердил — войти» в окне регистрации.
        </div>
      )}
      {!isGuest && (
        <div className="text-xs text-kiddy-textMuted">
          Вход выполнен как <span className="text-white font-semibold">{user.email || user.name}</span>
        </div>
      )}
    </div>
  );
};

