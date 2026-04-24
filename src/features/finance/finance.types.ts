/** Строки из Supabase (finance_*), уже приведённые к числам. */
export type FinanceAccount = {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  notes: string | null;
  sortOrder: number;
};

export type FinanceTransaction = {
  id: string;
  date: string;
  type: string;
  amount: number;
  currency: string;
  category: string | null;
  description: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
};

export type FinanceExpenseCategory = {
  id: string;
  name: string;
  type: string;
  expectedMonthly: number;
  /** Родительская категория (подкатегория расходов). */
  parentId: string | null;
  /** Порядок среди соседей (одинаковый parent_id). */
  sortOrder: number;
};

export type FinanceExpenseSettings = {
  dailyExpenseLimit: number;
};

export type FinanceOneTimeExpense = {
  id: string;
  name: string;
  amount: number;
  month: number;
  year: number;
  paid: boolean;
  type: string;
};

export type FinanceMonthSnapshot = {
  id: string;
  year: number;
  month: number;
  totalBalance: number;
  personalExpenses: number;
  businessExpenses: number;
  /** Общая выручка за месяц (если есть в Twinworks / импорте). */
  totalRevenue: number | null;
  /** Прибыль проектов за месяц (если есть в импорте). */
  projectProfit: number | null;
};

/** Карточка «месячный бюджет» по категории Twinworks. */
export type FinanceBudgetLine = {
  id: string;
  title: string;
  subtitle: string;
  spent: number;
  expectedMonthly: number;
  progress01: number;
  kind: 'personal' | 'business';
  /** Превышен месячный лимит (для подсветки на дашборде). */
  overLimit: boolean;
};

/** Группа счёта в UI (как в Twinworks: доступно / заморозка / резервы). */
export type FinanceAccountBucket = 'available' | 'frozen' | 'reserve';

export type FinanceOverview = {
  totalBalance: number;
  availableBalance: number;
  frozenBalance: number;
  /** Сумма счетов в группе «Резервы и цели» (по типу счёта). */
  reserveBalance: number;
  monthIncome: number;
  monthExpense: number;
  /** Упрощённый прогноз: баланс − неоплаченные разовые − дневной лимит × дней до конца месяца. */
  forecastEndOfMonth: number;
  dailyExpenseLimit: number;
  /** Все категории расходов (включая подкатегории) — для выбора в транзакциях. */
  expenseCategories: FinanceExpenseCategory[];
  /** Только верхний уровень: лимит родителя, потрачено с учётом подкатегорий. */
  budgetLines: FinanceBudgetLine[];
  accounts: FinanceAccount[];
  transactionsThisMonth: FinanceTransaction[];
  transactionsRecent: FinanceTransaction[];
  oneTimeUnpaidTotal: number;
  snapshots: FinanceMonthSnapshot[];
};
