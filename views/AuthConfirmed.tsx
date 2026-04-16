import React from 'react';

export const AuthConfirmed: React.FC = () => {
  return (
    <div className="flex min-h-[min(520px,80vh)] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
        Почта подтверждена
      </h1>
      <p className="max-w-md text-sm font-medium text-kiddy-textSecondary leading-relaxed">
        Почта успешно подтверждена. Теперь вернитесь в приложение и нажмите «Я подтвердил — войти» на устройстве, где начинали регистрацию.
      </p>
    </div>
  );
};

