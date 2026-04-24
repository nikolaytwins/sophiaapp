import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitsManagePanel } from '@/features/habits/HabitsManagePanel';
import { ProfileAboutTab } from '@/features/profile/ProfileAboutTab';
import { SettingsAccountPanel } from '@/features/profile/SettingsAccountPanel';
import { SOPHIA_UI_ACCENT } from '@/navigation/navConstants';
import { TAB_HREF } from '@/navigation/tabBarCatalog';
import { useAppTheme } from '@/theme';

type TabId = 'about' | 'settings' | 'habits';

function parseTab(raw: string | string[] | undefined): TabId {
  const t = Array.isArray(raw) ? raw[0] : raw;
  if (t === 'settings' || t === 'habits') return t;
  return 'about';
}

export function ProfileScreen() {
  const { colors, typography, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const initial = useMemo(() => parseTab(params.tab), [params.tab]);
  const [tab, setTab] = useState<TabId>(initial);

  useEffect(() => {
    setTab(parseTab(params.tab));
  }, [params.tab]);

  const webPtr = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

  const goMain = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    router.replace(TAB_HREF.day as Href);
  }, [router]);

  const setRouteTab = (id: TabId) => {
    setTab(id);
    if (id === 'about') {
      router.replace('/profile' as Href);
    } else {
      router.replace(`/profile?tab=${id}` as Href);
    }
  };

  const headerOptions = useMemo(
    () => ({
      headerShown: true as const,
      title: 'Профиль',
      headerBackTitle: 'Назад',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerLeft: () => (
        <Pressable
          onPress={goMain}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Главная, экран День"
          style={({ pressed }) =>
            StyleSheet.flatten([
              {
                flexDirection: 'row',
                alignItems: 'center',
                marginLeft: Platform.OS === 'ios' ? 6 : 12,
                paddingVertical: 8,
                paddingRight: 10,
                opacity: pressed ? 0.75 : 1,
              },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {},
            ])
          }
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600', marginLeft: 2 }}>Главная</Text>
        </Pressable>
      ),
    }),
    [colors.bg, colors.text, goMain]
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'about', label: 'Обо мне' },
    { id: 'settings', label: 'Настройки' },
    { id: 'habits', label: 'Привычки' },
  ];

  return (
    <>
      <Stack.Screen options={headerOptions} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.xl * 2,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            {tabs.map(({ id, label }) => {
              const active = tab === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setRouteTab(id)}
                  style={StyleSheet.flatten([
                    {
                      flex: 1,
                      paddingVertical: 12,
                      alignItems: 'center',
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: active ? 'rgba(115, 55, 221, 0.55)' : colors.border,
                      backgroundColor: active ? 'rgba(115, 55, 221, 0.16)' : colors.surface2,
                    },
                    webPtr,
                  ])}
                >
                  <Text
                    style={{
                      fontWeight: '800',
                      color: active ? SOPHIA_UI_ACCENT : colors.textMuted,
                      fontSize: 13,
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'about' ? (
            <ProfileAboutTab />
          ) : tab === 'settings' ? (
            <SettingsAccountPanel />
          ) : (
            <HabitsManagePanel paddingBottom={spacing.lg} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
