import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useSupabaseAuthSession } from '@/hooks/useSupabaseAuthSession';

const SIZE = 44;

type Props = {
  /** Смещение сверху для выравнивания с первой строкой заголовка */
  marginTop?: number;
};

/**
 * Аватар в шапке таб-экранов: гость / авторизован (фото из metadata.avatar_url).
 * Тап → /profile
 */
export function HeaderProfileAvatar({ marginTop = 2 }: Props) {
  const router = useRouter();
  const { isAuthed, avatarUrl, loading } = useSupabaseAuthSession();

  const onPress = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    router.push('/profile' as Href);
  };

  const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isAuthed ? 'Профиль' : 'Профиль · войти'}
      hitSlop={8}
      style={({ pressed }) =>
        StyleSheet.flatten([
          {
            marginTop,
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            overflow: 'hidden',
            opacity: pressed ? 0.88 : 1,
            borderWidth: 2,
            borderColor: isAuthed ? 'rgba(250,204,21,0.45)' : 'rgba(255,255,255,0.18)',
            backgroundColor: isAuthed ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.06)',
          },
          webPointer,
        ])
      }
    >
      {loading ? (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
      ) : avatarUrl && isAuthed ? (
        <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons
            name={isAuthed ? 'person' : 'person-outline'}
            size={22}
            color={isAuthed ? 'rgba(233,213,255,0.9)' : 'rgba(255,255,255,0.38)'}
          />
        </View>
      )}
    </Pressable>
  );
}
