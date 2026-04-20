import * as Haptics from 'expo-haptics';
import { Platform, Pressable, Text, View } from 'react-native';

import { STRATEGY } from '@/features/strategy/strategyDashboardUi';
import type { StrategyMainTabId, StrategyTabsLabelsDef } from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

type Props = {
  labels: StrategyTabsLabelsDef;
  active: StrategyMainTabId;
  onChange: (tab: StrategyMainTabId) => void;
};

const TAB_ORDER: StrategyMainTabId[] = ['strategy', 'vision', 'notes'];

export function StrategyInnerTabs({ labels, active, onChange }: Props) {
  const { typography, spacing, colors, brand, isLight } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {TAB_ORDER.map((id) => {
        const selected = active === id;
        const label = labels[id];
        const tint = selected ? (isLight ? '#5b21b6' : '#ddd6fe') : colors.textMuted;
        return (
          <Pressable
            key={id}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              onChange(id);
            }}
            style={(state) => {
              const hovered = Platform.OS === 'web' && Boolean((state as { hovered?: boolean }).hovered);
              return {
                flexGrow: 1,
                flexBasis: 0,
                minWidth: 92,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: STRATEGY.cardRadiusMd,
                borderWidth: 1,
                borderColor: selected ? brand.surfaceBorderStrong : colors.border,
                backgroundColor: selected
                  ? brand.primaryMuted
                  : hovered
                    ? isLight
                      ? 'rgba(15,23,42,0.04)'
                      : 'rgba(255,255,255,0.06)'
                    : isLight
                      ? brand.surface
                      : 'rgba(255,255,255,0.04)',
                ...(Platform.OS === 'web'
                  ? ({
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
                      transform: [{ scale: hovered && !selected ? 1.01 : 1 }],
                    } as object)
                  : {}),
              };
            }}
          >
            <Text
              style={[
                typography.caption,
                {
                  color: tint,
                  fontWeight: selected ? '800' : '600',
                  fontSize: 13,
                  lineHeight: 18,
                  textAlign: 'center',
                },
              ]}
              numberOfLines={3}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
