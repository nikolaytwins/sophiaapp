import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { createElement, useMemo, useState } from 'react';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { GOALS_ACCENT, GOALS_BORDER } from '@/features/goals/goalsNotionTheme';
import { useAppTheme } from '@/theme';

export type GoalStreamBucket = 'near' | 'year' | 'horizon';

export type GoalStreamCard = {
  id: string;
  title: string;
  bucket: GoalStreamBucket;
  subtitle?: string;
  imageUris: string[];
  progress01?: number;
  progressLabel?: string;
  checked?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
};

type Props = {
  cards: GoalStreamCard[];
  onToggleCheck: (id: string) => void;
};

function firstColor(bucket: GoalStreamBucket): string {
  if (bucket === 'near') return 'rgba(56,189,248,0.3)';
  if (bucket === 'horizon') return 'rgba(52,211,153,0.26)';
  return 'rgba(168,85,247,0.3)';
}

function bucketLabel(bucket: GoalStreamBucket): string {
  if (bucket === 'near') return 'Ближайшие';
  if (bucket === 'horizon') return 'Горизонт';
  return 'Год';
}

function isLikelyLandscape(uri: string): boolean {
  return /\b(landscape|wide|horizontal)\b/i.test(uri);
}

function isLikelyPortrait(uri: string): boolean {
  return /\b(portrait|vertical)\b/i.test(uri);
}

