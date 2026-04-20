import { Text, View } from 'react-native';

import { STRATEGY } from '@/features/strategy/strategyDashboardUi';
import type { PersonalBrandSectionDef } from '@/features/strategy/strategy.config';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useAppTheme } from '@/theme';

type Props = {
  config: PersonalBrandSectionDef;
};

export function StrategyPersonalBrand({ config }: Props) {
  const { typography, spacing, colors } = useAppTheme();

  return (
    <View style={{ gap: STRATEGY.sectionGap }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.title1, { letterSpacing: -0.35, fontSize: 22 }]}>{config.sectionTitle}</Text>
        <Text style={[typography.body, { color: colors.textMuted, fontSize: 15, lineHeight: 24 }]}>
          {config.subtitle}
        </Text>
        <View style={{ height: 1, backgroundColor: colors.border, marginTop: spacing.xs, borderRadius: 1 }} />
      </View>

      <View style={{ gap: spacing.lg }}>
        {config.narratives.map((n, index) => {
          const primary = index === 0;
          return (
            <AppSurfaceCard
              key={n.id}
              padded
              glow={primary}
              style={{
                padding: spacing.xl,
                borderRadius: STRATEGY.cardRadiusLg,
                borderLeftWidth: 3,
                borderLeftColor: primary ? '#a78bfa' : 'rgba(167,139,250,0.35)',
              }}
            >
              <Text
                style={[
                  typography.title2,
                  {
                    fontSize: 17,
                    fontWeight: '700',
                    color: colors.text,
                    marginBottom: n.subtitle ? spacing.sm : 0,
                    letterSpacing: -0.3,
                    lineHeight: 24,
                  },
                ]}
              >
                {n.title}
              </Text>
              {n.subtitle ? (
                <Text style={[typography.body, { fontSize: 15, lineHeight: 23, color: colors.textMuted }]}>
                  {n.subtitle}
                </Text>
              ) : null}
            </AppSurfaceCard>
          );
        })}
      </View>
    </View>
  );
}
