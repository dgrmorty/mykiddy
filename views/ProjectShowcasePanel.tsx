import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { AvatarImage } from '../components/AvatarImage';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Role } from '../types';
import {
  SHOWCASE_PHRASE_SLOTS,
  composeShowcaseText,
  defaultPhraseSelections,
  isPhraseSelectionsComplete,
  type PhraseSelections,
  SHOWCASE_MAX_MEDIA,
} from '../data/projectShowcaseCatalog';
import {
  createProjectPost,
  fetchApprovedShowcasePosts,
  fetchLikeCounts,
  fetchLikeState,
  mediaPublicUrl,
  toggleLike,
  uploadShowcaseFile,
  type MediaItem,
  type ShowcasePostRow,
} from '../services/projectShowcaseService';
import { supabase } from '../services/supabase';
import { Heart, ImagePlus, Loader2, Send, Trash2, Video, Sparkles } from 'lucide-react';

export const ProjectShowcasePanel: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isStudent = user.role === Role.STUDENT && user.id !== 'guest';

  const [posts, setPosts] = useState<ShowcasePostRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, { name: string | null; avatar: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [likeMap, setLikeMap] = useState<Record<string, boolean>>({});
  const [countMap, setCountMap] = useState<Record<string, number>>({});

  const [selections, setSelections] = useState<PhraseSelections>(() => defaultPhraseSelections());
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadDraftId, setUploadDraftId] = useState(() => crypto.randomUUID());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchApprovedShowcasePosts(50);
      setPosts(list);
      const ids = [...new Set(list.map((p) => p.author_id))];
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, name, avatar').in('id', ids);
        const m: Record<string, { name: string | null; avatar: string | null }> = {};
        (profs || []).forEach((p: { id: string; name: string | null; avatar: string | null }) => {
          m[p.id] = { name: p.name, avatar: p.avatar };
        });
        setAuthors(m);
      } else setAuthors({});

      const pids = list.map((p) => p.id);
      if (pids.length && user.id !== 'guest') {
        const [likes, counts] = await Promise.all([
          fetchLikeState(pids, user.id),
          fetchLikeCounts(pids),
        ]);
        setLikeMap(likes);
        setCountMap(counts);
      } else {
        setLikeMap({});
        setCountMap({});
      }
    } catch {
      setPosts([]);
      showToast('Не удалось загрузить витрину', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLike = async (postId: string, authorId: string) => {
    if (!isStudent || user.id === 'guest') {
      showToast('Лайки доступны ученикам', 'info');
      return;
    }
    if (authorId === user.id) return;
    const cur = !!likeMap[postId];
    try {
      await toggleLike(postId, user.id, cur);
      setLikeMap((m) => ({ ...m, [postId]: !cur }));
      setCountMap((m) => ({
        ...m,
        [postId]: Math.max(0, (m[postId] || 0) + (cur ? -1 : 1)),
      }));
    } catch {
      showToast('Не удалось поставить лайк', 'error');
    }
  };

  const submit = async () => {
    if (!isStudent) return;
    if (!isPhraseSelectionsComplete(selections)) {
      showToast('Выбери фразу в каждом блоке', 'info');
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
      await createProjectPost(user.id, selections, media);
      showToast('Отправлено на проверку наставникам!', 'success');
      setFiles([]);
      setUploadDraftId(crypto.randomUUID());
      setSelections(defaultPhraseSelections());
      void refreshUser();
    } catch (e: any) {
      showToast(e?.message || 'Не удалось отправить', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const previewText = composeShowcaseText(selections);

  return (
    <div className="space-y-10 pb-20">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-kiddy-cherry">Витрина</p>
        <h2 className="font-display text-2xl font-bold italic tracking-tight text-white md:text-3xl">Проекты ребят</h2>
        <p className="max-w-2xl text-sm text-kiddy-textMuted">
          Здесь только проверенные работы. Выбери готовые фразы, прикрепи скрин или короткое видео — наставник посмотрит и опубликует.
        </p>
      </header>

      {isStudent && (
        <Card className="space-y-6 border-kiddy-cherry/20 bg-kiddy-cherry/[0.04] p-6 md:p-8">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="text-kiddy-cherry" size={22} />
            <h3 className="font-display text-lg font-bold">Выложить проект</h3>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {SHOWCASE_PHRASE_SLOTS.map((slot) => (
              <div key={slot.id}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">{slot.label}</p>
                <select
                  value={selections[slot.id] || ''}
                  onChange={(e) => setSelections((s) => ({ ...s, [slot.id]: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.1] bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-kiddy-cherry/50"
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
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">Предпросмотр текста</p>
            <p className="rounded-xl border border-white/[0.08] bg-black/40 p-4 text-sm leading-relaxed text-kiddy-textSecondary">
              {previewText}
            </p>
          </div>
          <div>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              id="showcase-files"
              onChange={(e) => {
                const picked = Array.from(e.target.files || []);
                e.target.value = '';
                setFiles((prev) => [...prev, ...picked].slice(0, SHOWCASE_MAX_MEDIA));
              }}
            />
            <label
              htmlFor="showcase-files"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-kiddy-textSecondary transition-colors hover:border-kiddy-cherry/40 hover:text-white"
            >
              <ImagePlus size={16} />
              Фото / видео
            </label>
            <span className="ml-3 text-[10px] text-kiddy-textMuted">до {SHOWCASE_MAX_MEDIA} файлов</span>
            {files.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-1.5 text-xs text-white"
                  >
                    {f.type.startsWith('video/') ? <Video size={14} /> : <ImagePlus size={14} />}
                    <span className="max-w-[140px] truncate">{f.name}</span>
                    <button
                      type="button"
                      aria-label="Убрать"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="text-kiddy-textMuted hover:text-red-400"
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-kiddy-cherry py-4 text-sm font-bold text-white transition-all hover:bg-kiddy-cherryHover disabled:opacity-50 md:w-auto md:px-10"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
            Отправить на модерацию
          </button>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-kiddy-cherry" size={40} />
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-12 text-center text-sm text-kiddy-textMuted">
          Пока нет опубликованных работ. Скоро здесь появятся проекты учеников!
        </Card>
      ) : (
        <ul className="space-y-5">
          {posts.map((p, i) => {
            const au = authors[p.author_id];
            const name = au?.name || 'Ученик';
            const av =
              au?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
            const body = composeShowcaseText((p.phrase_selections || {}) as PhraseSelections);
            const media = Array.isArray(p.media) ? p.media : [];
            const liked = !!likeMap[p.id];
            const cnt = countMap[p.id] || 0;
            return (
              <li
                key={p.id}
                style={{ animation: `fade-in-up 0.45s ease both`, animationDelay: `${Math.min(i, 12) * 0.04}s` }}
              >
                <Card hoverEffect className="overflow-hidden p-0">
                  <div className="flex items-start gap-4 border-b border-white/[0.06] p-5">
                    <button type="button" onClick={() => navigate(`/users/${p.author_id}`)} className="shrink-0">
                      <AvatarImage src={av} name={name} alt="" className="h-12 w-12 rounded-xl border border-white/10 object-cover" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/users/${p.author_id}`)}
                        className="font-bold text-white hover:text-kiddy-cherry"
                      >
                        {name}
                      </button>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-kiddy-textSecondary">{body}</p>
                    </div>
                  </div>
                  {media.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3">
                      {media.map((m: MediaItem, idx: number) => {
                        const url = mediaPublicUrl(m.path);
                        return m.kind === 'video' ? (
                          <video key={idx} src={url} controls className="aspect-video w-full rounded-xl bg-black object-cover" />
                        ) : (
                          <img key={idx} src={url} alt="" className="aspect-video w-full rounded-xl object-cover" />
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
                    <button
                      type="button"
                      onClick={() => void handleLike(p.id, p.author_id)}
                      disabled={!isStudent || p.author_id === user.id}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                        liked ? 'text-kiddy-cherry' : 'text-kiddy-textMuted hover:text-white'
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <Heart size={18} className={liked ? 'fill-current' : ''} />
                      {cnt}
                    </button>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(p.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
