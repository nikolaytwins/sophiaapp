import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import type {
  StrategyMonthlyPlanCardAccent,
  StrategyMonthlyPlanDef,
  StrategyMonthlyPlanTagVariant,
} from '@/features/strategy/strategy.config';
import { strategyPageConfig } from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

const TAG_STYLES: Record<
  StrategyMonthlyPlanTagVariant,
  { light: { bg: string; fg: string }; dark: { bg: string; fg: string } }
> = {
  sky: {
    light: { bg: 'rgba(59,130,246,0.14)', fg: '#1d4ed8' },
    dark: { bg: 'rgba(59,130,246,0.18)', fg: '#93c5fd' },
  },
  violet: {
    light: { bg: 'rgba(139,92,246,0.14)', fg: '#5b21b6' },
    dark: { bg: 'rgba(139,92,246,0.2)', fg: '#c4b5fd' },
  },
  orange: {
    light: { bg: 'rgba(249,115,22,0.14)', fg: '#c2410c' },
    dark: { bg: 'rgba(249,115,22,0.18)', fg: '#fdba74' },
  },
  pink: {
    light: { bg: 'rgba(236,72,153,0.14)', fg: '#be185d' },
    dark: { bg: 'rgba(236,72,153,0.18)', fg: '#f9a8d4' },
  },
  slate: {
    light: { bg: 'rgba(15,23,42,0.06)', fg: '#475569' },
    dark: { bg: 'rgba(148,163,184,0.14)', fg: 'rgba(226,232,240,0.88)' },
  },
  amber: {
    light: { bg: 'rgba(245,158,11,0.16)', fg: '#b45309' },
    dark: { bg: 'rgba(245,158,11,0.2)', fg: '#fcd34d' },
  },
  emerald: {
    light: { bg: 'rgba(16,185,129,0.14)', fg: '#047857' },
    dark: { bg: 'rgba(16,185,129,0.18)', fg: '#6ee7b7' },
  },
  rose: {
    light: { bg: 'rgba(244,63,94,0.14)', fg: '#be123c' },
    dark: { bg: 'rgba(244,63,94,0.18)', fg: '#fda4af' },
  },
  teal: {
    light: { bg: 'rgba(20,184,166,0.14)', fg: '#0f766e' },
    dark: { bg: 'rgba(45,212,191,0.16)', fg: '#5eead4' },
  },
};

const ACCENT_BORDER: Record<StrategyMonthlyPlanCardAccent, { light: string; dark: string }> = {
  slate: { light: 'rgba(15,23,42,0.12)', dark: 'rgba(255,255,255,0.1)' },
  violet: { light: 'rgba(139,92,246,0.45)', dark: 'rgba(167,139,250,0.45)' },
  blue: { light: 'rgba(59,130,246,0.42)', dark: 'rgba(96,165,250,0.45)' },
  orange: { light: 'rgba(249,115,22,0.42)', dark: 'rgba(251,146,60,0.45)' },
  pink: { light: 'rgba(236,72,153,0.4)', dark: 'rgba(244,114,182,0.45)' },
  amber: { light: 'rgba(245,158,11,0.45)', dark: 'rgba(251,191,36,0.42)' },
  emerald: { light: 'rgba(16,185,129,0.42)', dark: 'rgba(52,211,153,0.45)' },
  teal: { light: 'rgba(20,184,166,0.42)', dark: 'rgba(45,212,191,0.45)' },
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
    <View style={{ gap: spacing.md }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.xs }}
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
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: spacing.md,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: selected ? 'rgba(139,92,246,0.55)' : colors.border,
                backgroundColor: selected ? 'rgba(124,58,237,0.14)' : isLight ? brand.surface : 'rgba(13,13,13,0.35)',
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
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: brand.surfaceBorder,
          backgroundColor: brand.surface,
          padding: spacing.lg,
          gap: spacing.md,
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

        <View style={{ height: 1, backgroundColor: 'rgba(139,92,246,0.25)', borderRadius: 1 }} />

        <View style={{ gap: spacing.md }}>
          {active.cards.map((card) => {
            const border = isLight ? ACCENT_BORDER[card.accent].light : ACCENT_BORDER[card.accent].dark;
            const tag = isLight ? TAG_STYLES[card.tag.variant].light : TAG_STYLES[card.tag.variant].dark;
            return (
              <View
                key={card.id}
                style={{
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: border,
                  backgroundColor: isLight ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.03)',
                  padding: spacing.lg,
                  gap: spacing.sm,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                  <Text style={{ fontSize: 22, lineHeight: 26 }}>{card.emoji}</Text>
                  <Text style={[typography.title2, { flex: 1, fontWeight: '700', fontSize: 16, lineHeight: 22 }]}>
                    {card.title}
                  </Text>
                </View>
                <Text style={[typography.body, { color: colors.text }]}>{card.description}</Text>
                <View style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}>
                  <View
                    style={{
                      paddingHorizontal: spacing.sm + 2,
                      paddingVertical: spacing.xs + 1,
                      borderRadius: radius.md,
                      backgroundColor: tag.bg,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: tag.fg }}>{card.tag.label}</Text>
                  </View>
                </View>
                {card.footerItalic ? (
                  <Text
                    style={[
                      typography.caption,
                      {
                        marginTop: spacing.xs,
                        fontStyle: 'italic',
                        color: colors.textMuted,
                        fontSize: 12,
                        lineHeight: 17,
                      },
                    ]}
                  >
                    {card.footerItalic}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
