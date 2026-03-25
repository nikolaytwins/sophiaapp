import { Link, Stack } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';

export default function NotFoundScreen() {
  const { colors, typography } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          backgroundColor: colors.bg,
        },
        title: {
          textAlign: 'center',
        },
        link: {
          marginTop: 16,
          paddingVertical: 12,
        },
        linkText: {
          ...typography.body,
          color: colors.accent,
        },
      }),
    [colors, typography]
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Не найдено' }} />
      <View style={styles.container}>
        <Text style={[typography.title1, styles.title]}>Экран не существует.</Text>
        <Link href="/habits" style={styles.link}>
          <Text style={styles.linkText}>К привычкам</Text>
        </Link>
      </View>
    </>
  );
}
