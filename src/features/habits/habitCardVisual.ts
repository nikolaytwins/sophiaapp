import { addDays, startOfWeekMondayKey } from '@/features/habits/habitLogic';

export type MonthGridCell = { dateKey: string | null };

/** Короткие подписи дней недели (пн–вс), совпадают с колонками сетки. */
export const WEEKDAY_LABELS_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const;

/** Индекс дня недели 0=пн … 6=вс для даты `YYYY-MM-DD`. */
export function weekdayIndexMondayFirst(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return (dt.getDay() + 6) % 7;
}

/** Заголовок календарного месяца для якорной даты (месяц сетки = месяц `anchorKey`). */
export function monthGridTitleRu(anchorKey: string): string {
  const [y, m] = anchorKey.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  const s = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const trimmed = s.replace(/\s*г\.?\s*$/i, '').trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function monthAnchorKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

export function parseYearMonthFromKey(key: string): { y: number; m: number } {
  const [y, m] = key.split('-').map(Number);
  return { y, m };
}

/** Сравнение календарных месяцев (для навигации). */
export function ymToIndex(y: number, m: number): number {
  return y * 12 + (m - 1);
}

/**
 * Daily: доля отмеченных дней за выбранный месяц.
 * — Прошлые месяцы: отмечено / дней в месяце.
 * — Текущий месяц: отмечено за 1…сегодня / число дней с начала месяца до сегодня (включительно).
 */
export function monthCompletionPercentDays(
  completionDates: string[] | undefined,
  y: number,
  m: number,
  todayKey: string
): number {
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const dim = new Date(y, m, 0).getDate();
  const set = new Set(completionDates ?? []);
  const isCurrent = y === ty && m === tm;
  const denom = isCurrent ? Math.min(td, dim) : dim;
  if (denom <= 0) return 0;
  let num = 0;
  for (let d = 1; d <= denom; d++) {
    const dk = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (set.has(dk)) num++;
  }
  return Math.min(100, Math.round((num / denom) * 100));
}

/** Строки по 7 ячеек (недели) для contribution-style layout. */
export function chunkMonthIntoWeekRows(cells: MonthGridCell[]): MonthGridCell[][] {
  const rows: MonthGridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

/** Сетка текущего календарного месяца (пн → вс), padding вне месяца — null. */
export function monthGridCells(anchorKey: string): MonthGridCell[] {
  const [y, m] = anchorKey.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstWd = (first.getDay() + 6) % 7;
  const cells: MonthGridCell[] = [];
  for (let i = 0; i < firstWd; i++) {
    cells.push({ dateKey: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dk = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ dateKey: dk });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null });
  }
  return cells;
}

/**
 * Еженедельная привычка: % за выбранный календарный месяц.
 * Ожидание = число ISO-недель (пн–вс), пересекающих месяц (или от 1-го числа до «сегодня» в текущем месяце), × weeklyTarget.
 * Факт = число отметок (дат) в этом диапазоне. Итог ограничен 100%.
 */
export function monthCompletionPercentWeekly(
  completionDates: string[] | undefined,
  y: number,
  m: number,
  todayKey: string,
  weeklyTarget: number
): number {
  const T = Math.max(1, weeklyTarget);
  const dim = new Date(y, m, 0).getDate();
  const firstDayKey = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDayOfMonth = `${y}-${String(m).padStart(2, '0')}-${String(dim).padStart(2, '0')}`;
  const [ty, tm] = todayKey.split('-').map(Number);
  const isCurrentMonth = y === ty && m === tm;
  const lastDayKey = isCurrentMonth && todayKey < lastDayOfMonth ? todayKey : lastDayOfMonth;

  if (firstDayKey > lastDayKey) return 0;

  let expected = 0;
  let ws = startOfWeekMondayKey(firstDayKey);
  while (ws <= lastDayKey) {
    const we = addDays(ws, 6);
    if (we >= firstDayKey && ws <= lastDayKey) expected += T;
    ws = addDays(ws, 7);
  }

  let actual = 0;
  for (const dk of completionDates ?? []) {
    if (dk >= firstDayKey && dk <= lastDayKey) actual++;
  }

  if (expected <= 0) return 0;
  return Math.min(100, Math.round((actual / expected) * 100));
}
