import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { deleteOwnAccount } from '../services/accountService';

const CONFIRM_WORD = 'УДАЛИТЬ';

/** Отзыв согласия на обработку ПД из профиля — в той же электронной форме, в которой оно дано (ст. 10 Закона № 99-З). */
export const WithdrawConsent: React.FC = () => {
  const { isAdmin, signOut } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAdmin) return null;

  const confirm = async () => {
    setBusy(true);
    try {
      await deleteOwnAccount();
      await signOut();
      showToast('Согласие отозвано, аккаунт и данные удалены.', 'success');
      window.location.href = '/';
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Не удалось удалить аккаунт.', 'error');
      setBusy(false);
    }
  };

  return (
    <>
      <p className="pt-4 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-semibold text-zinc-500 underline decoration-white/20 underline-offset-4 transition-colors hover:text-red-300"
        >
          Отозвать согласие и удалить аккаунт
        </button>
      </p>

      <Modal isOpen={open} onClose={() => !busy && setOpen(false)} maxWidth="max-w-md">
        <div className="p-7">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">Отозвать согласие?</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
            Мы удалим аккаунт, прогресс, опыт и бейджи, домашние задания, проекты на витрине, друзей и загруженные файлы.
            Восстановить их будет нельзя. Подробнее — в{' '}
            <Link to="/consent" onClick={() => setOpen(false)} className="font-semibold text-white underline underline-offset-2">
              тексте согласия
            </Link>
            .
          </p>
          <label className="mt-5 block text-sm text-zinc-400">
            Чтобы подтвердить, введите <b className="text-white">{CONFIRM_WORD}</b>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="input-premium mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
            />
          </label>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="btn-secondary btn-solid h-12 flex-1 text-sm"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy || typed.trim().toUpperCase() !== CONFIRM_WORD}
              className="h-12 flex-1 rounded-full bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40"
            >
              {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : 'Удалить навсегда'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
