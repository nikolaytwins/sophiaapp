#!/usr/bin/env node
/**
 * Одноразовый импорт финансов Twinworks (SQLite, только чтение) → Supabase.
 * Нужен service_role: обходит RLS. Ключ не коммить и не светить в клиенте.
 *
 * Использование:
 *   cd sophia-os
 *   npm install   # подтянет better-sqlite3 из devDependencies
 *
 *   export SUPABASE_URL="https://xxxx.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   export FINANCE_IMPORT_USER_ID="uuid-пользователя-из-Authentication"
 *
 *   node scripts/import-finance-from-sqlite.mjs \
 *     --sqlite /path/to/twinworks/prisma/dev.db
 *
 * Опции:
 *   --sqlite PATH   путь к dev.db (иначе FINANCE_IMPORT_SQLITE или TWINWORKS_SQLITE_PATH)
 *   --user UUID     (иначе FINANCE_IMPORT_USER_ID)
 *   --wipe          сначала удалить все finance_* строки этого user_id (для повторного импорта)
 */

import 'dotenv/config';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

function arg(name, def) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}
const hasFlag = (f) => process.argv.includes(f);

function toIso(v) {
  if (v == null || v === '') return new Date().toISOString();
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const sqlitePath =
    arg('--sqlite', null) ||
    process.env.FINANCE_IMPORT_SQLITE ||
    process.env.TWINWORKS_SQLITE_PATH;
  const userId = arg('--user', null) || process.env.FINANCE_IMPORT_USER_ID;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const wipe = hasFlag('--wipe');

  if (!sqlitePath) {
    console.error('Укажи путь к SQLite: --sqlite /path/to/prisma/dev.db или FINANCE_IMPORT_SQLITE');
    process.exit(1);
  }
  if (!userId) {
    console.error('Укажи UUID пользователя: --user <uuid> или FINANCE_IMPORT_USER_ID');
    process.exit(1);
  }
  if (!supabaseUrl || !serviceKey) {
    console.error('Нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в окружении');
    process.exit(1);
  }

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(userId)) {
    console.error('FINANCE_IMPORT_USER_ID / --user должен быть UUID (формат Supabase Auth)');
    process.exit(1);
  }

  console.log('SQLite (только чтение):', sqlitePath);
  console.log('user_id:', userId);
  console.log('wipe перед импортом:', wipe);

  const db = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (wipe) {
    console.log('Удаляю старые строки finance_* для этого пользователя...');
    const tables = [
      'finance_transactions',
      'finance_one_time_expenses',
      'finance_month_snapshots',
      'finance_expense_categories',
      'finance_accounts',
      'finance_expense_settings',
    ];
    for (const t of tables) {
      const { error } = await supabase.from(t).delete().eq('user_id', userId);
      if (error) {
        console.error(`Ошибка delete ${t}:`, error.message);
        if (/not find the table|does not exist/i.test(error.message)) {
          console.error('');
          console.error('→ Таблицы finance_* ещё не созданы в этом проекте Supabase.');
          console.error('  Выполни в SQL Editor весь файл: supabase/migrations/009_finance.sql');
          console.error('  Затем снова запусти этот скрипт.');
        }
        process.exit(1);
      }
    }
  }

  /** @type {any[]} */
  let accounts = [];
  try {
    accounts = db.prepare('SELECT * FROM PersonalAccount').all();
  } catch (e) {
    console.warn('PersonalAccount:', e.message);
  }
  /** @type {any[]} */
  let categories = [];
  try {
    categories = db.prepare('SELECT * FROM expense_categories').all();
  } catch (e) {
    console.warn('expense_categories:', e.message);
  }
  /** @type {any} */
  let expenseSettings = null;
  try {
    expenseSettings = db.prepare('SELECT * FROM expense_settings LIMIT 1').get();
  } catch (e) {
    console.warn('expense_settings:', e.message);
  }
  /** @type {any[]} */
  let oneTime = [];
  try {
    oneTime = db.prepare('SELECT * FROM one_time_expenses').all();
  } catch (e) {
    console.warn('one_time_expenses:', e.message);
  }
  /** @type {any[]} */
  let transactions = [];
  try {
    transactions = db.prepare('SELECT * FROM PersonalTransaction').all();
  } catch (e) {
    console.warn('PersonalTransaction:', e.message);
  }
  /** @type {any[]} */
  let monthly = [];
  try {
    monthly = db.prepare('SELECT * FROM monthly_history ORDER BY year, month').all();
  } catch (e) {
    console.warn('monthly_history:', e.message);
  }

  db.close();

  const accountRows = accounts.map((r) => ({
    id: String(r.id),
    user_id: userId,
    name: String(r.name),
    type: String(r.type),
    currency: String(r.currency ?? 'RUB'),
    balance: num(r.balance),
    notes: r.notes != null ? String(r.notes) : null,
    sort_order: num(r['order'] ?? r.sort_order ?? 0),
    created_at: toIso(r.createdAt),
    updated_at: toIso(r.updatedAt),
  }));

  const categoryRows = categories.map((r) => ({
    id: String(r.id),
    user_id: userId,
    name: String(r.name),
    type: String(r.type),
    expected_monthly: num(r.expectedMonthly),
    created_at: toIso(r.createdAt),
    updated_at: toIso(r.updatedAt),
  }));

  if (expenseSettings) {
    const row = {
      user_id: userId,
      daily_expense_limit: num(expenseSettings.dailyExpenseLimit ?? 3500),
      updated_at: toIso(expenseSettings.updatedAt),
    };
    const { error } = await supabase.from('finance_expense_settings').upsert(row, { onConflict: 'user_id' });
    if (error) {
      console.error('finance_expense_settings:', error.message);
      process.exit(1);
    }
    console.log('finance_expense_settings: 1 строка');
  } else {
    console.log('finance_expense_settings: пропуск (нет таблицы/строки)');
  }

  if (categoryRows.length) {
    const { error } = await supabase.from('finance_expense_categories').insert(categoryRows);
    if (error) {
      console.error('finance_expense_categories:', error.message);
      process.exit(1);
    }
    console.log('finance_expense_categories:', categoryRows.length);
  } else {
    console.log('finance_expense_categories: 0');
  }

  if (accountRows.length) {
    const { error } = await supabase.from('finance_accounts').insert(accountRows);
    if (error) {
      console.error('finance_accounts:', error.message);
      process.exit(1);
    }
    console.log('finance_accounts:', accountRows.length);
  } else {
    console.log('finance_accounts: 0');
  }

  const oneTimeRows = oneTime.map((r) => ({
    id: String(r.id),
    user_id: userId,
    name: String(r.name),
    amount: num(r.amount),
    month: Number(r.month),
    year: Number(r.year),
    paid: Boolean(r.paid),
    type: String(r.type ?? 'personal'),
    created_at: toIso(r.createdAt),
  }));

  if (oneTimeRows.length) {
    const { error } = await supabase.from('finance_one_time_expenses').insert(oneTimeRows);
    if (error) {
      console.error('finance_one_time_expenses:', error.message);
      process.exit(1);
    }
    console.log('finance_one_time_expenses:', oneTimeRows.length);
  } else {
    console.log('finance_one_time_expenses: 0');
  }

  const txRows = transactions.map((r) => ({
    id: String(r.id),
    user_id: userId,
    date: toIso(r.date),
    type: String(r.type),
    amount: num(r.amount),
    currency: String(r.currency ?? 'RUB'),
    category: r.category != null ? String(r.category) : null,
    description: r.description != null ? String(r.description) : null,
    from_account_id: r.fromAccountId != null ? String(r.fromAccountId) : null,
    to_account_id: r.toAccountId != null ? String(r.toAccountId) : null,
    created_at: toIso(r.createdAt),
    updated_at: toIso(r.updatedAt),
  }));

  if (txRows.length) {
    const batch = 200;
    for (let i = 0; i < txRows.length; i += batch) {
      const chunk = txRows.slice(i, i + batch);
      const { error } = await supabase.from('finance_transactions').insert(chunk);
      if (error) {
        console.error('finance_transactions batch', i, error.message);
        process.exit(1);
      }
    }
    console.log('finance_transactions:', txRows.length);
  } else {
    console.log('finance_transactions: 0');
  }

  const snapRows = monthly.map((r) => {
    const revRaw = r.totalRevenue ?? r.total_revenue ?? r.revenue ?? r.totalIncome ?? null;
    const profRaw = r.projectProfit ?? r.project_profit ?? r.profit ?? null;
    return {
      user_id: userId,
      year: Number(r.year),
      month: Number(r.month),
      total_balance: num(r.totalAccounts),
      personal_expenses: num(r.personalExpenses),
      business_expenses: num(r.businessExpenses),
      total_revenue: revRaw != null && revRaw !== '' ? num(revRaw) : null,
      project_profit: profRaw != null && profRaw !== '' ? num(profRaw) : null,
    };
  });

  if (snapRows.length) {
    const { error } = await supabase.from('finance_month_snapshots').upsert(snapRows, {
      onConflict: 'user_id,year,month',
    });
    if (error) {
      console.error('finance_month_snapshots:', error.message);
      process.exit(1);
    }
    console.log('finance_month_snapshots:', snapRows.length);
  } else {
    console.log('finance_month_snapshots: 0');
  }

  const sumBal = accountRows.reduce((s, a) => s + a.balance, 0);
  console.log('');
  console.log('Готово. Контроль: сумма балансов счетов (импорт) =', Math.round(sumBal));
  console.log('Открой приложение София под этим же пользователем → вкладка Финансы.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
