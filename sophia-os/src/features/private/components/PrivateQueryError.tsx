import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { privateColors } from '@/theme/privateTokens';

type Props = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function PrivateQueryError({ title = 'Нет данных с astro API', message, onRetry }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={[privateColors.bg, privateColors.plumDeep]} style={styles.grad}>
      <View style={[styles.box, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{message}</Text>
        <Text style={styles.hint}>
          Запусти в другом терминале: `npm run astro-api` (порт 8765). Открой в браузере тот же host, что и
          приложение (если http://localhost:8081 — API должен отвечать на http://localhost:8765). Проверка:
          открой в новой вкладке `http://localhost:8765/health` (или 127.0.0.1 — тот же host, что в адресной
          строке у :8081).
        </Text>
        {onRetry ? (
          <Pressable style={styles.btn} onPress={onRetry}>
            <Text style={styles.btnText}>Повторить</Text>
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  grad: { flex: 1 },
  box: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: privateColors.text, marginBottom: 12 },
  body: { fontSize: 14, color: privateColors.textSecondary, lineHeight: 21, marginBottom: 16 },
  hint: { fontSize: 12, color: privateColors.textMuted, lineHeight: 18 },
  btn: {
    marginTop: 20,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: privateColors.accent,
  },
  btnText: { color: privateColors.accent, fontWeight: '600', fontSize: 15 },
});
