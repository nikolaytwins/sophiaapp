import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
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
import { getSupabase } from '@/lib/supabase';
import { useAppTheme } from '@/theme';

export default function CloudScreen() {
  const { colors, typography, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
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

  const onSendMagicLink = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      Alert.alert('Email', 'Введи корректный email');
      return;
    }
    setBusy(true);
    try {
      const redirectTo = Linking.createURL('auth/callback');
      const { error } = await sb.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
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
        <Stack.Screen options={{ title: 'Облако', headerShown: true }} />
        <View style={[styles.center, { padding: spacing.xl, paddingTop: insets.top + 24 }]}>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
            В проекте не заданы EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY. Скопируй
            sophia.env.template → sophia.env, заполни ключи и перезапусти Expo.
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
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: radius.md,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.text,
                  fontSize: 16,
                  marginBottom: spacing.lg,
                }}
              />
              <Pressable
                onPress={() => void onSendMagicLink()}
                disabled={busy}
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  borderRadius: radius.lg,
                  alignItems: 'center',
                  backgroundColor: pressed ? 'rgba(168,85,247,0.35)' : '#A855F7',
                  opacity: busy ? 0.6 : 1,
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
                  marginTop: spacing.lg,
                  fontSize: 11,
                  lineHeight: 15,
                  color: 'rgba(255,255,255,0.38)',
                }}
              >
                Добавь в Supabase → Authentication → URL Configuration → Redirect URLs:{'\n'}
                {Linking.createURL('auth/callback')}
              </Text>
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
