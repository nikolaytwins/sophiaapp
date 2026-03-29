import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { getEmailAuthRedirectUri } from '@/lib/authRedirectUri';
import { getSupabase } from '@/lib/supabase';
import { useAppTheme } from '@/theme';

type AuthPanel = 'login' | 'register' | 'magic';

const inputOutline = {
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
} as const;

export default function CloudScreen() {
  const { colors, typography, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [panel, setPanel] = useState<AuthPanel>('login');
  const [busy, setBusy] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) {
      setSessionEmail(null);
      return;
    }
    const { data: { session } } = await sb.auth.getSession();
    setSessionEmail(session?.user?.email ?? null);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const validateEmail = () => {
    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      Alert.alert('Email', 'Введи корректный email');
      return null;
    }
    return trimmed;
  };

  const onSignInPassword = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const trimmed = validateEmail();
    if (!trimmed) return;
    if (password.length < 6) {
      Alert.alert('Пароль', 'Минимум 6 символов');
      return;
    }
    setBusy(true);
    try {
      const { error } = await sb.auth.signInWithPassword({ email: trimmed, password });
      if (error) {
        Alert.alert('Не вышло', error.message);
        return;
      }
      await refreshSession();
    } finally {
      setBusy(false);
    }
  };

  const onSignUp = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const trimmed = validateEmail();
    if (!trimmed) return;
    if (password.length < 6) {
      Alert.alert('Пароль', 'Минимум 6 символов');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Пароли', 'Не совпадают');
      return;
    }
    setBusy(true);
    try {
      const { error } = await sb.auth.signUp({
        email: trimmed,
        password,
        options: { emailRedirectTo: getEmailAuthRedirectUri() },
      });
      if (error) {
        Alert.alert('Регистрация', error.message);
        return;
      }
      Alert.alert(
        'Проверь почту',
        'Если в проекте включено подтверждение email, открой письмо от Supabase. Потом войди с паролем здесь.'
      );
      setPanel('login');
    } finally {
      setBusy(false);
    }
  };

  const onSendMagicLink = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const trimmed = validateEmail();
    if (!trimmed) return;
    setBusy(true);
    try {
      const { error } = await sb.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: getEmailAuthRedirectUri() },
      });
      if (error) {
        Alert.alert('Не отправилось', error.message);
        return;
      }
      Alert.alert(
        'Проверь почту',
        'Открой письмо от Supabase и нажми ссылку — приложение подхватит вход.'
      );
    } finally {
      setBusy(false);
    }
  };

  const onForgotPassword = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const trimmed = validateEmail();
    if (!trimmed) return;
    setBusy(true);
    try {
      const { error } = await sb.auth.resetPasswordForEmail(trimmed, {
        redirectTo: getEmailAuthRedirectUri(),
      });
      if (error) {
        Alert.alert('Сброс', error.message);
        return;
      }
      Alert.alert('Почта', 'Если такой email есть в системе, придёт письмо со ссылкой для нового пароля.');
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    try {
      await sb.auth.signOut();
      await refreshSession();
      Alert.alert('Выход', 'Привычки снова только на этом устройстве (локально), пока не войдёшь снова.');
    } finally {
      setBusy(false);
    }
  };

  if (!useSupabaseConfigured) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Облако',
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A10' },
            headerTintColor: '#fff',
            headerTitleStyle: { color: '#fff' },
          }}
        />
        <View
          style={[
            styles.center,
            {
              flex: 1,
              padding: spacing.xl,
              paddingTop: insets.top + 24,
              backgroundColor: '#030304',
            },
          ]}
        >
          <Text style={[typography.body, { color: '#E5E7EB', textAlign: 'center', lineHeight: 22 }]}>
            В этой сборке не подставлены ключи Supabase (для веба они задаются в GitHub → Settings →
            Secrets → Actions: EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY, затем
            пересобери деплой). Локально: файл sophia.env в корне проекта.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{ marginTop: spacing.lg, padding: spacing.md }}
          >
            <Text style={{ color: '#A855F7', fontWeight: '600' }}>Назад</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Облако',
          headerShown: true,
          headerStyle: { backgroundColor: '#0A0A10' },
          headerTintColor: '#fff',
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#030304' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.lg,
                backgroundColor: 'rgba(168,85,247,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="cloud-outline" size={24} color="#A855F7" />
            </View>
            <Text style={[typography.title2, { color: colors.text, flex: 1 }]}>
              Синхронизация привычек
            </Text>
          </View>

          <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 22 }]}>
            Один вход — одни и те же отметки на телефоне и в браузере. Данные хранятся в твоём проекте
            Supabase.
          </Text>

          {sessionEmail ? (
            <View
              style={{
                padding: spacing.lg,
                borderRadius: radius.lg,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: 'rgba(168,85,247,0.25)',
                marginBottom: spacing.lg,
              }}
            >
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 6 }]}>
                Вошёл как
              </Text>
              <Text style={[typography.title1, { color: colors.text }]}>{sessionEmail}</Text>
              <Pressable
                onPress={() => void onSignOut()}
                disabled={busy}
                style={({ pressed }) => ({
                  marginTop: spacing.md,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderRadius: radius.md,
                  backgroundColor: pressed ? 'rgba(255,80,80,0.15)' : 'rgba(255,80,80,0.08)',
                })}
              >
                <Text style={{ color: '#f87171', fontWeight: '700' }}>Выйти из облака</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.lg }}>
                {(
                  [
                    { key: 'login' as const, label: 'Пароль' },
                    { key: 'register' as const, label: 'Регистрация' },
                    { key: 'magic' as const, label: 'Ссылка' },
                  ] as const
                ).map(({ key, label }) => {
                  const active = panel === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setPanel(key)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: radius.md,
                        backgroundColor: active ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.05)',
                        borderWidth: 1,
                        borderColor: active ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.08)',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: active ? '800' : '600',
                          color: active ? '#E9D5FF' : 'rgba(255,255,255,0.55)',
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ ...inputOutline, color: colors.text, marginBottom: spacing.md }}
              />

              {panel !== 'magic' ? (
                <>
                  <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                    Пароль
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    secureTextEntry
                    style={{ ...inputOutline, color: colors.text, marginBottom: panel === 'register' ? spacing.md : spacing.lg }}
                  />
                </>
              ) : null}

              {panel === 'register' ? (
                <>
                  <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                    Пароль ещё раз
                  </Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    secureTextEntry
                    style={{ ...inputOutline, color: colors.text, marginBottom: spacing.lg }}
                  />
                </>
              ) : null}

              {panel === 'login' ? (
                <>
                  <Pressable
                    onPress={() => void onSignInPassword()}
                    disabled={busy}
                    style={({ pressed }) => ({
                      paddingVertical: 14,
                      borderRadius: radius.lg,
                      alignItems: 'center',
                      backgroundColor: pressed ? 'rgba(168,85,247,0.35)' : '#A855F7',
                      opacity: busy ? 0.6 : 1,
                      marginBottom: spacing.md,
                    })}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Войти</Text>
                    )}
                  </Pressable>
                  <Pressable onPress={() => void onForgotPassword()} style={{ alignSelf: 'center', marginBottom: spacing.lg }}>
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textDecorationLine: 'underline' }}>
                      Забыли пароль?
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {panel === 'register' ? (
                <Pressable
                  onPress={() => void onSignUp()}
                  disabled={busy}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    borderRadius: radius.lg,
                    alignItems: 'center',
                    backgroundColor: pressed ? 'rgba(168,85,247,0.35)' : '#A855F7',
                    opacity: busy ? 0.6 : 1,
                    marginBottom: spacing.lg,
                  })}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Создать аккаунт</Text>
                  )}
                </Pressable>
              ) : null}

              {panel === 'magic' ? (
                <>
                  <Pressable
                    onPress={() => void onSendMagicLink()}
                    disabled={busy}
                    style={({ pressed }) => ({
                      paddingVertical: 14,
                      borderRadius: radius.lg,
                      alignItems: 'center',
                      backgroundColor: pressed ? 'rgba(168,85,247,0.35)' : '#A855F7',
                      opacity: busy ? 0.6 : 1,
                      marginBottom: spacing.md,
                    })}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Выслать ссылку</Text>
                    )}
                  </Pressable>
                  <Text
                    selectable
                    style={{
                      fontSize: 11,
                      lineHeight: 15,
                      color: 'rgba(255,255,255,0.38)',
                    }}
                  >
                    Redirect URL в Supabase:{'\n'}
                    {getEmailAuthRedirectUri()}
                  </Text>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
});
