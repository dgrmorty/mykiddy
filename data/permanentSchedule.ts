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

function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map((part) => parseInt(part, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function dateKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function setScheduleAcademicBounds(startIso: string, endIso: string): void {
  const start = parseIsoDateLocal(startIso);
  const end = parseIsoDateLocal(endIso);
  end.setHours(23, 59, 59, 999);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
  bounds = { start, end };
}

export function resetScheduleAcademicBounds(): void {
  bounds = null;
}

/** Show recurring groups between academic year start and end (inclusive). */
export function isInAcademicYear(date: Date): boolean {
  const key = dateKey(date);
  if (bounds) {
    return key >= dateKey(bounds.start) && key <= dateKey(bounds.end);
  }
  const start = parseIsoDateLocal(DEFAULT_START);
  const end = parseIsoDateLocal(DEFAULT_END);
  end.setHours(23, 59, 59, 999);
  return key >= dateKey(start) && key <= dateKey(end);
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
