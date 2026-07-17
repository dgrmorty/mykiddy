import { supabase } from './supabase';

export type ClaimQuizResult = {
  ok: boolean;
  already: boolean;
  awarded: boolean;
  xp: number;
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

/**
 * Зафиксировать ответ на квиз.
 * +1 XP только если p_first_try и запись ещё не существовала.
 */
export async function claimLessonQuizCue(
  lessonId: string,
  cueId: string,
  firstTry: boolean,
): Promise<ClaimQuizResult> {
  const { data, error } = await supabase.rpc('claim_lesson_quiz_cue', {
    p_lesson_id: lessonId,
    p_cue_id: cueId,
    p_first_try: firstTry,
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
  };
}
