import type { SupabaseClient } from '@supabase/supabase-js';

import { localDateKey } from '@/features/habits/habitLogic';
import {
  checkInSlice,
  createHabitSlice,
  ensureDefaultHabitsSlice,
  removeHabitSlice,
  setRequiredSlice,
  totalCompletionCount,
  undoWeeklySlice,
  type HabitsPersistSlice,
} from '@/features/habits/habitsPersistReducer';
import { habitRowToView } from '@/stores/habits.store';

import { ensureHabitsStoreHydrated } from './habits-local.repository';
import type { CreateHabitInput, HabitsAnalyticsExport, HabitsRepository } from './types';

function normalizePayload(data: unknown): HabitsPersistSlice {
  if (!data || typeof data !== 'object') {
    return { habits: [], defaultsSeeded: false, heroHistory: {} };
  }
  const o = data as Record<string, unknown>;
  return {
    habits: Array.isArray(o.habits) ? (o.habits as HabitsPersistSlice['habits']) : [],
    defaultsSeeded: Boolean(o.defaultsSeeded),
    heroHistory:
      o.heroHistory && typeof o.heroHistory === 'object' && !Array.isArray(o.heroHistory)
        ? (o.heroHistory as HabitsPersistSlice['heroHistory'])
        : {},
  };
}

export function createSupabaseHabitsRepository(getClient: () => SupabaseClient): HabitsRepository {
  async function requireUserId(): Promise<string> {
    const supabase = getClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('Нет входа в облако. Открой экран «Облако» и войди по email.');
    }
    return user.id;
  }

  async function getState(): Promise<HabitsPersistSlice> {
    const supabase = getClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('habit_sync_state')
      .select('payload')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase: ${error.message}`);
    }
    return normalizePayload(data?.payload);
  }

  async function putState(slice: HabitsPersistSlice): Promise<void> {
    const supabase = getClient();
    const userId = await requireUserId();
    const { error } = await supabase.from('habit_sync_state').upsert(
      {
        user_id: userId,
        payload: slice,
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

  async function ensureSeedsOnServer(slice: HabitsPersistSlice): Promise<HabitsPersistSlice> {
    const next = ensureDefaultHabitsSlice(slice);
    if (next.habits.length !== slice.habits.length || next.defaultsSeeded !== slice.defaultsSeeded) {
      await putState(next);
    }
    return next;
  }

  async function loadNormalized(): Promise<HabitsPersistSlice> {
    let remote = await getState();
    remote = await maybeMigrateFromLocal(remote);
    remote = await ensureSeedsOnServer(remote);
    return remote;
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

    async checkIn(id: string, dateKey?: string) {
      let slice = await loadNormalized();
      slice = checkInSlice(slice, id, dateKey);
      await putState(slice);
      return toList(slice);
    },

    async undoWeekly(id: string, dateKey?: string) {
      let slice = await loadNormalized();
      slice = undoWeeklySlice(slice, id, dateKey);
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
        habits: slice.habits.map((h) => ({ ...h, completionDates: [...h.completionDates] })),
        heroHistory: { ...slice.heroHistory },
      };
    },
  };
}
