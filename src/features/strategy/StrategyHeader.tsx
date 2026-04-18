import { Text, View } from 'react-native';

import type { StrategyPageConfig } from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

const VIOLET = '#8B5CF6';
const VIOLET_DEEP = '#7C3AED';

type Props = {
  config: StrategyPageConfig['meta'];
};

export function StrategyHeader({ config }: Props) {
  const { typography, spacing, radius, colors } = useAppTheme();

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm }}>
        <Text style={[typography.sectionTitle, { flex: 1, minWidth: 200 }]}>{config.title}</Text>
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 2,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: 'rgba(139,92,246,0.45)',
            backgroundColor: 'rgba(124,58,237,0.14)',
          }}
        >
          <Text style={[typography.caption, { color: VIOLET, fontWeight: '700' }]}>{config.headerBadge}</Text>
        </View>
      </View>
      <Text style={[typography.body, { color: colors.textMuted }]}>{config.subtitle}</Text>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{config.lastContentUpdate}</Text>
    </View>
  );
}

export { VIOLET, VIOLET_DEEP };
