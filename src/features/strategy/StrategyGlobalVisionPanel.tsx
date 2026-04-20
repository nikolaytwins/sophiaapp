import { Text, View } from 'react-native';

import { STRATEGY, strategyEyebrow } from '@/features/strategy/strategyDashboardUi';
import type { GlobalVisionDef, GlobalVisionGoalLevelDef } from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

const LABEL_COLOR: Record<GlobalVisionGoalLevelDef['accent'], string> = {
  green: '#86efac',
  amber: '#fcd34d',
  violet: '#c4b5fd',
};

type Props = {
  config: GlobalVisionDef;
};

export function StrategyGlobalVisionPanel({ config }: Props) {
  const { typography, spacing, colors } = useAppTheme();

  return (
    <View style={{ gap: STRATEGY.sectionGap }}>
      <View style={{ gap: spacing.lg }}>
        <Text style={[typography.title1, { letterSpacing: -0.35, fontSize: 22 }]}>{config.whatIBuild.title}</Text>
        <View style={{ height: 1, backgroundColor: colors.border, borderRadius: 1 }} />
        {config.whatIBuild.paragraphs.map((p, i) => (
          <Text
            key={i}
            style={[typography.body, { fontSize: 15, lineHeight: 24, color: colors.textMuted }]}
          >
            {p}
          </Text>
        ))}
      </View>

      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <Text style={strategyEyebrow(colors.textMuted)}>{config.goalLevelsCapsTitle}</Text>
        <Text style={[typography.title1, { letterSpacing: -0.35, fontSize: 22 }]}>{config.goalLevelsTitle}</Text>

        <View style={{ gap: STRATEGY.blockGap }}>
          {config.goalLevels.map((level, idx) => (
            <View
              key={level.id}
              style={{
                gap: spacing.sm,
                paddingVertical: spacing.md,
                borderBottomWidth: idx < config.goalLevels.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.65,
                    color: LABEL_COLOR[level.accent],
                  },
                ]}
              >
                {level.label}
              </Text>
              <Text style={[typography.title2, { fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.3 }]}>
                {level.headline}
              </Text>
              <Text style={[typography.body, { fontSize: 15, lineHeight: 24, color: colors.textMuted }]}>{level.body}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
