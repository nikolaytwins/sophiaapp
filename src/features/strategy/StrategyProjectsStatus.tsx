import { Platform, Pressable, Text, View } from 'react-native';

import { STRATEGY, strategyEyebrow, strategySurfacePressStyle } from '@/features/strategy/strategyDashboardUi';
import type {
  ProjectsGridCardDef,
  ProjectsHighlightBadgeVariant,
  ProjectsHighlightCardDef,
  ProjectsMilestoneTagVariant,
  ProjectsStatusSectionDef,
} from '@/features/strategy/strategy.config';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useAppTheme } from '@/theme';

const BADGE_STYLES: Record<
  ProjectsHighlightBadgeVariant,
  { bg: string; border: string; text: string }
> = {
  fullGas: {
    bg: 'rgba(134,239,172,0.12)',
    border: 'rgba(134,239,172,0.28)',
    text: '#bbf7d0',
  },
  priority2: {
    bg: 'rgba(167,139,250,0.12)',
    border: 'rgba(167,139,250,0.28)',
    text: '#e9d5ff',
  },
  inside: {
    bg: 'rgba(147,197,253,0.12)',
    border: 'rgba(147,197,253,0.28)',
    text: '#bfdbfe',
  },
  october: {
    bg: 'rgba(251,146,60,0.12)',
    border: 'rgba(251,146,60,0.32)',
    text: '#fdba74',
  },
  year2026: {
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.12)',
    text: 'rgba(247,244,250,0.72)',
  },
};

const TAG_STYLES: Record<ProjectsMilestoneTagVariant, { color: string; border: string }> = {
  milestoneGreen: { color: '#86efac', border: 'rgba(134,239,172,0.35)' },
  milestoneOrange: { color: '#fb923c', border: 'rgba(251,146,60,0.35)' },
  milestoneBrown: { color: '#d6a577', border: 'rgba(180,83,9,0.32)' },
  milestoneGrey: { color: 'rgba(247,244,250,0.55)', border: 'rgba(255,255,255,0.16)' },
  milestoneBlue: { color: '#93c5fd', border: 'rgba(147,197,253,0.35)' },
};

function StatusBadge({ label, variant }: { label: string; variant: ProjectsHighlightBadgeVariant }) {
  const { typography, radius, spacing } = useAppTheme();
  const s = BADGE_STYLES[variant];
  return (
    <View
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: radius.full,
        backgroundColor: s.bg,
        borderWidth: 1,
        borderColor: s.border,
      }}
    >
      <Text style={[typography.caption, { color: s.text, fontWeight: '700', fontSize: 11 }]}>{label}</Text>
    </View>
  );
}

function HighlightCard({ card }: { card: ProjectsHighlightCardDef }) {
  const { typography, spacing, colors, shadows } = useAppTheme();

  return (
    <Pressable style={(state) => [strategySurfacePressStyle(state)]}>
      <AppSurfaceCard
        glow
        padded
        style={{
          padding: spacing.xl,
          gap: spacing.lg,
          borderRadius: STRATEGY.cardRadiusLg,
          ...(Platform.OS === 'web' ? {} : shadows.card),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg }}>
          <Text
            style={[
              typography.title2,
              { fontSize: 19, fontWeight: '700', flex: 1, color: colors.text, letterSpacing: -0.4, lineHeight: 26 },
            ]}
          >
            {card.title}
          </Text>
          <StatusBadge label={card.badge.label} variant={card.badge.variant} />
        </View>

        <Text style={[typography.body, { fontSize: 15, lineHeight: 24, color: colors.textMuted }]}>
          {card.description}
        </Text>

        <View
          style={{
            borderRadius: STRATEGY.timelineBarRadius,
            overflow: 'hidden',
            flexDirection: 'row',
            minHeight: 44,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {card.segments.map((seg, i) => (
            <View
              key={`${card.id}-s-${i}`}
              style={{
                flex: seg.flex,
                backgroundColor: seg.backgroundColor,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 8,
                paddingVertical: 10,
                borderLeftWidth: i > 0 ? 1 : 0,
                borderLeftColor: 'rgba(0,0,0,0.12)',
              }}
            >
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 11,
                  lineHeight: 14,
                  fontWeight: '800',
                  color: seg.textColor,
                  textAlign: 'center',
                }}
              >
                {seg.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, rowGap: 10 }}>
          {card.tags.map((tag) => {
            const t = TAG_STYLES[tag.variant];
            return (
              <View
                key={tag.label}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: t.border,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                }}
              >
                <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: '600', color: t.color }}>{tag.label}</Text>
              </View>
            );
          })}
        </View>
      </AppSurfaceCard>
    </Pressable>
  );
}

function GridCard({ card }: { card: ProjectsGridCardDef }) {
  const { typography, spacing, colors, isLight } = useAppTheme();

  return (
    <Pressable style={(state) => [{ flex: 1 }, strategySurfacePressStyle(state)]}>
      <View
        style={{
          padding: spacing.lg,
          flex: 1,
          gap: spacing.sm,
          minHeight: 128,
          borderRadius: STRATEGY.cardRadiusMd,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.035)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text style={[typography.title2, { fontSize: 15, fontWeight: '700', flex: 1, color: colors.text }]}>
            {card.title}
          </Text>
          <StatusBadge label={card.badge.label} variant={card.badge.variant} />
        </View>
        <Text style={[typography.body, { fontSize: 13, lineHeight: 20, color: colors.textMuted }]}>{card.description}</Text>
      </View>
    </Pressable>
  );
}

type Props = {
  config: ProjectsStatusSectionDef;
};

export function StrategyProjectsStatus({ config }: Props) {
  const { spacing, colors } = useAppTheme();
  const [g1, g2, g3, g4] = config.grid;
  const gap = spacing.lg + spacing.md;

  return (
    <View style={{ gap }}>
      <Text style={strategyEyebrow(colors.textMuted)}>{config.heading}</Text>

      <View style={{ gap: spacing.lg }}>
        {config.highlights.map((h) => (
          <HighlightCard key={h.id} card={h} />
        ))}
      </View>

      <View style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <GridCard card={g1} />
          <GridCard card={g2} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <GridCard card={g3} />
          <GridCard card={g4} />
        </View>
      </View>
    </View>
  );
}
