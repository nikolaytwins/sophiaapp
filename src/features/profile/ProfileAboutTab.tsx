import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
import {
  PROFILE_CARD_BG_DARK,
  PROFILE_CARD_STRIPE,
  PROFILE_LIST_ICON,
  profileCardBorder,
  profileSectionEyebrow,
} from '@/features/profile/profileVisualTokens';
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

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const owner = isProfileOwnerEmail(email);
  const twoCol = width >= 560;
  const innerW = Math.max(0, width - 48);
  const colGap = 10;
  const colW = twoCol ? (innerW - colGap) / 2 : innerW;

  const webPtr = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

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

  const cardBg = isLight ? colors.surface2 : PROFILE_CARD_BG_DARK;
  const borderCol = profileCardBorder(isLight);
  const eyebrow = profileSectionEyebrow(isLight, colors.textMuted);

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
              borderWidth: 2,
              borderColor: isLight ? colors.borderStrong : 'rgba(115, 55, 221, 0.5)',
              backgroundColor: isLight ? colors.surface2 : 'rgba(115, 55, 221, 0.1)',
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
      </View>

      {!owner ? (
        <View
          style={{
            padding: spacing.lg,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: borderCol,
            backgroundColor: cardBg,
          }}
        >
          <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
            Раздел «Обо мне» с расшифровкой оформлен для владельца аккаунта. Имя и почту можно изменить во вкладке
            «Настройки».
          </Text>
        </View>
      ) : (
        <>
          <Text style={[typography.title2, { color: colors.text, fontWeight: '800', marginBottom: spacing.lg, lineHeight: 24 }]}>
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
                  borderColor: borderCol,
                  backgroundColor: cardBg,
                  overflow: 'hidden',
                  flexDirection: 'row',
                }}
              >
                <View style={{ width: 3, backgroundColor: PROFILE_CARD_STRIPE, opacity: 0.85 }} />
                <View style={{ flex: 1, padding: spacing.md }}>
                  <Text style={[eyebrow, { marginBottom: 6 }]}>{c.label}</Text>
                  <Text style={[typography.title2, { color: colors.text, fontWeight: '800', marginBottom: 8 }]}>
                    {c.title}
                  </Text>
                  <Text style={[typography.body, { color: colors.textMuted, lineHeight: 21 }]}>{c.body}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 0.85,
              color: colors.textMuted,
              marginBottom: spacing.md,
              lineHeight: 16,
            }}
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
                  borderColor: borderCol,
                  backgroundColor: cardBg,
                  padding: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isLight ? 'rgba(91, 75, 255, 0.65)' : PROFILE_LIST_ICON}
                  style={{ marginTop: 3 }}
                />
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
