/**
 * Swap mock* implementations for remote adapters (REST, Supabase, your web service).
 */
export * from './types';
export * from './mocks';

import type {
  ChatRepository,
  DailyScoreRepository,
  EsotericRepository,
  EventRepository,
  FinanceRepository,
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
  mockEsotericRepository,
  mockEventRepository,
  mockFinanceRepository,
  mockGoalsRepository,
  mockHealthRepository,
  mockQuickPromptsRepository,
  mockTaskRepository,
  mockUserRepository,
} from './mocks';
import {
  sophiaHabitsApiBaseUrl,
  sophiaHabitsSyncKey,
  useRemoteHabitsSync,
  useSupabaseConfigured,
} from '@/config/env';
import { delegatingHabitsRepository } from './habits-delegating.repository';
import { localHabitsRepository } from './habits-local.repository';
import { createRemoteHabitsRepository } from './habits-remote.repository';

const habitsRepository: HabitsRepository = useSupabaseConfigured
  ? delegatingHabitsRepository
  : useRemoteHabitsSync
    ? createRemoteHabitsRepository(sophiaHabitsApiBaseUrl, sophiaHabitsSyncKey)
    : localHabitsRepository;

export const repos = {
  tasks: mockTaskRepository as TaskRepository,
  events: mockEventRepository as EventRepository,
  dailyScore: mockDailyScoreRepository as DailyScoreRepository,
  goals: mockGoalsRepository as GoalsRepository,
  habits: habitsRepository,
  health: mockHealthRepository as HealthRepository,
  finance: mockFinanceRepository as FinanceRepository,
  esoteric: mockEsotericRepository as EsotericRepository,
  user: mockUserRepository as UserRepository,
  chat: mockChatRepository as ChatRepository,
  prompts: mockQuickPromptsRepository as QuickPromptsRepository,
};
