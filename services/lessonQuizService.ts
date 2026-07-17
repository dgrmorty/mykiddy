import { supabase } from './supabase';

export type ClaimQuizResult = {
  ok: boolean;
  already: boolean;
  awarded: boolean;
  xp: number;
  firstTry: boolean;
};

/** Уже пройденные cue_id для урока (чтобы не показывать снова). */
export async function fetchAnsweredQuizCueIds(lessonId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('lesson_quiz_completions')
    .select('cue_id')
    .eq('lesson_id', lessonId);
  if (error) {
    console.warn('[quiz] fetch completions', error.message);
    return [];
  }
  return (data || []).map((r) => String(r.cue_id)).filter(Boolean);
}

/** Зафиксировать ошибку до правильного ответа (блокирует +1 XP). */
export async function recordLessonQuizMiss(lessonId: string, cueId: string): Promise<void> {
  const { error } = await supabase.rpc('record_lesson_quiz_miss', {
    p_lesson_id: lessonId,
    p_cue_id: cueId,
  });
  if (error) {
    console.warn('[quiz] record miss', error.message);
  }
}

/**
 * Правильный ответ: +1 XP только если не было miss (ответ с первого раза).
 * p_first_try на сервере игнорируется — решение по таблице misses.
 */
export async function claimLessonQuizCue(
  lessonId: string,
  cueId: string,
  _firstTry?: boolean,
): Promise<ClaimQuizResult> {
  const { data, error } = await supabase.rpc('claim_lesson_quiz_cue', {
    p_lesson_id: lessonId,
    p_cue_id: cueId,
    p_first_try: null,
  });
  if (error) {
    console.error('[quiz] claim', error);
    throw error;
  }
  const row = (data || {}) as Record<string, unknown>;
  return {
    ok: row.ok !== false,
    already: !!row.already,
    awarded: !!row.awarded,
    xp: Number(row.xp) || 0,
    firstTry: !!row.first_try,
  };
}
