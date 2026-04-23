import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { CAL_PAGE_BASE } from '@/features/calendar/calendarPremiumShell';

/** Радиальные «орбы» + пульсация света (AI-dashboard). */
export function CalendarAtmosphere() {
  const pulseA = useSharedValue(0.32);
  const pulseB = useSharedValue(0.22);

  useEffect(() => {
    pulseA.value = withRepeat(withTiming(0.78, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true);
    pulseB.value = withRepeat(withTiming(0.62, { duration: 6800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulseA, pulseB]);

  const orbStyleA = useAnimatedStyle(() => ({
    opacity: pulseA.value,
    transform: [{ scale: 0.96 + pulseA.value * 0.06 }],
  }));
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
        colors={['rgba(123,92,255,0.45)', 'rgba(30,27,75,0.15)', 'transparent']}
        start={{ x: 0.15, y: 0.1 }}
        end={{ x: 0.85, y: 0.95 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -120,
            left: -160,
            width: 620,
            height: 620,
            borderRadius: 310,
          },
          orbStyleA,
        ]}
      >
        <LinearGradient
          colors={['rgba(123,92,255,0.65)', 'rgba(99,102,241,0.12)', 'transparent']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.95, y: 0.9 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 310 }]}
        />
      </Animated.View>
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
          colors={['rgba(56,189,248,0.5)', 'rgba(15,23,42,0.08)', 'transparent']}
          start={{ x: 0.9, y: 0.15 }}
          end={{ x: 0.1, y: 0.85 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 260 }]}
        />
      </Animated.View>
      <View style={{ position: 'absolute', bottom: -80, left: '12%', width: 480, height: 380, borderRadius: 240, opacity: 0.55 }}>
        <LinearGradient
          colors={['rgba(244,114,182,0.38)', 'rgba(88,28,135,0.14)', 'transparent']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 240 }]}
        />
      </View>
      <View style={{ position: 'absolute', top: '38%', left: '-8%', width: 340, height: 340, borderRadius: 170, opacity: 0.35 }}>
        <LinearGradient
          colors={['rgba(99,102,241,0.35)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 170 }]}
        />
      </View>
    </View>
  );
}
