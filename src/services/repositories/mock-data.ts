import type {
  CalendarEvent,
  ChatMessage,
  DailyScore,
  EsotericPreview,
  FinanceSummary,
  Goal,
  HealthSnapshot,
  QuickPrompt,
  Task,
  UserProfile,
} from '@/entities/models';

const now = new Date().toISOString();

export const mockUser: UserProfile = {
  id: 'u1',
  displayName: 'Николай',
  avatarEmoji: '◉',
  timezone: 'Europe/Moscow',
};

export const mockTasks: Task[] = [
  {
    id: 't1',
    title: 'Свести финмодель Twinlabs',
    priority: 'high',
    status: 'todo',
    domain: 'work',
    dueDate: now.slice(0, 10),
    dueTime: '11:00',
    updatedAt: now,
  },
  {
    id: 't2',
    title: 'Сценарий ролика + таймкоды',
    priority: 'high',
    status: 'todo',
    domain: 'work',
    dueDate: now.slice(0, 10),
    dueTime: '15:30',
    updatedAt: now,
  },
  {
    id: 't3',
    title: 'Прогулка 25 мин',
    priority: 'medium',
    status: 'todo',
    domain: 'personal',
    dueDate: now.slice(0, 10),
    recurrence: 'daily',
    updatedAt: now,
  },
  {
    id: 't4',
    title: 'Белок: добить до цели',
    priority: 'medium',
    status: 'todo',
    domain: 'personal',
    dueDate: now.slice(0, 10),
    updatedAt: now,
  },
  {
    id: 't5',
    title: 'Бэклог: ответить в Notion',
    priority: 'low',
    status: 'todo',
    domain: 'work',
    updatedAt: now,
  },
];

export let mockEvents: CalendarEvent[] = [
  {
    id: 'e1',
    title: 'Фокус-блок · стратегия',
    start: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
    type: 'deepwork',
    category: 'work',
    note: 'Без уведомлений',
    source: 'local',
  },
  {
    id: 'e2',
    title: 'Созвон · агентство',
    start: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(14, 45, 0, 0)).toISOString(),
    type: 'call',
    category: 'work',
    source: 'local',
  },
  {
    id: 'e3',
    title: 'Вечерний чек-ин',
    start: new Date(new Date().setHours(21, 30, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(22, 0, 0, 0)).toISOString(),
    type: 'ritual',
    category: 'life',
    source: 'local',
  },
];

export const mockDailyScore: DailyScore = {
  date: now.slice(0, 10),
  score100: 78,
  summary: 'Сильный фокус до полудня. Добавь движение и белок — score вырастет.',
  factors: [
    { label: 'Задачи', impact: 22 },
    { label: 'Шаги', impact: 14 },
    { label: 'Белок', impact: 10 },
    { label: 'Сон', impact: 18 },
  ],
  progress01: 0.78,
};

export const mockGoals: Goal[] = [
  {
    id: 'g1',
    title: 'Медиа: 12 качественных роликов',
    horizonDays: 90,
    progress01: 0.34,
    domain: 'work',
    updatedAt: now,
  },
  {
    id: 'g2',
    title: 'Здоровье: стабильный сон 7ч+',
    horizonDays: 90,
    progress01: 0.62,
    domain: 'personal',
    updatedAt: now,
  },
  {
    id: 'g3',
    title: 'Финансы: подушка 6 мес расходов',
    horizonDays: 90,
    progress01: 0.41,
    domain: 'personal',
    updatedAt: now,
  },
];

export const mockHealth: HealthSnapshot = {
  date: now.slice(0, 10),
  steps: 8420,
  stepsGoal: 10000,
  proteinG: 112,
  proteinGoal: 150,
  calories: 1840,
  waterMl: 1400,
};

export const mockFinance: FinanceSummary = {
  balance: 428_500,
  monthlyIncome: 980_000,
  monthlyExpense: 640_000,
  savingsGoal: 1_200_000,
  savingsProgress01: 0.58,
  categories: [
    { id: 'c1', label: 'Команда', amount: 280_000, pct: 0.32 },
    { id: 'c2', label: 'Инфра', amount: 120_000, pct: 0.18 },
    { id: 'c3', label: 'Жизнь', amount: 140_000, pct: 0.22 },
    { id: 'c4', label: 'Налоги', amount: 100_000, pct: 0.16 },
  ],
};

export const mockEsoteric: EsotericPreview[] = [
  {
    id: 'x1',
    title: 'Астро · день',
    subtitle: 'Луна в Близнецах — ясность формулировок',
    accent: 'astro',
  },
  {
    id: 'x2',
    title: 'Периоды',
    subtitle: 'Неделя: связь · деньги · смысл',
    accent: 'moon',
  },
  {
    id: 'x3',
    title: 'Таро',
    subtitle: 'Расклад «Сегодня» — Император / Звезда',
    accent: 'tarot',
  },
  {
    id: 'x4',
    title: 'Портрет',
    subtitle: 'Твой стиль решений и ритм дня',
    accent: 'self',
  },
];

export const mockChat: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Привет. Я собрала день: фокус сильный, но тело просит движения. Хочешь — спланируем вечер за 2 минуты.',
    createdAt: now,
    scenarioId: 'planning',
  },
];

export const mockPrompts: QuickPrompt[] = [
  { id: 'p1', title: 'Спланировать вечер', subtitle: '3 шага без перегруза' },
  { id: 'p2', title: 'Разобрать питание', subtitle: 'КБЖУ из текста' },
  { id: 'p3', title: 'Астро-обзор', subtitle: 'коротко по сегодня' },
  { id: 'p4', title: 'Рефлексия', subtitle: 'что сработало' },
];

let chatMessages = [...mockChat];

export function getChatMessages() {
  return chatMessages;
}

export function pushUserChatMessage(text: string): ChatMessage[] {
  const msg: ChatMessage = {
    id: `m_${Date.now()}`,
    role: 'user',
    text,
    createdAt: new Date().toISOString(),
  };
  const reply: ChatMessage = {
    id: `m_${Date.now()}_a`,
    role: 'assistant',
    text: 'Принято. Когда подключим backend, я отвечу из твоей модели. Пока это премиум-каркас.',
    createdAt: new Date().toISOString(),
  };
  chatMessages = [...chatMessages, msg, reply];
  return chatMessages;
}

let tasksState = [...mockTasks];

export function getTasksState() {
  return tasksState;
}

export function setTasksState(next: Task[]) {
  tasksState = next;
}
