import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';

type Props = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, actionLabel, onActionPress }: Props) {
  const { colors, typography, spacing } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
          paddingHorizontal: 2,
        },
        title: {
          ...typography.caption,
          color: colors.textMuted,
          letterSpacing: 1.2,
        },
        action: {
          ...typography.caption,
          color: colors.accent,
        },
      }),
    [colors, typography, spacing.sm]
  );

  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {actionLabel ? (
        <Text onPress={onActionPress} style={styles.action}>
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}
