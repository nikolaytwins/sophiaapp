export const FINANCE_QUERY_KEY = ['finance'] as const;

export function financeExpenseAnalyticsKey(userId: string | null | undefined) {
  return [...FINANCE_QUERY_KEY, 'expense-analytics', userId ?? ''] as const;
}

export function financeTransactionsMonthKey(userId: string | null | undefined, year: number, month: number) {
  return [...FINANCE_QUERY_KEY, 'transactions-month', userId ?? '', year, month] as const;
}
