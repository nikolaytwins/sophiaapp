import type { Sprint, SprintGoal, SprintGoalKind } from '@/features/sprint/sprint.types';

/** Прогресс-цель выполнена — только по числам, без отдельного isDone. */
export function isProgressGoalDone(g: SprintGoal): boolean {
  if (g.kind !== 'progress' || g.target == null || g.current == null) return false;
  return g.current >= g.target;
}

export function isCheckpointGoalDone(g: SprintGoal): boolean {
  return g.kind === 'checkpoint' && Boolean(g.completedAt);
}

export function goalDone(g: SprintGoal): boolean {
  return g.kind === 'progress' ? isProgressGoalDone(g) : isCheckpointGoalDone(g);
}

/** Доля выполнения одной цели: прогресс — current/target (не больше 1), галочка — 0 или 1. */
export function sprintGoalCompletionRatio(g: SprintGoal): number {
  if (g.kind === 'progress' && g.target != null && g.target > 0 && g.current != null) {
    return Math.min(1, Math.max(0, g.current / g.target));
  }
  if (g.kind === 'checkpoint') {
    return g.completedAt ? 1 : 0;
  }
  return 0;
}

/**
 * Сводный % по спринту: среднее арифметическое долей по всем целям.
 * Так сопоставимы разные шкалы (тренировки, сессии, рубли): каждая цель вносит одинаковый вес.
 */
export function sprintAggregateStats(goals: SprintGoal[]): {
  doneCount: number;
  totalCount: number;
  /** 0–100, одна десятичная */
  aggregatePercent: number;
} {
  const totalCount = goals.length;
  if (totalCount === 0) {
    return { doneCount: 0, totalCount: 0, aggregatePercent: 0 };
  }
  let ratioSum = 0;
  let doneCount = 0;
  for (const g of goals) {
    ratioSum += sprintGoalCompletionRatio(g);
    if (goalDone(g)) doneCount++;
  }
  const aggregatePercent = Math.round((ratioSum / totalCount) * 1000) / 10;
  return { doneCount, totalCount, aggregatePercent };
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(dateKey: string): boolean {
  if (!DATE_KEY_RE.test(dateKey)) return false;
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Дней включительно от start до end (обе даты YYYY-MM-DD). Минимум 1. */
export function inclusiveDaysBetween(startKey: string, endKey: string): number {
  const [y1, m1, d1] = startKey.split('-').map(Number);
  const [y2, m2, d2] = endKey.split('-').map(Number);
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  const diff = Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

/** После применения дельты: не переливаем за target и не уходим ниже 0. */
export function clampProgressCurrent(current: number, target: number, rawDelta: number): number {
  const next = current + rawDelta;
  return Math.min(Math.max(next, 0), target);
}

export function newGoalId(): string {
  return `sg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newSprintId(): string {
  return `sp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function sprintEndDateKey(s: Sprint): string {
  const [y, m, d] = s.startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  start.setDate(start.getDate() + Math.max(0, s.durationDays - 1));
  const yy = start.getFullYear();
  const mm = String(start.getMonth() + 1).padStart(2, '0');
  const dd = String(start.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function activeSprintOrNull(sprints: Sprint[]): Sprint | null {
  const actives = sprints.filter((s) => s.status === 'active');
  if (actives.length === 0) return null;
  if (actives.length === 1) return actives[0];
  /** На случай порчи данных — оставляем один «новее по createdAt». */
  return actives.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

/** Гарантирует максимум один active в списке (остальные completed). */
export function normalizeSingleActiveSprint(sprints: Sprint[]): Sprint[] {
  const actives = sprints.filter((s) => s.status === 'active');
  if (actives.length <= 1) return sprints;
  const keep = actives.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]!;
  const ended = new Date().toISOString();
  return sprints.map((s) => {
    if (s.status !== 'active') return s;
    if (s.id === keep.id) return s;
    return {
      ...s,
      status: 'completed' as const,
      endedAt: s.endedAt ?? ended,
    };
  });
}

/** День спринта от 1 до duration; 0 если сегодня раньше старта. */
export function sprintElapsedDayIndex(startDate: string, todayKey: string, durationDays: number): number {
  const [y, m, d] = startDate.split('-').map(Number);
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date(ty, tm - 1, td);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
  if (diffDays < 1) return 0;
  return Math.min(diffDays, Math.max(1, durationDays));
}

export function validateKindFields(kind: SprintGoalKind, input: {
  target?: number;
  current?: number;
  completedAt?: string | null;
}): string | null {
  if (kind === 'checkpoint') {
    return null;
  }
  const t = input.target;
  if (t == null || !Number.isFinite(t) || t < 1) {
    return 'Укажите целевое число (от 1).';
  }
  const c = input.current ?? 0;
  if (!Number.isFinite(c) || c < 0) {
    return 'Текущее значение не может быть отрицательным.';
  }
  if (c > t) {
    return 'Текущее значение не может превышать цель.';
  }
  return null;
}
