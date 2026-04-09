import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Role } from '../types';
import {
  SHOWCASE_PHRASE_SLOTS,
  composeShowcaseText,
  defaultPhraseSelections,
  isPhraseSelectionsComplete,
  phrasePayloadCustom,
  showcasePostBody,
  type PhraseSelections,
  SHOWCASE_MAX_MEDIA,
  SHOWCASE_MIN_CUSTOM_LEN,
  SHOWCASE_MAX_CUSTOM_LEN,
  SHOWCASE_FREE_TEXT_KEY,
} from '../data/projectShowcaseCatalog';
import { createProjectPost, uploadShowcaseFile, type MediaItem } from '../services/projectShowcaseService';
import { ImagePlus, Loader2, Send, Trash2, Video, Sparkles, PenLine, LayoutList } from 'lucide-react';

type Mode = 'custom' | 'template';

export const ShowcaseSubmitCard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isStudent = user.role === Role.STUDENT && user.id !== 'guest';

  const [mode, setMode] = useState<Mode>('custom');
  const [customText, setCustomText] = useState('');
  const [selections, setSelections] = useState<PhraseSelections>(() => defaultPhraseSelections());
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadDraftId, setUploadDraftId] = useState(() => crypto.randomUUID());

  if (!isStudent) return null;

  const previewTemplate = composeShowcaseText(selections);
  const previewCustom = customText.trim();
  const customLen = customText.length;

  const submit = async () => {
    if (files.length > SHOWCASE_MAX_MEDIA) {
      showToast(`Максимум ${SHOWCASE_MAX_MEDIA} файлов`, 'info');
      return;
    }

    let payload: PhraseSelections;

    if (mode === 'custom') {
      const t = customText.trim();
      if (t.length < SHOWCASE_MIN_CUSTOM_LEN) {
        showToast(`Текст — не короче ${SHOWCASE_MIN_CUSTOM_LEN} символов`, 'info');
        return;
      }
      if (t.length > SHOWCASE_MAX_CUSTOM_LEN) {
        showToast(`Максимум ${SHOWCASE_MAX_CUSTOM_LEN} символов`, 'info');
        return;
      }
      payload = phrasePayloadCustom(t);
    } else {
      if (!isPhraseSelectionsComplete(selections)) {
        showToast('Выбери фразу в каждом блоке', 'info');
        return;
      }
      const copy = { ...selections };
      delete copy[SHOWCASE_FREE_TEXT_KEY];
      payload = copy;
    }

    setSubmitting(true);
    try {
      const media: MediaItem[] = [];
      for (const f of files) {
        const up = await uploadShowcaseFile(user.id, uploadDraftId, f);
        if (up) media.push({ path: up.path, kind: up.kind });
      }
      await createProjectPost(user.id, payload, media);
      showToast('Отправлено на проверку наставникам!', 'success');
      setFiles([]);
      setCustomText('');
      setSelections(defaultPhraseSelections());
      setUploadDraftId(crypto.randomUUID());
      void refreshUser();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Не удалось отправить';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="stagger-2">
      <Card className="overflow-hidden border border-kiddy-cherry/25 bg-gradient-to-br from-kiddy-cherry/[0.07] via-black/40 to-black/60 p-0 shadow-[0_0_0_1px_rgba(230,0,43,0.06)]">
        <div className="border-b border-white/[0.06] bg-black/25 px-5 py-4 md:px-8 md:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-kiddy-cherry/30 bg-kiddy-cherry/15 text-kiddy-cherry">
                <Sparkles size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-white md:text-xl">Витрина — новый пост</h3>
                <p className="text-xs text-kiddy-textMuted">Опиши проект своими словами или собери из готовых фраз. После проверки пост появится в ленте.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/community?v=showcase')}
              className="shrink-0 self-start rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-kiddy-textSecondary transition-colors hover:border-kiddy-cherry/35 hover:text-white sm:self-center"
            >
              Смотреть ленту
            </button>
          </div>

          <div className="mt-5 flex w-full rounded-2xl border border-white/[0.08] bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                mode === 'custom' ? 'bg-kiddy-cherry text-white shadow-lg' : 'text-kiddy-textMuted hover:text-white'
              }`}
            >
              <PenLine size={16} />
              Свой текст
            </button>
            <button
              type="button"
              onClick={() => setMode('template')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                mode === 'template' ? 'bg-kiddy-cherry text-white shadow-lg' : 'text-kiddy-textMuted hover:text-white'
              }`}
            >
              <LayoutList size={16} />
              Из фраз
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 md:px-8 md:py-8">
          {mode === 'custom' ? (
            <div>
              <label htmlFor="showcase-custom" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">
                Текст проекта
              </label>
              <textarea
                id="showcase-custom"
                value={customText}
                onChange={(e) => setCustomText(e.target.value.slice(0, SHOWCASE_MAX_CUSTOM_LEN))}
                rows={7}
                placeholder="Например: что сделал, чем гордишься, что было сложным…"
                className="min-h-[160px] w-full resize-y rounded-2xl border border-white/[0.1] bg-black/50 px-4 py-3 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-kiddy-cherry/45"
              />
              <div className="mt-2 flex justify-between text-[10px] text-kiddy-textMuted">
                <span>
                  от {SHOWCASE_MIN_CUSTOM_LEN} до {SHOWCASE_MAX_CUSTOM_LEN} символов
                </span>
                <span className={customLen < SHOWCASE_MIN_CUSTOM_LEN ? 'text-amber-400/90' : 'text-zinc-500'}>
                  {customLen} / {SHOWCASE_MAX_CUSTOM_LEN}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {SHOWCASE_PHRASE_SLOTS.map((slot) => (
                  <div key={slot.id} className="min-w-0">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">{slot.label}</p>
                    <select
                      value={selections[slot.id] || ''}
                      onChange={(e) => setSelections((s) => ({ ...s, [slot.id]: e.target.value }))}
                      className="w-full rounded-xl border border-white/[0.1] bg-black/60 px-3 py-3 text-sm text-white outline-none focus:border-kiddy-cherry/45"
                    >
                      {slot.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.text}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">Предпросмотр</p>
                <p className="rounded-2xl border border-white/[0.08] bg-black/35 px-4 py-3 text-sm leading-relaxed text-kiddy-textSecondary">
                  {previewTemplate}
                </p>
              </div>
            </>
          )}

          {mode === 'custom' && previewCustom.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">Предпросмотр</p>
              <p className="rounded-2xl border border-white/[0.08] bg-black/35 px-4 py-3 text-sm leading-relaxed text-kiddy-textSecondary whitespace-pre-wrap">
                {showcasePostBody(phrasePayloadCustom(previewCustom))}
              </p>
            </div>
          )}

          <div className="border-t border-white/[0.06] pt-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">Медиа (по желанию)</p>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              id="showcase-files-profile"
              onChange={(e) => {
                const picked = Array.from(e.target.files || []);
                e.target.value = '';
                setFiles((prev) => [...prev, ...picked].slice(0, SHOWCASE_MAX_MEDIA));
              }}
            />
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <label
                  htmlFor="showcase-files-profile"
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:border-kiddy-cherry/40 hover:bg-white/[0.09] sm:w-auto sm:justify-start"
                >
                  <ImagePlus size={18} />
                  Прикрепить фото или видео
                </label>
                <span className="text-center text-[10px] text-kiddy-textMuted sm:text-left">до {SHOWCASE_MAX_MEDIA} файлов</span>
              </div>
              {files.length > 0 && (
                <ul className="flex flex-wrap gap-2">
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
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-kiddy-cherry px-6 py-4 text-sm font-bold text-white shadow-lg shadow-kiddy-cherry/20 transition-all hover:bg-kiddy-cherryHover disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
              Отправить на модерацию
            </button>
          </div>
        </div>
      </Card>
    </section>
  );
};
