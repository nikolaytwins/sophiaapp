import type { SupabaseClient } from '@supabase/supabase-js';

import { localDateKey } from '@/features/habits/habitLogic';
import { applyNikolayHabitsProfile } from '@/features/accounts/nikolayHabitsMigration';
import { ensureJournalHabitForAccount } from '@/features/journal/journalHabit';
import {
  applySprintAfterHabitCheckIn,
  applySprintAfterHabitUndoWeekly,
} from '@/features/sprint/sprintHabitBridge';
import {
  checkInSlice,
  counterAdjustSlice,
  createHabitSlice,
  ensureDefaultHabitsSlice,
  normalizeHabitsSlice,
  removeHabitSlice,
  setHarmfulDayChoiceSlice,
  setRequiredSlice,
  totalCompletionCount,
  undoWeeklySlice,
  updateHabitSlice,
  type HabitsPersistSlice,
} from '@/features/habits/habitsPersistReducer';
import { habitRowToView } from '@/stores/habits.store';

import { ensureHabitsStoreHydrated } from './habits-local.repository';
import type { CreateHabitInput, HabitsAnalyticsExport, HabitsRepository, UpdateHabitInput } from './types';

function normalizePayload(data: unknown): HabitsPersistSlice {
  if (!data || typeof data !== 'object') {
    return { habits: [], defaultsSeeded: false, heroHistory: {} };
  }
  const o = data as Record<string, unknown>;
  return {
    ...normalizeHabitsSlice({
      habits: Array.isArray(o.habits) ? (o.habits as HabitsPersistSlice['habits']) : [],
      defaultsSeeded: Boolean(o.defaultsSeeded),
      heroHistory:
        o.heroHistory && typeof o.heroHistory === 'object' && !Array.isArray(o.heroHistory)
          ? (o.heroHistory as HabitsPersistSlice['heroHistory'])
          : {},
      ...(typeof o.nikolayHabitsProfileVersion === 'number'
        ? { nikolayHabitsProfileVersion: o.nikolayHabitsProfileVersion }
        : {}),
    }),
  };
}

