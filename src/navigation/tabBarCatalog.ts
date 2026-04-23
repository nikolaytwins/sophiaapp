import type { Href } from 'expo-router';

/** Порядок вкладок нижнего / бокового меню (синхронно с CustomTabBar). */
export const TAB_BAR_ROUTE_ORDER = ['day', 'calendar', 'strategy', 'goals', 'tasks', 'finance', 'habits'] as const;

export const TAB_HREF: Record<string, Href> = {
  day: '/day',
  calendar: '/calendar' as Href,
  sprint: '/sprint' as Href,
  strategy: '/strategy' as Href,
  goals: '/goals' as Href,
  tasks: '/tasks' as Href,
  inbox: '/inbox' as Href,
  finance: '/finance' as Href,
  habits: '/habits',
};

export const TAB_LABELS: Record<string, string> = {
  day: 'День',
  calendar: 'Календарь',
  sprint: 'Спринт',
  strategy: 'Стратегия',
  goals: 'Цели',
  tasks: 'Задачи',
  inbox: 'Входящие',
  finance: 'Финансы',
  habits: 'Аналитика',
};

export const TAB_ICONS: Record<string, string> = {
  day: 'sunny-outline',
  calendar: 'calendar-outline',
  sprint: 'flag-outline',
  strategy: 'navigate-circle-outline',
  goals: 'trophy-outline',
  tasks: 'list-outline',
  inbox: 'file-tray-stacked-outline',
  finance: 'wallet-outline',
  habits: 'stats-chart-outline',
};
