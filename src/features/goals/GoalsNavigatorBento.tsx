import { type ReactNode, useMemo } from 'react';
import { Text, View } from 'react-native';

import { mergeGoalsRoundRobin, PersonalGoalsMasonryGrid } from '@/features/goals/PersonalGoalsMasonry';
import { sideGoalDeadlineOnOrBefore } from '@/features/goals/sideGoals.logic';
import type { SideGoalPersisted } from '@/stores/sideGoals.store';
import { useAppTheme } from '@/theme';

export function GoalsNavigatorBento({
  calendarYear: _calendarYear,
  nearestDeadlineCutoffKey,
  pinnedGoals,
  yearGoals,
  wishGoals,
  horizonGoals,
  otherYearGoals,
  nearestSlot = null,
  onEditGoal,
  onToggleOneShot,
}: {
  calendarYear: number;
  nearestDeadlineCutoffKey: string;
  pinnedGoals: SideGoalPersisted[];
  yearGoals: SideGoalPersisted[];
  wishGoals: SideGoalPersisted[];
  horizonGoals: SideGoalPersisted[];
  otherYearGoals: SideGoalPersisted[];
  /** Блок накоплений (Китай/подушка) — опционально, если показан выше на странице. */
  nearestSlot?: ReactNode | null;
  onEditGoal: (id: string) => void;
  onToggleOneShot?: (id: string, done: boolean) => void;
}) {
  const { spacing } = useAppTheme();

  const yearNearest = useMemo(
    () => yearGoals.filter((g) => sideGoalDeadlineOnOrBefore(g, nearestDeadlineCutoffKey)),
    [yearGoals, nearestDeadlineCutoffKey]
  );
  const yearTrack = useMemo(
    () => yearGoals.filter((g) => !sideGoalDeadlineOnOrBefore(g, nearestDeadlineCutoffKey)),
    [yearGoals, nearestDeadlineCutoffKey]
  );

  const mergedAll = useMemo(
    () =>
      mergeGoalsRoundRobin([
        pinnedGoals,
        yearNearest,
        yearTrack,
        wishGoals,
        horizonGoals,
        otherYearGoals,
      ]),
    [pinnedGoals, yearNearest, yearTrack, wishGoals, horizonGoals, otherYearGoals]
  );

  return (
    <View style={{ gap: spacing.xl + 4 }}>
      <PersonalGoalsMasonryGrid
        goals={mergedAll}
        onEditGoal={onEditGoal}
        onToggleOneShot={onToggleOneShot}
      />

      {nearestSlot ? (
        <View
          style={{
            gap: spacing.md,
            paddingVertical: spacing.md + 2,
            paddingHorizontal: spacing.sm,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(167,139,250,0.28)',
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 2,
              color: 'rgba(248,250,252,0.28)',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Накопления · как отдельные счета
          </Text>
          {nearestSlot}
        </View>
      ) : null}
    </View>
  );
}

export function nearestCutoffForAugust(calendarYear: number): string {
  return `${calendarYear}-08-14`;
}
