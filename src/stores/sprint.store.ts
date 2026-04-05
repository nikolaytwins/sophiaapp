import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from '@/lib/zustandPersist';

import {
  activeSprintOrNull,
  clampProgressCurrent,
  inclusiveDaysBetween,
  isValidDateKey,
  newGoalId,
  newSprintId,
  normalizeSingleActiveSprint,
  validateKindFields,
} from '@/features/sprint/sprint.logic';
import type {
  Sprint,
  SprintGoal,
  SprintGoalHabitLink,
  SprintGoalKind,
  SprintSphere,
} from '@/features/sprint/sprint.types';
import { localDateKey } from '@/features/habits/habitLogic';

const STORAGE_KEY = 'sophia-os-sprint-v1';

export type CreateSprintInput = {
  title?: string;
  durationDays: number;
  /** По умолчанию сегодня */
  startDate?: string;
};

export type AddGoalInput = {
  sphere: SprintSphere;
  title: string;
  kind: SprintGoalKind;
  target?: number;
  current?: number;
  habitLinks?: SprintGoalHabitLink[];
};

function mapGoals(goals: SprintGoal[], goalId: string, fn: (g: SprintGoal) => SprintGoal): SprintGoal[] {
  return goals.map((g) => (g.id === goalId ? fn(g) : g));
}

type SprintState = {
  sprints: Sprint[];
  /** Создать спринт; при уже активном — ошибка (инвариант: один active). */
  createSprint: (input: CreateSprintInput) => { ok: true; id: string } | { ok: false; error: string };
  /** Только активный спринт; дата в формате YYYY-MM-DD. */
  updateSprintStartDate: (sprintId: string, startDate: string) => { ok: true } | { ok: false; error: string };
  /** Старт и конец (включительно); пересчитывает durationDays. Только active. */
  updateSprintSchedule: (
    sprintId: string,
    input: { startDate: string; endDate: string }
  ) => { ok: true } | { ok: false; error: string };
  completeSprint: (sprintId: string, summaryNote?: string) => void;
  addGoal: (sprintId: string, input: AddGoalInput) => { ok: true; goalId: string } | { ok: false; error: string };
  removeGoal: (sprintId: string, goalId: string) => void;
  setGoalHabitLinks: (sprintId: string, goalId: string, links: SprintGoalHabitLink[]) => void;
  setProgressGoalNumbers: (
    sprintId: string,
    goalId: string,
    input: { target: number; current: number }
  ) => { ok: true } | { ok: false; error: string };
  /** Ручная корректировка прогресса (+1 / −1 и т.д.), с клампом [0, target]. */
  adjustGoalCurrent: (sprintId: string, goalId: string, delta: number) => void;
  /** Чекпоинт: переключить «сделано» по completedAt. */
  toggleCheckpoint: (sprintId: string, goalId: string) => void;
  /** События привычки (signed: +N completions или −N при undo). */
  applyHabitContribution: (habitId: string, signedCompletionEvents: number) => void;
  getActiveSprint: () => Sprint | null;
  getSprintById: (id: string) => Sprint | undefined;
};

