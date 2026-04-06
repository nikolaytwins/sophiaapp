import { Ionicons } from '@expo/vector-icons';
import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSupabaseConfigured } from '@/config/env';
import { HabitsManagePanel } from '@/features/habits/HabitsManagePanel';
import { useSupabaseAuthSession } from '@/hooks/useSupabaseAuthSession';
import { getSupabase } from '@/lib/supabase';
import { alertInfo } from '@/shared/lib/confirmAction';
import { useAppTheme } from '@/theme';

const ACCENT = '#A855F7';

const inputBase = {
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  color: '#FAFAFC',
} as const;

type TabId = 'profile' | 'habits';

export function SettingsScreen() {
  const { colors, typography, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const supabaseOn = useSupabaseConfigured;
  const { user, isAuthed, displayName, avatarUrl, email, loading: authLoading, refresh } = useSupabaseAuthSession();

  const initialTab = useMemo((): TabId => {
    const t = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    return t === 'habits' ? 'habits' : 'profile';
  }, [params.tab]);

  const [tab, setTab] = useState<TabId>(initialTab);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const [nameDraft, setNameDraft] = useState('');
  const [avatarDraft, setAvatarDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [passNew, setPassNew] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) {
      setNameDraft('');
      setAvatarDraft('');
      setEmailDraft('');
      return;
    }
    setNameDraft(displayName);
    setAvatarDraft(avatarUrl ?? '');
    setEmailDraft(user.email ?? '');
  }, [user, displayName, avatarUrl]);

  const webPtr = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

  const onSaveProfile = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    setSavingProfile(true);
    try {
      const url = avatarDraft.trim();
      const { error } = await sb.auth.updateUser({
        data: {
          full_name: nameDraft.trim() || null,
          avatar_url: url.length > 0 ? url : null,
        },
      });
      if (error) {
        alertInfo('Профиль', error.message);
        return;
      }
      await refresh();
      alertInfo('Профиль', 'Сохранено');
    } finally {
      setSavingProfile(false);
    }
  }, [avatarDraft, nameDraft, refresh, user]);

  const onSaveEmail = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    const next = emailDraft.trim();
    if (!next.includes('@')) {
      alertInfo('Почта', 'Введи корректный email');
      return;
    }
    if (next === (user.email ?? '')) {
      alertInfo('Почта', 'Уже текущий адрес');
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await sb.auth.updateUser({ email: next });
      if (error) {
        alertInfo('Почта', error.message);
        return;
      }
      await refresh();
      alertInfo(
        'Почта',
        'Если в проекте включено подтверждение смены email, проверь входящие на старый и новый адрес.'
      );
    } finally {
      setSavingEmail(false);
    }
  }, [emailDraft, refresh, user]);

  const onSavePassword = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    if (passNew.length < 6) {
      alertInfo('Пароль', 'Минимум 6 символов');
      return;
    }
    if (passNew !== passConfirm) {
      alertInfo('Пароль', 'Поля не совпадают');
      return;
    }
    setSavingPass(true);
    try {
      const { error } = await sb.auth.updateUser({ password: passNew });
      if (error) {
        alertInfo('Пароль', error.message);
        return;
      }
      setPassNew('');
      setPassConfirm('');
      await refresh();
      alertInfo('Пароль', 'Обновлён');
    } finally {
      setSavingPass(false);
    }
  }, [passConfirm, passNew, refresh, user]);

  const onSignOut = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setSigningOut(true);
    try {
      await sb.auth.signOut();
      await refresh();
    } finally {
      setSigningOut(false);
    }
  }, [refresh]);

  const headerOptions = useMemo(
    () => ({
      headerShown: true as const,
      title: 'Настройки',
      headerBackTitle: 'Назад',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
    }),
    [colors.bg, colors.text]
  );

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
          <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
            {(['profile', 'habits'] as const).map((id) => {
              const active = tab === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setTab(id)}
                  style={StyleSheet.flatten([
                    {
                      flex: 1,
                      paddingVertical: 12,
                      alignItems: 'center',
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: active ? 'rgba(168,85,247,0.5)' : colors.border,
                      backgroundColor: active ? 'rgba(168,85,247,0.14)' : colors.surface,
                      marginRight: id === 'profile' ? spacing.sm : 0,
                    },
                    webPtr,
                  ])}
                >
                  <Text style={{ fontWeight: '800', color: active ? ACCENT : colors.textMuted, fontSize: 14 }}>
                    {id === 'profile' ? 'Профиль' : 'Привычки'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!supabaseOn ? (
            <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22, marginBottom: spacing.lg }]}>
              Добавь EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY в окружение — тогда войдёшь через экран «Облако»
              и профиль синхронизируется.
            </Text>
          ) : null}

          {tab === 'habits' ? (
            <HabitsManagePanel paddingBottom={spacing.lg} />
          ) : authLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={ACCENT} />
            </View>
          ) : !isAuthed ? (
            <View>
              <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22, marginBottom: spacing.md }]}>
                Войди в аккаунт — аватар и имя подтянутся из профиля, настройки почты и пароля станут доступны.
              </Text>
              <Pressable
                onPress={() => router.push('/cloud' as Href)}
                style={StyleSheet.flatten([
                  {
                    alignSelf: 'flex-start',
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderRadius: radius.lg,
                    backgroundColor: 'rgba(168,85,247,0.2)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.45)',
                  },
                  webPtr,
                ])}
              >
                <Text style={{ color: ACCENT, fontWeight: '800' }}>Открыть «Облако»</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>
                Аватар (URL картинки, https)
              </Text>
              <TextInput
                value={avatarDraft}
                onChangeText={setAvatarDraft}
                placeholder="https://…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="none"
                autoCorrect={false}
                style={[inputBase, { backgroundColor: colors.surface, marginBottom: spacing.md }]}
              />

              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm }]}>Имя</Text>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Как к тебе обращаться"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={[inputBase, { backgroundColor: colors.surface, marginBottom: spacing.md }]}
              />

              <Pressable
                onPress={() => void onSaveProfile()}
                disabled={savingProfile}
                style={StyleSheet.flatten([
                  {
                    paddingVertical: 14,
                    borderRadius: radius.lg,
                    backgroundColor: 'rgba(168,85,247,0.22)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.45)',
                    alignItems: 'center',
                    marginBottom: spacing.xl,
                    opacity: savingProfile ? 0.7 : 1,
                  },
                  webPtr,
                ])}
              >
                {savingProfile ? (
                  <ActivityIndicator color={ACCENT} />
                ) : (
                  <Text style={{ color: ACCENT, fontWeight: '800' }}>Сохранить профиль</Text>
                )}
              </Pressable>

              <Text style={[typography.title2, { color: colors.text, marginBottom: spacing.sm }]}>Почта</Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                Сейчас: {email ?? '—'}
              </Text>
              <TextInput
                value={emailDraft}
                onChangeText={setEmailDraft}
                placeholder="Новый email"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="none"
                keyboardType="email-address"
                style={[inputBase, { backgroundColor: colors.surface, marginBottom: spacing.md }]}
              />
              <Pressable
                onPress={() => void onSaveEmail()}
                disabled={savingEmail}
                style={StyleSheet.flatten([
                  {
                    paddingVertical: 14,
                    borderRadius: radius.lg,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    marginBottom: spacing.xl,
                    opacity: savingEmail ? 0.7 : 1,
                  },
                  webPtr,
                ])}
              >
                {savingEmail ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={{ color: colors.text, fontWeight: '800' }}>Сменить почту</Text>
                )}
              </Pressable>

              <Text style={[typography.title2, { color: colors.text, marginBottom: spacing.sm }]}>Пароль</Text>
              <TextInput
                value={passNew}
                onChangeText={setPassNew}
                placeholder="Новый пароль"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry
                style={[inputBase, { backgroundColor: colors.surface, marginBottom: spacing.sm }]}
              />
              <TextInput
                value={passConfirm}
                onChangeText={setPassConfirm}
                placeholder="Повтор пароля"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry
                style={[inputBase, { backgroundColor: colors.surface, marginBottom: spacing.md }]}
              />
              <Pressable
                onPress={() => void onSavePassword()}
                disabled={savingPass}
                style={StyleSheet.flatten([
                  {
                    paddingVertical: 14,
                    borderRadius: radius.lg,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    marginBottom: spacing.xl,
                    opacity: savingPass ? 0.7 : 1,
                  },
                  webPtr,
                ])}
              >
                {savingPass ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={{ color: colors.text, fontWeight: '800' }}>Сменить пароль</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => void onSignOut()}
                disabled={signingOut}
                style={StyleSheet.flatten([
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 14,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: 'rgba(248,113,113,0.35)',
                    backgroundColor: 'rgba(248,113,113,0.08)',
                    opacity: signingOut ? 0.7 : 1,
                  },
                  webPtr,
                ])}
              >
                <Ionicons name="log-out-outline" size={20} color="rgba(248,113,113,0.95)" />
                <Text style={{ marginLeft: 8, color: 'rgba(248,113,113,0.95)', fontWeight: '800' }}>
                  {signingOut ? 'Выход…' : 'Выйти'}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
