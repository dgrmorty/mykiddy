import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
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
import { Heart, Sparkles, Trash2 } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);

const PostIsland = ({ p, au, name, body, media, liked, cnt, lvl, when, handleLike, handleDeleteAsAdmin, user, isAdmin, navigate, index }: any) => {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.to(ref.current.querySelector('.action-bar'), {
      height: expanded ? 48 : 0,
      opacity: expanded ? 1 : 0,
      marginTop: expanded ? 12 : 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.8)'
    });
  }, [expanded]);

  return (
    <article 
      ref={ref}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="relative overflow-hidden border border-white/10 shadow-island bg-black rounded-[2.5rem] p-4 sm:p-5 transition-colors hover:border-white/20"
      style={{ animation: `fade-in-up 0.5s ease both`, animationDelay: `${Math.min(index, 14) * 0.035}s` }}
    >
      <div className="flex items-start gap-3 mb-4">
        <button type="button" onClick={() => navigate(`/users/${p.author_id}`)} className="shrink-0">
          <UserAvatar user={{ id: p.author_id, name, avatar: au?.avatar || '' }} size="md" />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => navigate(`/users/${p.author_id}`)} className="block truncate text-left font-bold text-[15px] text-white hover:text-zinc-300">{name}</button>
          <p className="text-xs text-zinc-500 font-semibold">Ур. {lvl} {when && `· ${when}`}</p>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-200 mb-4 px-1">{body}</p>

      {media.length > 0 && (
        <div className={media.length === 1 ? '' : 'flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar'}>
          {media.map((m: any, idx: number) => {
            const url = mediaPublicUrl(m.path);
            const single = media.length === 1;
            return m.kind === 'video' ? (
              <video key={idx} src={url} controls playsInline className={single ? 'aspect-video w-full rounded-3xl bg-black object-cover' : 'aspect-video w-[85%] shrink-0 snap-center rounded-3xl bg-black object-cover'} />
            ) : (
              <img key={idx} src={url} alt="" className={single ? 'max-h-[min(60vh,400px)] w-full rounded-3xl bg-black object-cover' : 'aspect-video w-[85%] shrink-0 snap-center rounded-3xl object-cover'} />
            );
          })}
        </div>
      )}

      <div className="action-bar h-0 opacity-0 overflow-hidden flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => p.id && void handleLike(p.id, p.author_id)}
          disabled={!p.id || p.author_id === user.id}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors ${liked ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'} disabled:opacity-50`}
        >
          <Heart size={16} strokeWidth={2.5} className={liked ? 'fill-current' : ''} />
          {cnt} {cnt === 1 ? 'лайк' : cnt > 1 && cnt < 5 ? 'лайка' : 'лайков'}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => p.id && void handleDeleteAsAdmin(p.id)}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20"
          >
            <Trash2 size={14} strokeWidth={2} /> Удалить
          </button>
        )}
      </div>
    </article>
  );
}
import { levelFromXp } from '../progression';
import { formatRelativeTimeRu } from '../utils/formatRelativeTime';

export type ProjectShowcasePanelProps = {
  /** Встраивание на главную: без большого заголовка, уже узкая колонка. */
  embed?: boolean;
  /** Сколько постов подгрузить (по умолчанию 40 на странице витрины вне «Учеников», меньше на главной). */
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

  const feedWrap = embed ? 'w-full max-w-none' : 'max-w-xl mx-auto w-full';

  return (
    <div className={embed ? 'space-y-4' : 'space-y-8 pb-16'}>
      {!embed && (
        <header className="space-y-3 text-center sm:text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-400">Витрина</p>
          <h2 className="font-display text-2xl font-bold italic tracking-tight text-white md:text-3xl">
            Лента проектов
          </h2>
          <p className="mx-auto max-w-xl text-sm text-kiddy-textMuted sm:mx-0">
            Как в ленте: кто что выложил. Свой проект отправляй из профиля — сначала проверка наставника.
          </p>
        </header>
      )}

      {loading ? (
        <div className="py-10">
          <AnimatedEmptyState message="Загружаем витрину" />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState 
          title="Нет проектов" 
          description="Пока нет опубликованных работ. Загляни позже или стань первым — через профиль." 
          icon={<Sparkles size={40} strokeWidth={1} />}
        />
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
                <li key={postKey}>
                  <PostIsland 
                    p={p} au={au} name={name} body={body} media={media} 
                    liked={liked} cnt={cnt} lvl={lvl} when={when} 
                    handleLike={handleLike} handleDeleteAsAdmin={handleDeleteAsAdmin} 
                    user={user} isAdmin={isAdmin} navigate={navigate} index={i} 
                  />
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
                className="font-bold text-white underline decoration-white/40 underline-offset-2"
              >
                профиль
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
