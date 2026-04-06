export const FINANCE_QUERY_KEY = ['finance'] as const;

export function financeExpenseAnalyticsKey(userId: string | null | undefined) {
  return [...FINANCE_QUERY_KEY, 'expense-analytics', userId ?? ''] as const;
}
