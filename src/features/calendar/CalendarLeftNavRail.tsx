import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, type Href, useRouter } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { calendarNeonOutlineWeb } from '@/features/calendar/calendarPremiumShell';
import { HABIT_HERO_SOPHIA_IMAGE } from '@/features/habits/HabitHero';
import { TAB_BAR_ROUTE_ORDER, TAB_HREF, TAB_ICONS, TAB_LABELS } from '@/navigation/tabBarCatalog';
import { useAppTheme } from '@/theme';

const RAIL_W_EXPANDED = 218;
const RAIL_W_COLLAPSED = 60;

type Props = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isLight: boolean;
  variant?: 'default' | 'v2';
};

function RailDayHero({ collapsed, isLight, isV2 }: { collapsed: boolean; isLight: boolean; isV2: boolean }) {
  const { colors, typography } = useAppTheme();
  const router = useRouter();
  const href = '/day' as Href;

  const expandedCard = (
    <View
      style={{
        marginTop: 4,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: isV2 ? 0 : 1,
        borderColor: isLight ? colors.border : 'rgba(167,139,250,0.32)',
        ...(Platform.OS === 'web'
          ? ({
              ...(isV2 ? {} : { boxShadow: '0 16px 48px rgba(0,0,0,0.62), 0 0 64px rgba(123,92,255,0.28), 0 0 100px rgba(244,114,182,0.1), inset 0 1px 0 rgba(255,255,255,0.06)' }),
            } as object)
          : { elevation: isV2 ? 0 : 10 }),
      }}
    >
      <View style={{ height: 132, position: 'relative' }}>
        <LinearGradient
          colors={isV2 ? ['#1A1535', '#171131'] : ['#141018', '#0a090f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {!isV2 ? <LinearGradient colors={['rgba(76,29,149,0.45)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} /> : null}
        <Image
          source={HABIT_HERO_SOPHIA_IMAGE}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          contentPosition={{ top: '8%', left: '50%' }}
        />
        <LinearGradient
          colors={isV2 ? ['transparent', 'rgba(11,9,24,0.9)'] : ['transparent', 'rgba(6,4,16,0.55)', 'rgba(6,4,16,0.92)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {!isV2 ? (
          <LinearGradient
            colors={['rgba(8,8,14,0.75)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.45, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, padding: 12, justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1.6, color: isV2 ? '#C49BFF' : 'rgba(196,181,253,0.75)' }}>СОФИЯ</Text>
          <Text style={[typography.title2, { color: '#F4F4F8', fontWeight: '800', fontSize: 17, marginTop: 4, letterSpacing: -0.3 }]}>
            День вместе
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 4 }}>Как на главном экране</Text>
        </View>
      </View>
    </View>
  );

  if (collapsed) {
    const avatar = (
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          overflow: 'hidden',
          borderWidth: isV2 ? 0 : 1,
          borderColor: isLight ? colors.border : 'rgba(167,139,250,0.45)',
          ...(Platform.OS === 'web'
            ? ({
              ...(isV2 ? {} : { boxShadow: '0 0 32px rgba(123,92,255,0.45), 0 0 56px rgba(244,114,182,0.12), 0 10px 28px rgba(0,0,0,0.55)' }),
            } as object)
            : { shadowColor: '#7C3AED', shadowOpacity: isV2 ? 0 : 0.35, shadowRadius: isV2 ? 0 : 10, shadowOffset: { width: 0, height: 4 }, elevation: isV2 ? 0 : 6 }),
        }}
      >
        <Image source={HABIT_HERO_SOPHIA_IMAGE} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="top" />
      </View>
    );
    if (Platform.OS === 'web') {
      return (
        <Link href={href} replace asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="Открыть день с Софией" style={{ alignItems: 'center', paddingVertical: 8 }}>
            {avatar}
          </Pressable>
        </Link>
      );
    }
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Открыть день с Софией"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(href);
        }}
        style={{ alignItems: 'center', paddingVertical: 8 }}
      >
        {avatar}
      </Pressable>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <Link href={href} replace asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="Открыть экран дня с Софией">
          {expandedCard}
        </Pressable>
      </Link>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Открыть экран дня с Софией"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(href);
      }}
    >
      {expandedCard}
    </Pressable>
  );
}

