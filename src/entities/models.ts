export type TaskDomain = 'work' | 'personal';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'done' | 'snoozed';

export interface Task {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  domain: TaskDomain;
  dueDate?: string;
  dueTime?: string;
  recurrence?: 'daily' | 'weekly' | 'none';
  completedAt?: string;
  updatedAt: string;
}

export type EventCategory = 'work' | 'life';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  category: EventCategory;
  note?: string;
  location?: string;
  source: 'local' | 'apple' | 'web';
}

export interface DailyScoreFactor {
  label: string;
  impact: number;
}

export interface DailyScore {
  date: string;
  score100: number;
  summary: string;
  factors: DailyScoreFactor[];
  progress01: number;
}

export interface Goal {
  id: string;
  title: string;
  horizonDays: number;
  progress01: number;
  domain: TaskDomain;
  updatedAt: string;
}

export type HabitCadence = 'daily' | 'weekly';

/** Только `media` выносит привычку в блок «Медийка и работа»; иначе — основной ритм. */
export type HabitListSection = 'media';

/** Persisted shape — completions are local YYYY-MM-DD; weekly allows duplicate days. */
export interface HabitPersisted {
  id: string;
  name: string;
  icon: string;
  cadence: HabitCadence;
  /** 1–7 when cadence === 'weekly' */
  weeklyTarget?: number;
  /** Опционально: отдельная секция на экране привычек. */
  section?: HabitListSection;
  /**
   * Учитывать в «ритме дня» и в месячном счёте (ежедневные).
   * `false` — не входит в X/Y и в max за месяц; по умолчанию (undefined) = да.
   */
  required?: boolean;
  createdAt: string;
  completionDates: string[];
}

/** Enriched for UI — computed from HabitPersisted + today. */
export interface Habit {
  id: string;
  name: string;
  streak: number;
  icon: string;
  section?: HabitListSection;
  /** Daily: completed today. Weekly: at least one check-in today. */
  todayDone: boolean;
  cadence: HabitCadence;
  weeklyTarget?: number;
  /** Current ISO week (Mon–Sun), weekly habits only */
  weeklyCompleted?: number;
  /** Weekly: weekly target reached (for progress / “done for the week”). */
  weekQuotaMet?: boolean;
  /** Weekly: сколько отметок сегодня (для undo). */
  todaySessionCount?: number;
  createdAt: string;
  /** YYYY-MM-DD — для сетки месяца / истории недель (из persisted). */
  completionDates?: string[];
  /** Входит в счётчик «ритма» (X/Y) и в месячный max для ежедневных. */
  required: boolean;
}

export interface HealthSnapshot {
  date: string;
  steps: number;
  stepsGoal: number;
  proteinG: number;
  proteinGoal: number;
  calories: number;
  waterMl?: number;
}

export interface FinanceCategorySlice {
  id: string;
  label: string;
  amount: number;
  pct: number;
}

export interface FinanceSummary {
  balance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  savingsGoal: number;
  savingsProgress01: number;
  categories: FinanceCategorySlice[];
}

export interface EsotericPreview {
  id: string;
  title: string;
  subtitle: string;
  accent: 'astro' | 'tarot' | 'moon' | 'self';
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  scenarioId?: string;
}

export interface QuickPrompt {
  id: string;
  title: string;
  subtitle: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarEmoji: string;
  timezone: string;
}
