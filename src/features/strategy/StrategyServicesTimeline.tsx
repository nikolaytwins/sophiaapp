import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { STRATEGY, strategyEyebrow } from '@/features/strategy/strategyDashboardUi';
import type { TimelineSectionDef, TimelineSegmentKind } from '@/features/strategy/strategy.config';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { useAppTheme } from '@/theme';

/** Семантика: зелёный — внутреннее/результат, синий — разработка, фиолетовый — запуск, оранжевый — масштаб/риск-напор, пауза — нейтрально. */
const TIMELINE_GRADIENT: Record<TimelineSegmentKind, readonly [string, string]> = {
  internal: ['#3f6212', '#65a30d'],
  dev: ['#1e3a8a', '#2563eb'],
  launch: ['#5b21b6', '#7c3aed'],
  scale: ['#9a3412', '#ea580c'],
  pause: ['#171717', '#404040'],
};

const TIMELINE_FG = '#fafafa';

type Props = {
  config: TimelineSectionDef;
};

export function StrategyServicesTimeline({ config }: Props) {
  const { typography, spacing, colors, brand, shadows } = useAppTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 560;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
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
      <Text style={strategyEyebrow(colors.textMuted)}>{config.heading}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, rowGap: spacing.sm }}>
        {config.legend.map((item) => {
          const g = TIMELINE_GRADIENT[item.kind];
          return (
            <View key={item.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <LinearGradient
                colors={[...g]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  borderWidth: item.kind === 'pause' ? 1 : 0,
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
              />
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 12 }]}>{item.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: spacing.xs, gap: 0 }}>
        {config.rows.map((row, rowIndex) => {
          const isOpen = Boolean(expanded[row.id]);
          return (
            <View
              key={row.id}
              style={{
                paddingVertical: STRATEGY.blockGap,
                borderBottomWidth: rowIndex < config.rows.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                gap: spacing.md,
              }}
            >
              <View
                style={{
                  flexDirection: narrow ? 'column' : 'row',
                  alignItems: narrow ? 'stretch' : 'center',
                  gap: narrow ? spacing.md : spacing.lg,
                }}
              >
                <Text
                  style={[
                    typography.title2,
                    {
                      fontSize: 17,
                      fontWeight: '700',
                      color: colors.text,
                      letterSpacing: -0.35,
                      minWidth: narrow ? undefined : 120,
                      maxWidth: narrow ? undefined : 148,
                    },
                  ]}
                >
                  {row.title}
                </Text>

                <View
                  style={{
                    flex: 1,
                    minHeight: STRATEGY.timelineBarHeight,
                    minWidth: narrow ? undefined : 168,
                    borderRadius: STRATEGY.timelineBarRadius,
                    overflow: 'hidden',
                    flexDirection: 'row',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  {row.segments.map((seg, i) => {
                    const grad = TIMELINE_GRADIENT[seg.kind];
                    return (
                      <LinearGradient
                        key={`${row.id}-seg-${i}`}
                        colors={[...grad]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{
                          flex: seg.flex,
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingHorizontal: 6,
                          paddingVertical: 10,
                          borderLeftWidth: i > 0 ? 1 : 0,
                          borderLeftColor: 'rgba(0,0,0,0.28)',
                        }}
                      >
                        <Text
                          numberOfLines={3}
                          style={{
                            fontSize: 11,
                            lineHeight: 14,
                            fontWeight: '800',
                            color: TIMELINE_FG,
                            textAlign: 'center',
                            letterSpacing: 0.2,
                          }}
                        >
                          {seg.label}
                        </Text>
                      </LinearGradient>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text
                  numberOfLines={isOpen ? undefined : 3}
                  style={{
                    ...typography.body,
                    fontSize: 14,
                    lineHeight: 22,
                    color: colors.textMuted,
                  }}
                >
                  {row.description}
                </Text>
                <Pressable
                  onPress={() => toggleRow(row.id)}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    alignSelf: 'flex-start',
                    marginTop: spacing.sm,
                    paddingVertical: 4,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Text style={[typography.caption, { color: brand.primarySoft, fontWeight: '700', fontSize: 12 }]}>
                    {isOpen ? 'Свернуть' : 'Подробнее'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </AppSurfaceCard>
  );
}
