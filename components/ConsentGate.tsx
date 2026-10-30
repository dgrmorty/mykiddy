import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { deleteOwnAccount, hasCurrentConsent, recordConsent } from '../services/accountService';

/**
 * Окно согласия на обработку ПД для тех, у кого его нет в текущей редакции:
 * ученики, зарегистрированные раньше, и новые пользователи через Google.
 * Без согласия платформой пользоваться нельзя; отказ = выход или удаление аккаунта.
 */
export const ConsentGate: React.FC = () => {
  const { isGuest, isAdmin, isLoading, signOut } = useAuth();
  const { showToast } = useToast();
  const [needed, setNeeded] = useState(false);
  const [terms, setTerms] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    // Сотрудники обрабатываются в рамках трудовых отношений — окно для них не нужно
    if (isLoading || isGuest || isAdmin) {
      setNeeded(false);
      return;
    }
    let cancelled = false;
    void hasCurrentConsent().then((ok) => {
      if (!cancelled) setNeeded(!ok);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading, isGuest, isAdmin]);

  useEffect(() => {
    if (!needed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [needed]);

  if (!needed) return null;

  const accept = async () => {
    setBusy('save');
    try {
      await recordConsent();
      setNeeded(false);
    } catch {
      showToast('Не удалось сохранить согласие. Попробуйте ещё раз.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await deleteOwnAccount();
      await signOut();
      setNeeded(false);
      showToast('Аккаунт и данные удалены.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Не удалось удалить аккаунт.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const node = (
    <div className="consent-gate" role="dialog" aria-modal="true" aria-labelledby="consent-gate-title">
      <div className="consent-gate__panel">
        <span className="feature-tile__icon mx-auto" aria-hidden>
          <ShieldCheck size={20} />
        </span>
        <h2 id="consent-gate-title" className="mt-5 text-center font-display text-xl font-semibold tracking-[-0.02em] text-white">
          Нужно ваше согласие
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-[15px] leading-relaxed text-zinc-400">
          Мы обновили документы платформы. Чтобы продолжить учиться, подтвердите условия и согласие на обработку данных.
        </p>

        <div className="mt-6 space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-left text-sm leading-relaxed text-zinc-300">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#e6002b]"
            />
            <span>
              Принимаю{' '}
              <a href="/terms" target="_blank" rel="noopener" className="font-semibold text-white underline underline-offset-2">
                условия использования
              </a>
              .
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#e6002b]"
            />
            <span>
              Даю{' '}
              <a href="/consent" target="_blank" rel="noopener" className="font-semibold text-white underline underline-offset-2">
                согласие на обработку персональных данных
              </a>
              , в том числе их передачу за рубеж. Если ученику нет 16 лет, согласие даёт родитель.
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void accept()}
          disabled={!terms || !consent || busy !== null}
          className="btn-cta mt-5 h-12 w-full text-[15px] disabled:opacity-50"
        >
          {busy === 'save' ? <Loader2 size={18} className="animate-spin" /> : 'Продолжить'}
        </button>

        {confirmDelete ? (
          <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-center text-sm text-red-100">
            <p>Аккаунт, прогресс, домашки и файлы будут удалены без возможности восстановления.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy !== null}
                className="btn-secondary btn-solid h-10 flex-1 text-sm"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy !== null}
                className="h-10 flex-1 rounded-full bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {busy === 'delete' ? <Loader2 size={16} className="mx-auto animate-spin" /> : 'Удалить'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={busy !== null}
              className="font-semibold text-zinc-400 transition-colors hover:text-white"
            >
              Выйти
            </button>
            <span className="text-zinc-600" aria-hidden>
              ·
            </span>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busy !== null}
              className="font-semibold text-zinc-400 transition-colors hover:text-red-300"
            >
              Отказаться и удалить аккаунт
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
};
