import { useQuery } from '@tanstack/react-query';

import { repos } from '@/services/repositories';

export function usePlanData(range: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['events', 'range', range.start.toISOString(), range.end.toISOString()],
    queryFn: () => repos.events.listForRange(range.start.toISOString(), range.end.toISOString()),
  });
}
