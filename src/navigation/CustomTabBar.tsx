import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Link, type Href } from 'expo-router';
import { Fragment, useMemo } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_ROUTE_ORDER, TAB_HREF, TAB_ICONS, TAB_LABELS } from '@/navigation/tabBarCatalog';
import { useAppTheme } from '@/theme';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isLight, typography, shadows } = useAppTheme();
  const screenW = Dimensions.get('window').width;
  /** На узких нативных экранах только иконки — подписи в шапке (бургер). На web всегда полная полоса с подписями. */
  const iconsOnlyTabs = Platform.OS !== 'web' && screenW < 480;
  const tabMinW = iconsOnlyTabs ? 44 : screenW < 340 ? 42 : screenW < 380 ? 50 : screenW < 420 ? 56 : 62;
  const iconSize = screenW < 340 ? 22 : screenW < 380 ? 24 : 28;
  const labelSize = screenW < 340 ? 9 : screenW < 380 ? 10 : 11;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          paddingHorizontal: 8,
          /**
           * На web экраны root Stack (habit-new и т.д.) должны оставаться выше таббара по z-index.
           * Слишком большой z-index здесь приводил к тому, что таббар перехватывал клики поверх карточных экранов.
           */
          zIndex: Platform.OS === 'web' ? 20 : 1000,
          elevation: Platform.OS === 'web' ? 0 : 24,
        },
        barOuter: {
          alignSelf: 'center',
          maxWidth: Math.max(screenW - 14, 200),
          borderRadius: 28,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isLight ? colors.border : 'rgba(255,255,255,0.08)',
          ...shadows.card,
        },
        blurFill: {
          alignSelf: 'center',
          ...(Platform.OS === 'web'
            ? {
                backgroundColor: isLight ? 'rgba(255,255,255,0.94)' : 'rgba(10,10,14,0.94)',
              }
            : {}),
        },
        tabsRow: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingVertical: iconsOnlyTabs ? 10 : 12,
          paddingHorizontal: iconsOnlyTabs ? 6 : 12,
          gap: iconsOnlyTabs ? 4 : 10,
        },
        tab: {
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: iconsOnlyTabs ? 48 : 54,
          minWidth: tabMinW,
          paddingHorizontal: iconsOnlyTabs ? 2 : 4,
          paddingVertical: iconsOnlyTabs ? 4 : 6,
        },
        label: {
          ...typography.caption,
          fontSize: labelSize,
          fontWeight: '700',
          marginTop: 4,
          textAlign: 'center',
          maxWidth: 92,
          letterSpacing: -0.15,
        },
      }),
    [colors, isLight, shadows, typography, tabMinW, labelSize, screenW, iconsOnlyTabs]
  );

  const visibleRoutes = TAB_BAR_ROUTE_ORDER.map((name) => state.routes.find((r) => r.name === name)).filter(
    (r): r is (typeof state.routes)[number] => r != null
  );

  const tabsRow = visibleRoutes.map((route) => {
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
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <Ionicons name={iconName} size={iconSize} color={tint} />
            {iconsOnlyTabs ? null : (
              <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                {label}
              </Text>
            )}
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
      });

  const row = <View style={styles.tabsRow}>{tabsRow}</View>;

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
