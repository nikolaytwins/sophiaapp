import type { BacklogPriority } from '@/features/tasks/backlog.types';

export const PLANNER_PRIORITY_OPTIONS: { id: BacklogPriority; label: string; short: string }[] = [
  { id: 'high', label: 'Высокий', short: 'Важно' },
  { id: 'medium', label: 'Средний', short: 'Средн.' },
  { id: 'low', label: 'Низкий', short: 'Низкий' },
];

/** Подсказка при наведении (web `title`) у кружка приоритета. */
export const PLANNER_PRIORITY_WEB_HINT: Record<BacklogPriority, string> = {
  high: 'Высокий приоритет — в первую очередь',
  medium: 'Средний — обычная очередь',
  low: 'Низкий — когда освободится время',
};

/** Полоска слева у карточки — главный сигнал важности. */
export function priorityStripStyle(
  priority: BacklogPriority,
  isLight: boolean
): { backgroundColor: string; width: number } {
  switch (priority) {
    case 'high':
      return { backgroundColor: isLight ? '#EA580C' : '#FB923C', width: 6 };
    case 'medium':
      return { backgroundColor: isLight ? 'rgba(124,58,237,0.75)' : 'rgba(196,181,253,0.9)', width: 5 };
    default:
      return { backgroundColor: isLight ? 'rgba(15,17,24,0.18)' : 'rgba(255,255,255,0.2)', width: 4 };
  }
}

export function priorityBadgeStyle(
  priority: BacklogPriority,
  isLight: boolean
): { backgroundColor: string; borderColor: string; color: string } {
  switch (priority) {
    case 'high':
      return {
        backgroundColor: isLight ? 'rgba(234,88,12,0.2)' : 'rgba(251,146,60,0.28)',
        borderColor: isLight ? 'rgba(234,88,12,0.55)' : 'rgba(251,146,60,0.7)',
        color: isLight ? '#9A3412' : '#FDBA74',
      };
    case 'medium':
      return {
        backgroundColor: isLight ? 'rgba(124,58,237,0.14)' : 'rgba(168,85,247,0.22)',
        borderColor: isLight ? 'rgba(124,58,237,0.45)' : 'rgba(196,181,253,0.5)',
        color: isLight ? '#5B21B6' : 'rgba(233,213,255,0.98)',
      };
    default:
      return {
        backgroundColor: isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.08)',
        borderColor: isLight ? 'rgba(15,17,24,0.12)' : 'rgba(255,255,255,0.14)',
        color: isLight ? 'rgba(15,17,24,0.55)' : 'rgba(255,255,255,0.55)',
      };
  }
}

export function cardSurfaceForPriority(priority: BacklogPriority, isLight: boolean) {
  if (isLight) {
    switch (priority) {
      case 'high':
        return {
          backgroundColor: 'rgba(254,243,232,0.92)',
          borderColor: 'rgba(234,88,12,0.28)',
          borderWidth: 1,
        };
      case 'medium':
        return {
          backgroundColor: 'rgba(124,58,237,0.07)',
          borderColor: 'rgba(124,58,237,0.22)',
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor: 'rgba(15,17,24,0.03)',
          borderColor: 'rgba(15,17,24,0.1)',
          borderWidth: 1,
        };
    }
  }
  switch (priority) {
    case 'high':
      return {
        backgroundColor: 'rgba(251,146,60,0.12)',
        borderColor: 'rgba(251,146,60,0.35)',
        borderWidth: 1,
      };
    case 'medium':
      return {
        backgroundColor: 'rgba(168,85,247,0.1)',
        borderColor: 'rgba(168,85,247,0.3)',
        borderWidth: 1,
      };
    default:
      return {
        backgroundColor: 'rgba(255,255,255,0.045)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
      };
  }
}

export function priorityRank(p: BacklogPriority): number {
  switch (p) {
    case 'high':
      return 0;
    case 'medium':
      return 1;
    default:
      return 2;
  }
}
