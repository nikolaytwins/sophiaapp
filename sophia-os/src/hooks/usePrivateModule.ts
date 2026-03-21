import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ForecastPeriodKind } from '@/entities/private/models';
import { privateRepos } from '@/services/private';

export function usePrivateOverview() {
  const asOf = new Date().toISOString();
  return useQuery({
    queryKey: ['private', 'overview', asOf.slice(0, 10)],
    queryFn: () => privateRepos.getOverview(asOf),
  });
}

export function usePrivatePeriod(kind: ForecastPeriodKind) {
  return useQuery({
    queryKey: ['private', 'period', kind],
    queryFn: () => privateRepos.getPeriodForecast(kind),
  });
}

export function useRelationshipDynamics() {
  return useQuery({
    queryKey: ['private', 'relationship'],
    queryFn: () => privateRepos.getRelationshipDynamics(),
  });
}

export function useFlirtWindows() {
  return useQuery({
    queryKey: ['private', 'flirt'],
    queryFn: () => privateRepos.getFlirtWindows(),
  });
}

export function usePrivateChat() {
  const qc = useQueryClient();
  const messages = useQuery({
    queryKey: ['private', 'chat'],
    queryFn: () => privateRepos.getPrivateChat(),
  });
  const prompts = useQuery({
    queryKey: ['private', 'prompts'],
    queryFn: () => privateRepos.getQuickPrompts(),
  });
  const send = useMutation({
    mutationFn: (t: string) => privateRepos.appendPrivateChat(t),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['private', 'chat'] }),
  });
  return { messages, prompts, send };
}
