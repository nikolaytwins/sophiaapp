import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';

import type { Habit } from '@/entities/models';

export function promptDeleteHabit(h: Habit, onConfirm: () => void) {
  if (Platform.OS !== 'web') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
  Alert.alert(
    'Удалить привычку?',
    `«${h.name}» исчезнет везде: День, Спринт, вкладка «Привычки». Связи целей со спринтом сбросятся.`,
    [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: onConfirm },
    ]
  );
}
