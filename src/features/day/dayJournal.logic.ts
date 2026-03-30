import type {
  DayJournalEntry,
  DayTypeId,
  EveningEnergyId,
  MorningStateId,
  RecoveryId,
} from '@/features/day/dayJournal.types';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const MORNING: MorningStateId[] = ['charged', 'ok', 'flat', 'dead'];
const EVENING: EveningEnergyId[] = ['charged', 'calm', 'tension', 'overload', 'edge'];
const DAY_TYPE: DayTypeId[] = ['super_productive', 'focus', 'chaos', 'stuck', 'dropped', 'rest'];
const RECOVERY: RecoveryId[] = ['walk', 'nothing', 'screen', 'workout', 'people', 'scroll', 'sleep'];

function pick<T extends string>(v: unknown, allowed: T[]): T | undefined {
  return typeof v === 'string' && (allowed as string[]).includes(v) ? (v as T) : undefined;
}

function parseRecoveryIds(raw: unknown): RecoveryId[] {
  if (!Array.isArray(raw)) return [];
  const out: RecoveryId[] = [];
  for (const x of raw) {
    const id = pick(x, RECOVERY);
    if (id && !out.includes(id)) out.push(id);
    if (out.length >= 2) break;
  }
  return out;
}

/** Одна запись после загрузки из JSON / облака. */
export function normalizeDayJournalEntry(dateKey: string, raw: unknown): DayJournalEntry {
  if (!raw || typeof raw !== 'object') {
    return {
      dateKey,
      recoveryIds: [],
      note: '',
      updatedAt: new Date().toISOString(),
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    dateKey,
    morningState: pick(o.morningState, MORNING),
    eveningEnergy: pick(o.eveningEnergy, EVENING),
    dayType: pick(o.dayType, DAY_TYPE),
    recoveryIds: parseRecoveryIds(o.recoveryIds),
    note: typeof o.note === 'string' ? o.note : '',
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
  };
}

export function normalizeDayJournalEntriesMap(raw: unknown): Record<string, DayJournalEntry> {
  if (!raw || typeof raw !== 'object') return {};
  const root = raw as Record<string, unknown>;
  const src =
    root.entries != null && typeof root.entries === 'object'
      ? (root.entries as Record<string, unknown>)
      : (raw as Record<string, unknown>);
  const out: Record<string, DayJournalEntry> = {};
  for (const [k, v] of Object.entries(src)) {
    if (!DATE_KEY_RE.test(k)) continue;
    out[k] = normalizeDayJournalEntry(k, v);
  }
  return out;
}

export function dayJournalEntryHasContent(e: DayJournalEntry | undefined): boolean {
  if (!e) return false;
  return Boolean(
    e.morningState ||
      e.eveningEnergy ||
      e.dayType ||
      (e.recoveryIds?.length ?? 0) > 0 ||
      (e.note?.trim().length ?? 0) > 0
  );
}

export function isDayJournalEmpty(entries: Record<string, DayJournalEntry>): boolean {
  const keys = Object.keys(entries);
  if (keys.length === 0) return true;
  return keys.every((k) => !dayJournalEntryHasContent(entries[k]));
}
