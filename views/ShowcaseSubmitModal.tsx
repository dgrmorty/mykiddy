import React, { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Role } from '../types';
import {
  phrasePayloadCustom,
  showcasePostBody,
  SHOWCASE_MAX_MEDIA,
  SHOWCASE_MIN_CUSTOM_LEN,
  SHOWCASE_MAX_CUSTOM_LEN,
} from '../data/projectShowcaseCatalog';
import { createProjectPost, uploadShowcaseFile, type MediaItem } from '../services/projectShowcaseService';
import { ImagePlus, Loader2, Send, Trash2, Video, Sparkles, X } from 'lucide-react';

interface ShowcaseSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShowcaseSubmitModal: React.FC<ShowcaseSubmitModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputId = useId();

  const [customText, setCustomText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadDraftId, setUploadDraftId] = useState(() => crypto.randomUUID());

  const isStudent = user.role === Role.STUDENT && user.id !== 'guest';
  const customLen = customText.length;
  const previewTrim = customText.trim();

  useEffect(() => {
    if (!isOpen) return;
    setCustomText('');
    setFiles([]);
    setSubmitting(false);
    setUploadDraftId(crypto.randomUUID());
  }, [isOpen]);

  const submit = async () => {
    const t = customText.trim();
    if (t.length < SHOWCASE_MIN_CUSTOM_LEN) {
      showToast(`Текст — не короче ${SHOWCASE_MIN_CUSTOM_LEN} символов`, 'info');
      return;
    }
    if (t.length > SHOWCASE_MAX_CUSTOM_LEN) {
      showToast(`Максимум ${SHOWCASE_MAX_CUSTOM_LEN} символов`, 'info');
      return;
    }
    if (files.length > SHOWCASE_MAX_MEDIA) {
      showToast(`Максимум ${SHOWCASE_MAX_MEDIA} файлов`, 'info');
      return;
    }

    setSubmitting(true);
    try {
      const media: MediaItem[] = [];
      for (const f of files) {
        const up = await uploadShowcaseFile(user.id, uploadDraftId, f);
        if (up) media.push({ path: up.path, kind: up.kind });
      }
      await createProjectPost(user.id, phrasePayloadCustom(t), media);
      showToast('Отправлено на проверку наставникам!', 'success');
      void refreshUser();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Не удалось отправить';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isStudent) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      panelClassName="border-kiddy-cherry/25 shadow-[0_0_80px_-20px_rgba(230,0,43,0.45)] ring-1 ring-white/[0.06]"
    >
      <div className="relative">
        <div
          className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-kiddy-cherry/25 blur-[80px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-violet-500/15 blur-[70px]"
          aria-hidden
        />

        <header className="relative flex items-start justify-between gap-4 border-b border-white/[0.08] px-6 pb-5 pt-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-kiddy-cherry/35 bg-gradient-to-br from-kiddy-cherry/25 to-kiddy-cherry/5 text-kiddy-cherry shadow-inner shadow-kiddy-cherry/10">
              <Sparkles size={22} strokeWidth={2} className="animate-pulse" style={{ animationDuration: '2.5s' }} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold tracking-tight text-white md:text-2xl">Новый проект</h2>
              <p className="mt-1 text-xs leading-relaxed text-kiddy-textMuted">
                Расскажи своими словами. После проверки наставник опубликует пост в витрине.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/community?v=showcase');
                }}
                className="mt-2 text-left text-xs font-bold text-kiddy-cherry/90 underline decoration-kiddy-cherry/30 underline-offset-2 transition-colors hover:text-kiddy-cherry hover:decoration-kiddy-cherry"
              >
                Посмотреть ленту витрины →
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 text-kiddy-textMuted transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </header>

        <div className="relative space-y-5 px-6 py-6">
          <div>
            <label htmlFor="showcase-modal-text" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">
              Описание проекта
            </label>
            <textarea
              id="showcase-modal-text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value.slice(0, SHOWCASE_MAX_CUSTOM_LEN))}
              rows={6}
              placeholder="Что сделал, чем доволен, что было интересного…"
              className="min-h-[140px] w-full resize-y rounded-2xl border border-white/[0.1] bg-black/50 px-4 py-3 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-kiddy-cherry/50 focus:ring-2 focus:ring-kiddy-cherry/15"
            />
            <div className="mt-2 flex justify-between text-[10px] text-kiddy-textMuted">
              <span>
                {SHOWCASE_MIN_CUSTOM_LEN}–{SHOWCASE_MAX_CUSTOM_LEN} символов
              </span>
              <span className={customLen < SHOWCASE_MIN_CUSTOM_LEN ? 'text-amber-400/90' : 'text-zinc-500'}>
                {customLen} / {SHOWCASE_MAX_CUSTOM_LEN}
              </span>
            </div>
          </div>

          {previewTrim.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-kiddy-textMuted">Предпросмотр</p>
              <p className="max-h-28 overflow-y-auto text-sm leading-relaxed text-kiddy-textSecondary whitespace-pre-wrap custom-scrollbar">
                {showcasePostBody(phrasePayloadCustom(previewTrim))}
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">Фото и видео</p>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              id={fileInputId}
              onChange={(e) => {
                const picked = Array.from(e.target.files || []);
                e.target.value = '';
                setFiles((prev) => [...prev, ...picked].slice(0, SHOWCASE_MAX_MEDIA));
              }}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <label
                htmlFor={fileInputId}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:border-kiddy-cherry/40 hover:bg-kiddy-cherry/10 sm:w-auto"
              >
                <ImagePlus size={18} />
                Прикрепить файлы
              </label>
              <span className="text-center text-[10px] text-kiddy-textMuted sm:text-left">до {SHOWCASE_MAX_MEDIA} шт.</span>
            </div>
            {files.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex max-w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-white"
                  >
                    {f.type.startsWith('video/') ? <Video size={14} className="shrink-0" /> : <ImagePlus size={14} className="shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <button
                      type="button"
                      aria-label="Убрать файл"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="shrink-0 text-kiddy-textMuted hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-kiddy-cherry to-[#c40028] py-4 text-sm font-bold text-white shadow-lg shadow-kiddy-cherry/25 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
            Отправить на модерацию
          </button>
        </div>
      </div>
    </Modal>
  );
};
