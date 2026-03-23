import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { repos } from '@/services/repositories';

export function useDayOverview(dateKey: string) {
  const qc = useQueryClient();

  const [tasksQ, scoreQ, healthQ, eventsQ] = useQueries({
    queries: [
      {
        queryKey: ['tasks', dateKey] as const,
        queryFn: () => repos.tasks.listForDate(dateKey),
      },
      {
        queryKey: ['dailyScore', dateKey] as const,
        queryFn: () => repos.dailyScore.getForDate(dateKey),
      },
      {
        queryKey: ['health', dateKey] as const,
        queryFn: () => repos.health.getSnapshot(dateKey),
      },
      {
        queryKey: ['events', 'day', dateKey] as const,
        queryFn: () => {
          const start = new Date(`${dateKey}T00:00:00`);
          const end = new Date(`${dateKey}T23:59:59.999`);
          return repos.events.listForRange(start.toISOString(), end.toISOString());
        },
      },
    ],
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) =>
      done ? repos.tasks.complete(id) : repos.tasks.uncomplete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const isLoading = tasksQ.isLoading || scoreQ.isLoading || healthQ.isLoading || eventsQ.isLoading;

  const sortedEvents = useMemo(() => {
    const list = eventsQ.data ?? [];
    return [...list].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [eventsQ.data]);

  return {
    tasks: tasksQ.data,
    dailyScore: scoreQ.data,
    health: healthQ.data,
    todayEvents: sortedEvents,
    isLoading,
    toggleTask,
  };
}
