import { Text, View } from 'react-native';

import type { StrategyPageConfig } from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

const VIOLET = '#8B5CF6';
const VIOLET_DEEP = '#7C3AED';

type Props = {
  config: StrategyPageConfig['meta'];
};

export function StrategyHeader({ config }: Props) {
  const { typography, spacing, radius, colors, brand } = useAppTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md }}>
        <Text style={[typography.sectionTitle, { flex: 1, minWidth: 200, letterSpacing: -0.65, lineHeight: 32 }]}>
          {config.title}
        </Text>
        <View
          style={{
            paddingHorizontal: spacing.md + 2,
            paddingVertical: spacing.sm,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: brand.surfaceBorderStrong,
            backgroundColor: brand.primaryMuted,
          }}
        >
          <Text style={[typography.caption, { color: VIOLET, fontWeight: '800', fontSize: 12 }]}>{config.headerBadge}</Text>
        </View>
      </View>
      <Text style={[typography.body, { color: colors.text, fontSize: 16, lineHeight: 24, opacity: 0.92 }]}>
        {config.subtitle}
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 12, letterSpacing: 0.2 }]}>
        {config.lastContentUpdate}
      </Text>
    </View>
  );
}

export { VIOLET, VIOLET_DEEP };
