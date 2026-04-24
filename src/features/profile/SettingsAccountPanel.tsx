import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSupabaseConfigured } from '@/config/env';
import { useSupabaseAuthSession } from '@/hooks/useSupabaseAuthSession';
import { getSupabase } from '@/lib/supabase';
import { SOPHIA_UI_ACCENT } from '@/navigation/navConstants';
import { alertInfo } from '@/shared/lib/confirmAction';
import { useAppTheme } from '@/theme';

function inputStyle(isLight: boolean, colors: { border: string; text: string }) {
  return {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderColor: isLight ? 'rgba(15,17,24,0.12)' : 'rgba(157, 107, 255, 0.28)',
    backgroundColor: isLight ? '#FFFFFF' : '#16101f',
  } as const;
}

export function SettingsAccountPanel() {
  const { colors, typography, spacing, radius, isLight } = useAppTheme();
  const router = useRouter();
  const supabaseOn = useSupabaseConfigured;
  const { user, isAuthed, email, loading: authLoading, refresh } = useSupabaseAuthSession();

  const [emailDraft, setEmailDraft] = useState('');
  const [passNew, setPassNew] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setEmailDraft(user?.email ?? '');
  }, [user]);

  const webPtr = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

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

  if (!supabaseOn) {
    return (
      <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
        Добавь EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY в окружение — тогда войдёшь через экран «Облако» и аккаунт
        синхронизируется.
      </Text>
    );
  }

  if (authLoading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator color={SOPHIA_UI_ACCENT} />
      </View>
    );
  }

  if (!isAuthed) {
    return (
      <View>
        <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22, marginBottom: spacing.md }]}>
          Войди в аккаунт — настройки почты и пароля станут доступны.
        </Text>
        <Pressable
          onPress={() => router.push('/cloud' as Href)}
          style={StyleSheet.flatten([
            {
              alignSelf: 'flex-start',
              paddingVertical: 14,
              paddingHorizontal: 20,
              borderRadius: radius.lg,
              backgroundColor: 'rgba(115, 55, 221, 0.18)',
              borderWidth: 1,
              borderColor: 'rgba(115, 55, 221, 0.45)',
            },
            webPtr,
          ])}
        >
          <Text style={{ color: SOPHIA_UI_ACCENT, fontWeight: '800' }}>Открыть «Облако»</Text>
        </Pressable>
      </View>
    );
  }

  const inp = inputStyle(isLight, colors);
  const ph = isLight ? 'rgba(15,17,24,0.35)' : 'rgba(255,255,255,0.35)';

  return (
    <View>
      <Text style={[typography.title2, { color: colors.text, marginBottom: spacing.sm }]}>Почта</Text>
      <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>Сейчас: {email ?? '—'}</Text>
      <TextInput
        value={emailDraft}
        onChangeText={setEmailDraft}
        placeholder="Новый email"
        placeholderTextColor={ph}
        autoCapitalize="none"
        keyboardType="email-address"
        style={[inp, { marginBottom: spacing.md }]}
      />
      <Pressable
        onPress={() => void onSaveEmail()}
        disabled={savingEmail}
        style={StyleSheet.flatten([
          {
            paddingVertical: 14,
            borderRadius: radius.lg,
            backgroundColor: isLight ? colors.surface2 : 'rgba(115, 55, 221, 0.12)',
            borderWidth: 1,
            borderColor: isLight ? colors.border : 'rgba(115, 55, 221, 0.35)',
            alignItems: 'center',
            marginBottom: spacing.xl,
            opacity: savingEmail ? 0.7 : 1,
          },
          webPtr,
        ])}
      >
        {savingEmail ? (
          <ActivityIndicator color={SOPHIA_UI_ACCENT} />
        ) : (
          <Text style={{ color: SOPHIA_UI_ACCENT, fontWeight: '800' }}>Сменить почту</Text>
        )}
      </Pressable>

      <Text style={[typography.title2, { color: colors.text, marginBottom: spacing.sm }]}>Пароль</Text>
      <TextInput
        value={passNew}
        onChangeText={setPassNew}
        placeholder="Новый пароль"
        placeholderTextColor={ph}
        secureTextEntry
        style={[inp, { marginBottom: spacing.sm }]}
      />
      <TextInput
        value={passConfirm}
        onChangeText={setPassConfirm}
        placeholder="Повтор пароля"
        placeholderTextColor={ph}
        secureTextEntry
        style={[inp, { marginBottom: spacing.md }]}
      />
      <Pressable
        onPress={() => void onSavePassword()}
        disabled={savingPass}
        style={StyleSheet.flatten([
          {
            paddingVertical: 14,
            borderRadius: radius.lg,
            backgroundColor: isLight ? colors.surface2 : 'rgba(255,255,255,0.04)',
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
  );
}
