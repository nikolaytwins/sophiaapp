import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import type {
  StrategyMonthlyPlanCardAccent,
  StrategyMonthlyPlanDef,
  StrategyMonthlyPlanTagVariant,
} from '@/features/strategy/strategy.config';
import { STRATEGY } from '@/features/strategy/strategyDashboardUi';
import { strategyPageConfig } from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

/** Теги: мягкий фон + читаемый текст, без «грязных» рамок. */
const TAG_STYLES: Record<
  StrategyMonthlyPlanTagVariant,
  { light: { bg: string; fg: string }; dark: { bg: string; fg: string } }
> = {
  sky: {
    light: { bg: 'rgba(59,130,246,0.09)', fg: '#1e40af' },
    dark: { bg: 'rgba(59,130,246,0.14)', fg: '#bfdbfe' },
  },
  violet: {
    light: { bg: 'rgba(124,58,237,0.09)', fg: '#5b21b6' },
    dark: { bg: 'rgba(139,92,246,0.14)', fg: '#ddd6fe' },
  },
  orange: {
    light: { bg: 'rgba(249,115,22,0.09)', fg: '#9a3412' },
    dark: { bg: 'rgba(249,115,22,0.14)', fg: '#fed7aa' },
  },
  pink: {
    light: { bg: 'rgba(236,72,153,0.09)', fg: '#9d174d' },
    dark: { bg: 'rgba(236,72,153,0.14)', fg: '#fbcfe8' },
  },
  slate: {
    light: { bg: 'rgba(15,23,42,0.05)', fg: '#475569' },
    dark: { bg: 'rgba(148,163,184,0.12)', fg: 'rgba(226,232,240,0.9)' },
  },
  amber: {
    light: { bg: 'rgba(245,158,11,0.1)', fg: '#92400e' },
    dark: { bg: 'rgba(245,158,11,0.14)', fg: '#fde68a' },
  },
  emerald: {
    light: { bg: 'rgba(16,185,129,0.09)', fg: '#047857' },
    dark: { bg: 'rgba(16,185,129,0.14)', fg: '#a7f3d0' },
  },
  rose: {
    light: { bg: 'rgba(244,63,94,0.09)', fg: '#9f1239' },
    dark: { bg: 'rgba(244,63,94,0.14)', fg: '#fecdd3' },
  },
  teal: {
    light: { bg: 'rgba(20,184,166,0.09)', fg: '#0f766e' },
    dark: { bg: 'rgba(45,212,191,0.14)', fg: '#99f6e4' },
  },
};

/**
 * Карточки: один нейтральный контур + лёгкий тон фона + узкий акцент слева
 * (вместо цветной обводки по периметру — она даёт визуальный шум).
 */
const CARD_THEME: Record<
  StrategyMonthlyPlanCardAccent,
  { light: { fill: string; rail: string }; dark: { fill: string; rail: string } }
> = {
  slate: {
    light: { fill: '#f8fafc', rail: '#94a3b8' },
    dark: { fill: 'rgba(255,255,255,0.04)', rail: 'rgba(148,163,184,0.55)' },
  },
  violet: {
    light: { fill: '#faf8ff', rail: '#7c3aed' },
    dark: { fill: 'rgba(139,92,246,0.09)', rail: '#a78bfa' },
  },
  blue: {
    light: { fill: '#f8fbff', rail: '#2563eb' },
    dark: { fill: 'rgba(59,130,246,0.1)', rail: '#60a5fa' },
  },
  orange: {
    light: { fill: '#fffbf5', rail: '#ea580c' },
    dark: { fill: 'rgba(249,115,22,0.09)', rail: '#fb923c' },
  },
  pink: {
    light: { fill: '#fff5f8', rail: '#db2777' },
    dark: { fill: 'rgba(236,72,153,0.09)', rail: '#f472b6' },
  },
  amber: {
    light: { fill: '#fffbeb', rail: '#d97706' },
    dark: { fill: 'rgba(245,158,11,0.09)', rail: '#fbbf24' },
  },
  emerald: {
    light: { fill: '#f0fdf9', rail: '#059669' },
    dark: { fill: 'rgba(16,185,129,0.09)', rail: '#34d399' },
  },
  teal: {
    light: { fill: '#f0fdfa', rail: '#0d9488' },
    dark: { fill: 'rgba(20,184,166,0.09)', rail: '#2dd4bf' },
  },
};

type Props = {
  plans?: StrategyMonthlyPlanDef[];
};

