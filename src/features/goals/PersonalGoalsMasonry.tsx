import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Image as RNImage, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';

import { formatSideGoalDateCaption } from '@/features/goals/sideGoals.logic';
import type { SideGoalPersisted } from '@/stores/sideGoals.store';
import { useAppTheme } from '@/theme';

const SILVER_BORDER = 'rgba(230, 232, 245, 0.34)';
const SILVER_BORDER_SOFT = 'rgba(230, 232, 245, 0.2)';
const SILVER_GLOW = 'rgba(248, 250, 252, 0.5)';
const GLASS_FILL = 'rgba(10, 10, 16, 0.78)';
const NEON_START = '#22d3ee';
const NEON_END = '#c084fc';

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
  return (
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
              backgroundColor: 'rgba(255,255,255,0.05)',
              ...({
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              } as Record<string, string>),
            },
          ]}
        />
      ) : (
        <BlurView
          intensity={isLight ? 40 : 38}
          tint="dark"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
        />
      )}
      <View style={{ position: 'relative' }}>{children}</View>
    </View>
  );
}

/** Грубая оценка высоты для балансировки колонок Masonry (фото — вертикальный стек без обрезки). */
export function estimateGoalMasonryHeight(goal: SideGoalPersisted): number {
  const n = goal.photoUris?.length ?? 0;
  const header = 130;
  if (n === 0) return header;
  return header + n * 220;
}

export function distributeGoalsMasonryColumns(
  goals: SideGoalPersisted[],
  columnCount: number,
  gap: number
): SideGoalPersisted[][] {
  if (goals.length === 0) return [];
  const cols: SideGoalPersisted[][] = Array.from({ length: Math.max(1, columnCount) }, () => []);
  const heights = Array(columnCount).fill(0);
  for (const g of goals) {
    let j = 0;
    for (let i = 1; i < columnCount; i += 1) {
      if (heights[i]! < heights[j]!) j = i;
    }
    cols[j]!.push(g);
    heights[j]! += estimateGoalMasonryHeight(g) + gap;
  }
  return cols;
}

/** Одно фото внутри карточки: ширина = карточка, высота по натуральному соотношению сторон, без crop (`contain`). */
function GoalPhotoNatural({ uri }: { uri: string }) {
  const [aspectWH, setAspectWH] = useState<number | null>(null);

  const applySize = useCallback((w: number, h: number) => {
    if (w > 0 && h > 0) setAspectWH(w / h);
  }, []);

  const ratio = aspectWH && aspectWH > 0 ? aspectWH : 4 / 3;

  const onLoadMeta = useCallback(
    (e: { source?: unknown }) => {
      const src = e.source;
      if (src && typeof src === 'object' && 'width' in src && 'height' in src) {
        const sw = Number((src as { width?: number }).width);
        const sh = Number((src as { height?: number }).height);
        if (sw > 0 && sh > 0) applySize(sw, sh);
      } else if (Platform.OS !== 'web') {
        RNImage.getSize(uri, (iw, ih) => applySize(iw, ih), () => {});
      }
    },
    [applySize, uri]
  );

  return (
    <View
      style={{
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.22)',
      }}
    >
      <View style={{ width: '100%', aspectRatio: ratio }}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="contain"
          onLoad={onLoadMeta}
        />
      </View>
    </View>
  );
}

function GoalPhotosInCard({ uris }: { uris: string[] }) {
  if (uris.length === 0) return null;
  return (
    <View style={{ gap: 12, marginTop: 2 }}>
      {uris.map((uri, i) => (
        <GoalPhotoNatural key={`${uri}-${i}`} uri={uri} />
      ))}
    </View>
  );
}

type CardProps = {
  goal: SideGoalPersisted;
  onEdit: () => void;
  onToggleOneShot?: (id: string, done: boolean) => void;
};

