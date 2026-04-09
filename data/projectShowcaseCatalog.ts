/**
 * Витрина: свободный текст в `phrase_selections.__free_text`.
 * Блоки SHOWCASE_PHRASE_SLOTS оставлены только для отображения старых постов, созданных из шаблонов.
 */

export interface ShowcasePhraseOption {
  id: string;
  text: string;
}

export interface ShowcasePhraseSlot {
  id: string;
  label: string;
  options: ShowcasePhraseOption[];
}

/** @deprecated Легаси: только для showcasePostBody / старых записей */
export const SHOWCASE_PHRASE_SLOTS: ShowcasePhraseSlot[] = [
  {
    id: 'intro',
    label: 'Что сделал(а)',
    options: [
      { id: 'i_game', text: 'Я сделал(а) свою первую игру.' },
      { id: 'i_site', text: 'Я сверстал(а) страницу сайта.' },
      { id: 'i_3d', text: 'Я смоделировал(а) объект в 3D.' },
      { id: 'i_python', text: 'Я написал(а) программу на Python.' },
      { id: 'i_robot', text: 'Я собрал(а) и запрограммировал(а) робота.' },
      { id: 'i_art', text: 'Я нарисовал(а) цифровой арт.' },
      { id: 'i_video', text: 'Я смонтировал(а) короткое видео.' },
    ],
  },
  {
    id: 'tool',
    label: 'Чем пользовался(ась)',
    options: [
      { id: 't_scratch', text: 'Работал(а) в Scratch.' },
      { id: 't_blender', text: 'Использовал(а) Blender.' },
      { id: 't_web', text: 'Писал(а) HTML и CSS.' },
      { id: 't_python', text: 'Писал(а) код в Python.' },
      { id: 't_unity', text: 'Пробовал(а) Unity или похожий движок.' },
      { id: 't_figma', text: 'Делал(а) макет в Figma или аналоге.' },
    ],
  },
  {
    id: 'feeling',
    label: 'Как было',
    options: [
      { id: 'f_fun', text: 'Было весело и интересно.' },
      { id: 'f_hard', text: 'Было непросто, но я справился(ась).' },
      { id: 'f_team', text: 'Мне помогали наставник или друзья.' },
      { id: 'f_proud', text: 'Я горжусь результатом.' },
      { id: 'f_learn', text: 'Я много нового узнал(а).' },
    ],
  },
  {
    id: 'cta',
    label: 'Призыв',
    options: [
      { id: 'c_like', text: 'Поставьте лайк, если нравится!' },
      { id: 'c_feedback', text: 'Напишите в комментариях школы, что думаете.' },
      { id: 'c_try', text: 'Попробуйте сделать что-то похожее — это круто!' },
      { id: 'c_share', text: 'Поделитесь с одноклассниками.' },
    ],
  },
];

export type PhraseSelections = Record<string, string>;

/** @deprecated Легаси: сборка текста из старых шаблонов */
export function composeShowcaseText(sel: PhraseSelections): string {
  const parts: string[] = [];
  for (const slot of SHOWCASE_PHRASE_SLOTS) {
    const oid = sel[slot.id];
    const opt = slot.options.find((x) => x.id === oid);
    if (opt) parts.push(opt.text);
  }
  return parts.join(' ');
}

export const SHOWCASE_FREE_TEXT_KEY = '__free_text';

export const SHOWCASE_MIN_CUSTOM_LEN = 10;
export const SHOWCASE_MAX_CUSTOM_LEN = 2500;

export function showcasePostBody(sel: PhraseSelections): string {
  const raw = sel[SHOWCASE_FREE_TEXT_KEY];
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.length > 0) return t;
  }
  return composeShowcaseText(sel);
}

export function phrasePayloadCustom(text: string): PhraseSelections {
  return { [SHOWCASE_FREE_TEXT_KEY]: text.trim() };
}

export interface MediaItem {
  path: string;
  kind: 'image' | 'video';
}

const MAX_MEDIA = 6;

export function validateMediaCount(n: number): boolean {
  return n >= 0 && n <= MAX_MEDIA;
}

export { MAX_MEDIA as SHOWCASE_MAX_MEDIA };
