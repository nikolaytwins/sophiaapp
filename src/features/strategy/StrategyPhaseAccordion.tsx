import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';

import type {
  StrategyCheckpointDef,
  StrategyPhaseBadgeVariant,
  StrategyPhaseDef,
} from '@/features/strategy/strategy.config';
import { VIOLET, VIOLET_DEEP } from '@/features/strategy/StrategyHeader';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useAppTheme } from '@/theme';

const BADGE: Record<
  StrategyPhaseBadgeVariant,
  { bg: string; fg: string; border: string }
> = {
  now: {
    bg: 'rgba(250,250,252,0.94)',
    fg: '#0d0d0d',
    border: 'rgba(255,255,255,0.2)',
  },
  build: {
    bg: 'rgba(245,208,122,0.14)',
    fg: '#F5D078',
    border: 'rgba(245,208,122,0.35)',
  },
  growth: {
    bg: 'rgba(110,231,168,0.12)',
    fg: '#6EE7A8',
    border: 'rgba(110,231,168,0.35)',
  },
  launch: {
    bg: 'rgba(139,92,246,0.2)',
    fg: VIOLET,
    border: 'rgba(124,58,237,0.45)',
  },
  scale: {
    bg: 'rgba(125,211,192,0.12)',
    fg: '#7DD3C0',
    border: 'rgba(125,211,192,0.35)',
  },
  muted: {
    bg: 'rgba(255,255,255,0.06)',
    fg: 'rgba(247,244,250,0.62)',
    border: 'rgba(255,255,255,0.08)',
  },
};

function StrategyCheckpointRow({
  cp,
  checked,
  onToggle,
  disabled,
}: {
  cp: StrategyCheckpointDef;
  checked: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const { typography, spacing, radius, colors } = useAppTheme();

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        opacity: disabled ? 0.45 : 1,
        backgroundColor: pressed && !disabled ? 'rgba(139,92,246,0.08)' : 'transparent',
      })}
    >
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={22}
        color={checked ? VIOLET : colors.textMuted}
        style={{ marginTop: 1 }}
      />
      <Text
        style={[
          typography.body,
          {
            flex: 1,
            textDecorationLine: checked ? 'line-through' : 'none',
            color: checked ? colors.textMuted : colors.text,
          },
        ]}
      >
        {cp.text}
      </Text>
    </Pressable>
  );
}

function ColumnCard({
  title,
  checkpoints,
  checkedMap,
  onToggle,
  disabled,
}: {
  title: string;
  checkpoints: StrategyCheckpointDef[];
  checkedMap: Record<string, boolean>;
  onToggle: (id: string) => void;
  disabled: boolean;
}) {
  const { typography, spacing, brand, radius } = useAppTheme();

  return (
    <View
      style={{
        flex: 1,
        minWidth: 200,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: brand.surfaceBorder,
        backgroundColor: 'rgba(13,13,13,0.55)',
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <Text style={[typography.title2, { color: VIOLET_DEEP, fontSize: 14 }]}>{title}</Text>
      {checkpoints.map((cp) => (
        <StrategyCheckpointRow
          key={cp.id}
          cp={cp}
          checked={Boolean(checkedMap[cp.id])}
          onToggle={() => onToggle(cp.id)}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

type Props = {
  phase: StrategyPhaseDef;
  checkedMap: Record<string, boolean>;
  onToggleCheckpoint: (id: string) => void;
  readOnly: boolean;
};

export function StrategyPhaseAccordion({ phase, checkedMap, onToggleCheckpoint, readOnly }: Props) {
  const { typography, spacing, brand, radius, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const multiColumn = width >= 720;
  const [open, setOpen] = useState(Boolean(phase.initiallyOpen));
  const badge = BADGE[phase.badgeVariant];

  const body = useMemo(() => {
    if (phase.columns?.length) {
      return (
        <View
          style={{
            flexDirection: multiColumn ? 'row' : 'column',
            flexWrap: 'wrap',
            gap: spacing.md,
          }}
        >
          {phase.columns.map((col) => (
            <ColumnCard
              key={col.title}
              title={col.title}
              checkpoints={col.checkpoints}
              checkedMap={checkedMap}
              onToggle={onToggleCheckpoint}
              disabled={readOnly}
            />
          ))}
        </View>
      );
    }
    if (phase.months?.length) {
      return (
        <View style={{ gap: spacing.lg }}>
          {phase.months.map((m) => (
            <View key={m.title} style={{ gap: spacing.sm }}>
              <Text style={[typography.title2, { color: VIOLET }]}>{m.title}</Text>
              <View
                style={{
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: brand.surfaceBorder,
                  backgroundColor: 'rgba(13,13,13,0.45)',
                  paddingHorizontal: spacing.sm,
                }}
              >
                {m.checkpoints.map((cp) => (
                  <StrategyCheckpointRow
                    key={cp.id}
                    cp={cp}
                    checked={Boolean(checkedMap[cp.id])}
                    onToggle={() => onToggleCheckpoint(cp.id)}
                    disabled={readOnly}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    }
    return null;
  }, [phase, checkedMap, multiColumn, onToggleCheckpoint, readOnly, brand, radius, spacing, typography]);

  return (
    <AppSurfaceCard glow={open} padded style={{ padding: spacing.lg }}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') void Haptics.selectionAsync();
          setOpen((v) => !v);
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.md,
          marginBottom: open ? spacing.lg : 0,
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <View
          style={{
            paddingHorizontal: spacing.sm + 2,
            paddingVertical: spacing.xs + 1,
            borderRadius: radius.full,
            backgroundColor: badge.bg,
            borderWidth: 1,
            borderColor: badge.border,
          }}
        >
          <Text style={[typography.caption, { color: badge.fg, fontWeight: '700' }]}>{phase.badgeLabel}</Text>
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={[typography.title2, { fontSize: 16, lineHeight: 22 }]}>{phase.title}</Text>
          {phase.headerAside ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>{phase.headerAside}</Text>
          ) : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textMuted} />
      </Pressable>

      {open ? (
        <View style={{ gap: spacing.lg }}>
          {body}
          {phase.footnoteCard ? (
            <View
              style={{
                borderLeftWidth: 4,
                borderLeftColor: VIOLET_DEEP,
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                backgroundColor: 'rgba(13,13,13,0.72)',
                borderWidth: 1,
                borderColor: 'rgba(124,58,237,0.25)',
              }}
            >
              <Text style={[typography.body, { color: colors.text }]}>{phase.footnoteCard.text}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </AppSurfaceCard>
  );
}
