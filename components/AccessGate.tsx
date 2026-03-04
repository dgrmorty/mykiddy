
import React from 'react';
import { Lock } from 'lucide-react';
import { Card } from './ui/Card';

export const AccessGate: React.FC<{ title?: string; message?: string }> = ({
  title = 'Доступ ограничен',
  message = 'Для доступа к материалам нужно подтверждение учётной записи администратором. Ожидайте завершения проверки.',
}) => (
  <div className="flex items-center justify-center min-h-[60vh] p-6 animate-fade-in-up">
    <Card className="max-w-md w-full text-center py-12 px-8">
      <div className="w-14 h-14 rounded-2xl bg-kiddy-cherry/15 flex items-center justify-center mx-auto mb-6 border border-kiddy-cherry/20">
        <Lock className="text-kiddy-cherry" size={28} strokeWidth={1.75} />
      </div>
      <h2 className="font-display font-semibold text-xl text-white tracking-tight mb-3">{title}</h2>
      <p className="text-body-sm text-kiddy-textSecondary leading-relaxed mb-8">{message}</p>
      <p className="text-caption text-kiddy-textMuted">Kiddy · верификация</p>
    </Card>
  </div>
);
