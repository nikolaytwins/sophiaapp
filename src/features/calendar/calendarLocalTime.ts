import { localDateKey } from '@/features/habits/habitLogic';

/** Локальная дата YYYY-MM-DD из ISO timestamptz. */
export function isoToLocalDateKey(iso: string): string {
  return localDateKey(new Date(iso));
}

/** Локальное время HH:mm из ISO. */
export function isoToHm(iso: string): string {
  const dt = new Date(iso);
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

/** Сборка ISO UTC из локальной даты и времени HH:mm (календарь пользователя). */
export function localDateAndHmToIso(dateKey: string, hm: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = hm.split(':').map((x) => Number(String(x).replace(/\D/g, '')) || 0);
  const h = Math.min(23, Math.max(0, hh));
  const min = Math.min(59, Math.max(0, mm));
  return new Date(y, m - 1, d, h, min, 0, 0).toISOString();
}
