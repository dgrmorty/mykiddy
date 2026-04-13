import { supabase } from './supabase';
import type { MediaItem, PhraseSelections } from '../data/projectShowcaseCatalog';

const BUCKET = 'project_showcase';

export interface ShowcasePostRow {
  id: string;
  author_id: string;
  status: 'pending' | 'approved' | 'rejected';
  phrase_selections: PhraseSelections;
  media: MediaItem[];
  reject_reason: string | null;
  created_at: string;
  moderated_at?: string | null;
}

function publicUrlForPath(path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function mediaPublicUrl(path: string): string {
  return publicUrlForPath(path);
}

export async function uploadShowcaseFile(
  userId: string,
  draftId: string,
  file: File,
): Promise<{ path: string; kind: 'image' | 'video' } | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safe = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${userId}/${draftId}/${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) {
    console.warn('[showcase] upload', error);
    return null;
  }
  const kind = file.type.startsWith('video/') ? 'video' : 'image';
  return { path, kind };
}

export async function createProjectPost(
  authorId: string,
  phrase_selections: PhraseSelections,
  media: MediaItem[],
) {
  const { data, error } = await supabase
    .from('project_posts')
    .insert({
      author_id: authorId,
      phrase_selections,
      media,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data?.id as string;
}

export async function fetchApprovedShowcasePosts(limit = 40): Promise<ShowcasePostRow[]> {
  const cap = Math.min(Math.max(limit, 1), 100);
  const { data, error } = await supabase
    .from('project_posts')
    .select('id, author_id, status, phrase_selections, media, reject_reason, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(cap);
  if (!error) return (data || []) as ShowcasePostRow[];

  console.warn('[showcase] project_posts select failed, trying list_approved_showcase_posts', error.message, error.code);
  const { data: rpcRows, error: rpcErr } = await supabase.rpc('list_approved_showcase_posts', {
    p_limit: cap,
  });
  if (rpcErr) throw rpcErr;
  return (rpcRows || []) as ShowcasePostRow[];
}

function mapProfilesToAuthorMap(
  rows: { id: string; name: string | null; avatar: string | null; xp: number | null }[] | null | undefined,
): Record<string, { name: string | null; avatar: string | null; xp: number | null }> {
  const m: Record<string, { name: string | null; avatar: string | null; xp: number | null }> = {};
  (rows || []).forEach((p) => {
    m[p.id] = { name: p.name, avatar: p.avatar, xp: p.xp };
  });
  return m;
}

/** Обход RLS на profiles при пакетной подгрузке авторов ленты (см. list_showcase_authors). */
export async function fetchShowcaseAuthorsForFeed(
  authorIds: string[],
): Promise<Record<string, { name: string | null; avatar: string | null; xp: number | null }>> {
  if (!authorIds.length) return {};
  const { data, error } = await supabase.rpc('list_showcase_authors', { author_ids: authorIds });
  if (!error) {
    return mapProfilesToAuthorMap(data as { id: string; name: string | null; avatar: string | null; xp: number | null }[]);
  }
  console.warn('[showcase] list_showcase_authors', error);
  const { data: profs, error: profErr } = await supabase
    .from('profiles')
    .select('id, name, avatar, xp')
    .in('id', authorIds);
  if (profErr) {
    console.warn('[showcase] profiles fallback', profErr);
    return {};
  }
  return mapProfilesToAuthorMap(profs);
}

export async function fetchUserShowcasePosts(userId: string): Promise<ShowcasePostRow[]> {
  const { data, error } = await supabase
    .from('project_posts')
    .select('id, author_id, status, phrase_selections, media, reject_reason, created_at')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data || []) as ShowcasePostRow[];
}

export async function fetchPendingShowcasePosts(): Promise<ShowcasePostRow[]> {
  const { data, error } = await supabase
    .from('project_posts')
    .select('id, author_id, status, phrase_selections, media, reject_reason, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as ShowcasePostRow[];
}

/** Удаление только для администратора (RLS). */
export async function deleteShowcasePost(postId: string) {
  const { error } = await supabase.from('project_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function moderatePost(
  postId: string,
  approve: boolean,
  moderatorId: string,
  rejectReason?: string,
) {
  const { error } = await supabase
    .from('project_posts')
    .update({
      status: approve ? 'approved' : 'rejected',
      moderated_at: new Date().toISOString(),
      moderator_id: moderatorId,
      reject_reason: approve ? null : (rejectReason?.trim() || 'Без указания причины'),
    })
    .eq('id', postId);
  if (error) throw error;
}

export async function fetchLikeState(postIds: string[], userId: string): Promise<Record<string, boolean>> {
  if (postIds.length === 0 || !userId) return {};
  const { data, error } = await supabase
    .from('project_post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  if (error) return {};
  const m: Record<string, boolean> = {};
  (data || []).forEach((r: { post_id: string }) => {
    m[r.post_id] = true;
  });
  return m;
}

export async function fetchLikeCounts(postIds: string[]): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase.rpc('showcase_like_counts', { target_ids: postIds });
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  (data as { post_id: string; cnt: number }[]).forEach((r) => {
    counts[r.post_id] = Number(r.cnt) || 0;
  });
  return counts;
}

export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    const { error } = await supabase.from('project_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('project_post_likes').insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  }
}
