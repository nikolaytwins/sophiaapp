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
  /** local — из моков; device — expo-calendar; ics — подписка .ics; apple/web — legacy */
  source: 'local' | 'apple' | 'web' | 'device' | 'ics';
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

export interface Habit {
  id: string;
  name: string;
  streak: number;
  icon: string;
  todayDone: boolean;
  cadence?: HabitCadence;
  weeklyTarget?: number;
  weeklyCompleted?: number;
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
