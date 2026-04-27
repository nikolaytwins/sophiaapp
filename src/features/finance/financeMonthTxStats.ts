import { expandCategoryBucketForMatching, normFinanceCatName } from '@/features/finance/financeBudgetTree';
import type { FinanceExpenseCategory, FinanceTransaction } from '@/features/finance/finance.types';

export type FinanceMonthTxStats = {
  totalExpense: number;
  lifeExpense: number;
  workExpense: number;
  monthIncome: number;
  delta: number;
};

/** Суммы по корзинам «жизнь» / «работа»: родительская категория покрывает все подкатегории (без двойного учёта одной операции). */
export function computeFinanceMonthTxStats(
  transactions: FinanceTransaction[],
  lifeNames: string[],
  workNames: string[],
  expenseCategories?: FinanceExpenseCategory[]
): FinanceMonthTxStats {
  const lifeSet =
    expenseCategories && expenseCategories.length > 0
      ? expandCategoryBucketForMatching(expenseCategories, lifeNames)
      : new Set(lifeNames.map((n) => normFinanceCatName(n)).filter(Boolean));
  const workSet =
    expenseCategories && expenseCategories.length > 0
      ? expandCategoryBucketForMatching(expenseCategories, workNames)
      : new Set(workNames.map((n) => normFinanceCatName(n)).filter(Boolean));
  let totalExpense = 0;
  let monthIncome = 0;
  let lifeExpense = 0;
  let workExpense = 0;
  for (const t of transactions) {
    if (t.type === 'income') monthIncome += t.amount;
    if (t.type === 'expense') {
      totalExpense += t.amount;
      const c = normFinanceCatName(t.category);
      if (!c) continue;
      if (lifeSet.has(c)) lifeExpense += t.amount;
      else if (workSet.has(c)) workExpense += t.amount;
    }
  }
  const delta = monthIncome - totalExpense;
  return { totalExpense, lifeExpense, workExpense, monthIncome, delta };
}
