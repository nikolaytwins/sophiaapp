import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { STRATEGY, strategyEyebrow } from '@/features/strategy/strategyDashboardUi';
import { StrategyProjectsTabContent } from '@/features/strategy/StrategyProjectsTabContent';
import { StrategyVisionTabContent } from '@/features/strategy/StrategyVisionTabContent';
import { RichParagraphBlock } from '@/features/strategy/strategyRichParagraph';
import type {
  StrategyNewSynastryDef,
  StrategySynastryMoneyCard,
  StrategySynastryMoneyCardAccent,
} from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

const ACCENT: Record<
  StrategySynastryMoneyCardAccent,
  { borderLeft: string; backgroundColor: string; overlineColor: string }
> = {
  twilight: {
    borderLeft: 'rgba(232,121,249,0.95)',
    backgroundColor: 'rgba(168,85,247,0.14)',
    overlineColor: 'rgba(196,181,253,0.95)',
  },
  mist: {
    borderLeft: 'rgba(148,163,184,0.65)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    overlineColor: 'rgba(203,213,225,0.85)',
  },
  aurora: {
    borderLeft: 'rgba(34,211,238,0.85)',
    backgroundColor: 'rgba(34,211,238,0.1)',
    overlineColor: 'rgba(165,243,252,0.95)',
  },
};

function MoneyCard({
  card,
  baseColor,
  mutedColor,
}: {
  card: StrategySynastryMoneyCard;
  baseColor: string;
  mutedColor: string;
}) {
  const { typography } = useAppTheme();
  const a = ACCENT[card.accent];

  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: a.borderLeft,
        backgroundColor: a.backgroundColor,
        paddingVertical: 18,
        paddingHorizontal: 18,
        borderRadius: STRATEGY.cardRadiusMd,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 4,
      }}
    >
      <Text
        style={{
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: a.overlineColor,
          marginBottom: 8,
        }}
      >
        {card.overline}
      </Text>
      {card.title ? (
        <Text
          style={[
            typography.title2,
            {
              fontSize: 19,
              fontWeight: '700',
              color: baseColor,
              letterSpacing: -0.2,
              lineHeight: 24,
              marginBottom: 10,
            },
          ]}
        >
          {card.title}
        </Text>
      ) : null}
      {card.paragraphs?.map((para, idx) => (
        <View key={idx} style={{ marginBottom: idx < (card.paragraphs?.length ?? 0) - 1 ? 14 : 0 }}>
          <RichParagraphBlock parts={para} baseColor={baseColor} mutedColor={mutedColor} />
        </View>
      ))}
      {card.patterns && card.patterns.length > 0 ? (
        <View style={{ gap: 8, marginTop: 4 }}>
          {card.patterns.map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                gap: 11,
                alignItems: 'flex-start',
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: 'rgba(15,15,20,0.55)',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '300',
                  color: 'rgba(196,181,253,0.9)',
                  minWidth: 22,
                  paddingTop: 2,
                  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                }}
              >
                →
              </Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: '600', color: baseColor, marginBottom: 2, fontSize: 13 }}>{item.title}</Text>
                <Text style={{ fontSize: 12, lineHeight: 19, color: mutedColor }}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type Inner = 'vision' | 'money' | 'projects';

type Props = {
  config: StrategyNewSynastryDef;
};

export function StrategyNewStrategyPanel({ config }: Props) {
  const { typography, spacing, colors, brand, isLight } = useAppTheme();
  const [inner, setInner] = useState<Inner>('vision');
  const { vision, money, projects } = config;
  const baseColor = colors.text;
  const mutedColor = colors.textMuted;

  const subTabs: { id: Inner; label: string }[] = [
    { id: 'vision', label: vision.innerTabLabel },
    { id: 'money', label: money.innerTabLabel },
    { id: 'projects', label: projects.innerTabLabel },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {subTabs.map(({ id, label }) => {
          const selected = inner === id;
          return (
            <Pressable
              key={id}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                setInner(id);
              }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: STRATEGY.cardRadiusMd,
                borderWidth: 1,
                borderColor: selected ? brand.surfaceBorderStrong : colors.border,
                backgroundColor: selected ? brand.primaryMuted : 'rgba(255,255,255,0.04)',
              }}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: selected ? (isLight ? '#5b21b6' : '#e9d5ff') : colors.textMuted,
                    fontWeight: selected ? '800' : '600',
                    fontSize: 11,
                    letterSpacing: 1.1,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {inner === 'vision' ? (
        <StrategyVisionTabContent config={vision} />
      ) : inner === 'money' ? (
        <>
          <View style={{ gap: 6 }}>
            <Text style={[typography.title1, { fontSize: 26, fontWeight: '700', color: baseColor, letterSpacing: -0.3 }]}>
              {money.screenTitle}
            </Text>
            <Text style={[strategyEyebrow(mutedColor), { letterSpacing: 2, marginBottom: 4 }]}>{money.screenSubtitle}</Text>
          </View>

          <View style={{ gap: 0 }}>
            {money.cards.map((c) => (
              <MoneyCard key={c.id} card={c} baseColor={baseColor} mutedColor={mutedColor} />
            ))}
          </View>
        </>
      ) : (
        <StrategyProjectsTabContent config={projects} />
      )}
    </View>
  );
}
