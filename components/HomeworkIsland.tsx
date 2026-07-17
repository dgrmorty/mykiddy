import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Check, ImagePlus, Loader2, Trash2, X } from 'lucide-react';

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
  canSubmit: boolean;
  isChecking: boolean;
  securityError: string | null;
  onSubmit: () => void;
};

function statusLabel(status: HomeworkIslandStatus, isCompleted: boolean, hasTask: boolean) {
  if (!hasTask) return 'Нет задания';
  if (isCompleted || status === 'approved') return 'Принято';
  if (status === 'pending') return 'На проверке';
  if (status === 'rejected') return 'Нужны правки';
  return '';
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
  canSubmit,
  isChecking,
  securityError,
  onSubmit,
}) => {
  const hasTask = !!task?.trim();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const label = statusLabel(status, isCompleted, hasTask);
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

      const easeOpen = 'expo.out';
      const easeClose = 'power3.inOut';

      if (!open) {
        if (reduced) {
          gsap.set(card, { borderRadius: 999, height: 48, overflow: 'hidden' });
          gsap.set(compact, { opacity: 1, visibility: 'visible', display: 'flex' });
          gsap.set(body, { opacity: 0, visibility: 'hidden', display: 'none' });
          return;
        }
        const tl = gsap.timeline({ defaults: { ease: easeClose } });
        tl.to(body, { opacity: 0, duration: 0.22 }, 0)
          .set(body, { visibility: 'hidden', display: 'none' }, 0.22)
          .set(compact, { visibility: 'visible', display: 'flex' }, 0.18)
          .fromTo(compact, { opacity: 0 }, { opacity: 1, duration: 0.28 }, 0.2)
          .to(card, { borderRadius: 999, height: 48, duration: 0.55 }, 0);
        return;
      }

      gsap.set(body, { display: 'flex', visibility: 'hidden', opacity: 0 });
      gsap.set(card, { height: 'auto', overflow: 'hidden' });
      const targetH = Math.min(Math.max(card.scrollHeight, 260), window.innerHeight * 0.78);

      if (reduced) {
        gsap.set(card, { borderRadius: 24, height: 'auto', overflow: 'visible' });
        gsap.set(compact, { opacity: 0, visibility: 'hidden', display: 'none' });
        gsap.set(body, { opacity: 1, visibility: 'visible', display: 'flex' });
        return;
      }

      gsap.set(card, { height: 48, borderRadius: 999 });
      gsap.set(compact, { opacity: 1, visibility: 'visible', display: 'flex' });

      const tl = gsap.timeline({ defaults: { ease: easeOpen } });
      tl.to(card, { borderRadius: 24, height: targetH, duration: 0.72 }, 0)
        .to(compact, { opacity: 0, duration: 0.18 }, 0.08)
        .set(compact, { visibility: 'hidden', display: 'none' }, 0.26)
        .set(body, { visibility: 'visible', display: 'flex' }, 0.2)
        .fromTo(body, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.28)
        .add(() => {
          gsap.set(card, { height: 'auto', clearProps: 'overflow' });
        });
    },
    { dependencies: [open, status, isCompleted, media.length, rejectionComment], scope: rootRef },
  );

  const submitLabel =
    isChecking || status === 'pending'
      ? 'Отправка…'
      : status === 'rejected'
        ? 'Отправить снова'
        : 'Отправить';

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
        className="relative w-full overflow-hidden border border-white/[0.08] bg-[#0c0c0c]/95 shadow-island backdrop-blur-2xl will-change-[height,border-radius]"
        style={{ borderRadius: 999, height: 48 }}
      >
        <button
          ref={compactRef}
          type="button"
          onClick={() => setOpen(true)}
          className="absolute inset-0 z-10 flex h-12 w-full items-center gap-3 px-5 text-left"
          aria-expanded={open}
        >
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-white">
            Домашнее задание
          </span>
          {label ? (
            <span className="shrink-0 text-[13px] font-medium text-white/40">{label}</span>
          ) : null}
        </button>

        <div
          ref={bodyRef}
          className="custom-scrollbar hidden max-h-[min(78vh,640px)] flex-col gap-6 overflow-y-auto overscroll-contain px-5 pb-5 pt-4"
          style={{ visibility: 'hidden' }}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-semibold tracking-tight text-white">Домашнее задание</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Свернуть"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {!hasTask ? (
            <p className="text-[15px] leading-relaxed text-white/40">Задание пока не задано.</p>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/75">{task}</p>

              {done ? (
                <div className="flex items-center gap-2 text-[15px] font-medium text-white/70">
                  <Check size={16} strokeWidth={2.5} className="text-white/50" />
                  Принято
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {status === 'rejected' && (
                    <p className="text-[14px] leading-relaxed text-white/55">
                      {rejectionComment?.trim() || 'Нужны правки — отправьте новую версию.'}
                    </p>
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
                    rows={4}
                    className="w-full resize-none rounded-2xl border-0 bg-white/[0.06] px-4 py-3.5 text-[15px] leading-relaxed text-white outline-none ring-0 placeholder:text-white/25 focus:bg-white/[0.08] disabled:opacity-50"
                    placeholder="Ваш ответ"
                  />

                  {media.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {media.map((m) => (
                        <div key={m.id} className="relative overflow-hidden rounded-xl">
                          {m.mime.startsWith('video/') ? (
                            <video src={m.preview} className="h-[72px] w-[96px] bg-black object-cover" muted playsInline />
                          ) : (
                            <img src={m.preview} alt="" className="h-[72px] w-[96px] object-cover" />
                          )}
                          <button
                            type="button"
                            aria-label="Убрать"
                            onClick={() => onRemoveMedia(m.id)}
                            disabled={busy}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/90 disabled:opacity-40"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {securityError && (
                    <p className="text-[13px] text-red-400">{securityError}</p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onPickFiles}
                      disabled={busy}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                      aria-label="Прикрепить фото или видео"
                    >
                      <ImagePlus size={18} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={onSubmit}
                      disabled={busy || done || !canSubmit}
                      className="flex h-11 flex-1 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {isChecking || status === 'pending' ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        submitLabel
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
