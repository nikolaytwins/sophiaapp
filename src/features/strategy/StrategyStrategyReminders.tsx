import { Text, View } from 'react-native';

import { STRATEGY } from '@/features/strategy/strategyDashboardUi';
import { strategyPageConfig } from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

/** Напутствия и долгие рамки — верх вкладки «Стратегия». */
export function StrategyStrategyReminders() {
  const { typography, spacing, colors, isLight, brand } = useAppTheme();
  const { sections } = strategyPageConfig.strategyReminders;
  if (!sections.length) return null;

  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: STRATEGY.cardRadiusLg,
        borderWidth: 1,
        borderColor: isLight ? 'rgba(124,58,237,0.22)' : 'rgba(168,85,247,0.28)',
        backgroundColor: isLight ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.1)',
      }}
    >
      {sections.map((block, i) => (
        <View key={i} style={{ gap: spacing.sm }}>
          <Text
            style={[
              typography.title2,
              {
                fontSize: 16,
                fontWeight: '800',
                letterSpacing: -0.2,
                color: brand.primary,
              },
            ]}
          >
            {block.title}
          </Text>
          <View style={{ gap: spacing.xs, paddingLeft: 2 }}>
            {block.bullets.map((line, j) => (
              <View key={j} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{ fontSize: 16, lineHeight: 24, color: brand.primary, marginTop: 1 }}>•</Text>
                <Text
                  style={[
                    typography.body,
                    {
                      flex: 1,
                      color: colors.text,
                      lineHeight: 24,
                      fontWeight: '600',
                      fontSize: 15,
                    },
                  ]}
                >
                  {line}
                </Text>
              </View>
            ))}
          </View>
          {i < sections.length - 1 ? (
            <View
              style={{
                height: 1,
                marginTop: spacing.xs,
                backgroundColor: colors.border,
                opacity: 0.75,
                borderRadius: 1,
              }}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}