function parseAspectHint(uri: string): number | null {
  const m = uri.match(/(?:[?&](?:w|width)=(\d+).*(?:h|height)=(\d+))|(?:[?&](?:h|height)=(\d+).*(?:w|width)=(\d+))/i);
  if (!m) return null;
  const a = Number(m[1] || m[4]);
  const b = Number(m[2] || m[3]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
  return a / b;
}

function GoalPhoto({ uri }: { uri: string }) {
  const hinted = useMemo(() => {
    const q = parseAspectHint(uri);
    if (q != null) return q;
    if (isLikelyLandscape(uri)) return 1.45;
    if (isLikelyPortrait(uri)) return 0.72;
    return 1;
  }, [uri]);
  const [ratio, setRatio] = useState<number>(hinted);

  return (
    <View style={{ width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.2)' }}>
      <Image
        source={{ uri }}
        contentFit="cover"
        transition={180}
        style={{ width: '100%', aspectRatio: Math.max(0.55, Math.min(1.85, ratio)) }}
        onLoad={(e) => {
          const w = e.source.width ?? 0;
          const h = e.source.height ?? 0;
          if (w > 0 && h > 0) setRatio(w / h);
        }}
      />
    </View>
  );
}

function GoalCardTile({ card, onToggleCheck }: { card: GoalStreamCard; onToggleCheck: (id: string) => void }) {
  const { colors } = useAppTheme();
  const hasPhoto = card.imageUris.length > 0;
  const photos = card.imageUris.slice(0, 4);
  const compact = !hasPhoto;

  return (
    <Pressable
      onPress={card.onPress}
      style={({ hovered, pressed }) => ({
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: compact ? 'rgba(203,213,225,0.45)' : 'rgba(203,213,225,0.32)',
        backgroundColor: compact ? 'rgba(15,17,24,0.58)' : 'rgba(9,10,14,0.56)',
        padding: compact ? 14 : 10,
        transform: [{ scale: pressed ? 0.995 : hovered ? 1.012 : 1 }],
        ...(Platform.OS === 'web'
          ? ({
              transition: 'transform 180ms ease, box-shadow 220ms ease, border-color 220ms ease',
              boxShadow: hovered
                ? '0 16px 42px rgba(0,0,0,0.5), 0 0 0 1px rgba(226,232,240,0.4), 0 0 30px rgba(148,163,184,0.32)'
                : '0 10px 28px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(12px) saturate(1.1)',
              WebkitBackdropFilter: 'blur(12px) saturate(1.1)',
            } as object)
          : {}),
      })}
    >
      {hasPhoto ? (
        <View style={{ gap: photos.length > 1 ? 8 : 0 }}>
          {photos.length === 1 ? (
            <GoalPhoto uri={photos[0]!} />
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, gap: 8 }}>
                <GoalPhoto uri={photos[0]!} />
                {photos[2] ? <GoalPhoto uri={photos[2]!} /> : null}
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <GoalPhoto uri={photos[1]!} />
                {photos[3] ? <GoalPhoto uri={photos[3]!} /> : null}
              </View>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(2,4,8,0.15)', 'rgba(2,4,8,0.82)']}
            locations={[0, 0.45, 1]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 132 }}
          />
          <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(226,232,240,0.9)', marginBottom: 4 }}>
              {bucketLabel(card.bucket)}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#F8FAFC' }} numberOfLines={3}>
              {card.title}
            </Text>
            {card.subtitle ? (
              <Text style={{ fontSize: 12, color: 'rgba(226,232,240,0.76)', marginTop: 6 }} numberOfLines={2}>
                {card.subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View>
          <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(226,232,240,0.8)', marginBottom: 6 }}>
            {bucketLabel(card.bucket)}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }} numberOfLines={4}>
            {card.title}
          </Text>
          {card.subtitle ? (
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }} numberOfLines={4}>
              {card.subtitle}
            </Text>
          ) : null}
        </View>
      )}

      <View style={{ marginTop: hasPhoto ? 10 : 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {card.progress01 != null ? (
          <View style={{ flex: 1 }}>
            <View style={{ height: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <LinearGradient
                colors={['#818CF8', '#8B5CF6', '#A855F7']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ width: `${Math.max(0, Math.min(100, Math.round(card.progress01 * 100)))}%`, height: '100%' }}
              />
            </View>
            {card.progressLabel ? (
              <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(226,232,240,0.72)', marginTop: 6 }}>
                {card.progressLabel}
              </Text>
            ) : null}
          </View>
        ) : (
          <Pressable
            onPress={() => onToggleCheck(card.id)}
            hitSlop={8}
            style={{ paddingVertical: 2, paddingHorizontal: 2 }}
          >
            <Ionicons
              name={card.checked ? 'checkbox' : 'square-outline'}
              size={20}
              color={card.checked ? '#94A3B8' : 'rgba(203,213,225,0.72)'}
            />
          </Pressable>
        )}

        {card.onEdit ? (
          <Pressable onPress={card.onEdit} hitSlop={10} style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(148,163,184,0.16)' }}>
            <Ionicons name="pencil" size={15} color="#E2E8F0" />
          </Pressable>
        ) : null}
      </View>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 1,
          backgroundColor: firstColor(card.bucket),
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(226,232,240,0.12)',
        }}
      />
    </Pressable>
  );
}

export function GoalsMasonryDashboard({ cards, onToggleCheck }: Props) {
  const { width } = useWindowDimensions();
  const cols = width >= 1320 ? 4 : width >= 1024 ? 3 : width >= 700 ? 2 : 1;

  if (cards.length === 0) {
    return (
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: GOALS_BORDER,
          paddingVertical: 28,
          paddingHorizontal: 16,
          backgroundColor: 'rgba(255,255,255,0.02)',
        }}
      >
        <Text style={{ textAlign: 'center', color: 'rgba(226,232,240,0.7)', fontWeight: '700' }}>
          Пока нет целей в выбранном фильтре.
        </Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return createElement(
      'div',
      {
        style: {
          display: 'grid',
          gap: '12px',
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: 'masonry',
          alignItems: 'start',
        },
      },
      cards.map((c) =>
        createElement('div', { key: c.id, style: { breakInside: 'avoid', display: 'block' } }, <GoalCardTile card={c} onToggleCheck={onToggleCheck} />)
      )
    );
  }

  const groups: GoalStreamCard[][] = Array.from({ length: cols }, () => []);
  for (let i = 0; i < cards.length; i++) groups[i % cols]!.push(cards[i]!);
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {groups.map((g, gi) => (
        <View key={`col-${gi}`} style={{ flex: 1, gap: 10 }}>
          {g.map((card) => (
            <GoalCardTile key={card.id} card={card} onToggleCheck={onToggleCheck} />
          ))}
        </View>
      ))}
    </View>
  );
}
