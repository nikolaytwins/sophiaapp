import type {
  CalendarEvent,
  ChatMessage,
  DailyScore,
  EsotericPreview,
  FinanceSummary,
  Goal,
  Habit,
  HabitCadence,
  HabitPersisted,
  HealthSnapshot,
  QuickPrompt,
  Task,
  UserProfile,
} from '@/entities/models';

/** Полный срез для аналитики и выгрузки в GPT. */
export type HabitsAnalyticsExport = {
  exportedAt: string;
  habits: HabitPersisted[];
  heroHistory: Record<string, { done: number; total: number }>;
};

export interface TaskRepository {
  listForDate(date: string): Promise<Task[]>;
  complete(id: string): Promise<Task[]>;
  uncomplete(id: string): Promise<Task[]>;
}

export interface EventRepository {
  listForRange(startISO: string, endISO: string): Promise<CalendarEvent[]>;
  create(input: Omit<CalendarEvent, 'id' | 'source'>): Promise<CalendarEvent>;
}

export interface DailyScoreRepository {
  getForDate(date: string): Promise<DailyScore>;
}

export interface GoalsRepository {
  listActive(): Promise<Goal[]>;
}

export type CreateHabitInput = {
  name: string;
  icon: string;
  cadence: HabitCadence;
  weeklyTarget?: number;
  /** Только `media` — блок «Медийка и работа». */
  section?: 'media';
};

export interface HabitsRepository {
  list(): Promise<Habit[]>;
  create(input: CreateHabitInput): Promise<Habit[]>;
  /** Если dateKey не указан — используется сегодня (localDateKey). */
  checkIn(id: string, dateKey?: string): Promise<Habit[]>;
  /** Удаляет последнюю отметку за dateKey (по умолчанию — сегодня). */
  undoWeekly(id: string, dateKey?: string): Promise<Habit[]>;
  remove(id: string): Promise<Habit[]>;
  /** Все отметки + hero для выгрузки / GPT. */
  exportAnalytics(): Promise<HabitsAnalyticsExport>;
}

export interface HealthRepository {
  getSnapshot(date: string): Promise<HealthSnapshot>;
}

export interface FinanceRepository {
  getSummary(): Promise<FinanceSummary>;
}

export interface EsotericRepository {
  getHub(): Promise<EsotericPreview[]>;
}

export interface UserRepository {
  getProfile(): Promise<UserProfile>;
}

export interface ChatRepository {
  listMessages(): Promise<ChatMessage[]>;
  appendUserMessage(text: string): Promise<ChatMessage[]>;
}

export interface QuickPromptsRepository {
  list(): Promise<QuickPrompt[]>;
}
