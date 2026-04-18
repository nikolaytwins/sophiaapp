import { Text, useWindowDimensions, View } from 'react-native';

import type { TimelineSectionDef, TimelineSegmentKind } from '@/features/strategy/strategy.config';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useAppTheme } from '@/theme';

const TIMELINE_COLORS: Record<
  TimelineSegmentKind,
  { bg: string; fg: string; border?: string }
> = {
  internal: { bg: '#65a30d', fg: '#FFFFFF' },
  dev: { bg: '#2563eb', fg: '#FFFFFF' },
  launch: { bg: '#7c3aed', fg: '#FFFFFF' },
  scale: { bg: '#ea580c', fg: '#FFFFFF' },
  pause: { bg: '#262626', fg: 'rgba(255,255,255,0.92)', border: '#404040' },
};

type Props = {
  config: TimelineSectionDef;
};

export function StrategyServicesTimeline({ config }: Props) {
  const { typography, spacing, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 560;

  return (
    <AppSurfaceCard padded style={{ padding: spacing.lg, gap: spacing.lg }}>
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

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, rowGap: spacing.sm }}>
        {config.legend.map((item) => {
          const c = TIMELINE_COLORS[item.kind];
          return (
            <View key={item.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: c.bg,
                  borderWidth: item.kind === 'pause' ? 1 : 0,
                  borderColor: c.border ?? 'transparent',
                }}
              />
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 12 }]}>{item.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: spacing.xs }}>
        {config.rows.map((row, rowIndex) => (
          <View
            key={row.id}
            style={{
              paddingVertical: 18,
              borderBottomWidth: rowIndex < config.rows.length - 1 ? 1 : 0,
              borderBottomColor: 'rgba(255,255,255,0.07)',
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: narrow ? 'column' : 'row',
                alignItems: narrow ? 'stretch' : 'center',
                gap: narrow ? spacing.sm : spacing.md,
              }}
            >
              <Text
                style={[
                  typography.title2,
                  {
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.text,
                    minWidth: narrow ? undefined : 118,
                    maxWidth: narrow ? undefined : 140,
                  },
                ]}
              >
                {row.title}
              </Text>

              <View
                style={{
                  flex: 1,
                  minHeight: 38,
                  minWidth: narrow ? undefined : 160,
                  borderRadius: 6,
                  overflow: 'hidden',
                  flexDirection: 'row',
                }}
              >
                {row.segments.map((seg, i) => {
                  const c = TIMELINE_COLORS[seg.kind];
                  return (
                    <View
                      key={`${row.id}-seg-${i}`}
                      style={{
                        flex: seg.flex,
                        backgroundColor: c.bg,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 4,
                        paddingVertical: 6,
                        borderLeftWidth: i > 0 ? 1 : 0,
                        borderLeftColor: 'rgba(0,0,0,0.35)',
                      }}
                    >
                      <Text
                        numberOfLines={3}
                        style={{
                          fontSize: 10,
                          lineHeight: 13,
                          fontWeight: '700',
                          color: c.fg,
                          textAlign: 'center',
                        }}
                      >
                        {seg.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <Text
              style={{
                ...typography.body,
                fontSize: 13,
                lineHeight: 19,
                color: 'rgba(247,244,250,0.55)',
              }}
            >
              {row.description}
            </Text>
          </View>
        ))}
      </View>
    </AppSurfaceCard>
  );
}
