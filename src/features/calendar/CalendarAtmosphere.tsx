import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

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

/** Фон календаря: глубокий градиент + диффузный свет (без крупных кругов в углу под панелями). */
export function CalendarAtmosphere() {
  const pulseB = useSharedValue(0.22);

  useEffect(() => {
    pulseB.value = withRepeat(withTiming(0.62, { duration: 6800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulseB]);

  const orbStyleB = useAnimatedStyle(() => ({
    opacity: pulseB.value * 0.85,
    transform: [{ scale: 0.94 + pulseB.value * 0.05 }],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={['#0a0418', CAL_PAGE_BASE, '#020308']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(123,92,255,0.14)', 'rgba(30,27,75,0.08)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.92, y: 0.92 }}
        style={StyleSheet.absoluteFillObject}
      />
      <WebBlurWash />
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: '6%',
            right: -100,
            width: 520,
            height: 520,
            borderRadius: 260,
          },
          orbStyleB,
        ]}
      >
        <LinearGradient
          colors={['rgba(56,189,248,0.42)', 'rgba(15,23,42,0.06)', 'transparent']}
          start={{ x: 0.9, y: 0.15 }}
          end={{ x: 0.1, y: 0.85 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 260 }]}
        />
      </Animated.View>
      <View style={{ position: 'absolute', bottom: -80, left: '12%', width: 480, height: 380, borderRadius: 240, opacity: 0.42 }}>
        <LinearGradient
          colors={['rgba(244,114,182,0.28)', 'rgba(88,28,135,0.1)', 'transparent']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 240 }]}
        />
      </View>
    </View>
  );
}
