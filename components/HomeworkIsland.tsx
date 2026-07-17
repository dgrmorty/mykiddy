import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ImagePlus,
  Loader2,
  Send,
  Trash2,
  X,
} from 'lucide-react';

gsap.registerPlugin(useGSAP);

export type HomeworkIslandMedia = {
  id: string;
  mime: string;
  preview: string;
  name: string;
};

export type HomeworkIslandStatus = 'none' | 'pending' | 'approved' | 'rejected';

type Props = {
  task: string | null | undefined;
  status: HomeworkIslandStatus;
  isCompleted: boolean;
  rejectionComment: string | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  media: HomeworkIslandMedia[];
  onPickFiles: () => void;
  onRemoveMedia: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFilesSelected: (files: FileList | null) => void;
  textOnlyMinLen: number;
  canSubmit: boolean;
  isChecking: boolean;
  securityError: string | null;
  onSubmit: () => void;
  maxFilesHint?: string;
};

function statusMeta(status: HomeworkIslandStatus, isCompleted: boolean, hasTask: boolean) {
  if (!hasTask) {
    return { label: 'Нет задания', dot: 'bg-zinc-500', chip: 'text-zinc-400 bg-white/5 border-white/10' };
  }
  if (isCompleted || status === 'approved') {
    return { label: 'Принято', dot: 'bg-emerald-400', chip: 'text-emerald-200 bg-emerald-500/15 border-emerald-400/30' };
  }
  if (status === 'pending') {
    return { label: 'На проверке', dot: 'bg-amber-400 animate-pulse', chip: 'text-amber-200 bg-amber-500/15 border-amber-400/30' };
  }
  if (status === 'rejected') {
    return { label: 'На доработку', dot: 'bg-amber-400', chip: 'text-amber-100 bg-amber-500/15 border-amber-400/35' };
  }
  return { label: 'Открыть', dot: 'bg-kiddy-cherry', chip: 'text-white bg-white/10 border-white/15' };
}

