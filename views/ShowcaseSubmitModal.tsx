import React, { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
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

interface ShowcaseSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PreviewFile = {
  id: string;
  file: File;
  url: string;
};

export const ShowcaseSubmitModal: React.FC<ShowcaseSubmitModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [customText, setCustomText] = useState('');
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadDraftId, setUploadDraftId] = useState(() => crypto.randomUUID());

  const isStudent = user.role === Role.STUDENT && user.id !== 'guest';
  const canSubmit = customText.trim().length >= SHOWCASE_MIN_CUSTOM_LEN && !submitting;

  useEffect(() => {
    if (!isOpen) return;
    setCustomText('');
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setSubmitting(false);
    setUploadDraftId(crypto.randomUUID());
  }, [isOpen]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      maxWidth="max-w-md"
      mobileCentered
      panelClassName="border-white/[0.08] bg-[#0c0c0c]/98 shadow-island backdrop-blur-2xl"
    >
      <div className="flex flex-col gap-6 px-5 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold tracking-tight text-white">Новый проект</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Закрыть"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

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

        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value.slice(0, SHOWCASE_MAX_CUSTOM_LEN))}
          disabled={submitting}
          rows={5}
          autoFocus
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

        <div className="flex items-center gap-2">
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
    </Modal>
  );
};
