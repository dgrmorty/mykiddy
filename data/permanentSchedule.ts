export interface PermanentGroup {
  day: number;
  time: string;
  end: string;
  title: string;
}

export const PERMANENT_GROUPS: PermanentGroup[] = [
  // Среда
  { day: 3, time: '16:30', end: '18:00', title: 'Занятие' },
  { day: 3, time: '18:20', end: '19:50', title: 'Занятие' },
  // Четверг
  { day: 4, time: '16:10', end: '17:40', title: 'Занятие' },
  { day: 4, time: '18:20', end: '19:50', title: 'Занятие' },
  // Пятница
  { day: 5, time: '14:40', end: '16:10', title: 'Занятие' },
  { day: 5, time: '16:30', end: '18:00', title: 'Занятие' },
  { day: 5, time: '18:20', end: '19:50', title: 'Занятие' },
  // Суббота
  { day: 6, time: '10:00', end: '11:30', title: 'Занятие' },
  { day: 6, time: '11:40', end: '13:10', title: 'Занятие' },
  { day: 6, time: '13:20', end: '14:50', title: 'Занятие' },
  { day: 6, time: '15:00', end: '16:30', title: 'Занятие' },
  // Воскресенье
  { day: 7, time: '10:00', end: '11:30', title: 'Отработка' },
  { day: 7, time: '11:40', end: '13:10', title: 'Занятие' },
  { day: 7, time: '13:20', end: '14:50', title: 'Занятие' },
  { day: 7, time: '15:00', end: '16:30', title: 'Занятие' },
];

/** Academic year: September 1 – May 31 */
export function isInAcademicYear(date: Date): boolean {
  const m = date.getMonth();
  return m >= 8 || m <= 4;
}

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 1 = Mon … 7 = Sun */
export function dayOfWeek(d: Date): number {
  const v = d.getDay();
  return v === 0 ? 7 : v;
}

const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function formatDateShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function formatWeekRange(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${MONTHS_GEN[end.getMonth()]}`;
  }
  return `${start.getDate()} ${MONTHS_GEN[start.getMonth()]} – ${end.getDate()} ${MONTHS_GEN[end.getMonth()]}`;
}
