import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlobalVisionScreen } from '@/features/goals/GlobalVisionScreen';
import { GOALS_ACCENT } from '@/features/goals/goalsNotionTheme';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

/** Глобальное видение — отдельный экран; вкладка «Цели» = персональная доска. */
export default function GlobalVisionRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { spacing, typography } = useAppTheme();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/goals');
  };

  return (
    <ScreenCanvas>
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xs,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Pressable onPress={goBack} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="chevron-back" size={22} color={GOALS_ACCENT} />
          <Text style={[typography.body, { fontWeight: '800', color: GOALS_ACCENT }]}>К целям</Text>
        </Pressable>
      </View>
      <GlobalVisionScreen />
    </ScreenCanvas>
  );
}
