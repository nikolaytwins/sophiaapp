/** Сферы жизни внутри спринта (фиксированный набор). */
export type SprintSphere = 'relationships' | 'energy' | 'work';

export type SprintGoalKind = 'checkpoint' | 'progress';

/** Связь прогресс-цели с привычкой: при каждом «событии выполнения» привычки к current добавляется delta. */
export interface SprintGoalHabitLink {
  habitId: string;
  /** Обычно 1. */
  deltaPerCompletion: number;
}

/**
 * Цель спринта.
 * — checkpoint: «сделано» = только `completedAt` (не дублируем с progress).
 * — progress: `current` / `target`; выполнение считается на лету: current >= target.
 */
export interface SprintGoal {
  id: string;
  sphere: SprintSphere;
  title: string;
  kind: SprintGoalKind;
  /** Только kind === 'progress', >= 1 */
  target?: number;
  /** Только kind === 'progress', в диапазоне [0, target] */
  current?: number;
  /** Только kind === 'checkpoint' */
  completedAt?: string | null;
  habitLinks: SprintGoalHabitLink[];
  sortOrder: number;
}

export interface Sprint {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  startDate: string;
  durationDays: number;
  status: 'active' | 'completed';
  endedAt?: string;
  summaryNote?: string;
  goals: SprintGoal[];
  createdAt: string;
}

export const SPRINT_SPHERE_LABEL: Record<SprintSphere, string> = {
  relationships: 'Отношения',
  energy: 'Энергия и яркость жизни',
  work: 'Работа',
};
