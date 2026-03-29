import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { GOALS_BG_ELEVATED, GOALS_BORDER, GOALS_EMBED_MAX_W } from '@/features/goals/goalsNotionTheme';

export function ImageEmbed({
  uri,
  height,
  placeholder,
  alignLeft,
}: {
  uri: string | null;
  height: number;
  placeholder: ReactNode;
  alignLeft?: boolean;
}) {
  return (
    <View
      style={{
        alignSelf: alignLeft ? 'flex-start' : 'center',
        width: '100%',
        maxWidth: GOALS_EMBED_MAX_W,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: GOALS_BORDER,
        backgroundColor: GOALS_BG_ELEVATED,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height }} contentFit="cover" />
      ) : (
        <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>{placeholder}</View>
      )}
    </View>
  );
}
