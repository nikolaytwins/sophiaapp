import type { FinanceBudgetLine, FinanceExpenseCategory, FinanceTransaction } from '@/features/finance/finance.types';

/** Нормализация имени категории как в транзакциях (регистр / пробелы). */
export function normFinanceCatName(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

function sortSiblings(a: FinanceExpenseCategory, b: FinanceExpenseCategory): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name, 'ru');
}

function categoryByLowerName(categories: FinanceExpenseCategory[]): Map<string, FinanceExpenseCategory> {
  const m = new Map<string, FinanceExpenseCategory>();
  for (const c of categories) m.set(normFinanceCatName(c.name), c);
  return m;
}

/** Все имена потомков (рекурсивно), без самого родителя. */
export function collectDescendantCategoryNames(categories: FinanceExpenseCategory[], parentId: string): string[] {
  const out: string[] = [];
  const kids = categories.filter((c) => c.parentId === parentId).sort(sortSiblings);
  for (const ch of kids) {
    out.push(ch.name.trim());
    out.push(...collectDescendantCategoryNames(categories, ch.id));
  }
  return out;
}

/**
 * Развернуть минимальный набор выбранных имён в множество для матчинга к полю транзакции «категория»:
 * каждая отмеченная категория + все её подкатегории (рекурсивно).
 * Имена вне дерева (старые/ручные) добавляются как есть.
 */
export function expandCategoryBucketForMatching(
  categories: FinanceExpenseCategory[],
  selectedMinimalNames: string[]
): Set<string> {
  const nameMap = categoryByLowerName(categories);
  const out = new Set<string>();
  for (const raw of selectedMinimalNames) {
    const t = raw.trim();
    if (!t) continue;
    const cat = nameMap.get(normFinanceCatName(t));
    if (cat) {
      out.add(normFinanceCatName(cat.name));
      for (const dn of collectDescendantCategoryNames(categories, cat.id)) {
        out.add(normFinanceCatName(dn));
      }
    } else {
      out.add(normFinanceCatName(t));
    }
  }
  return out;
}

/**
 * Убрать из выбора подкатегории, если отмечен предок — чтобы не дублировать запись в корзине
 * и не суммировать одно и то же дважды при визуализации.
 */
export function canonicalizeBucketSelectionNames(
  categories: FinanceExpenseCategory[],
  selectedNames: string[]
): string[] {
  if (categories.length === 0) {
    return [...new Set(selectedNames.map((s) => s.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  }
  const nameMap = categoryByLowerName(categories);
  const pickedDisplay = new Set<string>();
  for (const s of selectedNames) {
    const t = s.trim();
    if (!t) continue;
    const c = nameMap.get(normFinanceCatName(t));
    pickedDisplay.add(c ? c.name.trim() : t);
  }
  const pickedIds = new Set<string>();
  for (const d of pickedDisplay) {
    const c = nameMap.get(normFinanceCatName(d));
    if (c) pickedIds.add(c.id);
  }
  const minimal: string[] = [];
  for (const displayName of pickedDisplay) {
    const c = nameMap.get(normFinanceCatName(displayName));
    if (!c) {
      minimal.push(displayName);
      continue;
    }
    let pid: string | null = c.parentId;
    let ancestorPicked = false;
    while (pid) {
      if (pickedIds.has(pid)) {
        ancestorPicked = true;
        break;
      }
      const p = categories.find((x) => x.id === pid);
      pid = p?.parentId ?? null;
    }
    if (!ancestorPicked) minimal.push(c.name.trim());
  }
  return [...new Set(minimal)].sort((a, b) => a.localeCompare(b, 'ru'));
}

/** Для группировки в donut / списках: ключ = корневая категория в дереве (имя). */
export function rollupExpenseCategoryToRootName(
  categories: FinanceExpenseCategory[],
  txCategoryLabel: string
): string {
  const nameMap = categoryByLowerName(categories);
  let cur = nameMap.get(normFinanceCatName(txCategoryLabel));
  if (!cur) return txCategoryLabel.trim();
  let root = cur;
  while (root.parentId) {
    const p = categories.find((x) => x.id === root.parentId);
    if (!p) break;
    root = p;
  }
  return root.name.trim();
}

/** У категории есть отмеченный предок в минимальном наборе — дочерние чекбоксы «заблокированы» родителем. */
export function hasSelectedAncestorInBucket(
  categories: FinanceExpenseCategory[],
  selectedMinimalDisplayNames: Set<string>,
  cat: FinanceExpenseCategory
): boolean {
  const lowerSel = new Set([...selectedMinimalDisplayNames].map(normFinanceCatName));
  let pid: string | null = cat.parentId;
  while (pid) {
    const p = categories.find((x) => x.id === pid);
    if (!p) break;
    if (lowerSel.has(normFinanceCatName(p.name))) return true;
    pid = p.parentId;
  }
  return false;
}

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
