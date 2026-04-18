import { Text, View } from 'react-native';

import { strategyPageConfig } from '@/features/strategy/strategy.config';
import { StrategyHeader } from '@/features/strategy/StrategyHeader';
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
  const { typography, spacing } = useAppTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <StrategyHeader config={strategyPageConfig.meta} />

      <View style={{ gap: spacing.xs }}>
        <Text style={[typography.title1, { letterSpacing: -0.2 }]}>
          {strategyPageConfig.strategySectionTitle}
        </Text>
        <View style={{ height: 1, backgroundColor: 'rgba(139,92,246,0.35)', borderRadius: 1 }} />
      </View>

      <View style={{ gap: spacing.md }}>
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
