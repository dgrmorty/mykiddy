/** Решение о зачёте ДЗ: сначала доверяем verdict с сервера, иначе — осторожная эвристика. */
export function shouldAcceptHomework(
  verdict: 'accepted' | 'needs_work' | undefined | null,
  feedbackText: string,
  answerTrimmed: string,
  hasAttachments: boolean,
): boolean {
  if (verdict === 'accepted') return true;
  if (verdict === 'needs_work') return false;

  const fl = feedbackText.toLowerCase();
  const negatives = [
    'совсем не',
    'не по теме',
    'пустой ответ',
    'нужно переделать',
    'переделай',
    'не подходит',
    'недостаточно',
    'не соответствует',
    'verdict: needs_work',
    'не засчитываю',
    'пока не принимаю',
    'давай ещё',
  ];
  if (negatives.some((n) => fl.includes(n))) return false;

  const minLen = hasAttachments ? 8 : 35;
  if (answerTrimmed.length < minLen) return false;

  const positives = [
    'молодец',
    'отлично',
    'правильно',
    'хорошая работа',
    'справился',
    'умничка',
    'так держать',
    'очень хорошо',
    'здорово получилось',
    'засчитываю',
    'принимаю работу',
    'работа принята',
  ];
  return positives.some((p) => fl.includes(p));
}
