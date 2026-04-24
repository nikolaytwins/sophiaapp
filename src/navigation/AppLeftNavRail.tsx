import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, type Href, usePathname, useRouter, useSegments } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HABIT_HERO_SOPHIA_IMAGE } from '@/features/habits/HabitHero';
import { SOPHIA_UI_ACCENT } from '@/navigation/navConstants';
import { TAB_BAR_ROUTE_ORDER, TAB_HREF, TAB_ICONS, TAB_LABELS } from '@/navigation/tabBarCatalog';
import { useAppTheme } from '@/theme';

const RAIL_W_EXPANDED = 218;
const RAIL_W_COLLAPSED = 60;

/** Фон бокового меню: плоский тёмный, без «стекла» и без свечения по краям. */
export const APP_NAV_RAIL_BG_DARK = '#05040b';

const RAIL_ITEM_ACTIVE_SOLID = SOPHIA_UI_ACCENT;

function routeNameFromPathname(pathname: string): string | null {
  const p = pathname.split('?')[0] ?? '';
  for (const name of TAB_BAR_ROUTE_ORDER) {
    const href = String(TAB_HREF[name] ?? `/${name}`);
    if (p === href || p.startsWith(`${href}/`)) return name;
  }
  return null;
}

function RailDayHero({ collapsed, isLight }: { collapsed: boolean; isLight: boolean }) {
  const { colors, typography } = useAppTheme();
  const router = useRouter();
  const href = '/day' as Href;

  const expandedCard = (
    <View
      style={{
        marginTop: 4,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: isLight ? 1 : 0,
        borderColor: isLight ? colors.border : 'transparent',
        ...(Platform.OS === 'web' ? {} : { elevation: isLight ? 4 : 0 }),
      }}
    >
      <View style={{ height: 132, position: 'relative' }}>
        <LinearGradient
          colors={isLight ? ['#f4f4f8', '#e8e8ee'] : ['#0c0a12', '#08060e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Image
          source={HABIT_HERO_SOPHIA_IMAGE}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          contentPosition={{ top: '8%', left: '50%' }}
        />
        <LinearGradient
          colors={isLight ? ['transparent', 'rgba(255,255,255,0.75)'] : ['transparent', 'rgba(5,4,11,0.92)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, padding: 12, justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1.6, color: isLight ? colors.textMuted : 'rgba(196,181,253,0.7)' }}>СОФИЯ</Text>
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
          borderWidth: isLight ? 1 : 0,
          borderColor: isLight ? colors.border : 'transparent',
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

type Props = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isLight: boolean;
};

export function AppLeftNavRail({ collapsed, onToggleCollapsed, isLight }: Props) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();
  const { colors, brand, typography } = useAppTheme();
  const router = useRouter();
  const w = collapsed ? RAIL_W_COLLAPSED : RAIL_W_EXPANDED;
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);

  const activeRoute = useMemo(() => {
    const last = segments[segments.length - 1];
    const order = TAB_BAR_ROUTE_ORDER as unknown as readonly string[];
    if (last && order.includes(last)) return last;
    return routeNameFromPathname(pathname);
  }, [segments, pathname]);

  const shell = useMemo(() => {
    if (!isLight) {
      return {
        backgroundColor: APP_NAV_RAIL_BG_DARK,
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
  }, [colors.border, colors.surface2, isLight]);

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
          borderRightColor: isLight ? colors.border : 'rgba(255,255,255,0.06)',
        },
        shell as object,
      ]}
    >
      <View>
        {Platform.OS === 'web' ? (
          !collapsed ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <Image
                  source={require('../../assets/images/sophia-icon-1024.png')}
                  style={{ width: 28, height: 28, borderRadius: 7 }}
                  contentFit="cover"
                />
                <Text
                  style={[typography.screenTitle, { color: isLight ? colors.text : '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.25, flexShrink: 1 }]}
                  numberOfLines={1}
                >
                  Sophia
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onToggleCollapsed();
                }}
                hitSlop={10}
                style={{ paddingVertical: 8, paddingHorizontal: 4 }}
                accessibilityLabel="Свернуть меню"
              >
                <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Image
                source={require('../../assets/images/sophia-icon-1024.png')}
                style={{ width: 28, height: 28, borderRadius: 7 }}
                contentFit="cover"
              />
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onToggleCollapsed();
                }}
                hitSlop={10}
                style={{ paddingVertical: 8, paddingHorizontal: 4, marginTop: 6 }}
                accessibilityLabel="Развернуть меню"
              >
                <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          )
        ) : (
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
        )}

        <View style={{ gap: 2 }}>
          {TAB_BAR_ROUTE_ORDER.map((routeName) => {
            const href = TAB_HREF[routeName] ?? (`/${routeName}` as Href);
            const focused = activeRoute === routeName;
            const hovered = hoveredRoute === routeName;
            const tint = isLight
              ? focused
                ? colors.accent
                : colors.textMuted
              : focused
                ? '#FFFFFF'
                : hovered
                  ? 'rgba(255,255,255,0.72)'
                  : 'rgba(255,255,255,0.38)';
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
                  backgroundColor: focused ? (isLight ? brand.primaryMuted : RAIL_ITEM_ACTIVE_SOLID) : 'transparent',
                  borderWidth: 0,
                  borderColor: 'transparent',
                }}
              >
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
        <RailDayHero collapsed={collapsed} isLight={isLight} />
      </View>
    </View>
  );
}
