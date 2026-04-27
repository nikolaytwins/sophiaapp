import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';

import {
  formatSideGoalDateCaption,
  sideGoalDeadlineOnOrBefore,
} from '@/features/goals/sideGoals.logic';
import type { SideGoalPersisted } from '@/stores/sideGoals.store';
import { useAppTheme } from '@/theme';

const SILVER_BORDER = 'rgba(230, 232, 245, 0.32)';
const SILVER_BORDER_SOFT = 'rgba(230, 232, 245, 0.18)';
const SILVER_GLOW = 'rgba(248, 250, 252, 0.45)';
const GLASS_FILL = 'rgba(12, 12, 18, 0.72)';
const NEON_START = '#22d3ee';
const NEON_END = '#c084fc';

export type BentoTileSize = 'xlarge' | 'large' | 'medium' | 'small';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function GlassShell({
  children,
  borderColor,
  borderRadius,
  style,
}: {
  children: ReactNode;
  borderColor: string;
  borderRadius: number;
  style?: object;
}) {
  const { isLight } = useAppTheme();
  const inner = (
    <View
      style={[
        {
          borderRadius,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor,
          backgroundColor: Platform.OS === 'web' ? GLASS_FILL : 'transparent',
        },
        style,
      ]}
    >
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: 'rgba(255,255,255,0.06)',
              ...({
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
              } as Record<string, string>),
            },
          ]}
        />
      ) : (
        <BlurView
          intensity={isLight ? 48 : 36}
          tint="dark"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
        />
      )}
      <View style={{ position: 'relative' }}>{children}</View>
    </View>
  );
  return inner;
}

export function SideGoalBentoTile({
  goal,
  size,
  onEdit,
}: {
  goal: SideGoalPersisted;
  size: BentoTileSize;
  onEdit: () => void;
}) {
  const { spacing, colors } = useAppTheme();
  const pct = Math.min(1, Math.max(0, goal.target > 0 ? goal.current / goal.target : 0));
  const photos = goal.photoUris ?? [];
  const heroUri = photos[0];
  const dateCap = formatSideGoalDateCaption(goal);
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const onHoverIn = useCallback(() => {
    if (Platform.OS !== 'web') return;
    setHovered(true);
    Animated.spring(scale, { toValue: 1.06, friction: 6, useNativeDriver: true }).start();
  }, [scale]);

  const onHoverOut = useCallback(() => {
    if (Platform.OS !== 'web') return;
    setHovered(false);
    Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }).start();
  }, [scale]);

  const pad = size === 'xlarge' || size === 'large' ? spacing.lg : size === 'medium' ? spacing.md : spacing.sm;
  const titleSize = size === 'xlarge' || size === 'large' ? 20 : size === 'medium' ? 16 : 13;
  const minH =
    size === 'xlarge' ? 260 : size === 'large' ? 220 : size === 'medium' ? 148 : 112;
  const radius = size === 'small' ? 16 : 20;
  const borderColor = hovered && Platform.OS === 'web' ? SILVER_GLOW : SILVER_BORDER;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onEdit();
      }}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === 'web' && hovered
          ? {
              shadowColor: '#f8fafc',
              shadowOpacity: 0.35,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 0 },
            }
          : {}),
      })}
    >
      <GlassShell borderColor={borderColor} borderRadius={radius + 1} style={{ minHeight: minH }}>
        <View style={{ minHeight: minH, flex: 1, overflow: 'hidden', borderRadius: radius }}>
          {heroUri ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  transform: [{ scale }],
                },
              ]}
            >
              <Image source={{ uri: heroUri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            </Animated.View>
          ) : (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <Ionicons name="sparkles-outline" size={size === 'small' ? 22 : 32} color="rgba(248,250,252,0.25)" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(6,6,10,0.5)', 'rgba(6,6,10,0.92)']}
            locations={[0, 0.45, 1]}
            style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}
          />
          <View style={{ flex: 1, justifyContent: 'flex-end', padding: pad, paddingBottom: pad + 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                {goal.isHorizon ? (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      paddingVertical: 2,
                      paddingHorizontal: 7,
                      borderRadius: 7,
                      backgroundColor: 'rgba(248,250,252,0.08)',
                      borderWidth: 1,
                      borderColor: SILVER_BORDER,
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '900', letterSpacing: 1, color: 'rgba(248,250,252,0.75)' }}>
                      ГОРИЗОНТ
                    </Text>
                  </View>
                ) : null}
                {goal.isNearestPinned ? (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      paddingVertical: 2,
                      paddingHorizontal: 7,
                      borderRadius: 7,
                      backgroundColor: 'rgba(34,211,238,0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(34,211,238,0.35)',
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '900', letterSpacing: 1, color: 'rgba(165,243,252,0.95)' }}>
                      РЯДОМ
                    </Text>
                  </View>
                ) : null}
                <Text
                  numberOfLines={size === 'small' ? 2 : 3}
                  style={{
                    fontSize: titleSize,
                    fontWeight: '800',
                    color: colors.text,
                    letterSpacing: size === 'xlarge' ? -0.3 : 0,
                  }}
                >
                  {goal.title}
                </Text>
                {dateCap ? (
                  <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(248,250,252,0.55)' }}>{dateCap}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={(e) => {
                  if (typeof (e as { stopPropagation?: () => void })?.stopPropagation === 'function') {
                    (e as { stopPropagation: () => void }).stopPropagation();
                  }
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  onEdit();
                }}
                hitSlop={10}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  borderWidth: 1,
                  borderColor: SILVER_BORDER_SOFT,
                }}
              >
                <Ionicons name="create-outline" size={18} color="rgba(248,250,252,0.85)" />
              </Pressable>
            </View>
            <Text
              style={{
                marginTop: 8,
                fontSize: size === 'small' ? 11 : 12,
                fontWeight: '700',
                color: 'rgba(248,250,252,0.62)',
                fontVariant: ['tabular-nums'],
              }}
            >
              {goal.target <= 1
                ? goal.current >= goal.target
                  ? 'Выполнено'
                  : 'В работе'
                : goal.target >= 100_000
                  ? `${new Intl.NumberFormat('ru-RU').format(Math.round(goal.current))} из ${new Intl.NumberFormat('ru-RU').format(Math.round(goal.target))} ₽`
                  : `${goal.current} из ${goal.target}`}
            </Text>
          </View>
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 3,
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <LinearGradient
              colors={[NEON_START, NEON_END]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                width: `${Math.round(pct * 1000) / 10}%`,
                height: '100%',
              }}
            />
          </View>
        </View>
      </GlassShell>
    </Pressable>
  );
}

