import { supabase } from './supabase';
import { getApiUrl } from '../config';
import { LEGAL } from '../config/legal';

/** Есть ли у вошедшего пользователя согласие на обработку ПД в текущей редакции. */
export async function hasCurrentConsent(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  const meta = data.user?.user_metadata ?? {};
  return meta.pd_consent_version === LEGAL.consentVersion && !!meta.terms_accepted_at;
}

/** Сохраняет согласие (и принятие условий) в метаданных пользователя — доказательство для оператора. */
export async function recordConsent(): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.auth.updateUser({
    data: { pd_consent_at: now, pd_consent_version: LEGAL.consentVersion, terms_accepted_at: now },
  });
  if (error) throw error;
}

/** Отзыв согласия: сервер удаляет аккаунт, учебные данные и файлы ученика. */
export async function deleteOwnAccount(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Нужно войти в аккаунт.');
  const response = await fetch(getApiUrl('api/account/delete'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Не удалось удалить аккаунт. Попробуйте позже.');
}
