import Constants from 'expo-constants';

import type { Habit } from '@/entities/models';
import { localCalendarDateKey } from '@/utils/calendar-date';

import type { HabitsRepository } from './types';

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

type HabitsListJson = {
  habits?: Habit[];
  hint?: string;
  dateKey?: string;
};

export const remoteHabitsRepository: HabitsRepository = {
  async list(dateKey?: string) {
    const dk = dateKey ?? localCalendarDateKey();
    const res = await habitsFetch(`/api/sophia/habits?dateKey=${encodeURIComponent(dk)}`);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`habits list ${res.status}: ${t.slice(0, 200)}`);
    }
    const j = (await res.json()) as HabitsListJson;
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
      const j2 = (await boot.json()) as HabitsListJson;
      return j2.habits ?? [];
    }
    return j.habits ?? [];
  },

  async toggle(habitId: string, dateKey?: string) {
    const dk = dateKey ?? localCalendarDateKey();
    const res = await habitsFetch(`/api/sophia/habits/${encodeURIComponent(habitId)}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateKey: dk }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`habits toggle ${res.status}: ${t.slice(0, 200)}`);
    }
    const j = (await res.json()) as HabitsListJson;
    return j.habits ?? [];
  },
};

export function isRemoteHabitsConfigured(): boolean {
  return !!getExtra().sophiaHabitsApiBase?.trim();
}
