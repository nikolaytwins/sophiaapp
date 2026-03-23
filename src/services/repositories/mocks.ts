import type { CalendarEvent } from '@/entities/models';
import { calendarIntegration } from '@/services/integrations/calendar';
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
  getChatMessages,
  getTasksState,
  mockDailyScore,
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

function mockEventsInRange(startISO: string, endISO: string): CalendarEvent[] {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  return mockEvents.filter((e) => {
    const t = new Date(e.start).getTime();
    return t >= start && t <= end;
  });
}

/** Включить демо-события из mock-data: EXPO_PUBLIC_INCLUDE_MOCK_EVENTS=true */
const includeMockEvents = process.env.EXPO_PUBLIC_INCLUDE_MOCK_EVENTS === 'true';

export const mockEventRepository: EventRepository = {
  async listForRange(startISO: string, endISO: string) {
    const fromDevice = await calendarIntegration.listExternal({ startISO, endISO });
    const fromMocks = includeMockEvents ? mockEventsInRange(startISO, endISO) : [];
    const merged = [...fromDevice, ...fromMocks].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    return delay(merged);
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
