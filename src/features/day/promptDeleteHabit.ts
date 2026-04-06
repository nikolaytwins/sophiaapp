import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import type { Habit } from '@/entities/models';
import { confirmDestructive } from '@/shared/lib/confirmAction';

export function promptDeleteHabit(h: Habit, onConfirm: () => void) {
  if (Platform.OS !== 'web') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
  confirmDestructive({
    title: 'Удалить привычку?',
    message: `«${h.name}» исчезнет везде: День, Спринт, аналитика. Связи целей со спринтом сбросятся.`,
    onConfirm,
  });
}