export function CalendarLeftNavRail({ collapsed, onToggleCollapsed, isLight, variant = 'default' }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, brand, typography } = useAppTheme();
  const router = useRouter();
  const isV2 = variant === 'v2' && !isLight;
  const w = collapsed ? RAIL_W_COLLAPSED : RAIL_W_EXPANDED;
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);

  const shell = useMemo(() => {
    if (!isLight) {
      return {
        backgroundColor: isV2 ? '#1A1535' : '#050308',
        borderRadius: 0,
        borderWidth: 0,
      };
    }
    return {
      backgroundColor: colors.surface2,
      borderRadius: 0,
      borderWidth: 1,
      borderColor: colors.border,
    };
  }, [colors.border, colors.surface2, isLight, isV2]);

  return (
    <View
      style={[
        {
          width: w,
          alignSelf: 'stretch',
          marginRight: 0,
          marginTop: 0,
          marginBottom: 0,
          marginLeft: 0,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 10,
          paddingHorizontal: collapsed ? 6 : 8,
          justifyContent: 'space-between',
          borderRightWidth: 1,
          borderRightColor: isLight ? colors.border : isV2 ? 'rgba(196,155,255,0.08)' : 'rgba(196,155,255,0.12)',
        },
        shell as object,
      ]}
    >
      <View>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleCollapsed();
          }}
          hitSlop={10}
          style={{
            alignSelf: collapsed ? 'center' : 'flex-end',
            paddingVertical: 8,
            paddingHorizontal: 4,
            marginBottom: 4,
          }}
          accessibilityLabel={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={22} color={colors.textMuted} />
        </Pressable>

        <View style={{ gap: 2 }}>
          {TAB_BAR_ROUTE_ORDER.map((routeName) => {
            const href = TAB_HREF[routeName] ?? (`/${routeName}` as Href);
            const focused = routeName === 'calendar';
            const hovered = hoveredRoute === routeName;
            const tint = isLight
              ? focused
                ? colors.accent
                : colors.textMuted
              : focused
                ? isV2
                  ? '#C49BFF'
                  : '#FFFFFF'
                : hovered
                  ? isV2
                    ? '#E2CCFF'
                    : 'rgba(255,255,255,0.85)'
                  : 'rgba(255,255,255,0.4)';
            const iconName = (TAB_ICONS[routeName] ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap;
            const label = TAB_LABELS[routeName] ?? routeName;

            const inner = (
              <Pressable
                onPress={
                  Platform.OS === 'web'
                    ? undefined
                    : () => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(href);
                      }
                }
                onHoverIn={() => Platform.OS === 'web' && setHoveredRoute(routeName)}
                onHoverOut={() => Platform.OS === 'web' && setHoveredRoute((cur) => (cur === routeName ? null : cur))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: collapsed ? 0 : 10,
                  paddingVertical: 10,
                  paddingHorizontal: collapsed ? 4 : 8,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: focused ? (isLight ? brand.primaryMuted : isV2 ? '#241C4A' : 'transparent') : 'transparent',
                  borderWidth: focused && !isLight && !isV2 ? 1 : 0,
                  borderColor: 'rgba(157, 107, 255, 0.5)',
                  ...(Platform.OS === 'web' && focused && !isLight && !isV2
                    ? ({
                        ...calendarNeonOutlineWeb(),
                        boxShadow:
                          '0 0 32px rgba(157,107,255,0.48), 0 0 56px rgba(123,92,255,0.32), 0 10px 24px rgba(0,0,0,0.45)',
                      } as object)
                    : {}),
                }}
              >
                {focused && !isLight && !isV2 ? (
                  <LinearGradient
                    colors={['#7B5CFF', '#9D6BFF', '#6D28D9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]}
                  />
                ) : null}
                <Ionicons name={iconName} size={22} color={tint} />
                {!collapsed ? (
                  <Text style={[typography.body, { fontSize: 13, fontWeight: '700', color: tint, flex: 1 }]} numberOfLines={1}>
                    {label}
                  </Text>
                ) : null}
              </Pressable>
            );

            if (Platform.OS === 'web') {
              return (
                <Link key={routeName} href={href} replace asChild>
                  {inner}
                </Link>
              );
            }
            return <Fragment key={routeName}>{inner}</Fragment>;
          })}
        </View>
      </View>

      <View style={{ paddingTop: 8 }}>
        <RailDayHero collapsed={collapsed} isLight={isLight} isV2={isV2} />
      </View>
    </View>
  );
}
