import type {
  FinanceAccount,
  FinanceAccountBucket,
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

/** Типы счетов «резервы и цели» (накопления, не повседневный расчёт). */
const RESERVE_ACCOUNT_TYPES = new Set([
  'savings',
  'investment',
  'goal',
  'reserve',
  'deposit',
  'capital',
]);

/**
 * Три группы как в Twinworks: доступные деньги, замороженные (`other`), резервы и цели.
 */
export function accountBucketFromType(type: string): FinanceAccountBucket {
  const t = String(type ?? '').toLowerCase();
  if (t === 'other') return 'frozen';
  if (RESERVE_ACCOUNT_TYPES.has(t)) return 'reserve';
  return 'available';
}

/** Какой `type` писать в БД при выборе группы в UI (упрощённо). */
export function defaultAccountTypeForBucket(bucket: FinanceAccountBucket): string {
  switch (bucket) {
    case 'frozen':
      return 'other';
    case 'reserve':
      return 'savings';
    default:
      return 'checking';
  }
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
  const frozenBalance = accounts
    .filter((a) => accountBucketFromType(a.type) === 'frozen')
    .reduce((s, a) => s + a.balance, 0);
  const reserveBalance = accounts
    .filter((a) => accountBucketFromType(a.type) === 'reserve')
    .reduce((s, a) => s + a.balance, 0);
  const availableBalance = accounts
    .filter((a) => accountBucketFromType(a.type) === 'available')
    .reduce((s, a) => s + a.balance, 0);

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
    reserveBalance,
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

export type FinanceCategoryInput = {
  name: string;
  type: 'personal' | 'business';
  expectedMonthly: number;
};

function nowIso() {
  return new Date().toISOString();
}

export async function createFinanceExpenseCategory(userId: string, input: FinanceCategoryInput): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const { error } = await sb.from('finance_expense_categories').insert({
    id,
    user_id: userId,
    name: input.name.trim(),
    type: input.type,
    expected_monthly: input.expectedMonthly,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  if (error) throw error;
}

export async function updateFinanceExpenseCategory(
  userId: string,
  categoryId: string,
  patch: Partial<FinanceCategoryInput>
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');

  if (patch.name != null) {
    const { data: prev, error: selErr } = await sb
      .from('finance_expense_categories')
      .select('name')
      .eq('id', categoryId)
      .eq('user_id', userId)
      .maybeSingle();
    if (selErr) throw selErr;
    const oldName = prev && typeof (prev as { name?: string }).name === 'string' ? (prev as { name: string }).name : '';
    const nextName = patch.name.trim();
    if (oldName && nextName && oldName !== nextName) {
      const { error: txErr } = await sb
        .from('finance_transactions')
        .update({ category: nextName, updated_at: nowIso() })
        .eq('user_id', userId)
        .eq('category', oldName);
      if (txErr) throw txErr;
    }
  }

  const row: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.name != null) row.name = patch.name.trim();
  if (patch.type != null) row.type = patch.type;
  if (patch.expectedMonthly != null) row.expected_monthly = patch.expectedMonthly;

  const { error } = await sb
    .from('finance_expense_categories')
    .update(row)
    .eq('id', categoryId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteFinanceExpenseCategory(userId: string, categoryId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const { data: prev, error: selErr } = await sb
    .from('finance_expense_categories')
    .select('name')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .maybeSingle();
  if (selErr) throw selErr;
  const nm = prev && typeof (prev as { name?: string }).name === 'string' ? (prev as { name: string }).name : '';
  if (nm) {
    const { error: txErr } = await sb
      .from('finance_transactions')
      .update({ category: null, updated_at: nowIso() })
      .eq('user_id', userId)
      .eq('category', nm);
    if (txErr) throw txErr;
  }
  const { error } = await sb.from('finance_expense_categories').delete().eq('id', categoryId).eq('user_id', userId);
  if (error) throw error;
}

export async function updateFinanceAccount(
  userId: string,
  accountId: string,
  patch: Partial<Pick<FinanceAccount, 'name' | 'balance' | 'type' | 'sortOrder' | 'notes'>>
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const row: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.name != null) row.name = patch.name;
  if (patch.balance != null) row.balance = patch.balance;
  if (patch.type != null) row.type = patch.type;
  if (patch.sortOrder != null) row.sort_order = patch.sortOrder;
  if (patch.notes !== undefined) row.notes = patch.notes;
  const { error } = await sb.from('finance_accounts').update(row).eq('id', accountId).eq('user_id', userId);
  if (error) throw error;
}

export type CreateFinanceTransactionInput = {
  type: 'expense' | 'income';
  amount: number;
  currency?: string;
  dateISO: string;
  category?: string | null;
  description?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
};

function newFinanceTransactionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Новая операция + обновление баланса счёта (Twinworks: расход с from, доход на to). */
export async function createFinanceTransaction(
  userId: string,
  input: CreateFinanceTransactionInput
): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');

  const amount = input.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Сумма должна быть больше нуля');
  }

  const currency = input.currency ?? 'RUB';
  const ts = nowIso();
  const id = newFinanceTransactionId();

  const rollbackTx = async () => {
    await sb.from('finance_transactions').delete().eq('id', id).eq('user_id', userId);
  };

  if (input.type === 'expense') {
    if (!input.fromAccountId) throw new Error('Выбери счёт списания');

    const { data: accRow, error: selErr } = await sb
      .from('finance_accounts')
      .select('balance')
      .eq('id', input.fromAccountId)
      .eq('user_id', userId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!accRow) throw new Error('Счёт не найден');

    const bal = num((accRow as { balance?: unknown }).balance);

    const { error: insErr } = await sb.from('finance_transactions').insert({
      id,
      user_id: userId,
      date: input.dateISO,
      type: 'expense',
      amount,
      currency,
      category: input.category != null && String(input.category).trim() ? String(input.category).trim() : null,
      description:
        input.description != null && String(input.description).trim() ? String(input.description).trim() : null,
      from_account_id: input.fromAccountId,
      to_account_id: null,
      created_at: ts,
      updated_at: ts,
    });
    if (insErr) throw insErr;

    const { error: upErr } = await sb
      .from('finance_accounts')
      .update({ balance: bal - amount, updated_at: ts })
      .eq('id', input.fromAccountId)
      .eq('user_id', userId);
    if (upErr) {
      await rollbackTx();
      throw upErr;
    }
  } else {
    if (!input.toAccountId) throw new Error('Выбери счёт зачисления');

    const { data: accRow, error: selErr } = await sb
      .from('finance_accounts')
      .select('balance')
      .eq('id', input.toAccountId)
      .eq('user_id', userId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!accRow) throw new Error('Счёт не найден');

    const bal = num((accRow as { balance?: unknown }).balance);

    const { error: insErr } = await sb.from('finance_transactions').insert({
      id,
      user_id: userId,
      date: input.dateISO,
      type: 'income',
      amount,
      currency,
      category: input.category != null && String(input.category).trim() ? String(input.category).trim() : null,
      description:
        input.description != null && String(input.description).trim() ? String(input.description).trim() : null,
      from_account_id: null,
      to_account_id: input.toAccountId,
      created_at: ts,
      updated_at: ts,
    });
    if (insErr) throw insErr;

    const { error: upErr } = await sb
      .from('finance_accounts')
      .update({ balance: bal + amount, updated_at: ts })
      .eq('id', input.toAccountId)
      .eq('user_id', userId);
    if (upErr) {
      await rollbackTx();
      throw upErr;
    }
  }

  return id;
}
