import type { SideGoalPersisted } from '@/stores/sideGoals.store';

function dateKeyToUtcMidnightMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d);
}

/** Календарный год из ключа YYYY-MM-DD. */
export function yearFromDateKey(key: string): number | null {
  const y = Number(key.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

export function rangeIntersectsCalendarYear(fromKey: string, toKey: string, year: number): boolean {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year, 11, 31, 23, 59, 59, 999);
  const a = dateKeyToUtcMidnightMs(fromKey);
  const b = dateKeyToUtcMidnightMs(toKey);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo <= end && hi >= start;
}

export function singleDateInCalendarYear(key: string, year: number): boolean {
  const y = yearFromDateKey(key);
  return y === year;
}

export function sideGoalHasAnyDate(g: SideGoalPersisted): boolean {
  if (g.dateMode === 'single') return Boolean(g.dateSingle?.trim());
  if (g.dateMode === 'range') return Boolean(g.dateFrom?.trim() && g.dateTo?.trim());
  return false;
}

export function sideGoalInCalendarYear(g: SideGoalPersisted, year: number): boolean {
  if (g.dateMode === 'single' && g.dateSingle) return singleDateInCalendarYear(g.dateSingle, year);
  if (g.dateMode === 'range' && g.dateFrom && g.dateTo) {
    return rangeIntersectsCalendarYear(g.dateFrom, g.dateTo, year);
  }
  return false;
}

/** Цели с датой не в выбранном году (показываем в конце вкладки «год»). */
export function sideGoalDatedOutsideYear(g: SideGoalPersisted, year: number): boolean {
  if (!sideGoalHasAnyDate(g)) return false;
  return !sideGoalInCalendarYear(g, year);
}

/** `all` — все разделы подряд; остальные — фильтр одной вкладки. */
export type SideGoalBoardTab = 'all' | 'nearest' | 'year' | 'wish' | 'horizon';

export function normalizeDateKey(raw: string): string | null {
  const t = raw.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function formatSideGoalDateCaption(g: SideGoalPersisted): string | null {
  if (g.dateMode === 'single' && g.dateSingle) {
    const [y, m, d] = g.dateSingle.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return g.dateSingle;
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (g.dateMode === 'range' && g.dateFrom && g.dateTo) {
    return `${g.dateFrom} — ${g.dateTo}`;
  }
  return null;
}
