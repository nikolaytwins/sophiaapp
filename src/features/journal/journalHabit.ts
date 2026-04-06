import { isNikolayPrimaryAccount, NIKOLAY_ACCOUNT_EMAIL_PRIMARY } from '@/features/accounts/nikolayProfile';
import type { Habit, HabitPersisted } from '@/entities/models';
import type { HabitsPersistSlice } from '@/features/habits/habitsPersistReducer';

/** @deprecated Используйте isNikolayPrimaryAccount — поддерживается и опечатка nikollaytwins. */
export const JOURNAL_HABIT_EMAIL = NIKOLAY_ACCOUNT_EMAIL_PRIMARY;
export const JOURNAL_HABIT_ID = 'seed_journal_daily';
export const JOURNAL_HABIT_NAME = 'Ведение дневника';
/** Второй дневниковый ритуал в профиле nikolaytwins — не дублируем в таймлайне «План дня». */
export const NIKOLAY_JOURNAL_BRAINDUMP_ID = 'nikolay_journal_braindump';

/** Привычки, которые ведутся через блок «Дневник» на экране Дня — не показываем в общем списке чек-инов. */
export function habitIsDiaryLinked(h: { id: string; name: string }): boolean {
  if (h.id === JOURNAL_HABIT_ID || h.name.trim() === JOURNAL_HABIT_NAME) return true;
  if (h.id === NIKOLAY_JOURNAL_BRAINDUMP_ID) return true;
  return false;
}

export function buildJournalHabitPersisted(): HabitPersisted {
  return {
    id: JOURNAL_HABIT_ID,
    name: JOURNAL_HABIT_NAME,
    icon: 'book-outline',
    cadence: 'daily',
    createdAt: new Date().toISOString(),
    completionDates: [],
  };
}

export function ensureJournalHabitForAccount(
  slice: HabitsPersistSlice,
  email: string | null | undefined
): HabitsPersistSlice {
  if (!isNikolayPrimaryAccount(email)) return slice;
  if (slice.habits.some((h) => h.id === JOURNAL_HABIT_ID || h.name === JOURNAL_HABIT_NAME)) return slice;
  return {
    ...slice,
    habits: [...slice.habits, buildJournalHabitPersisted()],
  };
}

export function findJournalHabit(list: Habit[]): Habit | undefined {
  return list.find((h) => h.id === JOURNAL_HABIT_ID || h.name === JOURNAL_HABIT_NAME);
}
