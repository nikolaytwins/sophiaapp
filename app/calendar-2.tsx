import { Platform, View } from 'react-native';

import { CalendarScreen } from '@/features/calendar/CalendarScreen';

/** Альтернативная версия календаря для визуального сравнения палитр. */
export default function CalendarTwoScreen() {
  return (
    <View
      style={{
        flex: 1,
        ...(Platform.OS === 'web'
          ? ({
              /* Смещение неоновой палитры в холодный blue/cyan диапазон (реф №3). */
              filter: 'hue-rotate(160deg) saturate(1.05) brightness(1.06)',
            } as object)
          : {}),
      }}
    >
      <CalendarScreen />
    </View>
  );
}