export const HomeworkIsland: React.FC<Props> = ({
  task,
  status,
  isCompleted,
  rejectionComment,
  answer,
  onAnswerChange,
  media,
  onPickFiles,
  onRemoveMedia,
  fileInputRef,
  onFilesSelected,
  textOnlyMinLen,
  canSubmit,
  isChecking,
  securityError,
  onSubmit,
  maxFilesHint = 'До 6 файлов · фото до 4 МБ · одно видео до 12 МБ',
}) => {
  const hasTask = !!task?.trim();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const meta = statusMeta(status, isCompleted, hasTask);
  const busy = isChecking || status === 'pending';
  const done = isCompleted || status === 'approved';

  useEffect(() => {
    setOpen(false);
  }, [task]);

  useGSAP(
    () => {
      const card = cardRef.current;
      const compact = compactRef.current;
      const body = bodyRef.current;
      if (!card || !compact || !body) return;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.killTweensOf([card, compact, body]);

      if (!open) {
        if (reduced) {
          gsap.set(card, { borderRadius: 999, height: 52, overflow: 'hidden' });
          gsap.set(compact, { opacity: 1, visibility: 'visible' });
          gsap.set(body, { opacity: 0, visibility: 'hidden', display: 'none' });
          return;
        }
        gsap.set(body, { opacity: 0 });
        const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
        tl.to(body, { opacity: 0, y: 6, duration: 0.16 }, 0)
          .set(body, { visibility: 'hidden', display: 'none' })
          .set(compact, { visibility: 'visible', display: 'flex' })
          .to(compact, { opacity: 1, duration: 0.18 }, 0.05)
          .to(card, { borderRadius: 999, height: 52, duration: 0.38 }, 0);
        return;
      }

      gsap.set(body, { display: 'flex', visibility: 'hidden', opacity: 0 });
      gsap.set(card, { height: 'auto', overflow: 'hidden' });
      const targetH = Math.min(Math.max(card.scrollHeight, 280), window.innerHeight * 0.78);

      if (reduced) {
        gsap.set(card, { borderRadius: 28, height: 'auto', overflow: 'visible' });
        gsap.set(compact, { opacity: 0, visibility: 'hidden', display: 'none' });
        gsap.set(body, { opacity: 1, visibility: 'visible', display: 'flex' });
        return;
      }

      gsap.set(card, { height: 52, borderRadius: 999 });
      gsap.set(compact, { opacity: 1, visibility: 'visible', display: 'flex' });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.to(card, { borderRadius: 28, height: targetH, duration: 0.45 }, 0)
        .to(compact, { opacity: 0, duration: 0.12 }, 0.12)
        .set(compact, { visibility: 'hidden', display: 'none' })
        .set(body, { visibility: 'visible', display: 'flex' })
        .fromTo(body, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.28 }, 0.22)
        .add(() => {
          gsap.set(card, { height: 'auto', clearProps: 'overflow' });
        });
    },
    { dependencies: [open, status, isCompleted, media.length, rejectionComment], scope: rootRef },
  );

  return (
    <div ref={rootRef} className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onFilesSelected(e.target.files);
          e.target.value = '';
        }}
      />

      <div
        ref={cardRef}
        className="relative w-full overflow-hidden border border-white/12 bg-black/95 shadow-island backdrop-blur-2xl will-change-[height,border-radius]"
        style={{ borderRadius: 999, height: 52 }}
      >
        {/* Compact pill */}
        <button
          ref={compactRef}
          type="button"
          onClick={() => setOpen(true)}
          className="absolute inset-0 z-10 flex h-[52px] w-full items-center gap-3 px-4 text-left"
          aria-expanded={open}
        >
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
          <span className="min-w-0 flex-1 truncate text-sm font-bold tracking-tight text-white">
            Домашнее задание
          </span>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.chip}`}
          >
            {meta.label}
          </span>
          <ChevronDown size={16} className="shrink-0 text-zinc-400" aria-hidden />
        </button>

        {/* Expanded body */}
        <div
          ref={bodyRef}
          className="custom-scrollbar hidden max-h-[min(78vh,640px)] flex-col gap-5 overflow-y-auto overscroll-contain p-4 sm:p-5"
          style={{ visibility: 'hidden' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <BookOpen className="text-white" size={20} />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Урок</p>
                <h3 className="text-lg font-bold tracking-tight text-white">Домашнее задание</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Свернуть"
            >
              <X size={18} />
            </button>
          </div>

          {!hasTask ? (
            <p className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-5 text-sm leading-relaxed text-kiddy-textMuted">
              Для этого урока домашнее задание пока не задано.
            </p>
          ) : (
            <>
              <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-transparent p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Задание</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{task}</p>
              </div>

              {done ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 py-4 text-sm font-bold text-emerald-100">
                  <CheckCircle size={18} />
                  Задание принято
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {status === 'rejected' && (
                    <div
                      role="status"
                      className="rounded-2xl border border-amber-500/35 bg-amber-500/[0.08] p-4 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 shrink-0 text-amber-400" size={20} aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200/95">
                            Задание не принято
                          </p>
                          {rejectionComment ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white">
                              {rejectionComment}
                            </p>
                          ) : (
                            <p className="mt-2 text-sm leading-relaxed text-kiddy-textSecondary">
                              Исправьте работу и отправьте снова — можно любое число попыток.
                            </p>
                          )}
                          <p className="mt-2 text-[11px] leading-relaxed text-kiddy-textMuted">
                            Обновите текст и файлы ниже и отправьте новую версию на проверку.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] font-medium leading-relaxed text-kiddy-textMuted">
                    Отправьте ответ на проверку: можно только текст, только фото/видео или и то и другое.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onPickFiles}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2.5 text-xs font-bold text-white transition-all hover:border-white/25 hover:bg-white/10 disabled:opacity-50"
                    >
                      <ImagePlus size={16} />
                      Фото или видео
                    </button>
                    <span className="text-[10px] font-medium text-kiddy-textMuted">{maxFilesHint}</span>
                  </div>

                  {media.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {media.map((m) => (
                        <div
                          key={m.id}
                          className="group relative overflow-hidden rounded-2xl border border-white/10"
                        >
                          {m.mime.startsWith('video/') ? (
                            <video src={m.preview} className="h-20 w-28 bg-black object-cover" muted playsInline />
                          ) : (
                            <img src={m.preview} alt="" className="h-20 w-28 object-cover" />
                          )}
                          <button
                            type="button"
                            aria-label="Убрать файл"
                            onClick={() => onRemoveMedia(m.id)}
                            disabled={busy}
                            className="absolute right-1.5 top-1.5 rounded-full bg-black/75 p-1.5 text-white transition-colors hover:bg-red-600/90 disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    value={answer}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    onFocus={(e) => {
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 300);
                    }}
                    disabled={busy}
                    className="min-h-[132px] w-full resize-none rounded-2xl border border-white/[0.08] bg-black/60 p-4 font-mono text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-white/25 disabled:opacity-60"
                    placeholder={
                      media.length > 0
                        ? 'Комментарий к файлам — по желанию…'
                        : `Только текст — не короче ${textOnlyMinLen} символов. Или прикрепите фото/видео без текста.`
                    }
                  />

                  {securityError && (
                    <div className="text-xs font-bold text-red-500">{securityError}</div>
                  )}

                  {status === 'pending' && (
                    <p className="flex items-center gap-2 text-xs font-bold text-amber-400/95">
                      <Loader2 className="shrink-0 animate-spin" size={14} />
                      Работа на проверке у администратора
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={busy || done || !canSubmit}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-black transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isChecking ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : status === 'pending' ? (
                      <>
                        <Loader2 className="animate-spin" size={18} /> В обработке
                      </>
                    ) : status === 'rejected' ? (
                      <>
                        <Send size={18} /> Отправить снова
                      </>
                    ) : (
                      <>
                        <Send size={18} /> Отправить на проверку
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
