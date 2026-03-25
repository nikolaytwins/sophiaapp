/** Local calendar day YYYY-MM-DD (device timezone). */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return localDateKey(dt);
}

/** Monday 00:00 local week start key for the week containing dateKey. */
export function startOfWeekMondayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return localDateKey(dt);
}

export function uniqueSortedDates(dates: string[]): string[] {
  return [...new Set(dates)].sort();
}

export function dailyStreak(completionDates: string[], todayKey: string): number {
  const set = new Set(completionDates);
  let anchor: string | null = null;
  if (set.has(todayKey)) anchor = todayKey;
  else {
    const y = addDays(todayKey, -1);
    if (set.has(y)) anchor = y;
  }
  if (anchor == null) return 0;
  let streak = 0;
  let d = anchor;
  while (set.has(d)) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

export function countCompletionsInWeekRange(
  completionDates: string[],
  weekStartKey: string
): number {
  const end = addDays(weekStartKey, 6);
  return completionDates.filter((d) => d >= weekStartKey && d <= end).length;
}

/**
 * Consecutive weeks where goal was met. Current partial week: counts only if done >= target;
 * if below target and week not over, previous full weeks still contribute.
 */
export function weeklyStreak(
  completionDates: string[],
  weeklyTarget: number,
  todayKey: string
): number {
  let streak = 0;
  let weekStart = startOfWeekMondayKey(todayKey);
  const maxWeeks = 520;
  for (let i = 0; i < maxWeeks; i++) {
    const weekEnd = addDays(weekStart, 6);
    const cnt = countCompletionsInWeekRange(completionDates, weekStart);
    const isCurrentWeek = todayKey >= weekStart && todayKey <= weekEnd;

    if (cnt >= weeklyTarget) {
      streak++;
      weekStart = addDays(weekStart, -7);
      continue;
    }

    if (isCurrentWeek) {
      weekStart = addDays(weekStart, -7);
      continue;
    }

    break;
  }
  return streak;
}

export function hasDailyCompletionOn(completionDates: string[], dayKey: string): boolean {
  return completionDates.includes(dayKey);
}

/** For daily habits: at most one completion per day — toggle uses filter. */
export function toggleDailyCompletion(completionDates: string[], todayKey: string): string[] {
  if (completionDates.includes(todayKey)) {
    return completionDates.filter((d) => d !== todayKey);
  }
  return [...completionDates, todayKey];
}

export function appendWeeklyCompletion(completionDates: string[], todayKey: string): string[] {
  return [...completionDates, todayKey];
}

export function undoLastWeeklyIfToday(completionDates: string[], todayKey: string): string[] {
  for (let i = completionDates.length - 1; i >= 0; i--) {
    if (completionDates[i] === todayKey) {
      return completionDates.filter((_, idx) => idx !== i);
    }
  }
  return completionDates;
}