export function StrategyMonthlyPlansPanel({ plans = strategyPageConfig.monthlyPlans }: Props) {
  const { typography, spacing, radius, colors, brand, isLight, shadows } = useAppTheme();
  const list = plans;
  const [activeId, setActiveId] = useState(() => list[0]?.id ?? '');

  const active = useMemo(() => list.find((p) => p.id === activeId) ?? list[0], [activeId, list]);

  useEffect(() => {
    if (list.length && !list.some((p) => p.id === activeId)) {
      setActiveId(list[0]!.id);
    }
  }, [list, activeId]);

  if (!list.length || !active) {
    return null;
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', gap: spacing.md, paddingRight: spacing.xs }}
      >
        {list.map((plan) => {
          const selected = plan.id === active.id;
          const tint = selected ? (isLight ? '#7c3aed' : '#c4b5fd') : colors.textMuted;
          return (
            <Pressable
              key={plan.id}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                setActiveId(plan.id);
              }}
              style={{
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md + 2,
                borderRadius: STRATEGY.cardRadiusMd,
                borderWidth: 1,
                borderColor: selected ? brand.surfaceBorderStrong : colors.border,
                backgroundColor: selected ? brand.primaryMuted : isLight ? brand.surface : 'rgba(255,255,255,0.04)',
              }}
            >
              <Text style={[typography.caption, { color: tint, fontWeight: selected ? '800' : '600', fontSize: 13 }]}>
                {plan.tabLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={{
          borderRadius: STRATEGY.cardRadiusLg,
          borderWidth: 1,
          borderColor: brand.surfaceBorder,
          backgroundColor: brand.surface,
          padding: spacing.xl,
          gap: spacing.lg,
          ...(Platform.OS === 'web' ? {} : shadows.card),
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.md,
            flexWrap: 'wrap',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, flexShrink: 1 }}>
            {active.monthYear ? (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
                <Text style={[typography.title1, { letterSpacing: -0.3 }]}>{active.monthTitle}</Text>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textMuted, letterSpacing: -0.2 }}>
                  {active.monthYear}
                </Text>
              </View>
            ) : (
              <Text style={[typography.title1, { letterSpacing: -0.3 }]}>{active.monthTitle}</Text>
            )}
            {active.monthTitleBadge ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: spacing.sm + 2,
                  paddingVertical: spacing.xs + 1,
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: 'rgba(124,58,237,0.45)',
                  backgroundColor: 'rgba(124,58,237,0.88)',
                }}
              >
                {(active.monthTitleBadge.starCount ?? 1) === 2 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Ionicons name="star" size={10} color="#ffffff" />
                    <Ionicons name="star" size={10} color="#ffffff" />
                  </View>
                ) : (
                  <Ionicons name="star" size={12} color="#ffffff" />
                )}
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>{active.monthTitleBadge.label}</Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[
              typography.body,
              {
                color: colors.textMuted,
                fontWeight: '500',
                fontSize: 14,
                lineHeight: 20,
                flex: 1,
                minWidth: 160,
                textAlign: 'right',
              },
            ]}
          >
            {active.monthTagline}
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: colors.border, opacity: 0.85, borderRadius: 1 }} />

        <View style={{ gap: spacing.lg }}>
          {active.cards.map((card) => {
            const theme = isLight ? CARD_THEME[card.accent].light : CARD_THEME[card.accent].dark;
            const tag = isLight ? TAG_STYLES[card.tag.variant].light : TAG_STYLES[card.tag.variant].dark;
            return (
              <View
                key={card.id}
                style={{
                  flexDirection: 'row',
                  borderRadius: STRATEGY.cardRadiusMd,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: theme.fill,
                  overflow: 'hidden',
                }}
              >
                <View style={{ width: 3, backgroundColor: theme.rail }} />
                <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <Text style={{ fontSize: 22, lineHeight: 26 }}>{card.emoji}</Text>
                    </View>
                    <Text
                      style={[
                        typography.title2,
                        {
                          flex: 1,
                          fontWeight: '700',
                          fontSize: 17,
                          lineHeight: 24,
                          letterSpacing: -0.35,
                          color: colors.text,
                        },
                      ]}
                    >
                      {card.title}
                    </Text>
                  </View>
                  <Text style={[typography.body, { color: colors.text, lineHeight: 23, opacity: 0.92 }]}>
                    {card.description}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
                    <View
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: 6,
                        borderRadius: radius.full,
                        backgroundColor: tag.bg,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: tag.fg, letterSpacing: 0.15 }}>
                        {card.tag.label}
                      </Text>
                    </View>
                  </View>
                  {card.footerItalic ? (
                    <Text
                      style={[
                        typography.caption,
                        {
                          fontStyle: 'italic',
                          color: colors.textMuted,
                          fontSize: 12,
                          lineHeight: 18,
                          opacity: 0.95,
                        },
                      ]}
                    >
                      {card.footerItalic}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
