/**
 * Swap mock* implementations for remote adapters (REST, Supabase, your web service).
 */
export * from './types';
export * from './mocks';

import type {
  ChatRepository,
  DailyScoreRepository,
  EventRepository,
  GoalsRepository,
  HabitsRepository,
  HealthRepository,
  QuickPromptsRepository,
  TaskRepository,
  UserRepository,
} from './types';
import {
  mockChatRepository,
  mockDailyScoreRepository,
  mockEventRepository,
  mockGoalsRepository,
  mockHabitsRepository,
  mockHealthRepository,
  mockQuickPromptsRepository,
  mockTaskRepository,
  mockUserRepository,
} from './mocks';

export const repos = {
  tasks: mockTaskRepository as TaskRepository,
  events: mockEventRepository as EventRepository,
  dailyScore: mockDailyScoreRepository as DailyScoreRepository,
  goals: mockGoalsRepository as GoalsRepository,
  habits: mockHabitsRepository as HabitsRepository,
  health: mockHealthRepository as HealthRepository,
  user: mockUserRepository as UserRepository,
  chat: mockChatRepository as ChatRepository,
  prompts: mockQuickPromptsRepository as QuickPromptsRepository,
};
