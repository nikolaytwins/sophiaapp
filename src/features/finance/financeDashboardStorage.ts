import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'finance_dashboard_prefs_v1';

/** Настройки дашборда (ожидаемые суммы, лимит «на жизнь», закреплённые категории). */
export type FinanceDashboardPrefs = {
  expectedIncomeMonthly: number;
  /**
   * Сумма всех запланированных **фиксированных** расходов на календарный месяц
   * (аренда, подписки и т.п. — одной цифрой на месяц, без умножения на дни).
   */
  plannedFixedMonthlyRub: number;
  /** Лимит трат на 1 день; в ожидаемом расходе за месяц участвует как × число дней в месяце. */
  plannedDailyAllowanceRub: number;
  /** Лимит трат «на жизнь» за календарный месяц (те же категории, что в блоке транзакций). 0 — не задан. */
  lifeSpendLimitMonthly: number;
  /** id корневых категорий расходов для плашки «ключевые категории». */
  pinnedCategoryIds: string[];
};

export const DEFAULT_FINANCE_DASHBOARD_PREFS: FinanceDashboardPrefs = {
  expectedIncomeMonthly: 0,
  plannedFixedMonthlyRub: 0,
  plannedDailyAllowanceRub: 0,
  lifeSpendLimitMonthly: 0,
  pinnedCategoryIds: [],
};

function mergePrefs(raw: unknown): FinanceDashboardPrefs {
  const base = { ...DEFAULT_FINANCE_DASHBOARD_PREFS };
  if (raw == null || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  if (typeof o.expectedIncomeMonthly === 'number' && Number.isFinite(o.expectedIncomeMonthly)) {
    base.expectedIncomeMonthly = Math.max(0, o.expectedIncomeMonthly);
  }
  if (typeof o.plannedFixedMonthlyRub === 'number' && Number.isFinite(o.plannedFixedMonthlyRub)) {
    base.plannedFixedMonthlyRub = Math.max(0, o.plannedFixedMonthlyRub);
  }
  if (typeof o.plannedDailyAllowanceRub === 'number' && Number.isFinite(o.plannedDailyAllowanceRub)) {
    base.plannedDailyAllowanceRub = Math.max(0, o.plannedDailyAllowanceRub);
  }
  /** Раньше хранился один «ожидаемый расход» — переносим в фикс за месяц, если новый план ещё пуст. */
  if (
    base.plannedFixedMonthlyRub === 0 &&
    base.plannedDailyAllowanceRub === 0 &&
    typeof o.expectedExpenseMonthly === 'number' &&
    Number.isFinite(o.expectedExpenseMonthly) &&
    o.expectedExpenseMonthly > 0
  ) {
    base.plannedFixedMonthlyRub = Math.max(0, o.expectedExpenseMonthly);
  }
  if (typeof o.lifeSpendLimitMonthly === 'number' && Number.isFinite(o.lifeSpendLimitMonthly)) {
    base.lifeSpendLimitMonthly = Math.max(0, o.lifeSpendLimitMonthly);
  }
  if (Array.isArray(o.pinnedCategoryIds)) {
    base.pinnedCategoryIds = o.pinnedCategoryIds.map((x) => String(x).trim()).filter(Boolean);
  }
  return base;
}

export async function loadFinanceDashboardPrefs(): Promise<FinanceDashboardPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null || raw === '') return { ...DEFAULT_FINANCE_DASHBOARD_PREFS };
    return mergePrefs(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_FINANCE_DASHBOARD_PREFS };
  }
}

export async function saveFinanceDashboardPrefs(patch: Partial<FinanceDashboardPrefs>): Promise<void> {
  const cur = await loadFinanceDashboardPrefs();
  const next: FinanceDashboardPrefs = {
    ...cur,
    ...patch,
    pinnedCategoryIds: patch.pinnedCategoryIds ?? cur.pinnedCategoryIds,
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
