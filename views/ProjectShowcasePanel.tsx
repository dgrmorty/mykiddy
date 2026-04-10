import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Role } from '../types';
import { showcasePostBody, type PhraseSelections } from '../data/projectShowcaseCatalog';
import { defaultAvatarUrlForUserId } from '../data/defaultAvatars';
import {
  fetchApprovedShowcasePosts,
  fetchLikeCounts,
  fetchLikeState,
  mediaPublicUrl,
  toggleLike,
  deleteShowcasePost,
  type MediaItem,
  type ShowcasePostRow,
} from '../services/projectShowcaseService';
import { supabase } from '../services/supabase';
import { Heart, Loader2, Sparkles, Trash2 } from 'lucide-react';

/** Лента одобренных постов (форма отправки — только в профиле). */
export const ProjectShowcasePanel: React.FC = () => {
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
      const list = await fetchApprovedShowcasePosts(50);
      setPosts(list);
      const ids = [...new Set(list.map((p) => p.author_id))];
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, name, avatar, xp').in('id', ids);
        const m: Record<string, { name: string | null; avatar: string | null; xp: number | null }> = {};
        (profs || []).forEach((p: { id: string; name: string | null; avatar: string | null; xp: number | null }) => {
          m[p.id] = { name: p.name, avatar: p.avatar, xp: p.xp };
        });
        setAuthors(m);
      } else setAuthors({});

      const pids = list.map((p) => p.id);
      if (pids.length && user.id !== 'guest') {
        const [likes, counts] = await Promise.all([fetchLikeState(pids, user.id), fetchLikeCounts(pids)]);
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

  return (
    <div className="space-y-10 pb-20">
      <header className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-kiddy-cherry">Витрина</p>
        <h2 className="font-display text-2xl font-bold italic tracking-tight text-white md:text-3xl">Проекты ребят</h2>
        <p className="max-w-2xl text-sm text-kiddy-textMuted">
          Здесь только проверенные работы. Чтобы выложить свой проект, открой{' '}
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="font-bold text-kiddy-cherry underline decoration-kiddy-cherry/40 underline-offset-2 hover:decoration-kiddy-cherry"
          >
            профиль
          </button>
          — форма отправки на модерацию там.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-kiddy-cherry" size={40} />
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-12 text-center text-sm text-kiddy-textMuted">
          <Sparkles className="mx-auto mb-4 text-kiddy-cherry/50" size={36} />
          <p>Пока нет опубликованных работ. Загляни позже или стань первым — через профиль.</p>
        </Card>
      ) : (
        <ul className="space-y-5">
          {posts.map((p, i) => {
            const au = authors[p.author_id];
            const name = au?.name || 'Ученик';
            const body = showcasePostBody((p.phrase_selections || {}) as PhraseSelections);
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
                      <UserAvatar
                        user={{
                          name,
                          avatar:
                            au && (au.avatar || '').trim().startsWith('/avatars/student-')
                              ? au.avatar!
                              : defaultAvatarUrlForUserId(p.author_id),
                        }}
                        size="md"
                      />
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
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3">
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
                    <div className="flex items-center gap-2 sm:gap-3">
                      {isAdmin && (
                        <button
                          type="button"
                          disabled={deletingId === p.id}
                          onClick={() => void handleDeleteAsAdmin(p.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Trash2 size={16} strokeWidth={2} />
                          )}
                          Удалить
                        </button>
                      )}
                      <span className="text-[10px] text-zinc-600 tabular-nums">
                        {new Date(p.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
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
