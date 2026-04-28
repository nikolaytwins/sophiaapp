import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme';

/**
 * Нативные клиенты: полный HTML-хаб не вшиваем в бандл.
 * Смотри веб-версию (`StrategyVisionHubEmbed.web.tsx`).
 */
export function StrategyVisionHubEmbed() {
  const { typography, colors, spacing } = useAppTheme();
  return (
    <View style={{ paddingVertical: spacing.md, paddingHorizontal: 2 }}>
      <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
        Интерактивный хаб «Стратегия и видение» (таймлайн, вкладки, графики) доступен в веб-версии Sophia — открой раздел «Стратегия» в браузере.
      </Text>
    </View>
  );
}
