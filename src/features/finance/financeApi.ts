import type {
  FinanceAccount,
  FinanceBudgetLine,
  FinanceExpenseCategory,
  FinanceExpenseSettings,
  FinanceMonthSnapshot,
  FinanceOneTimeExpense,
  FinanceOverview,
  FinanceTransaction,
} from '@/features/finance/finance.types';
import { getSupabase } from '@/lib/supabase';

export function num(v: unknown): number {
  if (v == null) return 0;
  const x = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Замороженные активы в Twinworks: тип счёта `other`. */
export function isFrozenAccountType(type: string): boolean {
  return type === 'other';
}

function monthRangeISO(): { startISO: string; endISO: string; y: number; m: number } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString(), y, m };
}

function daysLeftInMonthInclusive(): number {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate() + 1;
}

function mapAccount(row: Record<string, unknown>): FinanceAccount {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    currency: String(row.currency ?? 'RUB'),
    balance: num(row.balance),
    notes: row.notes != null ? String(row.notes) : null,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapTransaction(row: Record<string, unknown>): FinanceTransaction {
  return {
    id: String(row.id),
    date: String(row.date),
    type: String(row.type),
    amount: num(row.amount),
    currency: String(row.currency ?? 'RUB'),
    category: row.category != null ? String(row.category) : null,
    description: row.description != null ? String(row.description) : null,
    fromAccountId: row.from_account_id != null ? String(row.from_account_id) : null,
    toAccountId: row.to_account_id != null ? String(row.to_account_id) : null,
  };
}

function mapCategory(row: Record<string, unknown>): FinanceExpenseCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    expectedMonthly: num(row.expected_monthly),
  };
}

function mapOneTime(row: Record<string, unknown>): FinanceOneTimeExpense {
  return {
    id: String(row.id),
    name: String(row.name),
    amount: num(row.amount),
    month: Number(row.month),
    year: Number(row.year),
    paid: Boolean(row.paid),
    type: String(row.type ?? 'personal'),
  };
}

function mapSnapshot(row: Record<string, unknown>): FinanceMonthSnapshot {
  return {
    id: String(row.id),
    year: Number(row.year),
    month: Number(row.month),
    totalBalance: num(row.total_balance),
    personalExpenses: num(row.personal_expenses),
    businessExpenses: num(row.business_expenses),
  };
}

export async function loadFinanceOverview(userId: string): Promise<FinanceOverview> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');

  const { startISO, endISO, y, m } = monthRangeISO();

  const [
    accountsRes,
    categoriesRes,
    settingsRes,
    oneTimeRes,
    snapshotsRes,
    monthTxRes,
    recentTxRes,
  ] = await Promise.all([
    sb.from('finance_accounts').select('*').eq('user_id', userId),
    sb.from('finance_expense_categories').select('*').eq('user_id', userId),
    sb.from('finance_expense_settings').select('*').eq('user_id', userId).maybeSingle(),
    sb.from('finance_one_time_expenses').select('*').eq('user_id', userId).eq('year', y).eq('month', m),
    sb.from('finance_month_snapshots').select('*').eq('user_id', userId).limit(120),
    sb
      .from('finance_transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startISO)
      .lte('date', endISO)
      .order('date', { ascending: false }),
    sb
      .from('finance_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(120),
  ]);

  const err =
    accountsRes.error ||
    categoriesRes.error ||
    settingsRes.error ||
    oneTimeRes.error ||
    snapshotsRes.error ||
    monthTxRes.error ||
    recentTxRes.error;
  if (err) throw err;

  const accounts = (accountsRes.data ?? [])
    .map((r) => mapAccount(r as Record<string, unknown>))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));
  const categories = (categoriesRes.data ?? [])
    .map((r) => mapCategory(r as Record<string, unknown>))
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name, 'ru'));
  const settingsRow = settingsRes.data as Record<string, unknown> | null;
  const expenseSettings: FinanceExpenseSettings = {
    dailyExpenseLimit: settingsRow ? num(settingsRow.daily_expense_limit) : 3500,
  };
  const oneTime = (oneTimeRes.data ?? []).map((r) => mapOneTime(r as Record<string, unknown>));
  const snapshots = (snapshotsRes.data ?? [])
    .map((r) => mapSnapshot(r as Record<string, unknown>))
    .sort((a, b) => b.year - a.year || b.month - a.month);
  const transactionsThisMonth = (monthTxRes.data ?? []).map((r) => mapTransaction(r as Record<string, unknown>));
  const transactionsRecent = (recentTxRes.data ?? []).map((r) => mapTransaction(r as Record<string, unknown>));

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const frozenBalance = accounts.filter((a) => isFrozenAccountType(a.type)).reduce((s, a) => s + a.balance, 0);
  const availableBalance = accounts.filter((a) => !isFrozenAccountType(a.type)).reduce((s, a) => s + a.balance, 0);

  let monthIncome = 0;
  let monthExpense = 0;
  const spendByCategory = new Map<string, number>();
  for (const t of transactionsThisMonth) {
    if (t.type === 'income') monthIncome += t.amount;
    if (t.type === 'expense') {
      monthExpense += t.amount;
      const key = (t.category ?? '').trim();
      if (key) spendByCategory.set(key, (spendByCategory.get(key) ?? 0) + t.amount);
    }
  }

  const oneTimeUnpaidTotal = oneTime.filter((o) => !o.paid).reduce((s, o) => s + o.amount, 0);
  const daysLeft = daysLeftInMonthInclusive();
  const burnReserve = expenseSettings.dailyExpenseLimit * daysLeft;
  const forecastEndOfMonth = totalBalance - oneTimeUnpaidTotal - burnReserve;

  const budgetLines: FinanceBudgetLine[] = categories.map((c) => {
    const spent = spendByCategory.get(c.name) ?? 0;
    const exp = c.expectedMonthly;
    const progress01 = exp > 0 ? Math.min(1, spent / exp) : spent > 0 ? 1 : 0;
    return {
      id: c.id,
      title: c.name,
      subtitle:
        exp > 0
          ? `План ${Math.round(exp).toLocaleString('ru-RU')} ₽ · потрачено ${Math.round(spent).toLocaleString('ru-RU')} ₽`
          : `Потрачено ${Math.round(spent).toLocaleString('ru-RU')} ₽`,
      spent,
      expectedMonthly: exp,
      progress01,
      kind: c.type === 'business' ? 'business' : 'personal',
    };
  });

  return {
    totalBalance,
    availableBalance,
    frozenBalance,
    monthIncome,
    monthExpense,
    forecastEndOfMonth,
    dailyExpenseLimit: expenseSettings.dailyExpenseLimit,
    budgetLines,
    accounts,
    transactionsThisMonth,
    transactionsRecent,
    oneTimeUnpaidTotal,
    snapshots,
  };
}
