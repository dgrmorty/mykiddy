/**
 * Убирает служебную строку вердикта и слегка приводит текст к читабельным абзацам (без Markdown).
 */
export function stripVerdictLine(text: string): string {
  return text.replace(/\n*(?:VERDICT|ВЕРДИКТ)\s*:\s*(?:ACCEPTED|NEEDS_WORK|ПРИНЯТО|НУЖНО_ДОРАБОТАТЬ)\s*$/i, '').trim();
}

/** Форматирование ответа наставника для экрана (после того как сервер уже отдал очищенный text). */
export function formatFeedbackForDisplay(text: string): string {
  let s = text.trim();
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*\n]+)\*/g, '$1');
  s = s.replace(/^\s*[*•·-]\s+/gm, '— ');
  s = s.replace(/#{1,6}\s*/g, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}
