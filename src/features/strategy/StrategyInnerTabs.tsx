import * as Haptics from 'expo-haptics';
import { Platform, Pressable, Text, View } from 'react-native';

import type { StrategyMainTabId, StrategyTabsLabelsDef } from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

type Props = {
  labels: StrategyTabsLabelsDef;
  active: StrategyMainTabId;
  onChange: (tab: StrategyMainTabId) => void;
};

const TAB_ORDER: StrategyMainTabId[] = ['strategy', 'vision', 'notes'];

export function StrategyInnerTabs({ labels, active, onChange }: Props) {
  const { typography, spacing, radius, colors, isLight } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {TAB_ORDER.map((id) => {
        const selected = active === id;
        const label = labels[id];
        const tint = selected ? (isLight ? '#7c3aed' : '#c4b5fd') : colors.textMuted;
        return (
          <Pressable
            key={id}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              onChange(id);
            }}
            style={{
              flexGrow: 1,
              flexBasis: 0,
              minWidth: 88,
              paddingVertical: spacing.sm + 2,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: selected ? 'rgba(139,92,246,0.55)' : colors.border,
              backgroundColor: selected ? 'rgba(124,58,237,0.14)' : 'rgba(13,13,13,0.35)',
            }}
          >
            <Text
              style={[
                typography.caption,
                {
                  color: tint,
                  fontWeight: selected ? '700' : '600',
                  fontSize: 12,
                  lineHeight: 16,
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
