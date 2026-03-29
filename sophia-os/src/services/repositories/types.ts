import type {
  CalendarEvent,
  ChatMessage,
  DailyScore,
  EsotericPreview,
  FinanceSummary,
  Goal,
  Habit,
  HealthSnapshot,
  QuickPrompt,
  Task,
  UserProfile,
} from '@/entities/models';

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

export interface HabitsRepository {
  /** Календарный день пользователя YYYY-MM-DD (локальная дата устройства). */
  list(dateKey?: string): Promise<Habit[]>;
  toggle(habitId: string, dateKey?: string): Promise<Habit[]>;
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
