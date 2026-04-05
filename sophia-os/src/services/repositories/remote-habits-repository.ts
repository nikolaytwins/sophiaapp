import Constants from 'expo-constants';

import type { HabitsSnapshot } from '@/entities/models';
import { DEFAULT_SOPHIA_HABITS_MANIFEST } from '@/services/repositories/mock-data';
import { localCalendarDateKey } from '@/utils/calendar-date';

import type { HabitsRepository, HabitToggleOptions } from './types';

type HabitsExtra = {
  sophiaHabitsApiBase?: string;
  sophiaHabitsBearerToken?: string;
};

function getExtra(): HabitsExtra {
  return (Constants.expoConfig?.extra ?? {}) as HabitsExtra;
}

function apiRoot(): string {
  const base = getExtra().sophiaHabitsApiBase?.trim().replace(/\/$/, '') ?? '';
  if (!base) {
    throw new Error('extra.sophiaHabitsApiBase is empty (set EXPO_PUBLIC_SOPHIA_HABITS_API_BASE)');
  }
  return base;
}

async function habitsFetch(path: string, init?: RequestInit): Promise<Response> {
  const root = apiRoot();
  const token = getExtra().sophiaHabitsBearerToken?.trim();
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${root}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
}

type HabitsApiJson = Partial<HabitsSnapshot> & {
  hint?: string;
  ok?: boolean;
  seeded?: boolean;
};

function normalizeSnapshot(j: HabitsApiJson, dateKey: string): HabitsSnapshot {
  return {
    habits: j.habits ?? [],
    manifest: j.manifest ?? DEFAULT_SOPHIA_HABITS_MANIFEST,
    dailyReflection: j.dailyReflection ?? {
      prompt: DEFAULT_SOPHIA_HABITS_MANIFEST.journalPrompt,
      note: null,
    },
  };
}

export const remoteHabitsRepository: HabitsRepository = {
  async list(dateKey?: string) {
    const dk = dateKey ?? localCalendarDateKey();
    const res = await habitsFetch(`/api/sophia/habits?dateKey=${encodeURIComponent(dk)}`);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`habits list ${res.status}: ${t.slice(0, 200)}`);
    }
    const j = (await res.json()) as HabitsApiJson;
    if ((j.habits?.length ?? 0) === 0 && j.hint) {
      const boot = await habitsFetch(`/api/sophia/habits?dateKey=${encodeURIComponent(dk)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bootstrap: true }),
      });
      if (!boot.ok) {
        const t = await boot.text();
        throw new Error(`habits bootstrap ${boot.status}: ${t.slice(0, 200)}`);
      }
      const j2 = (await boot.json()) as HabitsApiJson;
      return normalizeSnapshot(j2, dk);
    }
    return normalizeSnapshot(j, dk);
  },

  async toggle(habitId: string, dateKey?: string, opts?: HabitToggleOptions) {
    const dk = dateKey ?? localCalendarDateKey();
    const body: Record<string, unknown> = { dateKey: dk };
    if (opts?.bump !== undefined) body.bump = opts.bump;
    if (opts?.setCount !== undefined) body.setCount = opts.setCount;
    const res = await habitsFetch(`/api/sophia/habits/${encodeURIComponent(habitId)}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`habits toggle ${res.status}: ${t.slice(0, 200)}`);
    }
    const j = (await res.json()) as HabitsApiJson;
    return normalizeSnapshot(j, dk);
  },

  async saveReflection(note: string, dateKey?: string) {
    const dk = dateKey ?? localCalendarDateKey();
    const res = await habitsFetch(`/api/sophia/habits/reflection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey: dk, note }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`habits reflection ${res.status}: ${t.slice(0, 200)}`);
    }
    const j = (await res.json()) as HabitsApiJson;
    return normalizeSnapshot(j, dk);
  },
};

export function isRemoteHabitsConfigured(): boolean {
  return !!getExtra().sophiaHabitsApiBase?.trim();
}
