import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DayJournalCloudSync } from '@/providers/DayJournalCloudSync';
import { GoalsCloudSync } from '@/providers/GoalsCloudSync';
import { SprintCloudSync } from '@/providers/SprintCloudSync';
import { StrategyCloudSync } from '@/providers/StrategyCloudSync';
import { SupabaseAuthListener } from '@/providers/SupabaseAuthListener';

type Props = { children: ReactNode };

export function AppProviders({ children }: Props) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <SupabaseAuthListener />
      <GoalsCloudSync />
      <StrategyCloudSync />
      <DayJournalCloudSync />
      <SprintCloudSync />
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </QueryClientProvider>
  );
}
