/**
 * Автозакрытие прошлого календарного месяца в finance_month_snapshots (Supabase).
 * Надёжность: обычный upsert с RLS «только свой user_id»; дубликат по (user_id, year, month) не создаётся.
 * Снимок не перезаписывается, если строка за этот месяц уже есть (ручная или прошлый автозапуск).
 */
import {
  loadFinanceExpenseCategories,
  loadFinanceTransactionsForMonth,
  num,
  upsertFinanceMonthSnapshot,
} from '@/features/finance/financeApi';
import { computeFinanceMonthTxStats } from '@/features/finance/financeMonthTxStats';
import type { FinanceTransaction } from '@/features/finance/finance.types';
import { getSupabase } from '@/lib/supabase';

export type AutoSealPreviousMonthResult = 'skipped' | 'created' | 'noop';

function previousCalendarMonth(): { year: number; month: number } {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  let py = cy;
  let pm = cm - 1;
  if (pm < 1) {
    pm = 12;
    py -= 1;
  }
  return { year: py, month: pm };
}

/**
 * Если за прошлый календарный месяц ещё нет строки в finance_month_snapshots — создаёт одну.
 * Доход (total_revenue) и прибыль (project_profit) — из Teamtracker при успешном fetch; иначе null.
 * Расход в снимке — сумма трат «на жизнь» по категориям из настроек дашборда (без работы).
 * total_balance — сумма текущих остатков по счетам (оценка на момент записи; при необходимости правьте в таблице истории).
 */
export async function tryAutoSealPreviousMonthSnapshot(
  userId: string,
  lifeNames: string[],
  workNames: string[],
  fetchTeamtracker?: (year: number, month: number) => Promise<{ actualRevenue: number; actualProfit: number }>
): Promise<AutoSealPreviousMonthResult> {
  const sb = getSupabase();
  if (!sb) return 'noop';

  const { year: py, month: pm } = previousCalendarMonth();

  const { data: existing, error: selErr } = await sb
    .from('finance_month_snapshots')
    .select('id')
    .eq('user_id', userId)
    .eq('year', py)
    .eq('month', pm)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return 'skipped';

  const [{ data: accts, error: aErr }, txs, expenseCategories] = await Promise.all([
    sb.from('finance_accounts').select('balance').eq('user_id', userId),
    loadFinanceTransactionsForMonth(userId, py, pm),
    loadFinanceExpenseCategories(userId),
  ]);
  if (aErr) throw aErr;

  const totalBalance = (accts ?? []).reduce((s, r) => s + num((r as { balance?: unknown }).balance), 0);
  const stats = computeFinanceMonthTxStats(txs as FinanceTransaction[], lifeNames, workNames, expenseCategories);

  let totalRevenue: number | null = null;
  let projectProfit: number | null = null;
  if (fetchTeamtracker) {
    try {
      const tt = await fetchTeamtracker(py, pm);
      totalRevenue = Number.isFinite(tt.actualRevenue) ? Math.round(tt.actualRevenue) : null;
      projectProfit = Number.isFinite(tt.actualProfit) ? Math.round(tt.actualProfit) : null;
    } catch {
      /* TT недоступен — оставляем null, пользователь может заполнить вручную */
    }
  }

  await upsertFinanceMonthSnapshot(userId, {
    year: py,
    month: pm,
    totalBalance: Math.round(totalBalance),
    personalExpenses: Math.round(stats.lifeExpense),
    businessExpenses: 0,
    totalRevenue,
    projectProfit,
  });

  return 'created';
}