export function SideGoalMasonryCard({ goal, onEdit, onToggleOneShot }: CardProps) {
  const { spacing } = useAppTheme();
  const photos = goal.photoUris ?? [];
  const hasPhoto = photos.length > 0;
  const pct = Math.min(1, Math.max(0, goal.target > 0 ? goal.current / goal.target : 0));
  const oneShot = goal.target <= 1;
  const done = oneShot && goal.current >= goal.target;
  const dateCap = formatSideGoalDateCaption(goal);
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const onHoverIn = useCallback(() => {
    if (Platform.OS !== 'web') return;
    setHovered(true);
    if (hasPhoto) {
      Animated.spring(scale, { toValue: 1.015, friction: 9, useNativeDriver: true }).start();
    }
  }, [hasPhoto, scale]);

  const onHoverOut = useCallback(() => {
    if (Platform.OS !== 'web') return;
    setHovered(false);
    Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
  }, [scale]);

  const borderColor = hovered && Platform.OS === 'web' ? SILVER_GLOW : SILVER_BORDER;

  const badges = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
      {goal.isHorizon ? (
        <View style={pill('#fbbf24', 'rgba(251,191,36,0.2)')}>
          <Text style={pillText}>Горизонт</Text>
        </View>
      ) : null}
      {goal.isNearestPinned ? (
        <View style={pill('#67e8f9', 'rgba(34,211,238,0.15)')}>
          <Text style={pillText}>Рядом</Text>
        </View>
      ) : null}
    </View>
  );

  const titleBlock = (
    <View style={{ gap: 4 }}>
      {badges}
      <Text numberOfLines={8} style={{ fontSize: 16, fontWeight: '800', color: '#FAFAFC', letterSpacing: -0.2 }}>
        {goal.title}
      </Text>
      {dateCap ? <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(248,250,252,0.5)' }}>{dateCap}</Text> : null}
      {!oneShot ? (
        <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(248,250,252,0.55)', fontVariant: ['tabular-nums'] }}>
          {goal.target >= 100_000
            ? `${new Intl.NumberFormat('ru-RU').format(Math.round(goal.current))} / ${new Intl.NumberFormat('ru-RU').format(Math.round(goal.target))} ₽`
            : `${goal.current} / ${goal.target}`}
        </Text>
      ) : null}
    </View>
  );

  const footerProgress =
    !oneShot && goal.target > 1 ? (
      <View style={{ marginTop: 10, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <LinearGradient
          colors={[NEON_START, NEON_END]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: `${Math.round(pct * 1000) / 10}%`, height: '100%' }}
        />
      </View>
    ) : null;

  const oneShotRow =
    oneShot && onToggleOneShot ? (
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          if (Platform.OS !== 'web') void Haptics.selectionAsync();
          onToggleOneShot(goal.id, !done);
        }}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}
      >
        <Ionicons name={done ? 'checkbox' : 'square-outline'} size={24} color={done ? '#a78bfa' : 'rgba(248,250,252,0.45)'} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(248,250,252,0.75)' }}>{done ? 'Сделано' : 'Отметить выполнение'}</Text>
      </Pressable>
    ) : oneShot ? (
      <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '700', color: 'rgba(248,250,252,0.5)' }}>{done ? 'Выполнено' : 'В работе'}</Text>
    ) : null;

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
          ? { shadowColor: '#f8fafc', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }
          : {}),
      })}
    >
      <GlassShell borderColor={borderColor} borderRadius={20} style={{ padding: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>{titleBlock}</View>
          <Pressable
            onPress={(e) => {
              (e as { stopPropagation?: () => void }).stopPropagation?.();
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              onEdit();
            }}
            hitSlop={8}
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.35)',
              borderWidth: 1,
              borderColor: SILVER_BORDER_SOFT,
            }}
          >
            <Ionicons name="create-outline" size={18} color="rgba(248,250,252,0.88)" />
          </Pressable>
        </View>
        {footerProgress}
        {oneShotRow}
        {hasPhoto ? (
          <Animated.View style={{ marginTop: spacing.md, transform: [{ scale }] }}>
            <GoalPhotosInCard uris={photos} />
          </Animated.View>
        ) : null}
      </GlassShell>
    </Pressable>
  );
}

const pillText = { fontSize: 9, fontWeight: '900' as const, letterSpacing: 0.8, color: 'rgba(250,250,252,0.88)' };
function pill(textColor: string, bg: string) {
  return {
    alignSelf: 'flex-start' as const,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: bg,
    borderWidth: 1,
    borderColor: `${textColor}55`,
  } as const;
}

type GridProps = {
  goals: SideGoalPersisted[];
  onEditGoal: (id: string) => void;
  onToggleOneShot?: (id: string, done: boolean) => void;
};

/** Pinterest-style колонки (баланс по высоте). На web дополнительно можно включить CSS masonry через style.web. */
export function PersonalGoalsMasonryGrid({ goals, onEditGoal, onToggleOneShot }: GridProps) {
  const { width } = useWindowDimensions();
  const gap = 12;
  const colCount = width >= 960 ? 3 : width >= 560 ? 2 : 1;
  const columns = useMemo(() => distributeGoalsMasonryColumns(goals, colCount, gap), [goals, colCount, gap]);

  if (goals.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: 'rgba(248,250,252,0.38)', fontWeight: '600' }}>
        Пока нет целей — нажми «Добавить цель».
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap }}>
      {columns.map((col, ci) => (
        <View key={`col-${ci}`} style={{ flex: 1, minWidth: 0, gap }}>
          {col.map((g) => (
            <SideGoalMasonryCard key={g.id} goal={g} onEdit={() => onEditGoal(g.id)} onToggleOneShot={onToggleOneShot} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Смешанный поток для «Все цели»: по кругу берём по одной цели из каждого раздела, без дубликатов. */
export function mergeGoalsRoundRobin(pools: SideGoalPersisted[][]): SideGoalPersisted[] {
  const seen = new Set<string>();
  const out: SideGoalPersisted[] = [];
  const push = (g: SideGoalPersisted) => {
    if (seen.has(g.id)) return;
    seen.add(g.id);
    out.push(g);
  };
  const queues = pools.map((p) => [...p]);
  while (queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const g = q.shift();
      if (g) push(g);
    }
  }
  return out;
}
