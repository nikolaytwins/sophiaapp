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
    parentId: row.parent_id != null && String(row.parent_id).trim() !== '' ? String(row.parent_id) : null,
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
    totalRevenue: row.total_revenue != null ? num(row.total_revenue) : null,
    projectProfit: row.project_profit != null ? num(row.project_profit) : null,
  };
}

/** Имена категорий для полей выбора (включая подкатегории). */
export function expenseCategorySelectOptions(categories: FinanceExpenseCategory[]): { value: string; label: string }[] {
  return [...categories]
    .sort((a, b) => {
      const rootA = !a.parentId;
      const rootB = !b.parentId;
      if (rootA !== rootB) return rootA ? -1 : 1;
      return a.name.localeCompare(b.name, 'ru');
    })
    .map((c) => ({
      value: c.name,
      label: c.parentId ? `· ${c.name}` : c.name,
    }));
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

  const childrenByParent = new Map<string, FinanceExpenseCategory[]>();
  for (const c of categories) {
    if (c.parentId) {
      const arr = childrenByParent.get(c.parentId) ?? [];
      arr.push(c);
      childrenByParent.set(c.parentId, arr);
    }
  }

  const rollupSpentFor = (cat: FinanceExpenseCategory): number => {
    let s = spendByCategory.get(cat.name) ?? 0;
    for (const ch of childrenByParent.get(cat.id) ?? []) {
      s += spendByCategory.get(ch.name) ?? 0;
    }
    return s;
  };

  const fmtR0 = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/\u00A0/g, ' ') + ' ₽';

  const rootCategories = categories.filter((c) => !c.parentId);
  const budgetLines: FinanceBudgetLine[] = rootCategories.map((c) => {
    const spent = rollupSpentFor(c);
    const exp = c.expectedMonthly;
    const progress01 = exp > 0 ? Math.min(1, spent / exp) : spent > 0 ? 1 : 0;
    const overLimit = exp > 0 && spent > exp;
    const kids = childrenByParent.get(c.id) ?? [];
    const subHint =
      kids.length > 0
        ? ` · ${kids.map((k) => k.name).join(', ')}`
        : '';
    return {
      id: c.id,
      title: c.name,
      subtitle:
        exp > 0
          ? `${fmtR0(spent)} из ${fmtR0(exp)}${subHint}`
          : `Потрачено ${fmtR0(spent)}${subHint}`,
      spent,
      expectedMonthly: exp,
      progress01,
      kind: c.type === 'business' ? 'business' : 'personal',
      overLimit,
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
    expenseCategories: categories,
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
  /** null — верхний уровень; иначе id родительской категории. */
  parentId?: string | null;
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
  const parentId =
    input.parentId != null && String(input.parentId).trim() !== '' ? String(input.parentId).trim() : null;
  if (parentId) {
    const { data: par, error: pe } = await sb
      .from('finance_expense_categories')
      .select('id')
      .eq('user_id', userId)
      .eq('id', parentId)
      .maybeSingle();
    if (pe) throw pe;
    if (!par) throw new Error('Родительская категория не найдена');
  }

  const { error } = await sb.from('finance_expense_categories').insert({
    id,
    user_id: userId,
    name: input.name.trim(),
    type: input.type,
    expected_monthly: input.expectedMonthly,
    parent_id: parentId,
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
  if (patch.parentId !== undefined) {
    const pid = patch.parentId != null && String(patch.parentId).trim() !== '' ? String(patch.parentId).trim() : null;
    if (pid === categoryId) throw new Error('Категория не может быть родителем самой себя');
    if (pid) {
      const { data: par, error: pe } = await sb
        .from('finance_expense_categories')
        .select('id')
        .eq('user_id', userId)
        .eq('id', pid)
        .maybeSingle();
      if (pe) throw pe;
      if (!par) throw new Error('Родительская категория не найдена');
    }
    row.parent_id = pid;
  }

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
  const { data: rel, error: selErr } = await sb
    .from('finance_expense_categories')
    .select('name')
    .eq('user_id', userId)
    .or(`id.eq.${categoryId},parent_id.eq.${categoryId}`);
  if (selErr) throw selErr;
  const names = [...new Set((rel ?? []).map((r) => String((r as { name?: string }).name ?? '').trim()).filter(Boolean))];
  for (const nm of names) {
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
};

function newFinanceTransactionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Новая операция в журнале. Балансы счетов не меняются. */
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

  const category =
    input.category != null && String(input.category).trim() ? String(input.category).trim() : null;
  const description =
    input.description != null && String(input.description).trim() ? String(input.description).trim() : null;

  const { error: insErr } = await sb.from('finance_transactions').insert({
    id,
    user_id: userId,
    date: input.dateISO,
    type: input.type,
    amount,
    currency,
    category,
    description,
    from_account_id: null,
    to_account_id: null,
    created_at: ts,
    updated_at: ts,
  });
  if (insErr) throw insErr;

  return id;
}

export type UpdateFinanceTransactionPatch = {
  dateISO?: string;
  amount?: number;
  category?: string | null;
  description?: string | null;
};

export async function updateFinanceTransaction(
  userId: string,
  transactionId: string,
  patch: UpdateFinanceTransactionPatch
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const row: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.dateISO != null) row.date = patch.dateISO;
  if (patch.amount != null) row.amount = patch.amount;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.description !== undefined) row.description = patch.description;
  const { error } = await sb.from('finance_transactions').update(row).eq('id', transactionId).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteFinanceTransaction(userId: string, transactionId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const { error } = await sb.from('finance_transactions').delete().eq('id', transactionId).eq('user_id', userId);
  if (error) throw error;
}

export type FinanceBulkExpenseRow = {
  dateISO: string;
  amount: number;
  description: string | null;
  category: string | null;
};

/** Массовая вставка расходов (импорт CSV и т.п.). Балансы счетов не меняются. */
export async function bulkInsertFinanceExpenseTransactions(
  userId: string,
  items: FinanceBulkExpenseRow[]
): Promise<void> {
  if (items.length === 0) return;
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const ts = nowIso();
  const rows = items.map((r) => {
    const id = newFinanceTransactionId();
    const amount = r.amount;
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Каждая сумма должна быть больше нуля');
    }
    return {
      id,
      user_id: userId,
      date: r.dateISO,
      type: 'expense' as const,
      amount,
      currency: 'RUB',
      category: r.category != null && String(r.category).trim() ? String(r.category).trim() : null,
      description:
        r.description != null && String(r.description).trim() ? String(r.description).trim() : null,
      from_account_id: null,
      to_account_id: null,
      created_at: ts,
      updated_at: ts,
    };
  });
  const { error } = await sb.from('finance_transactions').insert(rows);
  if (error) throw error;
}

const EXPENSE_ANALYTICS_MONTHS = 12;

export type FinanceCategoryMonthSeries = {
  category: string;
  amounts: number[];
  total: number;
};

export type FinanceExpenseAnalytics = {
  monthKeys: string[];
  monthLabels: string[];
  monthlyExpenseTotal: number[];
  categorySeries: FinanceCategoryMonthSeries[];
};

export async function loadFinanceExpenseAnalytics(userId: string): Promise<FinanceExpenseAnalytics> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (EXPENSE_ANALYTICS_MONTHS - 1), 1, 0, 0, 0, 0);
  const { data, error } = await sb
    .from('finance_transactions')
    .select('date, amount, category')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', start.toISOString())
    .order('date', { ascending: true })
    .limit(10000);
  if (error) throw error;
  const monthKeys: string[] = [];
  const monthLabels: string[] = [];
  for (let i = 0; i < EXPENSE_ANALYTICS_MONTHS; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    monthKeys.push(`${y}-${String(m).padStart(2, '0')}`);
    monthLabels.push(d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }));
  }
  const monthlyTotals = new Array(EXPENSE_ANALYTICS_MONTHS).fill(0);
  const catMap = new Map<string, number[]>();
  const keyToIndex = (key: string) => monthKeys.indexOf(key);
  for (const row of data ?? []) {
    const r = row as { date: string; amount: unknown; category: string | null };
    const dt = new Date(r.date);
    if (!Number.isFinite(dt.getTime())) continue;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const idx = keyToIndex(key);
    if (idx < 0) continue;
    const amt = num(r.amount);
    monthlyTotals[idx] += amt;
    const cat = (r.category ?? '').trim() || 'Без категории';
    if (!catMap.has(cat)) catMap.set(cat, new Array(EXPENSE_ANALYTICS_MONTHS).fill(0));
    catMap.get(cat)![idx] += amt;
  }
  const categorySeries: FinanceCategoryMonthSeries[] = Array.from(catMap.entries())
    .map(([category, amounts]) => ({ category, amounts, total: amounts.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
  return { monthKeys, monthLabels, monthlyExpenseTotal: monthlyTotals, categorySeries };
}
