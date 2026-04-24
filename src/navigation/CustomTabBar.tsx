import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Link, type Href } from 'expo-router';
import { Fragment, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_ROUTE_ORDER, TAB_HREF, TAB_ICONS, TAB_LABELS } from '@/navigation/tabBarCatalog';
import { useAppTheme } from '@/theme';

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
          /**
           * На web экраны root Stack (habit-new и т.д.) должны оставаться выше таббара по z-index.
           * Слишком большой z-index здесь приводил к тому, что таббар перехватывал клики поверх карточных экранов.
           */
          zIndex: Platform.OS === 'web' ? 20 : 1000,
          elevation: Platform.OS === 'web' ? 0 : 24,
        },
        barOuter: {
          maxWidth: 520,
          width: '100%',
          borderRadius: 28,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isLight ? colors.border : 'rgba(255,255,255,0.08)',
          ...shadows.card,
        },
        blurFill: {
          width: '100%',
          ...(Platform.OS === 'web'
            ? {
                backgroundColor: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(10,10,14,0.94)',
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
        label: {
          ...typography.caption,
          fontSize: 10,
          marginTop: 4,
          textAlign: 'center',
        },
      }),
    [colors, isLight, shadows, typography]
  );

  const visibleRoutes = TAB_BAR_ROUTE_ORDER.map((name) => state.routes.find((r) => r.name === name)).filter(
    (r): r is (typeof state.routes)[number] => r != null
  );

  const row = (
    <View style={styles.row}>
      {visibleRoutes.map((route) => {
        const indexInState = state.routes.findIndex((r) => r.key === route.key);
        const focused = state.index === indexInState;
        const { options } = descriptors[route.key];
        const label = (options.title as string) ?? TAB_LABELS[route.name] ?? route.name;

        const href = TAB_HREF[route.name] ?? (`/${route.name}` as Href);

        const onPress = () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (Platform.OS === 'web') return;
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

        const tint = focused ? (isLight ? colors.accent : '#A855F7') : colors.textMuted;
        const iconName = (TAB_ICONS[route.name] ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap;

        const normalBtn = (
          <Pressable
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

        if (Platform.OS === 'web') {
          return (
            <Link key={route.key} href={href} replace asChild>
              {normalBtn}
            </Link>
          );
        }

        return <Fragment key={route.key}>{normalBtn}</Fragment>;
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
