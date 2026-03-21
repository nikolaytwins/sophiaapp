import type { CalendarEvent } from '@/entities/models';
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
  getChatMessages,
  getTasksState,
  mockDailyScore,
  mockEsoteric,
  mockFinance,
  mockGoals,
  mockHabits,
  mockHealth,
  mockEvents,
  mockPrompts,
  mockUser,
  pushUserChatMessage,
  setTasksState,
} from './mock-data';

function delay<T>(value: T, ms = 40): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const mockTaskRepository: TaskRepository = {
  async listForDate(date: string) {
    const list = getTasksState().filter((t) => !t.dueDate || t.dueDate === date);
    return delay(list);
  },
  async complete(id: string) {
    const next = getTasksState().map((t) =>
      t.id === id
        ? {
            ...t,
            status: 'done' as const,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : t
    );
    setTasksState(next);
    return delay(next);
  },
  async uncomplete(id: string) {
    const next = getTasksState().map((t) =>
      t.id === id
        ? { ...t, status: 'todo' as const, completedAt: undefined, updatedAt: new Date().toISOString() }
        : t
    );
    setTasksState(next);
    return delay(next);
  },
};

export const mockEventRepository: EventRepository = {
  async listForRange(startISO: string, endISO: string) {
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();
    const filtered = mockEvents.filter((e) => {
      const t = new Date(e.start).getTime();
      return t >= start && t <= end;
    });
    return delay(filtered);
  },
  async create(input: Omit<CalendarEvent, 'id' | 'source'>) {
    const ev: CalendarEvent = {
      ...input,
      id: `e_${Date.now()}`,
      source: 'local',
    };
    mockEvents.push(ev);
    return delay(ev);
  },
};

export const mockDailyScoreRepository: DailyScoreRepository = {
  async getForDate(date: string) {
    return delay({ ...mockDailyScore, date });
  },
};

export const mockGoalsRepository: GoalsRepository = {
  async listActive() {
    return delay([...mockGoals]);
  },
};

export const mockHabitsRepository: HabitsRepository = {
  async list() {
    return delay([...mockHabits]);
  },
};

export const mockHealthRepository: HealthRepository = {
  async getSnapshot(date: string) {
    return delay({ ...mockHealth, date });
  },
};

export const mockFinanceRepository: FinanceRepository = {
  async getSummary() {
    return delay({ ...mockFinance });
  },
};

export const mockEsotericRepository: EsotericRepository = {
  async getHub() {
    return delay([...mockEsoteric]);
  },
};

export const mockUserRepository: UserRepository = {
  async getProfile() {
    return delay({ ...mockUser });
  },
};

export const mockChatRepository: ChatRepository = {
  async listMessages() {
    return delay([...getChatMessages()]);
  },
  async appendUserMessage(text: string) {
    return delay(pushUserChatMessage(text));
  },
};

export const mockQuickPromptsRepository: QuickPromptsRepository = {
  async list() {
    return delay([...mockPrompts]);
  },
};