type MosaicCell = { uri: string; goalId: string; key: string };

function WishPhotoMosaic({ cells, onOpenGoal }: { cells: MosaicCell[]; onOpenGoal: (id: string) => void }) {
  const { spacing } = useAppTheme();
  if (cells.length === 0) {
    return (
      <View
        style={{
          minHeight: 120,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: SILVER_BORDER_SOFT,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
          backgroundColor: 'rgba(255,255,255,0.02)',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(248,250,252,0.38)', textAlign: 'center' }}>
          Добавь фото к желаниям — здесь соберётся визуальная доска.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
      {cells.map((c, i) => {
        const h = hashStr(c.key);
        const wide = h % 3 === 0 ? '46%' : h % 3 === 1 ? '31%' : '38%';
        const aspect = 0.85 + (h % 5) * 0.06;
        const rot = ((h % 7) - 3) * 0.6;
        return (
          <Pressable
            key={c.key}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              onOpenGoal(c.goalId);
            }}
            style={{
              width: wide,
              maxWidth: '48%',
            }}
          >
            <View
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: SILVER_BORDER,
                aspectRatio: aspect,
                transform: [{ rotate: `${rot}deg` }],
              }}
            >
              <Image source={{ uri: c.uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.45)']}
                style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ZoneHint({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        color: 'rgba(248,250,252,0.28)',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}
    >
      {text}
    </Text>
  );
}

export function GoalsNavigatorBento({
  calendarYear,
  nearestDeadlineCutoffKey,
  pinnedGoals,
  yearGoals,
  wishGoals,
  horizonGoals,
  otherYearGoals,
  nearestSlot,
  onEditGoal,
}: {
  calendarYear: number;
  nearestDeadlineCutoffKey: string;
  pinnedGoals: SideGoalPersisted[];
  yearGoals: SideGoalPersisted[];
  wishGoals: SideGoalPersisted[];
  horizonGoals: SideGoalPersisted[];
  otherYearGoals: SideGoalPersisted[];
  nearestSlot: ReactNode;
  onEditGoal: (id: string) => void;
}) {
  const { spacing } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;

  const nearestSide = useMemo(() => {
    const byId = new Map<string, SideGoalPersisted>();
    for (const g of pinnedGoals) byId.set(g.id, g);
    for (const g of yearGoals) {
      if (sideGoalDeadlineOnOrBefore(g, nearestDeadlineCutoffKey)) byId.set(g.id, g);
    }
    return [...byId.values()];
  }, [pinnedGoals, yearGoals, nearestDeadlineCutoffKey]);

  const yearTrack = useMemo(
    () => yearGoals.filter((g) => !sideGoalDeadlineOnOrBefore(g, nearestDeadlineCutoffKey)),
    [yearGoals, nearestDeadlineCutoffKey]
  );

  const mosaicCells = useMemo(() => {
    const out: MosaicCell[] = [];
    const pool = [...wishGoals, ...yearTrack];
    for (const g of pool) {
      const uris = g.photoUris ?? [];
      for (let i = 0; i < uris.length; i += 1) {
        out.push({ uri: uris[i], goalId: g.id, key: `${g.id}-${i}-${uris[i]}` });
      }
    }
    out.sort((a, b) => hashStr(a.key) - hashStr(b.key));
    return out.slice(0, 18);
  }, [wishGoals, yearTrack]);

  return (
    <View style={{ gap: spacing.xl + 4 }}>
      <View style={{ gap: spacing.md }}>
        <ZoneHint text="Навигатор · верх" />
        {nearestSide.length > 0 ? (
          <View
            style={{
              flexDirection: isWide ? 'row' : 'column',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            {nearestSide.map((g) => (
              <View key={g.id} style={{ flex: isWide ? 1 : undefined, minWidth: isWide ? 200 : undefined }}>
                <SideGoalBentoTile goal={g} size="medium" onEdit={() => onEditGoal(g.id)} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: 'rgba(248,250,252,0.35)', fontWeight: '600' }}>
            Закрепи «ближайшую» или поставь дедлайн до {nearestDeadlineCutoffKey.slice(5)} — карточки появятся здесь.
          </Text>
        )}
      </View>

      {yearTrack.length > 0 || otherYearGoals.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <ZoneHint text="На этот год" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[...yearTrack, ...otherYearGoals].map((g) => (
              <View key={g.id} style={{ width: isWide ? '48%' : '100%' }}>
                <SideGoalBentoTile goal={g} size="medium" onEdit={() => onEditGoal(g.id)} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ gap: spacing.md }}>
        <ZoneHint text="Визуальная доска" />
        <WishPhotoMosaic cells={mosaicCells} onOpenGoal={onEditGoal} />
        {wishGoals.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {wishGoals.map((g) => (
              <View key={g.id} style={{ width: isWide ? '31.5%' : '48%', flexGrow: 0 }}>
                <SideGoalBentoTile goal={g} size="small" onEdit={() => onEditGoal(g.id)} />
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.md }}>
        <ZoneHint text="Горизонт" />
        {horizonGoals.length === 0 ? (
          <Text style={{ fontSize: 13, color: 'rgba(248,250,252,0.35)', fontWeight: '600' }}>
            Большие цели «на горизонте» — отдельный ярус. Добавь цель и отметь «На горизонте».
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {horizonGoals.map((g) => (
              <View key={g.id} style={{ width: isWide ? '48%' : '100%' }}>
                <SideGoalBentoTile goal={g} size="xlarge" onEdit={() => onEditGoal(g.id)} />
              </View>
            ))}
          </View>
        )}
      </View>

      <View
        style={{
          gap: spacing.md,
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.sm,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(167,139,250,0.28)',
          backgroundColor: 'rgba(255,255,255,0.04)',
        }}
      >
        <ZoneHint text="Накопления · как отдельные счета" />
        {nearestSlot}
      </View>
    </View>
  );
}

export function nearestCutoffForAugust(calendarYear: number): string {
  return `${calendarYear}-08-14`;
}
