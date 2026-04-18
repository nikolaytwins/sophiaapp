import { Text, View } from 'react-native';

import type { PersonalBrandSectionDef } from '@/features/strategy/strategy.config';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useAppTheme } from '@/theme';

type Props = {
  config: PersonalBrandSectionDef;
};

export function StrategyPersonalBrand({ config }: Props) {
  const { typography, spacing, colors } = useAppTheme();

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={[typography.title1, { letterSpacing: -0.2 }]}>{config.sectionTitle}</Text>
        <Text style={[typography.body, { color: colors.textMuted, fontSize: 15, lineHeight: 22 }]}>
          {config.subtitle}
        </Text>
        <View style={{ height: 1, backgroundColor: 'rgba(139,92,246,0.35)', borderRadius: 1, marginTop: spacing.xs }} />
      </View>

      <View style={{ gap: spacing.md }}>
        {config.narratives.map((n) => (
          <AppSurfaceCard
            key={n.id}
            padded
            glow
            style={{
              padding: spacing.lg,
              borderLeftWidth: 3,
              borderLeftColor: '#7c3aed',
            }}
          >
            <Text style={[typography.title2, { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: n.subtitle ? spacing.sm : 0 }]}>
              {n.title}
            </Text>
            {n.subtitle ? (
              <Text style={[typography.body, { fontSize: 14, lineHeight: 21, color: 'rgba(247,244,250,0.68)' }]}>
                {n.subtitle}
              </Text>
            ) : null}
          </AppSurfaceCard>
        ))}
      </View>
    </View>
  );
}
