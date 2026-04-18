import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { NikolayDayMoneyHeroCards, pickNikolayMoneyProgressGoals } from '@/features/accounts/nikolayHabitsUi';
import type { StrategyGoalsTabDef } from '@/features/strategy/strategy.config';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useSprintStore } from '@/stores/sprint.store';
import { useAppTheme } from '@/theme';

function plaqueOverlineFromDeadlineLine(line: string): string {
  const idx = line.lastIndexOf('·');
  if (idx === -1) return line.trim();
  return line.slice(idx + 1).trim();
}

type Props = {
  config: StrategyGoalsTabDef;
};

export function StrategyGoalsTabPanel({ config }: Props) {
  const { typography, spacing, colors } = useAppTheme();
  const activeSprint = useSprintStore((s) => s.sprints.find((x) => x.status === 'active') ?? null);
  const { china, cushion } = useMemo(
    () => pickNikolayMoneyProgressGoals(activeSprint?.goals ?? []),
    [activeSprint]
  );
  const heroOverline = plaqueOverlineFromDeadlineLine(config.nearestDeadlineLine);

  return (
    <View style={{ gap: spacing.xl + 8 }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.title1, { letterSpacing: -0.2 }]}>{config.pageTitle}</Text>
        <View style={{ height: 1, backgroundColor: 'rgba(139,92,246,0.35)', borderRadius: 1 }} />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text
          style={{
            fontSize: 11,
            lineHeight: 15,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: 'rgba(247,244,250,0.55)',
          }}
        >
          {config.nearestSectionTitle}
        </Text>
        <Text style={[typography.body, { fontSize: 14, lineHeight: 20, color: colors.textMuted }]}>
          {config.nearestDeadlineLine}
        </Text>
        <NikolayDayMoneyHeroCards
          sprintId={activeSprint?.id ?? null}
          chinaGoal={china}
          cushionGoal={cushion}
          overline={heroOverline}
          size="hero"
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text
          style={{
            fontSize: 11,
            lineHeight: 15,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: 'rgba(247,244,250,0.55)',
          }}
        >
          {config.sideSectionTitle}
        </Text>
        <AppSurfaceCard>
          <View style={{ gap: spacing.md }}>
            {config.sideGoals.map((line, i) => (
              <View
                key={i}
                style={{
                  paddingBottom: i < config.sideGoals.length - 1 ? spacing.md : 0,
                  marginBottom: i < config.sideGoals.length - 1 ? spacing.md : 0,
                  borderBottomWidth: i < config.sideGoals.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={[typography.body, { fontSize: 15, lineHeight: 22, color: colors.text }]}>{line}</Text>
              </View>
            ))}
          </View>
        </AppSurfaceCard>
      </View>
    </View>
  );
}
