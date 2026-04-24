import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
    }),
    [colors.bg, colors.text]
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
