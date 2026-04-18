import { Text, View } from 'react-native';

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
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.md }}>
        <Text style={[typography.title1, { letterSpacing: -0.2 }]}>{config.whatIBuild.title}</Text>
        <View style={{ height: 1, backgroundColor: 'rgba(139,92,246,0.35)', borderRadius: 1 }} />
        {config.whatIBuild.paragraphs.map((p, i) => (
          <Text
            key={i}
            style={[typography.body, { fontSize: 15, lineHeight: 23, color: 'rgba(247,244,250,0.78)' }]}
          >
            {p}
          </Text>
        ))}
      </View>

      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <Text
          style={{
            fontSize: 11,
            lineHeight: 15,
            fontWeight: '600',
            letterSpacing: 1.1,
            textTransform: 'uppercase',
            color: 'rgba(247,244,250,0.52)',
          }}
        >
          {config.goalLevelsCapsTitle}
        </Text>
        <Text style={[typography.title1, { letterSpacing: -0.2 }]}>{config.goalLevelsTitle}</Text>

        <View style={{ gap: 28 }}>
          {config.goalLevels.map((level) => (
            <View key={level.id} style={{ gap: spacing.sm }}>
              <Text
                style={[
                  typography.caption,
                  {
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.6,
                    color: LABEL_COLOR[level.accent],
                  },
                ]}
              >
                {level.label}
              </Text>
              <Text style={[typography.title2, { fontSize: 18, fontWeight: '700', color: colors.text }]}>
                {level.headline}
              </Text>
              <Text style={[typography.body, { fontSize: 15, lineHeight: 23, color: 'rgba(247,244,250,0.62)' }]}>
                {level.body}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
