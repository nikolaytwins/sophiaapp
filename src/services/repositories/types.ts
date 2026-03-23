import type {
  CalendarEvent,
  ChatMessage,
  DailyScore,
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
  list(): Promise<Habit[]>;
}

export interface HealthRepository {
  getSnapshot(date: string): Promise<HealthSnapshot>;
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
