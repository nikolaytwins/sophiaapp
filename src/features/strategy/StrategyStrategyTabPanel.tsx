import { Text, View } from 'react-native';

import { STRATEGY } from '@/features/strategy/strategyDashboardUi';
import { strategyPageConfig } from '@/features/strategy/strategy.config';
import { StrategyMonthlyPlansPanel } from '@/features/strategy/StrategyMonthlyPlansPanel';
import { StrategyStrategyReminders } from '@/features/strategy/StrategyStrategyReminders';
import { StrategyPhaseAccordion } from '@/features/strategy/StrategyPhaseAccordion';
import { StrategyPersonalBrand } from '@/features/strategy/StrategyPersonalBrand';
import { StrategyProjectsStatus } from '@/features/strategy/StrategyProjectsStatus';
import { StrategyServicesTimeline } from '@/features/strategy/StrategyServicesTimeline';
import { useAppTheme } from '@/theme';

type Props = {
  checked: Record<string, boolean>;
  onToggleCheckpoint: (id: string) => void;
};

export function StrategyStrategyTabPanel({ checked, onToggleCheckpoint }: Props) {
  const { typography, spacing, colors } = useAppTheme();

  return (
    <View style={{ gap: STRATEGY.sectionGap }}>
      <StrategyStrategyReminders />
      <StrategyMonthlyPlansPanel plans={strategyPageConfig.monthlyPlans} />

      <View style={{ gap: spacing.xs }}>
        <Text style={[typography.title1, { letterSpacing: -0.35, fontSize: 22 }]}>
          {strategyPageConfig.strategySectionTitle}
        </Text>
        <View style={{ height: 1, backgroundColor: colors.border, marginTop: spacing.xs, borderRadius: 1 }} />
      </View>

      <View style={{ gap: spacing.lg }}>
        {strategyPageConfig.phases.map((phase) => (
          <StrategyPhaseAccordion
            key={phase.id}
            phase={phase}
            checkedMap={checked}
            onToggleCheckpoint={onToggleCheckpoint}
            readOnly={false}
          />
        ))}
      </View>

      <StrategyServicesTimeline config={strategyPageConfig.timeline} />

      <StrategyProjectsStatus config={strategyPageConfig.projectsStatus} />

      <StrategyPersonalBrand config={strategyPageConfig.personalBrand} />
    </View>
  );
}
