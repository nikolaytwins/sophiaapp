import { localDateKey } from '@/features/habits/habitLogic';
import {
  checkInSlice,
  createHabitSlice,
  ensureDefaultHabitsSlice,
  removeHabitSlice,
  totalCompletionCount,
  undoWeeklySlice,
  type HabitsPersistSlice,
} from '@/features/habits/habitsPersistReducer';
import { habitRowToView } from '@/stores/habits.store';

import { ensureHabitsStoreHydrated } from './habits-local.repository';
import type { CreateHabitInput, HabitsAnalyticsExport, HabitsRepository } from './types';

function headers(syncKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${syncKey}`,
    'Content-Type': 'application/json',
  };
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t.slice(0, 400);
  } catch {
    return '';
  }
}

export function createRemoteHabitsRepository(baseUrl: string, syncKey: string): HabitsRepository {
  if (!baseUrl.trim() || !syncKey.trim()) {
    throw new Error('Sophia habits: задайте EXPO_PUBLIC_SOPHIA_HABITS_URL и EXPO_PUBLIC_SOPHIA_HABITS_SYNC_KEY');
  }
  const base = baseUrl.replace(/\/$/, '');

  async function getState(): Promise<HabitsPersistSlice> {
    const res = await fetch(`${base}/v1/state`, { headers: { Authorization: `Bearer ${syncKey}` } });
    if (!res.ok) {
      throw new Error(`Sophia habits GET /v1/state ${res.status}: ${await readErrorBody(res)}`);
    }
    const data = (await res.json()) as Partial<HabitsPersistSlice>;
    return {
      habits: Array.isArray(data.habits) ? data.habits : [],
      defaultsSeeded: Boolean(data.defaultsSeeded),
      heroHistory:
        data.heroHistory && typeof data.heroHistory === 'object' && !Array.isArray(data.heroHistory)
          ? (data.heroHistory as HabitsPersistSlice['heroHistory'])
          : {},
    };
  }

  async function putState(slice: HabitsPersistSlice): Promise<void> {
    const res = await fetch(`${base}/v1/state`, {
      method: 'PUT',
      headers: headers(syncKey),
      body: JSON.stringify(slice),
    });
    if (!res.ok) {
      throw new Error(`Sophia habits PUT /v1/state ${res.status}: ${await readErrorBody(res)}`);
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

  /** Пустой сервер + первый заход — сиды как в локальном режиме. */
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
