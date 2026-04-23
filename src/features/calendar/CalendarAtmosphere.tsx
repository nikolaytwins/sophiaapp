import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { CAL_PAGE_BASE } from '@/features/calendar/calendarPremiumShell';

/** Атмосферный фон только для экрана календаря (тёмная тема). */
export function CalendarAtmosphere() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: CAL_PAGE_BASE }]} />
      <LinearGradient
        colors={['rgba(109,40,217,0.28)', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 0.85 }}
        style={{ position: 'absolute', top: -100, left: -140, width: 560, height: 560, borderRadius: 280 }}
      />
      <LinearGradient
        colors={['rgba(59,130,246,0.14)', 'transparent']}
        start={{ x: 0.9, y: 0.1 }}
        end={{ x: 0, y: 0.9 }}
        style={{ position: 'absolute', bottom: '8%', right: -80, width: 480, height: 480, borderRadius: 240 }}
      />
      <LinearGradient
        colors={['rgba(168,85,247,0.12)', 'transparent']}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={{ position: 'absolute', bottom: -60, left: '20%', width: 400, height: 320, borderRadius: 200 }}
      />
    </View>
  );
}
