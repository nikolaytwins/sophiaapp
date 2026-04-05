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
  DEFAULT_SOPHIA_HABITS_MANIFEST,
  getChatMessages,
  getHabitsState,
  getMockReflectionNote,
  getTasksState,
  mockDailyScore,
  mockEsoteric,
  mockFinance,
  mockGoals,
  mockHealth,
  mockEvents,
  mockPrompts,
  mockUser,
  pushUserChatMessage,
  setHabitsState,
  setMockReflectionNote,
  setTasksState,
} from './mock-data';
import type { HabitToggleOptions } from './types';

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

function mockSnapshot(dateKey: string) {
  return {
    habits: [...getHabitsState()],
    manifest: DEFAULT_SOPHIA_HABITS_MANIFEST,
    dailyReflection: {
      prompt: DEFAULT_SOPHIA_HABITS_MANIFEST.journalPrompt,
      note: getMockReflectionNote(dateKey),
    },
  };
}

export const mockHabitsRepository: HabitsRepository = {
  async list(dateKey?: string) {
    const dk = dateKey ?? new Date().toISOString().slice(0, 10);
    return delay(mockSnapshot(dk));
  },
  async toggle(habitId: string, dateKey?: string, opts?: HabitToggleOptions) {
    const dk = dateKey ?? new Date().toISOString().slice(0, 10);
    const next = getHabitsState().map((h) => {
      if (h.id !== habitId) return h;
      if (h.trackMode === 'count') {
        const maxC = h.countMax ?? 5;
        const minC = h.countMin ?? 3;
        let c = h.todayCount ?? 0;
        if (typeof opts?.setCount === 'number' && Number.isFinite(opts.setCount)) {
          c = Math.max(0, Math.min(maxC, Math.round(opts.setCount)));
        } else if (opts?.bump === -1) c = Math.max(0, c - 1);
        else if (opts?.bump === 1) c = Math.min(maxC, c + 1);
        else c = Math.min(maxC, c + 1);
        const todayDone = c >= minC;
        return { ...h, todayCount: c, todayDone };
      }
      const on = !h.todayDone;
      return { ...h, todayDone: on, todayCount: 0 };
    });
    setHabitsState(next);
    return delay(mockSnapshot(dk));
  },
  async saveReflection(note: string, dateKey?: string) {
    const dk = dateKey ?? new Date().toISOString().slice(0, 10);
    setMockReflectionNote(dk, note);
    return delay(mockSnapshot(dk));
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