export function createSupabaseHabitsRepository(getClient: () => SupabaseClient): HabitsRepository {
  async function requireUser(): Promise<{ id: string; email: string | null }> {
    const supabase = getClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('Нет входа в облако. Открой экран «Облако» и войди по email.');
    }
    return { id: user.id, email: user.email ?? null };
  }

  async function getState(): Promise<HabitsPersistSlice> {
    const supabase = getClient();
    const user = await requireUser();
    const { data, error } = await supabase
      .from('habit_sync_state')
      .select('payload')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase: ${error.message}`);
    }
    return ensureJournalHabitForAccount(normalizePayload(data?.payload), user.email);
  }

  async function putState(slice: HabitsPersistSlice): Promise<void> {
    const supabase = getClient();
    const user = await requireUser();
    const nextSlice = ensureJournalHabitForAccount(slice, user.email);
    const { error } = await supabase.from('habit_sync_state').upsert(
      {
        user_id: user.id,
        payload: nextSlice,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) {
      throw new Error(`Supabase: ${error.message}`);
    }
  }

  async function maybeMigrateFromLocal(remote: HabitsPersistSlice): Promise<HabitsPersistSlice> {
    if (totalCompletionCount(remote) > 0) return remote;
    await ensureHabitsStoreHydrated();
    const { getHabitsPersistSlice } = await import('@/stores/habits.store');
    const local = getHabitsPersistSlice();
    if (totalCompletionCount(local) === 0) return remote;
    await putState(local);
    return getState();
  }

  async function ensureSpecialHabitsOnServer(slice: HabitsPersistSlice): Promise<HabitsPersistSlice> {
    const supabase = getClient();
    const { data: { user } } = await supabase.auth.getUser();
    const next = ensureJournalHabitForAccount(slice, user?.email ?? null);
    if (next.habits.length !== slice.habits.length) {
      await putState(next);
    }
    return next;
  }

  async function ensureSeedsOnServer(slice: HabitsPersistSlice): Promise<HabitsPersistSlice> {
    const next = ensureDefaultHabitsSlice(slice);
    if (next.habits.length !== slice.habits.length || next.defaultsSeeded !== slice.defaultsSeeded) {
      await putState(next);
    }
    return next;
  }

  async function loadNormalized(): Promise<HabitsPersistSlice> {
    const user = await requireUser();
    let remote = await getState();
    remote = await maybeMigrateFromLocal(remote);
    remote = await ensureSpecialHabitsOnServer(remote);
    remote = await ensureSeedsOnServer(remote);
    const nikolay = applyNikolayHabitsProfile(remote, user.email);
    if (
      nikolay.nikolayHabitsProfileVersion !== remote.nikolayHabitsProfileVersion ||
      JSON.stringify(nikolay.habits) !== JSON.stringify(remote.habits)
    ) {
      await putState(nikolay);
      remote = nikolay;
    }
    return remote;
  }

  /** Одна выборка + минимальные локальные правки — без лишних round-trip при каждом чек-ине. */
  async function loadSliceForMutation(): Promise<HabitsPersistSlice> {
    let slice = await getState();
    slice = await maybeMigrateFromLocal(slice);
    const user = await requireUser();
    slice = ensureDefaultHabitsSlice(slice);
    slice = applyNikolayHabitsProfile(slice, user.email);
    return slice;
  }

  function toList(slice: HabitsPersistSlice) {
    const today = localDateKey();
    return slice.habits.map((row) => habitRowToView(row, today));
  }

  return {
    async list() {
      const slice = await loadNormalized();
      return toList(slice);
    },

    async create(input: CreateHabitInput) {
      let slice = await loadNormalized();
      slice = createHabitSlice(slice, input);
      await putState(slice);
      return toList(slice);
    },

    async update(id: string, patch: UpdateHabitInput) {
      let slice = await loadNormalized();
      slice = updateHabitSlice(slice, id, patch);
      await putState(slice);
      return toList(slice);
    },

    async checkIn(id: string, dateKey?: string) {
      let slice = await loadSliceForMutation();
      const dk = dateKey ?? localDateKey();
      const prev = slice.habits.find((h) => h.id === id);
      slice = checkInSlice(slice, id, dateKey);
      const next = slice.habits.find((h) => h.id === id);
      if (prev && next) {
        applySprintAfterHabitCheckIn(id, prev, next, dk);
      }
      await putState(slice);
      return toList(slice);
    },

    async adjustCounter(id: string, dateKey: string, delta: 1 | -1) {
      let slice = await loadSliceForMutation();
      const prev = slice.habits.find((h) => h.id === id);
      slice = counterAdjustSlice(slice, id, dateKey, delta);
      const next = slice.habits.find((h) => h.id === id);
      if (prev && next) {
        applySprintAfterHabitCheckIn(id, prev, next, dateKey);
      }
      await putState(slice);
      return toList(slice);
    },

    async setHarmfulDayChoice(id: string, dateKey: string, choice) {
      let slice = await loadSliceForMutation();
      slice = setHarmfulDayChoiceSlice(slice, id, dateKey, choice);
      await putState(slice);
      return toList(slice);
    },

    async undoWeekly(id: string, dateKey?: string) {
      let slice = await loadSliceForMutation();
      const prev = slice.habits.find((h) => h.id === id);
      slice = undoWeeklySlice(slice, id, dateKey);
      const next = slice.habits.find((h) => h.id === id);
      if (prev && next) {
        applySprintAfterHabitUndoWeekly(id, prev, next);
      }
      await putState(slice);
      return toList(slice);
    },

    async remove(id: string) {
      let slice = await loadNormalized();
      slice = removeHabitSlice(slice, id);
      await putState(slice);
      return toList(slice);
    },

    async setRequired(id: string, required: boolean) {
      let slice = await loadNormalized();
      slice = setRequiredSlice(slice, id, required);
      await putState(slice);
      return toList(slice);
    },

    async exportAnalytics(): Promise<HabitsAnalyticsExport> {
      const slice = await loadNormalized();
      return {
        exportedAt: new Date().toISOString(),
        habits: slice.habits.map((h) => ({
          ...h,
          completionDates: [...h.completionDates],
          ...(h.countsByDate ? { countsByDate: { ...h.countsByDate } } : {}),
          ...(h.explicitCleanDates?.length ? { explicitCleanDates: [...h.explicitCleanDates] } : {}),
        })),
        heroHistory: { ...slice.heroHistory },
      };
    },
  };
}
