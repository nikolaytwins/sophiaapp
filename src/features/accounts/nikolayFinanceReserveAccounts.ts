import type { FinanceAccount } from '@/features/finance/finance.types';
import { accountBucketFromType } from '@/features/finance/financeApi';

/** Счета из группы «резервы / накопления» с Китаем и подушкой в названии (как цели, но это счета). */
export function pickNikolayMoneyReserveAccounts(
  accounts: FinanceAccount[]
): { china: FinanceAccount | null; cushion: FinanceAccount | null } {
  const reserve = accounts.filter((a) => accountBucketFromType(a.type) === 'reserve');
  let china: FinanceAccount | null = null;
  let cushion: FinanceAccount | null = null;
  for (const a of reserve) {
    const t = a.name.toLowerCase();
    if (!china && t.includes('китай')) china = a;
    else if (!cushion && t.includes('подуш')) cushion = a;
  }
  return { china, cushion };
}

/** Цель накопления в ₽ в заметках счёта: отдельная строка `target:300000`. */
export function parseFinanceAccountGoalTarget(notes: string | null | undefined): number | null {
  if (!notes?.trim()) return null;
  const m = notes.match(/(?:^|\n)\s*target\s*:\s*([\d\s]+)/i);
  if (!m?.[1]) return null;
  const n = parseInt(String(m[1]).replace(/\s/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function mergeNotesWithGoalTarget(prevNotes: string | null | undefined, targetAmount: number): string {
  const line = `target:${Math.round(targetAmount)}`;
  const lines = (prevNotes ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\s*target\s*:\s*\d+\s*$/i.test(l));
  const body = lines.join('\n').trim();
  return body ? `${body}\n${line}` : line;
}

export function defaultNikolayReserveTargetRub(variant: 'china' | 'cushion'): number {
  return variant === 'china' ? 300_000 : 700_000;
}
