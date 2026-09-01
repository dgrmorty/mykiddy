export interface ScheduleGroup {
  id: string;
  day_of_week: number;
  time_start: string;
  time_end: string;
  title: string;
  sort_order?: number;
}

export interface ScheduleConfig {
  academic_year_start: string;
  academic_year_end: string;
}

const DEFAULT_START = '2026-09-01';
const DEFAULT_END = '2027-05-27';

let bounds: { start: Date; end: Date } | null = null;

export function setScheduleAcademicBounds(startIso: string, endIso: string): void {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T23:59:59`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
  bounds = { start, end };
}

export function resetScheduleAcademicBounds(): void {
  bounds = null;
}

/** Show recurring groups between academic year start and end (inclusive). */
export function isInAcademicYear(date: Date): boolean {
  if (bounds) {
    return date >= bounds.start && date <= bounds.end;
  }
  const start = new Date(`${DEFAULT_START}T00:00:00`);
  const end = new Date(`${DEFAULT_END}T23:59:59`);
  return date >= start && date <= end;
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

export function formatAcademicYearEndLabel(endIso?: string): string {
  const iso = endIso || DEFAULT_END;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '27 мая 2027';
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

export const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

export function normalizeTimeInput(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, '');
  const m = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return trimmed;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
