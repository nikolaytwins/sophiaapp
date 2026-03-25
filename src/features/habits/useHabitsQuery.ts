import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { HABITS_QUERY_KEY } from '@/features/habits/queryKeys';
import { repos } from '@/services/repositories';
import { useHabitsStore } from '@/stores/habits.store';

export function useHabitsQuery() {
  const qc = useQueryClient();
  const didHydrateRef = useRef(useHabitsStore.persist.hasHydrated());

  useEffect(() => {
    const refetch = () => {
      void qc.invalidateQueries({ queryKey: [...HABITS_QUERY_KEY] });
    };
    if (didHydrateRef.current) {
      refetch();
    }
    const unsub = useHabitsStore.persist.onFinishHydration(() => {
      didHydrateRef.current = true;
      refetch();
    });
    return unsub;
  }, [qc]);

  return useQuery({
    queryKey: [...HABITS_QUERY_KEY],
    queryFn: () => repos.habits.list(),
    staleTime: 0,
    structuralSharing: false,
  });
}
