import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Role } from '../types';
import { showcasePostBody, type PhraseSelections } from '../data/projectShowcaseCatalog';

function normalizePhraseSelections(raw: unknown): PhraseSelections {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) return raw as PhraseSelections;
  return {};
}

function safeShowcaseBody(raw: unknown): string {
  try {
    return showcasePostBody(normalizePhraseSelections(raw));
  } catch (e) {
    console.warn('[Showcase] bad phrase_selections', e);
    return 'Текст поста недоступен (ошибка данных).';
  }
}

function normalizeShowcaseMedia(raw: unknown): MediaItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((m): m is MediaItem => {
    if (!m || typeof m !== 'object') return false;
    const o = m as MediaItem;
    return typeof o.path === 'string' && o.path.length > 0 && (o.kind === 'image' || o.kind === 'video');
  });
}
import {
  fetchApprovedShowcasePosts,
  fetchLikeCounts,
  fetchLikeState,
  fetchShowcaseAuthorsForFeed,
  mediaPublicUrl,
  toggleLike,
  deleteShowcasePost,
  type MediaItem,
  type ShowcasePostRow,
} from '../services/projectShowcaseService';
import { Heart, Loader2, Sparkles, Trash2, ChevronRight } from 'lucide-react';
import { levelFromXp } from '../progression';
import { formatRelativeTimeRu } from '../utils/formatRelativeTime';

export type ProjectShowcasePanelProps = {
  /** Встраивание на главную: без большого заголовка, уже узкая колонка. */
  embed?: boolean;
  /** Сколько постов подгрузить (по умолчанию 40 на странице сообщества, меньше на главной). */
  postLimit?: number;
};

