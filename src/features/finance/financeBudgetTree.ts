import type { FinanceBudgetLine, FinanceExpenseCategory, FinanceTransaction } from '@/features/finance/finance.types';

function fmtR0(n: number): string {
  return Math.round(n).toLocaleString('ru-RU').replace(/\u00A0/g, ' ') + ' ₽';
}

export function buildSpendByCategoryName(transactions: FinanceTransaction[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const k = (t.category ?? '').trim();
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + t.amount);
  }
  return m;
}

export function categoryToBudgetLine(cat: FinanceExpenseCategory, spendMap: Map<string, number>): FinanceBudgetLine {
  const spent = spendMap.get(cat.name.trim()) ?? 0;
  const exp = cat.expectedMonthly;
  const progress01 = exp > 0 ? Math.min(1, spent / exp) : spent > 0 ? 1 : 0;
  const overLimit = exp > 0 && spent > exp;
  return {
    id: cat.id,
    title: cat.name,
    subtitle: exp > 0 ? `${fmtR0(spent)} из ${fmtR0(exp)}` : `Потрачено ${fmtR0(spent)}`,
    spent,
    expectedMonthly: exp,
    progress01,
    kind: cat.type === 'business' ? 'business' : 'personal',
    overLimit,
  };
}

export function childrenForRoot(expenseCategories: FinanceExpenseCategory[], rootId: string): FinanceExpenseCategory[] {
  return expenseCategories
    .filter((c) => c.parentId === rootId)
    .sort((a, b) => (a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.name.localeCompare(b.name, 'ru')));
}
