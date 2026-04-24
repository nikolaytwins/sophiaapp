import type { FinanceTransaction } from '@/features/finance/finance.types';

export type FinanceMonthTxStats = {
  totalExpense: number;
  lifeExpense: number;
  workExpense: number;
  monthIncome: number;
  delta: number;
};

function normCat(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

/** Суммы по выбранным именам категорий (регистр не важен). «Жизнь» и «работа» не суммируются в одну строку дважды: сначала жизнь, иначе работа. */
export function computeFinanceMonthTxStats(
  transactions: FinanceTransaction[],
  lifeNames: string[],
  workNames: string[]
): FinanceMonthTxStats {
  const lifeSet = new Set(lifeNames.map((n) => normCat(n)).filter(Boolean));
  const workSet = new Set(workNames.map((n) => normCat(n)).filter(Boolean));
  let totalExpense = 0;
  let monthIncome = 0;
  let lifeExpense = 0;
  let workExpense = 0;
  for (const t of transactions) {
    if (t.type === 'income') monthIncome += t.amount;
    if (t.type === 'expense') {
      totalExpense += t.amount;
      const c = normCat(t.category);
      if (!c) continue;
      if (lifeSet.has(c)) lifeExpense += t.amount;
      else if (workSet.has(c)) workExpense += t.amount;
    }
  }
  const delta = monthIncome - totalExpense;
  return { totalExpense, lifeExpense, workExpense, monthIncome, delta };
}
