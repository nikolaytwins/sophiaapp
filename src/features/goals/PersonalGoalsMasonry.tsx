import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Image as RNImage,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';

import { formatSideGoalDateCaption } from '@/features/goals/sideGoals.logic';
import type { SideGoalPersisted } from '@/stores/sideGoals.store';
import { useAppTheme } from '@/theme';

const GLASS_FILL = 'rgba(10, 10, 16, 0.78)';
const NEON_START = '#22d3ee';
const NEON_END = '#c084fc';

/** Пробелы по разрядам (как 40 000 000 ₽); ₽ для сумм от 100, чтобы не цеплять мелкие счётчики вроде «5 / 10». */
function formatSideGoalNumericCaption(goal: Pick<SideGoalPersisted, 'current' | 'target'>): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU').format(Math.round(Number(n))).replace(/\u00A0/g, ' ');
  const cur = fmt(goal.current);
  const tgt = fmt(goal.target);
  const moneyLike = goal.target >= 100;
  return moneyLike ? `${cur} / ${tgt} ₽` : `${cur} / ${tgt}`;
}

function GlassShell({
  children,
  borderRadius,
  style,
}: {
  children: ReactNode;
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
          borderWidth: 0,
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

/** Грубая оценка высоты для Masonry (учёт 2-колоночной сетки для нескольких фото). */
export function estimateGoalMasonryHeight(goal: SideGoalPersisted): number {
  const n = goal.photoUris?.length ?? 0;
  const descExtra = goal.description?.trim() ? 44 : 0;
  const header = 130 + descExtra;
  if (n === 0) return header;
  if (n === 1) return header + 200;
  const rows = Math.ceil(n / 2);
  const rowH = n >= 3 ? 148 : 168;
  return header + rows * rowH;
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

/** Одно фото: ширина = родитель, высота по пропорциям, `contain` без crop. */
function GoalPhotoNatural({ uri, onOpen }: { uri: string; onOpen?: () => void }) {
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

  const inner = (
    <View
      style={{
        width: '100%',
        borderRadius: 12,
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

  if (!onOpen) return inner;
  return (
    <Pressable onPress={onOpen} accessibilityRole="imagebutton" accessibilityLabel="Увеличить фото">
      {inner}
    </Pressable>
  );
}

/** Ряд из 1–2 фото на всю ширину родителя. */
function GoalPhotoRow({
  uris,
  baseIndex,
  onPhotoPress,
}: {
  uris: string[];
  baseIndex: number;
  onPhotoPress?: (index: number) => void;
}) {
  if (uris.length === 0) return null;
  if (uris.length === 1) {
    return (
      <GoalPhotoNatural
        uri={uris[0]!}
        onOpen={onPhotoPress ? () => onPhotoPress(baseIndex) : undefined}
      />
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 8, width: '100%', alignItems: 'flex-start' }}>
      {uris.map((uri, i) => (
        <View key={`${uri}-${i}`} style={{ flex: 1, minWidth: 0 }}>
          <GoalPhotoNatural
            uri={uri}
            onOpen={onPhotoPress ? () => onPhotoPress(baseIndex + i) : undefined}
          />
        </View>
      ))}
    </View>
  );
}

/**
 * Динамика по числу фото:
 * - 1 — на всю ширину карточки;
 * - 2 — один ряд, две колонки на 100% ширины;
 * - 3+ — сетка 2 колонки на всю ширину карточки (галереи вроде сессий — без узких полей по бокам).
 */
function GoalPhotosInCard({
  uris,
  onPhotoPress,
}: {
  uris: string[];
  onPhotoPress?: (index: number) => void;
}) {
  if (uris.length === 0) return null;

  const rows: string[][] = [];
  for (let i = 0; i < uris.length; i += 2) {
    rows.push(uris.slice(i, i + 2));
  }

  if (uris.length === 1) {
    return (
      <View style={{ marginTop: 2, gap: 10 }}>
        <GoalPhotoNatural uri={uris[0]!} onOpen={onPhotoPress ? () => onPhotoPress(0) : undefined} />
      </View>
    );
  }

  if (uris.length === 2) {
    return (
      <View style={{ marginTop: 2 }}>
        <GoalPhotoRow uris={uris} baseIndex={0} onPhotoPress={onPhotoPress} />
      </View>
    );
  }

  const grid = (
    <View style={{ gap: 10 }}>
      {rows.map((pair, ri) => (
        <GoalPhotoRow key={`row-${pair[0]}-${ri}`} uris={pair} baseIndex={ri * 2} onPhotoPress={onPhotoPress} />
      ))}
    </View>
  );

  return <View style={{ marginTop: 2, width: '100%' }}>{grid}</View>;
}

const BAR_HEIGHT = 18;

/** Полноэкранный просмотр фото цели со свайпом, если несколько. */
export function SideGoalPhotoLightboxModal({
  visible,
  uris,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  uris: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const safeIndex = Math.max(0, Math.min(initialIndex, Math.max(0, uris.length - 1)));

  useEffect(() => {
    if (!visible || uris.length === 0) return;
    const x = safeIndex * width;
    const t = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x, animated: false });
    });
    return () => cancelAnimationFrame(t);
  }, [visible, safeIndex, width, uris.length]);

  if (uris.length === 0) return null;

  const baseW = width - 24;
  const baseH = height * 0.58;
  const targetW = baseW * 1.5;
  const targetH = baseH * 1.5;
  const maxW = width - 8;
  const maxH = height * 0.8;
  const shrink = Math.min(1, maxW / targetW, maxH / targetH);
  const imgW = targetW * shrink;
  const imgH = targetH * shrink;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть просмотр"
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={{ flex: 1, justifyContent: 'center' }} pointerEvents="box-none">
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={uris.length > 1}
            keyboardShouldPersistTaps="handled"
            style={{ flexGrow: 0 }}
          >
            {uris.map((uri, i) => (
              <View
                key={`lb-${uri}-${i}`}
                style={{
                  width,
                  minHeight: height * 0.82,
                  justifyContent: 'center',
                  paddingHorizontal: 8,
                  paddingTop: 48,
                  paddingBottom: 32,
                }}
              >
                <Image
                  source={{ uri }}
                  style={{ width: imgW, height: imgH, alignSelf: 'center' }}
                  contentFit="contain"
                />
              </View>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{
              position: 'absolute',
              top: 52,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.45)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>×</Text>
          </Pressable>
          {uris.length > 1 ? (
            <Text
              style={{
                position: 'absolute',
                bottom: 28,
                alignSelf: 'center',
                color: 'rgba(255,255,255,0.55)',
                fontSize: 13,
                fontWeight: '700',
              }}
            >
              Свайп влево/вправо · {uris.length} фото
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type CardProps = {
  goal: SideGoalPersisted;
  onEdit: () => void;
  onView: () => void;
  onToggleOneShot?: (id: string, done: boolean) => void;
};

export function SideGoalMasonryCard({ goal, onEdit, onView, onToggleOneShot }: CardProps) {
  const { spacing } = useAppTheme();
  const photos = goal.photoUris ?? [];
  const hasPhoto = photos.length > 0;
  const pct = Math.min(1, Math.max(0, goal.target > 0 ? goal.current / goal.target : 0));
  const showNumericBar = goal.progressKind === 'numeric' && goal.target > 1;
  const showCheckbox =
    goal.progressKind === 'checkbox' || (goal.progressKind === 'numeric' && goal.target <= 1);
  const done = showCheckbox && goal.current >= goal.target;
  const dateCap = formatSideGoalDateCaption(goal);
  const scale = useRef(new Animated.Value(1)).current;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const onHoverIn = useCallback(() => {
    if (Platform.OS !== 'web') return;
    if (hasPhoto) {
      Animated.spring(scale, { toValue: 1.015, friction: 9, useNativeDriver: true }).start();
    }
  }, [hasPhoto, scale]);

  const onHoverOut = useCallback(() => {
    if (Platform.OS !== 'web') return;
    Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
  }, [scale]);

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

  const desc = goal.description?.trim();

  const titleBlock = (
    <View style={{ gap: 4 }}>
      {badges}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        {showCheckbox && onToggleOneShot ? (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              onToggleOneShot(goal.id, !done);
            }}
            hitSlop={10}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={done ? 'Выполнено' : 'Отметить выполненным'}
            style={{ paddingTop: 2 }}
          >
            <Ionicons
              name={done ? 'checkbox' : 'square-outline'}
              size={22}
              color={done ? '#a78bfa' : 'rgba(248,250,252,0.45)'}
            />
          </Pressable>
        ) : showCheckbox ? (
          <View style={{ paddingTop: 2 }} pointerEvents="none">
            <Ionicons
              name={done ? 'checkbox' : 'square-outline'}
              size={22}
              color={done ? '#a78bfa' : 'rgba(248,250,252,0.35)'}
            />
          </View>
        ) : null}
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.selectionAsync();
            onView();
          }}
          hitSlop={{ top: 4, bottom: 4 }}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Text numberOfLines={8} style={{ fontSize: 16, fontWeight: '800', color: '#FAFAFC', letterSpacing: -0.2 }}>
            {goal.title}
          </Text>
        </Pressable>
      </View>
      {desc ? (
        <Text numberOfLines={6} style={{ fontSize: 13, lineHeight: 18, fontWeight: '400', color: 'rgba(248,250,252,0.55)' }}>
          {desc}
        </Text>
      ) : null}
      {dateCap ? <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(248,250,252,0.5)' }}>{dateCap}</Text> : null}
      {showNumericBar ? (
        <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(248,250,252,0.55)', fontVariant: ['tabular-nums'] }}>
          {formatSideGoalNumericCaption(goal)}
        </Text>
      ) : null}
    </View>
  );

  const footerProgress = showNumericBar ? (
    <View
      style={{
        marginTop: 12,
        height: BAR_HEIGHT,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={[NEON_START, NEON_END]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: `${Math.round(pct * 1000) / 10}%`, height: '100%', borderRadius: 999 }}
      />
    </View>
  ) : null;

  return (
    <Pressable onHoverIn={onHoverIn} onHoverOut={onHoverOut}>
      <GlassShell borderRadius={20} style={{ padding: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>{titleBlock}</View>
          <Pressable
            onPress={() => {
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
            }}
          >
            <Ionicons name="create-outline" size={18} color="rgba(248,250,252,0.88)" />
          </Pressable>
        </View>
        {footerProgress}
        {hasPhoto ? (
          <Animated.View style={{ marginTop: spacing.md, transform: [{ scale }] }}>
            <GoalPhotosInCard uris={photos} onPhotoPress={(i) => setLightboxIndex(i)} />
          </Animated.View>
        ) : null}
      </GlassShell>
      <SideGoalPhotoLightboxModal
        visible={lightboxIndex != null && photos.length > 0}
        uris={photos}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />
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
  onViewGoal: (id: string) => void;
  onToggleOneShot?: (id: string, done: boolean) => void;
};

/** Pinterest-style колонки (баланс по высоте). На web дополнительно можно включить CSS masonry через style.web. */
export function PersonalGoalsMasonryGrid({ goals, onEditGoal, onViewGoal, onToggleOneShot }: GridProps) {
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
            <SideGoalMasonryCard
              key={g.id}
              goal={g}
              onEdit={() => onEditGoal(g.id)}
              onView={() => onViewGoal(g.id)}
              onToggleOneShot={onToggleOneShot}
            />
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
