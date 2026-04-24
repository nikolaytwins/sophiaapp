import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  isProfileOwnerEmail,
  PROFILE_LOVE_CARDS,
  PROFILE_LOVE_SECTION_TITLE,
  PROFILE_ROOM_CARDS,
  PROFILE_ROOM_SECTION_TITLE,
} from '@/features/profile/profileAboutCopy';
import { uploadUserAvatarToStorage } from '@/features/profile/uploadUserAvatar';
import { useSupabaseConfigured } from '@/config/env';
import { useSupabaseAuthSession } from '@/hooks/useSupabaseAuthSession';
import { getSupabase } from '@/lib/supabase';
import { SOPHIA_UI_ACCENT } from '@/navigation/navConstants';
import { alertInfo } from '@/shared/lib/confirmAction';
import { useAppTheme } from '@/theme';

const AVATAR = 108;

export function ProfileAboutTab() {
  const { width } = useWindowDimensions();
  const { colors, typography, spacing, radius, isLight } = useAppTheme();
  const supabaseOn = useSupabaseConfigured;
  const { user, isAuthed, displayName, avatarUrl, email, loading: authLoading, refresh } = useSupabaseAuthSession();

  const [nameDraft, setNameDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const owner = isProfileOwnerEmail(email);
  const twoCol = width >= 560;
  const innerW = Math.max(0, width - 48);
  const colGap = 10;
  const colW = twoCol ? (innerW - colGap) / 2 : innerW;

  useEffect(() => {
    setNameDraft(displayName);
  }, [displayName]);

  const webPtr = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

  const onSaveName = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    setSavingProfile(true);
    try {
      const { error } = await sb.auth.updateUser({
        data: {
          full_name: nameDraft.trim() || null,
        },
      });
      if (error) {
        alertInfo('Профиль', error.message);
        return;
      }
      await refresh();
      alertInfo('Профиль', 'Имя сохранено');
    } finally {
      setSavingProfile(false);
    }
  }, [nameDraft, refresh, user]);

  const onPickAvatar = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) {
      alertInfo('Аватар', 'Войди в аккаунт');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alertInfo('Аватар', 'Нужен доступ к фотографиям');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;

    setUploadingAvatar(true);
    try {
      const up = await uploadUserAvatarToStorage(sb, user.id, picked.assets[0].uri);
      if ('error' in up) {
        alertInfo('Аватар', up.error);
        return;
      }
      const { error } = await sb.auth.updateUser({
        data: { avatar_url: up.publicUrl },
      });
      if (error) {
        alertInfo('Аватар', error.message);
        return;
      }
      await refresh();
      alertInfo('Аватар', 'Фото обновлено');
    } finally {
      setUploadingAvatar(false);
    }
  }, [refresh, user]);

  const cardBg = isLight ? colors.surface2 : '#16101f';
  const cardBorder = isLight ? colors.border : 'rgba(157, 107, 255, 0.22)';
  const serifTitle =
    Platform.OS === 'web'
      ? ({ fontFamily: 'Georgia, "Times New Roman", serif' } as const)
      : Platform.OS === 'ios'
        ? ({ fontFamily: 'Georgia' } as const)
        : ({} as const);

  if (!supabaseOn) {
    return (
      <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
        Подключи Supabase в окружении — тогда появится профиль и загрузка фото.
      </Text>
    );
  }

  if (authLoading) {
    return (
      <View style={{ paddingVertical: 48, alignItems: 'center' }}>
        <ActivityIndicator color={SOPHIA_UI_ACCENT} />
      </View>
    );
  }

  if (!isAuthed) {
    return (
      <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
        Войди через «Облако», чтобы увидеть профиль и имя.
      </Text>
    );
  }

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <Pressable
          onPress={() => void onPickAvatar()}
          disabled={uploadingAvatar}
          style={StyleSheet.flatten([
            {
              width: AVATAR,
              height: AVATAR,
              borderRadius: AVATAR / 2,
              overflow: 'hidden',
              borderWidth: 3,
              borderColor: isAuthed ? 'rgba(250,204,21,0.5)' : 'rgba(255,255,255,0.18)',
              backgroundColor: isLight ? colors.surface2 : 'rgba(115, 55, 221, 0.12)',
            },
            webPtr,
          ])}
        >
          {uploadingAvatar ? (
            <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator color={SOPHIA_UI_ACCENT} />
            </View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person" size={44} color={isLight ? colors.textMuted : 'rgba(233,213,255,0.85)'} />
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => void onPickAvatar()} disabled={uploadingAvatar} style={[{ marginTop: 12 }, webPtr]}>
          <Text style={{ color: SOPHIA_UI_ACCENT, fontWeight: '800', fontSize: 14 }}>
            {uploadingAvatar ? 'Загрузка…' : 'Сменить фото'}
          </Text>
        </Pressable>

        <Text
          style={[
            typography.sectionTitle,
            {
              marginTop: spacing.lg,
              textAlign: 'center',
              fontSize: 22,
              color: colors.text,
            },
          ]}
        >
          {displayName || 'Без имени'}
        </Text>

        <Text style={[typography.caption, { marginTop: spacing.xs, color: colors.textMuted }]}>{email}</Text>

        <Text style={[typography.caption, { marginTop: spacing.md, alignSelf: 'stretch', color: colors.textMuted }]}>
          Имя (как показываем в приложении)
        </Text>
        <TextInput
          value={nameDraft}
          onChangeText={setNameDraft}
          placeholder="Как к тебе обращаться"
          placeholderTextColor={isLight ? 'rgba(15,17,24,0.35)' : 'rgba(255,255,255,0.35)'}
          style={{
            alignSelf: 'stretch',
            marginTop: spacing.sm,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.text,
            borderColor: isLight ? 'rgba(15,17,24,0.12)' : 'rgba(157, 107, 255, 0.28)',
            backgroundColor: cardBg,
          }}
        />
        <Pressable
          onPress={() => void onSaveName()}
          disabled={savingProfile}
          style={StyleSheet.flatten([
            {
              alignSelf: 'stretch',
              marginTop: spacing.md,
              paddingVertical: 14,
              borderRadius: radius.lg,
              backgroundColor: 'rgba(115, 55, 221, 0.18)',
              borderWidth: 1,
              borderColor: 'rgba(115, 55, 221, 0.42)',
              alignItems: 'center',
              opacity: savingProfile ? 0.7 : 1,
            },
            webPtr,
          ])}
        >
          {savingProfile ? (
            <ActivityIndicator color={SOPHIA_UI_ACCENT} />
          ) : (
            <Text style={{ color: SOPHIA_UI_ACCENT, fontWeight: '800' }}>Сохранить имя</Text>
          )}
        </Pressable>
      </View>

      {!owner ? (
        <View
          style={{
            padding: spacing.lg,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: cardBorder,
            backgroundColor: cardBg,
          }}
        >
          <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
            Раздел «Обо мне» с расшифровкой оформлен для владельца аккаунта. У тебя всё равно есть имя, фото и вход в
            настройках.
          </Text>
        </View>
      ) : (
        <>
          <Text
            style={[
              typography.body,
              {
                marginBottom: spacing.lg,
                fontSize: 17,
                lineHeight: 24,
                fontWeight: '600',
                color: isLight ? colors.text : colors.accent,
                ...serifTitle,
              },
            ]}
          >
            {PROFILE_ROOM_SECTION_TITLE}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: colGap,
              marginBottom: spacing.xl * 1.25,
            }}
          >
            {PROFILE_ROOM_CARDS.map((c, idx) => (
              <View
                key={`room-${idx}`}
                style={{
                  width: colW,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  backgroundColor: cardBg,
                  overflow: 'hidden',
                  flexDirection: 'row',
                }}
              >
                <View style={{ width: 4, backgroundColor: c.accent }} />
                <View style={{ flex: 1, padding: spacing.md }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 1.1,
                      color: colors.textMuted,
                      marginBottom: 8,
                    }}
                  >
                    {c.label}
                  </Text>
                  <Text style={[typography.title2, { color: colors.text, fontWeight: '800', marginBottom: 8 }]}>
                    {c.title}
                  </Text>
                  <Text style={[typography.body, { color: colors.textMuted, lineHeight: 21 }]}>{c.body}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text
            style={[
              typography.caption,
              {
                marginBottom: spacing.md,
                fontSize: 11,
                letterSpacing: 1.2,
                fontWeight: '800',
                color: colors.textMuted,
              },
            ]}
          >
            {PROFILE_LOVE_SECTION_TITLE}
          </Text>

          <View style={{ gap: spacing.md }}>
            {PROFILE_LOVE_CARDS.map((c, idx) => (
              <View
                key={`love-${idx}`}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  backgroundColor: cardBg,
                  padding: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <Ionicons name="arrow-forward" size={20} color={isLight ? colors.accent : '#D4A574'} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.title2, { color: colors.text, fontWeight: '800', marginBottom: 8 }]}>
                    {c.title}
                  </Text>
                  <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>{c.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