/** Лента одобренных постов. Форма отправки — в профиле (или виджет на главной). */
export const ProjectShowcasePanel: React.FC<ProjectShowcasePanelProps> = ({
  embed = false,
  postLimit = 40,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isStudent = user.role === Role.STUDENT && user.id !== 'guest';
  const isAdmin = user.role === Role.ADMIN && user.id !== 'guest';

  const [posts, setPosts] = useState<ShowcasePostRow[]>([]);
  const [authors, setAuthors] = useState<
    Record<string, { name: string | null; avatar: string | null; xp: number | null }>
  >({});
  const [loading, setLoading] = useState(true);
  const [likeMap, setLikeMap] = useState<Record<string, boolean>>({});
  const [countMap, setCountMap] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = (await fetchApprovedShowcasePosts(postLimit)).filter((row) => row.id && row.author_id);
      setPosts(list);
      const ids = [...new Set(list.map((p) => p.author_id))];
      if (ids.length) {
        setAuthors(await fetchShowcaseAuthorsForFeed(ids));
      } else setAuthors({});

      const pids = list.map((p) => p.id);
      if (pids.length && user.id !== 'guest') {
        const [likes, counts] = await Promise.all([fetchLikeState(pids, user.id), fetchLikeCounts(pids)]);
        setLikeMap(likes);
        setCountMap(counts);
      } else if (pids.length) {
        setLikeMap({});
        setCountMap(await fetchLikeCounts(pids));
      } else {
        setLikeMap({});
        setCountMap({});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: string }).code) : '';
      console.error('[Showcase] load failed', msg, code, err);
      setPosts([]);
      showToast('Не удалось загрузить ленту', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, user.id, postLimit]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeleteAsAdmin = async (postId: string) => {
    if (!window.confirm('Удалить этот пост с витрины? Лайки тоже сбросятся.')) return;
    setDeletingId(postId);
    try {
      await deleteShowcasePost(postId);
      showToast('Пост удалён', 'success');
      setPosts((prev) => prev.filter((x) => x.id !== postId));
      setLikeMap((m) => {
        const n = { ...m };
        delete n[postId];
        return n;
      });
      setCountMap((m) => {
        const n = { ...m };
        delete n[postId];
        return n;
      });
    } catch {
      showToast('Не удалось удалить пост', 'error');
    } finally {
      setDeletingId(null);
    }
  };

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

  const feedWrap = embed ? 'max-w-xl mx-auto w-full' : 'max-w-xl mx-auto w-full';

  return (
    <div className={embed ? 'space-y-4' : 'space-y-8 pb-16'}>
      {!embed && (
        <header className="space-y-3 text-center sm:text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-kiddy-cherry">Витрина</p>
          <h2 className="font-display text-2xl font-bold italic tracking-tight text-white md:text-3xl">
            Лента проектов
          </h2>
          <p className="mx-auto max-w-xl text-sm text-kiddy-textMuted sm:mx-0">
            Как в ленте: кто что выложил. Свой проект отправляй из профиля — сначала проверка наставника.
          </p>
        </header>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-kiddy-cherry" size={40} />
        </div>
      ) : posts.length === 0 ? (
        <Card className="border border-white/[0.06] bg-kiddy-surfaceElevated/40 p-10 text-center text-sm text-kiddy-textMuted">
          <Sparkles className="mx-auto mb-4 text-kiddy-cherry/50" size={36} />
          <p>Пока нет опубликованных работ. Загляни позже или стань первым — через профиль.</p>
        </Card>
      ) : (
        <div className={feedWrap}>
          <ul className="flex flex-col gap-5 sm:gap-6">
            {posts.map((p, i) => {
              const postKey = p.id || `post-fallback-${i}`;
              const au = authors[p.author_id];
              const name = au?.name || 'Ученик';
              const body = safeShowcaseBody(p.phrase_selections);
              const media = normalizeShowcaseMedia(p.media);
              const liked = !!likeMap[p.id];
              const cnt = countMap[p.id] || 0;
              const lvl = levelFromXp(au?.xp ?? 0);
              const when = formatRelativeTimeRu(p.created_at || '');

              return (
                <li
                  key={postKey}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i, 14) * 0.035}s` }}
                >
                  <article className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c0c0c]/90 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.85)]">
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
                      <button
                        type="button"
                        onClick={() => navigate(`/users/${p.author_id}`)}
                        className="shrink-0 rounded-full ring-2 ring-transparent transition ring-offset-2 ring-offset-[#0c0c0c] hover:ring-kiddy-cherry/40"
                        aria-label={`Профиль: ${name}`}
                      >
                        <UserAvatar
                          user={{
                            id: p.author_id,
                            name,
                            avatar: au?.avatar || '',
                          }}
                          size="md"
                        />
                      </button>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/users/${p.author_id}`)}
                            className="truncate font-bold text-white hover:text-kiddy-cherry"
                          >
                            {name}
                          </button>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            ур. {lvl}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500">{when}</p>
                      </div>
                    </div>

                    <div className="px-4 pb-3 sm:px-5">
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-100">{body}</p>
                    </div>

                    {media.length > 0 && (
                      <div
                        className={
                          media.length === 1
                            ? 'border-t border-white/[0.06]'
                            : 'flex snap-x snap-mandatory gap-2 overflow-x-auto border-t border-white/[0.06] px-4 pb-1 pt-3 sm:px-5 [-webkit-overflow-scrolling:touch]'
                        }
                      >
                        {media.map((m: MediaItem, idx: number) => {
                          const url = mediaPublicUrl(m.path);
                          const single = media.length === 1;
                          return m.kind === 'video' ? (
                            <video
                              key={idx}
                              src={url}
                              controls
                              playsInline
                              className={
                                single
                                  ? 'aspect-video w-full bg-black object-cover'
                                  : 'aspect-video w-[min(92vw,22rem)] shrink-0 snap-center rounded-2xl bg-black object-cover sm:w-80'
                              }
                            />
                          ) : (
                            <img
                              key={idx}
                              src={url}
                              alt=""
                              className={
                                single
                                  ? 'max-h-[min(70vh,520px)] w-full bg-black object-contain'
                                  : 'aspect-video w-[min(92vw,22rem)] shrink-0 snap-center rounded-2xl object-cover sm:w-80'
                              }
                            />
                          );
                        })}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3 sm:px-5">
                      <button
                        type="button"
                        onClick={() => p.id && void handleLike(p.id, p.author_id)}
                        disabled={!isStudent || !p.id || p.author_id === user.id}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition-colors ${
                          liked ? 'text-kiddy-cherry' : 'text-kiddy-textMuted hover:text-white'
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        <Heart size={18} className={liked ? 'fill-current' : ''} />
                        <span>{cnt}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            type="button"
                            disabled={deletingId === p.id || !p.id}
                            onClick={() => {
                              if (p.id) void handleDeleteAsAdmin(p.id);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                          >
                            {deletingId === p.id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <Trash2 size={16} strokeWidth={2} />
                            )}
                            Удалить
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>

          {!embed && posts.length > 0 && (
            <p className="mt-6 text-center text-xs text-kiddy-textMuted">
              Показаны последние публикации. Чтобы выложить свой проект:{' '}
              <button
                type="button"
                onClick={() => navigate('/profile#showcase-submit')}
                className="font-bold text-kiddy-cherry underline decoration-kiddy-cherry/40 underline-offset-2"
              >
                профиль
              </button>
            </p>
          )}

          {embed && posts.length > 0 && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => navigate('/community?v=showcase')}
                className="inline-flex items-center gap-1 text-sm font-bold text-kiddy-cherry hover:underline"
              >
                Открыть ленту в сообществе
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
