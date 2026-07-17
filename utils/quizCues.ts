import type { LessonQuizCue } from '../types';

/** Нормализация quiz_cues из БД / формы админки. */
export function normalizeQuizCues(raw: unknown): LessonQuizCue[] {
  if (!Array.isArray(raw)) return [];
  const out: LessonQuizCue[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const options = Array.isArray(row.options)
      ? row.options.map((o) => String(o ?? '').trim()).filter(Boolean)
      : [];
    const timeSec = Number(row.timeSec ?? row.time_sec ?? 0);
    const correctIndex = Number(row.correctIndex ?? row.correct_index ?? 0);
    const question = String(row.question ?? '').trim();
    if (!question || options.length < 2) continue;
    if (!Number.isFinite(timeSec) || timeSec < 0) continue;
    const safeCorrect = Math.min(Math.max(0, Math.floor(correctIndex)), options.length - 1);
    out.push({
      id: String(row.id ?? `cue_${out.length}_${Math.floor(timeSec)}`),
      timeSec: Math.floor(timeSec),
      question,
      options,
      correctIndex: safeCorrect,
    });
  }
  return out.sort((a, b) => a.timeSec - b.timeSec);
}

export function quizCuesToDb(cues: LessonQuizCue[]) {
  return normalizeQuizCues(cues).map((c) => ({
    id: c.id,
    time_sec: c.timeSec,
    question: c.question,
    options: c.options,
    correct_index: c.correctIndex,
  }));
}
