import { localDateKey } from '@/features/habits/habitLogic';

/**
 * Нормализует `event_date` из БД/JSON в `YYYY-MM-DD`.
 * Иногда в ответе приезжает ISO с временем (`2026-04-24T00:00:00+00:00`); сравнение с колонкой дня должно быть по дате.
 */
export function plannerEventDateKey(d: string | null | undefined): string | null {
  if (d == null) return null;
  const s = String(d).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

/** Локальная дата YYYY-MM-DD из ISO timestamptz. */
export function isoToLocalDateKey(iso: string): string {
  return localDateKey(new Date(iso));
}

/** Дробные минуты от локальной полуночи до момента `iso` (для выравнивания сетки с `isoToHm`). */
export function isoToLocalMinutesSinceMidnight(iso: string): number {
  const dt = new Date(iso);
  return dt.getHours() * 60 + dt.getMinutes() + dt.getSeconds() / 60 + dt.getMilliseconds() / 60_000;
}

/** Локальное время HH:mm из ISO. */
export function isoToHm(iso: string): string {
  const m = isoToLocalMinutesSinceMidnight(iso);
  const hh = Math.floor(m / 60) % 24;
  const mm = Math.floor(m % 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Сборка ISO UTC из локальной даты и времени HH:mm (календарь пользователя). */
export function localDateAndHmToIso(dateKey: string, hm: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = hm.split(':').map((x) => Number(String(x).replace(/\D/g, '')) || 0);
  const h = Math.min(23, Math.max(0, hh));
  const min = Math.min(59, Math.max(0, mm));
  return new Date(y, m - 1, d, h, min, 0, 0).toISOString();
}
