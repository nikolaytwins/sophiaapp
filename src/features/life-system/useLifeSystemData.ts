import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import {
  parseFinanceAccountGoalTarget,
  pickNikolayMoneyReserveAccounts,
} from '@/features/accounts/nikolayFinanceReserveAccounts';
import { addDays } from '@/features/habits/habitLogic';
import { listBacklogTasks } from '@/features/tasks/backlogApi';
import { listPlannerTasksInDateRange } from '@/features/tasks/plannerApi';
import type { PlannerTaskRow } from '@/features/tasks/planner.types';
import { BACKLOG_TASKS_QUERY_KEY, PLANNER_TASKS_QUERY_KEY } from '@/features/tasks/queryKeys';
import { loadFinanceOverview } from '@/features/finance/financeApi';
import { FINANCE_QUERY_KEY } from '@/features/finance/queryKeys';
import { LIFE_SYSTEM_CUSHION_TARGET_RUB } from '@/features/life-system/lifeSystem.config';
import { getSupabase } from '@/lib/supabase';
import { getSideGoalPlacementKind } from '@/features/goals/sideGoals.logic';
import { useSideGoalsStore } from '@/stores/sideGoals.store';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type LifeSystemUpcomingTask = {
  id: string;
  title: string;
  source: 'planner' | 'backlog';
  dayDate?: string;
  priority?: string;
};

export function useLifeSystemData() {
  const goals = useSideGoalsStore((s) => s.goals);

  const nearestGoals = useMemo(
    () =>
      goals.filter(
        (g) => getSideGoalPlacementKind(g) === 'nearest' || g.isNearestPinned
      ),
    [goals]
  );

  const horizonGoals = useMemo(() => goals.filter((g) => g.isHorizon), [goals]);

  const financeQ = useQuery({
    queryKey: [...FINANCE_QUERY_KEY, 'life-system'],
    queryFn: async () => {
      const sb = getSupabase();
      if (!sb) return null;
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user?.id || !isNikolayPrimaryAccount(user.email)) return null;
      return loadFinanceOverview(user.id);
    },
    staleTime: 60_000,
  });

  const reserves = useMemo(
    () => pickNikolayMoneyReserveAccounts(financeQ.data?.accounts ?? []),
    [financeQ.data?.accounts]
  );

  const cushionTarget = useMemo(() => {
    const fromNotes = reserves.cushion
      ? parseFinanceAccountGoalTarget(reserves.cushion.notes)
      : null;
    return fromNotes ?? LIFE_SYSTEM_CUSHION_TARGET_RUB;
  }, [reserves.cushion]);

  const cushionCurrent = reserves.cushion?.balance ?? 0;
  const cushionPct =
    cushionTarget > 0 ? Math.min(1, Math.max(0, cushionCurrent / cushionTarget)) : 0;

  const growthCurrent = reserves.growth?.balance ?? 0;
  const growthTarget = reserves.growth
    ? parseFinanceAccountGoalTarget(reserves.growth.notes) ?? 0
    : 0;

  const startKey = todayKey();
  const endKey = addDays(startKey, 14);

  const plannerQ = useQuery({
    queryKey: [...PLANNER_TASKS_QUERY_KEY, 'life-system', startKey, endKey],
    queryFn: () => listPlannerTasksInDateRange(startKey, endKey),
    staleTime: 30_000,
  });

  const backlogQ = useQuery({
    queryKey: [...BACKLOG_TASKS_QUERY_KEY, 'life-system'],
    queryFn: listBacklogTasks,
    staleTime: 30_000,
  });

  const upcomingTasks = useMemo((): LifeSystemUpcomingTask[] => {
    const openPlanner = (plannerQ.data ?? [])
      .filter((t: PlannerTaskRow) => !t.is_done)
      .sort((a, b) => a.day_date.localeCompare(b.day_date) || a.sort_order - b.sort_order)
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        title: t.title,
        source: 'planner' as const,
        dayDate: t.day_date,
        priority: t.priority,
      }));

    if (openPlanner.length >= 6) return openPlanner;

    const backlog = (backlogQ.data ?? [])
      .slice(0, 6 - openPlanner.length)
      .map((t) => ({
        id: t.id,
        title: t.title,
        source: 'backlog' as const,
        priority: t.priority,
      }));

    return [...openPlanner, ...backlog];
  }, [backlogQ.data, plannerQ.data]);

  return {
    nearestGoals,
    horizonGoals,
    reserves,
    cushionTarget,
    cushionCurrent,
    cushionPct,
    growthCurrent,
    growthTarget,
    upcomingTasks,
    financeLoading: financeQ.isLoading,
    financeAccounts: financeQ.data?.accounts ?? [],
  };
}
