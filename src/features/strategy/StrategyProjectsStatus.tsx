import { Text, View } from 'react-native';

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
    bg: 'rgba(134,239,172,0.14)',
    border: 'rgba(134,239,172,0.42)',
    text: '#bbf7d0',
  },
  priority2: {
    bg: 'rgba(167,139,250,0.14)',
    border: 'rgba(167,139,250,0.42)',
    text: '#e9d5ff',
  },
  inside: {
    bg: 'rgba(147,197,253,0.14)',
    border: 'rgba(147,197,253,0.42)',
    text: '#bfdbfe',
  },
  october: {
    bg: 'rgba(251,146,60,0.14)',
    border: 'rgba(251,146,60,0.45)',
    text: '#fdba74',
  },
  year2026: {
    bg: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.14)',
    text: 'rgba(247,244,250,0.72)',
  },
};

const TAG_STYLES: Record<ProjectsMilestoneTagVariant, { color: string; border: string }> = {
  milestoneGreen: { color: '#86efac', border: 'rgba(134,239,172,0.5)' },
  milestoneOrange: { color: '#fb923c', border: 'rgba(251,146,60,0.5)' },
  milestoneBrown: { color: '#d6a577', border: 'rgba(180,83,9,0.42)' },
  milestoneGrey: { color: 'rgba(247,244,250,0.55)', border: 'rgba(255,255,255,0.22)' },
  milestoneBlue: { color: '#93c5fd', border: 'rgba(147,197,253,0.5)' },
};

function StatusBadge({ label, variant }: { label: string; variant: ProjectsHighlightBadgeVariant }) {
  const { typography, radius, spacing } = useAppTheme();
  const s = BADGE_STYLES[variant];
  return (
    <View
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 1,
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
  const { typography, spacing, colors } = useAppTheme();

  return (
    <AppSurfaceCard padded style={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
        <Text style={[typography.title2, { fontSize: 17, fontWeight: '700', flex: 1, color: colors.text }]}>
          {card.title}
        </Text>
        <StatusBadge label={card.badge.label} variant={card.badge.variant} />
      </View>

      <Text style={[typography.body, { fontSize: 14, lineHeight: 21, color: 'rgba(247,244,250,0.62)' }]}>
        {card.description}
      </Text>

      <View
        style={{
          borderRadius: 6,
          overflow: 'hidden',
          flexDirection: 'row',
          minHeight: 40,
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
              paddingHorizontal: 6,
              paddingVertical: 8,
              borderLeftWidth: i > 0 ? 1 : 0,
              borderLeftColor: 'rgba(0,0,0,0.2)',
            }}
          >
            <Text
              numberOfLines={2}
              style={{
                fontSize: 11,
                lineHeight: 14,
                fontWeight: '700',
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
                backgroundColor: 'rgba(13,13,13,0.35)',
              }}
            >
              <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: '600', color: t.color }}>{tag.label}</Text>
            </View>
          );
        })}
      </View>
    </AppSurfaceCard>
  );
}

function GridCard({ card }: { card: ProjectsGridCardDef }) {
  const { typography, spacing, colors } = useAppTheme();

  return (
    <AppSurfaceCard padded style={{ padding: spacing.md, flex: 1, gap: spacing.sm, minHeight: 120 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text style={[typography.title2, { fontSize: 15, fontWeight: '700', flex: 1, color: colors.text }]}>
          {card.title}
        </Text>
        <StatusBadge label={card.badge.label} variant={card.badge.variant} />
      </View>
      <Text style={[typography.body, { fontSize: 13, lineHeight: 19, color: 'rgba(247,244,250,0.58)' }]}>
        {card.description}
      </Text>
    </AppSurfaceCard>
  );
}

type Props = {
  config: ProjectsStatusSectionDef;
};

export function StrategyProjectsStatus({ config }: Props) {
  const { spacing } = useAppTheme();
  const [g1, g2, g3, g4] = config.grid;

  return (
    <View style={{ gap: spacing.lg }}>
      <Text
        style={{
          fontSize: 11,
          lineHeight: 15,
          fontWeight: '600',
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: 'rgba(247,244,250,0.52)',
        }}
      >
        {config.heading}
      </Text>

      <View style={{ gap: spacing.md }}>
        {config.highlights.map((h) => (
          <HighlightCard key={h.id} card={h} />
        ))}
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <GridCard card={g1} />
          <GridCard card={g2} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <GridCard card={g3} />
          <GridCard card={g4} />
        </View>
      </View>
    </View>
  );
}
