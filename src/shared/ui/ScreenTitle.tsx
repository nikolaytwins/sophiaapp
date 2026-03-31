import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme';

type Props = {
  eyebrow?: string;
  title: string;
  trailing?: ReactNode;
  subtitle?: string;
};

export function ScreenTitle({ eyebrow, title, trailing, subtitle }: Props) {
  const { colors, typography, spacing } = useAppTheme();

  return (
    <View style={{ marginBottom: spacing.md }}>
      {eyebrow ? (
        <Text
          style={[
            typography.caption,
            {
              color: 'rgba(255,255,255,0.38)',
              letterSpacing: 2.2,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            },
          ]}
        >
          {eyebrow}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.screenTitle, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[typography.caption, { marginTop: spacing.xs, color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
        {trailing}
      </View>
    </View>
  );
}