export const useSprintStore = create<SprintState>()(
  persist(
    (set, get) => ({
      sprints: [],

      getActiveSprint: () => activeSprintOrNull(get().sprints),

      getSprintById: (id) => get().sprints.find((s) => s.id === id),

      createSprint: (input) => {
        const sprints = normalizeSingleActiveSprint(get().sprints);
        if (activeSprintOrNull(sprints)) {
          return { ok: false, error: 'Уже есть активный спринт. Завершите его, чтобы начать новый.' };
        }
        const durationDays = Math.max(1, Math.round(input.durationDays));
        const startDate = input.startDate ?? localDateKey();
        const id = newSprintId();
        const row: Sprint = {
          id,
          title: (input.title ?? '').trim() || 'Спринт',
          startDate,
          durationDays,
          status: 'active',
          goals: [],
          createdAt: new Date().toISOString(),
        };
        set({ sprints: [row, ...sprints] });
        return { ok: true, id };
      },

      updateSprintStartDate: (sprintId, startDate) => {
        const trimmed = startDate.trim();
        if (!isValidDateKey(trimmed)) {
          return { ok: false, error: 'Укажите дату в формате ГГГГ-ММ-ДД (например 2026-03-30).' };
        }
        const sprint = get().sprints.find((s) => s.id === sprintId);
        if (!sprint) return { ok: false, error: 'Спринт не найден.' };
        if (sprint.status !== 'active') {
          return { ok: false, error: 'Дату старта можно менять только у активного спринта.' };
        }
        set((state) => ({
          sprints: state.sprints.map((s) => (s.id === sprintId ? { ...s, startDate: trimmed } : s)),
        }));
        return { ok: true };
      },

      updateSprintSchedule: (sprintId, input) => {
        const start = input.startDate.trim();
        const end = input.endDate.trim();
        if (!isValidDateKey(start)) {
          return { ok: false, error: 'Дата старта: формат ГГГГ-ММ-ДД.' };
        }
        if (!isValidDateKey(end)) {
          return { ok: false, error: 'Дата конца: формат ГГГГ-ММ-ДД.' };
        }
        if (end < start) {
          return { ok: false, error: 'Дата конца не может быть раньше даты старта.' };
        }
        const durationDays = inclusiveDaysBetween(start, end);
        const sprint = get().sprints.find((s) => s.id === sprintId);
        if (!sprint) return { ok: false, error: 'Спринт не найден.' };
        if (sprint.status !== 'active') {
          return { ok: false, error: 'Расписание можно менять только у активного спринта.' };
        }
        set((state) => ({
          sprints: state.sprints.map((s) =>
            s.id === sprintId ? { ...s, startDate: start, durationDays } : s
          ),
        }));
        return { ok: true };
      },

      completeSprint: (sprintId, summaryNote) => {
        const endedAt = new Date().toISOString();
        set((state) => ({
          sprints: state.sprints.map((s) =>
            s.id === sprintId
              ? {
                  ...s,
                  status: 'completed' as const,
                  endedAt,
                  ...(summaryNote != null && summaryNote.trim() ? { summaryNote: summaryNote.trim() } : {}),
                }
              : s
          ),
        }));
      },

      addGoal: (sprintId, input) => {
        const sprint = get().sprints.find((s) => s.id === sprintId);
        if (!sprint) return { ok: false, error: 'Спринт не найден.' };
        if (sprint.status !== 'active') return { ok: false, error: 'Нельзя добавлять цели в завершённый спринт.' };

        const title = input.title.trim();
        if (!title) return { ok: false, error: 'Введите название цели.' };

        if (input.kind === 'progress') {
          const t = input.target ?? 1;
          const c = input.current ?? 0;
          const err = validateKindFields('progress', { target: t, current: c });
          if (err) return { ok: false, error: err };
        }

        const sortOrder =
          sprint.goals.length === 0 ? 0 : Math.max(...sprint.goals.map((g) => g.sortOrder)) + 1;

        const habitLinks = (input.habitLinks ?? []).map((l) => ({
          habitId: l.habitId,
          deltaPerCompletion: Math.max(0.001, l.deltaPerCompletion),
        }));

        const base = {
          id: newGoalId(),
          sphere: input.sphere,
          title,
          sortOrder,
          habitLinks,
        };

        const t = Math.max(1, Math.round(input.target ?? 1));
        const cRaw = Math.max(0, Math.round(input.current ?? 0));
        const c = Math.min(cRaw, t);

        const goal: SprintGoal =
          input.kind === 'checkpoint'
            ? { ...base, kind: 'checkpoint', completedAt: null }
            : {
                ...base,
                kind: 'progress',
                target: t,
                current: c,
              };

        set((state) => ({
          sprints: state.sprints.map((s) =>
            s.id === sprintId ? { ...s, goals: [...s.goals, goal] } : s
          ),
        }));
        return { ok: true, goalId: goal.id };
      },

      setGoalHabitLinks: (sprintId, goalId, links) => {
        set((state) => ({
          sprints: state.sprints.map((s) => {
            if (s.id !== sprintId || s.status !== 'active') return s;
            return {
              ...s,
              goals: s.goals.map((g) =>
                g.id === goalId
                  ? {
                      ...g,
                      habitLinks: links.map((l) => ({
                        habitId: l.habitId,
                        deltaPerCompletion: Math.max(0.001, l.deltaPerCompletion),
                      })),
                    }
                  : g
              ),
            };
          }),
        }));
      },

      setProgressGoalNumbers: (sprintId, goalId, input) => {
        const err = validateKindFields('progress', { target: input.target, current: input.current });
        if (err) return { ok: false, error: err };
        const t = Math.max(1, Math.round(input.target));
        const c = Math.min(Math.max(0, Math.round(input.current)), t);
        set((state) => ({
          sprints: state.sprints.map((s) => {
            if (s.id !== sprintId || s.status !== 'active') return s;
            return {
              ...s,
              goals: s.goals.map((g) =>
                g.id === goalId && g.kind === 'progress'
                  ? { ...g, target: t, current: c }
                  : g
              ),
            };
          }),
        }));
        return { ok: true };
      },

      removeGoal: (sprintId, goalId) => {
        set((state) => ({
          sprints: state.sprints.map((s) =>
            s.id === sprintId ? { ...s, goals: s.goals.filter((g) => g.id !== goalId) } : s
          ),
        }));
      },

      adjustGoalCurrent: (sprintId, goalId, delta) => {
        if (!Number.isFinite(delta) || delta === 0) return;
        set((state) => ({
          sprints: state.sprints.map((s) => {
            if (s.id !== sprintId || s.status !== 'active') return s;
            return {
              ...s,
              goals: mapGoals(s.goals, goalId, (g) => {
                if (g.kind !== 'progress' || g.target == null || g.current == null) return g;
                const nextCurrent = clampProgressCurrent(g.current, g.target, delta);
                return { ...g, current: nextCurrent };
              }),
            };
          }),
        }));
      },

      toggleCheckpoint: (sprintId, goalId) => {
        set((state) => ({
          sprints: state.sprints.map((s) => {
            if (s.id !== sprintId || s.status !== 'active') return s;
            return {
              ...s,
              goals: mapGoals(s.goals, goalId, (g) => {
                if (g.kind !== 'checkpoint') return g;
                const done = Boolean(g.completedAt);
                return { ...g, completedAt: done ? null : new Date().toISOString() };
              }),
            };
          }),
        }));
      },

      applyHabitContribution: (habitId, signedCompletionEvents) => {
        if (!Number.isFinite(signedCompletionEvents) || signedCompletionEvents === 0) return;
        const active = activeSprintOrNull(get().sprints);
        if (!active || active.status !== 'active') return;

        set((state) => ({
          sprints: state.sprints.map((s) => {
            if (s.id !== active.id) return s;
            return {
              ...s,
              goals: s.goals.map((g) => {
                if (g.kind !== 'progress' || g.target == null || g.current == null) return g;
                let raw = 0;
                for (const link of g.habitLinks) {
                  if (link.habitId !== habitId) continue;
                  raw += signedCompletionEvents * link.deltaPerCompletion;
                }
                if (raw === 0) return g;
                const nextCurrent = clampProgressCurrent(g.current, g.target, raw);
                return { ...g, current: nextCurrent };
              }),
            };
          }),
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ sprints: normalizeSingleActiveSprint(s.sprints) }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.sprints = normalizeSingleActiveSprint(state.sprints);
        }
      },
    }
  )
);

export function ensureSprintStoreHydrated(): Promise<void> {
  if (useSprintStore.persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsub = useSprintStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
