/** Число календарных дней в месяце (month1 = 1…12). */
export function daysInCalendarMonth(year: number, month1: number): number {
  const m = Math.min(12, Math.max(1, Math.floor(month1)));
  return new Date(year, m, 0).getDate();
}

/**
 * Ожидаемый расход за календарный месяц:
 * фиксированная сумма на месяц + (лимит трат на 1 день × число дней в этом месяце).
 */
export function computeExpectedMonthlyExpense(
  plannedFixedMonthlyRub: number,
  plannedDailyAllowanceRub: number,
  refDate: Date = new Date()
): number {
  const y = refDate.getFullYear();
  const m1 = refDate.getMonth() + 1;
  const d = daysInCalendarMonth(y, m1);
  const fixed = Math.max(0, plannedFixedMonthlyRub);
  const daily = Math.max(0, plannedDailyAllowanceRub);
  return fixed + daily * d;
}
