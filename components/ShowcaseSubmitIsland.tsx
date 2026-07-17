import React, { useEffect, useId, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Role } from '../types';
import {
  phrasePayloadCustom,
  SHOWCASE_MAX_MEDIA,
  SHOWCASE_MIN_CUSTOM_LEN,
  SHOWCASE_MAX_CUSTOM_LEN,
} from '../data/projectShowcaseCatalog';
import { createProjectPost, uploadShowcaseFile, type MediaItem } from '../services/projectShowcaseService';

gsap.registerPlugin(useGSAP);

type Props = {
  /** Открыть снаружи (например /profile#showcase-submit) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** id для scroll / hash (один на страницу) */
  anchorId?: string;
};

type PreviewFile = {
  id: string;
  file: File;
  url: string;
};

export const ShowcaseSubmitIsland: React.FC<Props> = ({
  open: openProp,
  onOpenChange,
  className = '',
  anchorId,
}) => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? !!openProp : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!controlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const [customText, setCustomText] = useState('');
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadDraftId, setUploadDraftId] = useState(() => crypto.randomUUID());

  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const isStudent = user.role === Role.STUDENT && user.id !== 'guest';
  const canSubmit = customText.trim().length >= SHOWCASE_MIN_CUSTOM_LEN && !submitting;

  useEffect(() => {
    if (open) return;
    setCustomText('');
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setSubmitting(false);
    setUploadDraftId(crypto.randomUUID());
  }, [open]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

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
      const targetH = Math.min(Math.max(card.scrollHeight, 280), window.innerHeight * 0.78);

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
    { dependencies: [open, previews.length, customText.length > 0], scope: rootRef },
  );

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    setPreviews((prev) => {
      const next = [...prev];
      for (const file of picked) {
        if (next.length >= SHOWCASE_MAX_MEDIA) {
          showToast(`Максимум ${SHOWCASE_MAX_MEDIA} файлов`, 'info');
          break;
        }
        next.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
      }
      return next;
    });
  };

  const removePreview = (id: string) => {
    setPreviews((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const submit = async () => {
    const t = customText.trim();
    if (t.length < SHOWCASE_MIN_CUSTOM_LEN) {
      showToast('Напишите короткое описание', 'info');
      return;
    }
    if (t.length > SHOWCASE_MAX_CUSTOM_LEN) {
      showToast(`Максимум ${SHOWCASE_MAX_CUSTOM_LEN} символов`, 'info');
      return;
    }

    setSubmitting(true);
    try {
      const media: MediaItem[] = [];
      for (const p of previews) {
        const up = await uploadShowcaseFile(user.id, uploadDraftId, p.file);
        if (up) media.push({ path: up.path, kind: up.kind });
      }
      await createProjectPost(user.id, phrasePayloadCustom(t), media);
      showToast('Отправлено на проверку', 'success');
      void refreshUser();
      setOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Не удалось отправить';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const compactHint = submitting ? 'Отправка…' : '';

  if (!isStudent) return null;

  return (
    <div ref={rootRef} id={anchorId} className={`w-full scroll-mt-24 ${className}`}>
      <input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
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
            Витрина проектов
          </span>
          {compactHint ? (
            <span className="shrink-0 text-[13px] font-medium text-white/40">{compactHint}</span>
          ) : null}
        </button>

        <div
          ref={bodyRef}
          className="custom-scrollbar hidden max-h-[min(78vh,640px)] flex-col gap-6 overflow-y-auto overscroll-contain px-5 pb-5 pt-4"
          style={{ visibility: 'hidden' }}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-semibold tracking-tight text-white">Новый проект</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Свернуть"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value.slice(0, SHOWCASE_MAX_CUSTOM_LEN))}
            onFocus={(e) => {
              setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 300);
            }}
            disabled={submitting}
            rows={5}
            className="w-full resize-none rounded-2xl border-0 bg-white/[0.06] px-4 py-3.5 text-[15px] leading-relaxed text-white outline-none ring-0 placeholder:text-white/25 focus:bg-white/[0.08] disabled:opacity-50"
            placeholder="Расскажите о проекте"
          />

          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((p) => (
                <div key={p.id} className="relative overflow-hidden rounded-xl">
                  {p.file.type.startsWith('video/') ? (
                    <video src={p.url} className="h-[72px] w-[96px] bg-black object-cover" muted playsInline />
                  ) : (
                    <img src={p.url} alt="" className="h-[72px] w-[96px] object-cover" />
                  )}
                  <button
                    type="button"
                    aria-label="Убрать"
                    onClick={() => removePreview(p.id)}
                    disabled={submitting}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/90 disabled:opacity-40"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting || previews.length >= SHOWCASE_MAX_MEDIA}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Прикрепить фото или видео"
            >
              <ImagePlus size={18} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Отправить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
