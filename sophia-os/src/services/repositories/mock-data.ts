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
  SophiaHabitsManifest,
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

export const DEFAULT_SOPHIA_HABITS_MANIFEST: SophiaHabitsManifest = {
  northStar: {
    badge: 'Супер-цель',
    title: 'Поездка в Китай',
    subtitle: 'То, ради чего я работаю — держу ритм и фокус.',
    amountLine: '~300 000 ₽ на поездку',
  },
  reminders: [
    {
      id: 'pc-reward',
      variant: 'info',
      title: 'Компьютер — только награда',
      body: 'Компы только после сделанного действия по работе, как награда.',
    },
    {
      id: 'no-fantasy',
      variant: 'warning',
      title: '❗ Убрать жизнь в фантазиях',
      body: 'Временно не крутить в голове девушек, тройнички и большие проекты — только реальные шаги.',
    },
  ],
  sprintGoals: [
    { id: 'china-300k', title: 'Китай — накопить ~300 000 ₽' },
    { id: 'cushion-700k', title: 'Подушка безопасности — 700 000 ₽' },
  ],
  journalPrompt:
    'Я оправдывался? Объяснял себя? Подстраивался под ожидания другого?',
};

export const mockHabits: Habit[] = [
  {
    id: 'h1',
    name: '3–5 действий на привлечение клиентов',
    streak: 2,
    icon: 'megaphone-outline',
    todayDone: false,
    todayCount: 1,
    category: 'money',
    trackMode: 'count',
    countMin: 3,
    countMax: 5,
    subtitle: 'Считай любой контакт: написал, выложил, ответил, предложил.',
  },
  {
    id: 'h2',
    name: 'Сон до 01:00',
    streak: 5,
    icon: 'moon-outline',
    todayDone: true,
    category: 'body',
    trackMode: 'toggle',
    countMin: 0,
    countMax: 5,
  },
  {
    id: 'h3',
    name: 'Прогулка без цели',
    streak: 3,
    icon: 'walk-outline',
    todayDone: false,
    category: 'body',
    trackMode: 'toggle',
    subtitle: 'Без цели по шагам — просто выйти.',
    countMin: 0,
    countMax: 5,
  },
  {
    id: 'h4',
    name: 'Тренировка (3× в неделю)',
    streak: 1,
    icon: 'barbell-outline',
    todayDone: false,
    category: 'body',
    trackMode: 'toggle',
    subtitle: 'Отмечай в дни тренировки.',
    countMin: 0,
    countMax: 5,
  },
  {
    id: 'h5',
    name: '1 выходной в неделю',
    streak: 0,
    icon: 'umbrella-outline',
    todayDone: false,
    category: 'body',
    trackMode: 'toggle',
    countMin: 0,
    countMax: 5,
  },
  {
    id: 'h6',
    name: '1 яркое событие в неделю',
    streak: 0,
    icon: 'star-outline',
    todayDone: false,
    category: 'body',
    trackMode: 'toggle',
    countMin: 0,
    countMax: 5,
  },
  {
    id: 'h7',
    name: 'Дневник 10–15 минут',
    streak: 4,
    icon: 'book-outline',
    todayDone: false,
    category: 'life',
    trackMode: 'toggle',
    subtitle: 'Выписать всё из головы.',
    countMin: 0,
    countMax: 5,
  },
  {
    id: 'h8',
    name: 'В отношениях: не «отец/спасатель»',
    streak: 0,
    icon: 'heart-outline',
    todayDone: false,
    category: 'life',
    trackMode: 'toggle',
    subtitle: 'Не оправдывался, не подстраивался под чужие ожидания.',
    countMin: 0,
    countMax: 5,
  },
];

let habitsState: Habit[] = mockHabits.map((h) => ({ ...h }));

const mockReflectionByDate: Record<string, string> = {};

export function getHabitsState() {
  return habitsState;
}

export function setHabitsState(next: Habit[]) {
  habitsState = next;
}

export function getMockReflectionNote(dateKey: string): string | null {
  const v = mockReflectionByDate[dateKey];
  return v && v.trim() !== '' ? v : null;
}

export function setMockReflectionNote(dateKey: string, note: string) {
  const t = note.trim();
  if (t === '') delete mockReflectionByDate[dateKey];
  else mockReflectionByDate[dateKey] = t;
}

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
