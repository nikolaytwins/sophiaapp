import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View } from 'react-native';

import { CAL_PAGE_BASE } from '@/features/calendar/calendarPremiumShell';

/** Мягкие блобы только на web: центр за краем экрана + CSS blur — без «колец» поверх UI. */
function WebBlurWash() {
  if (Platform.OS !== 'web') return null;
  const blur = { filter: 'blur(100px)', WebkitFilter: 'blur(100px)' } as const;
  return (
    <>
      <View
        style={{
          position: 'absolute',
          width: 720,
          height: 720,
          borderRadius: 360,
          top: '-18%',
          left: '-32%',
          backgroundColor: 'rgba(123, 92, 255, 0.22)',
          opacity: 0.85,
          ...blur,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: 260,
          top: '8%',
          left: '-28%',
          backgroundColor: 'rgba(99, 102, 241, 0.12)',
          opacity: 0.7,
          ...blur,
        }}
      />
    </>
  );
}

/** Фон календаря: почти чёрный градиент + лёгкий диффузный свет (без резких кругов на фоне). */
export function CalendarAtmosphere() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={['#05030C', CAL_PAGE_BASE, '#000000']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(90,70,160,0.06)', 'rgba(20,18,32,0.04)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.92, y: 0.92 }}
        style={StyleSheet.absoluteFillObject}
      />
      <WebBlurWash />
    </View>
  );
}
