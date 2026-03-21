import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

const LABELS: Record<string, string> = {
  day: 'День',
  plan: 'План',
  sophia: 'София',
  habits: 'Ритм',
  finance: 'Финансы',
  esoterica: 'Эзо',
};

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  day: 'sunny-outline',
  plan: 'calendar-outline',
  sophia: 'sparkles',
  habits: 'fitness-outline',
  finance: 'wallet-outline',
  esoterica: 'planet-outline',
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isLight, typography, shadows } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          paddingHorizontal: 12,
        },
        barOuter: {
          maxWidth: 520,
          width: '100%',
          borderRadius: 28,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.card,
        },
        blurFill: {
          width: '100%',
          ...(Platform.OS === 'web'
            ? {
                backgroundColor: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(22,20,28,0.92)',
              }
            : {}),
        },
        row: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingVertical: 10,
          paddingHorizontal: 6,
        },
        tab: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
          paddingVertical: 4,
        },
        tabSophia: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -18,
        },
        sophiaOrb: {
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent,
          borderWidth: 3,
          borderColor: isLight ? colors.surface : colors.bg,
          ...shadows.card,
        },
        label: {
          ...typography.caption,
          fontSize: 10,
          marginTop: 4,
          textAlign: 'center',
        },
      }),
    [colors, isLight, shadows, typography]
  );

  const row = (
    <View style={styles.row}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = (options.title as string) ?? LABELS[route.name] ?? route.name;

        const onPress = () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        const isSophia = route.name === 'sophia';
        const tint = focused ? colors.accent : colors.textMuted;
        const iconName = ICONS[route.name] ?? 'ellipse-outline';

        if (isSophia) {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabSophia}
            >
              <View style={styles.sophiaOrb}>
                <Ionicons name={iconName} size={26} color="#FFFFFF" />
              </View>
              <Text style={[styles.label, { color: tint }]}>{label}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <Ionicons name={iconName} size={22} color={tint} />
            <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.barOuter}>
        {Platform.OS === 'web' ? (
          <View style={styles.blurFill}>{row}</View>
        ) : (
          <BlurView intensity={isLight ? 72 : 42} tint={isLight ? 'light' : 'dark'} style={styles.blurFill}>
            {row}
          </BlurView>
        )}
      </View>
    </View>
  );
}
