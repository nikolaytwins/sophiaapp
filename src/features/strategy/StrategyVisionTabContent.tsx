import { Text, View, useWindowDimensions } from 'react-native';

import { STRATEGY, strategyEyebrow } from '@/features/strategy/strategyDashboardUi';
import { RichParagraphBlock } from '@/features/strategy/strategyRichParagraph';
import type { StrategyArkaliumVisionDef, StrategyVisionNationKind } from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

const NATION_STYLE: Record<
  StrategyVisionNationKind,
  { border: string; bg: string; title: string }
> = {
  fire: {
    border: 'rgba(248,113,113,0.35)',
    bg: 'rgba(248,113,113,0.08)',
    title: '#fb7185',
  },
  crystal: {
    border: 'rgba(96,165,250,0.35)',
    bg: 'rgba(59,130,246,0.1)',
    title: '#93c5fd',
  },
  forest: {
    border: 'rgba(74,222,128,0.35)',
    bg: 'rgba(34,197,94,0.1)',
    title: '#86efac',
  },
  air: {
    border: 'rgba(250,204,21,0.35)',
    bg: 'rgba(250,204,21,0.08)',
    title: '#fde047',
  },
};

type Props = {
  config: StrategyArkaliumVisionDef;
};

export function StrategyVisionTabContent({ config }: Props) {
  const { spacing, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const compactNumbers = width < 540;
  const base = colors.text;
  const muted = colors.textMuted;
  const gold = 'rgba(196,181,253,0.95)';
  const { hero, mission, nations, phases, numbers, strategyWhy, finale } = config;

  return (
    <View style={{ gap: spacing.xl + 12 }}>
      {/* Hero */}
      <View
        style={{
          alignItems: 'center',
          paddingVertical: spacing.xl + 8,
          paddingHorizontal: spacing.md,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Text style={[strategyEyebrow(muted), { letterSpacing: 4, marginBottom: spacing.lg, textAlign: 'center' }]}>
          {hero.eyebrow}
        </Text>
        <Text
          style={{
            fontSize: width > 400 ? 48 : 38,
            fontWeight: '200',
            color: gold,
            letterSpacing: 2,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {hero.title}
        </Text>
        <Text
          style={{
            fontSize: 20,
            fontWeight: '300',
            fontStyle: 'italic',
            color: muted,
            marginBottom: spacing.xl,
            textAlign: 'center',
          }}
        >
          {hero.subtitle}
        </Text>
        <View
          style={{
            maxWidth: 560,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            paddingVertical: spacing.lg,
            gap: 12,
          }}
        >
          {hero.statementParagraphs.map((p, i) => (
            <RichParagraphBlock key={i} parts={p} baseColor={base} mutedColor={muted} />
          ))}
        </View>
      </View>

      {/* Mission */}
      <View style={{ gap: spacing.md, paddingTop: spacing.md }}>
        <Text style={[strategyEyebrow(muted), { letterSpacing: 3 }]}>{mission.sectionLabel}</Text>
        <Text style={{ fontSize: 32, fontWeight: '300', color: gold, letterSpacing: 1, lineHeight: 38, marginBottom: 8 }}>
          {mission.sectionTitle}
        </Text>
        {mission.paragraphs.map((p, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <RichParagraphBlock parts={p} baseColor={base} mutedColor={muted} fontSize={17} lineHeight={26} />
          </View>
        ))}
      </View>

      {/* Nations */}
      <View style={{ gap: spacing.md, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
        <Text style={[strategyEyebrow(muted), { letterSpacing: 3 }]}>{nations.sectionLabel}</Text>
        <Text style={{ fontSize: 32, fontWeight: '300', color: gold, lineHeight: 38, marginBottom: 8 }}>{nations.sectionTitle}</Text>
        <Text style={{ fontSize: 13, lineHeight: 22, color: muted, marginBottom: spacing.lg }}>{nations.intro}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {nations.nations.map((n) => {
            const s = NATION_STYLE[n.kind];
            return (
              <View
                key={n.id}
                style={{
                  flexBasis: width >= 560 ? '48%' : '100%',
                  flexGrow: 1,
                  minWidth: width >= 560 ? '45%' : undefined,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: s.border,
                  backgroundColor: s.bg,
                  borderRadius: STRATEGY.cardRadiusMd,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '500', color: s.title, marginBottom: 8 }}>{n.title}</Text>
                <RichParagraphBlock parts={n.body} baseColor={base} mutedColor={muted} />
              </View>
            );
          })}
        </View>
        <View style={{ marginTop: spacing.md }}>
          <RichParagraphBlock parts={nations.landscapeNote} baseColor={muted} mutedColor={muted} />
        </View>
      </View>

      {/* Phases */}
      <View style={{ gap: 0, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
        <Text style={[strategyEyebrow(muted), { letterSpacing: 3, marginBottom: 8 }]}>{phases.sectionLabel}</Text>
        <Text style={{ fontSize: 32, fontWeight: '300', color: gold, lineHeight: 38, marginBottom: spacing.lg }}>
          {phases.sectionTitle}
        </Text>
        {phases.items.map((ph, idx) => (
          <View
            key={ph.yearKey + ph.nameLine}
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingVertical: spacing.lg,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
              alignItems: 'flex-start',
            }}
          >
            <Text
              style={{
                width: width > 400 ? 72 : 56,
                fontSize: width > 400 ? 36 : 28,
                fontWeight: '200',
                color: 'rgba(255,255,255,0.12)',
                lineHeight: 40,
              }}
            >
              {ph.yearKey}
            </Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: muted, marginBottom: 8 }}>
                {ph.nameLine}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '400', color: base, marginBottom: 10, lineHeight: 26 }}>{ph.title}</Text>
              {ph.bodyParagraphs.map((para, pi) => (
                <View key={pi} style={{ marginBottom: 8 }}>
                  <RichParagraphBlock parts={para} baseColor={muted} mutedColor={muted} />
                </View>
              ))}
              {ph.keyDate ? (
                <View
                  style={{
                    marginTop: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor:
                      ph.keyDate.variant === 'fire' ? 'rgba(248,113,113,0.35)' : 'rgba(196,181,253,0.28)',
                    backgroundColor:
                      ph.keyDate.variant === 'fire' ? 'rgba(248,113,113,0.08)' : 'rgba(168,85,247,0.08)',
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '600',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      color: ph.keyDate.variant === 'fire' ? '#fb7185' : gold,
                      marginBottom: 6,
                    }}
                  >
                    {ph.keyDate.dateLine}
                  </Text>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: '500',
                      color: ph.keyDate.variant === 'fire' ? '#fda4af' : gold,
                      marginBottom: 6,
                      lineHeight: 22,
                    }}
                  >
                    {ph.keyDate.headline}
                  </Text>
                  <RichParagraphBlock parts={ph.keyDate.body} baseColor={base} mutedColor={muted} />
                </View>
              ) : null}
              {ph.target ? (
                <Text
                  style={{
                    marginTop: 10,
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: 'rgba(196,181,253,0.75)',
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(196,181,253,0.35)',
                    alignSelf: 'flex-start',
                    paddingBottom: 2,
                  }}
                >
                  {ph.target}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {/* Numbers */}
      <View style={{ gap: spacing.md, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
        <Text style={[strategyEyebrow(muted), { letterSpacing: 3 }]}>{numbers.sectionLabel}</Text>
        <Text style={{ fontSize: 32, fontWeight: '300', color: gold, marginBottom: 8 }}>{numbers.sectionTitle}</Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 1,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {numbers.cells.map((c, i) => (
            <View
              key={i}
              style={{
                flexBasis: compactNumbers ? '48%' : '32%',
                flexGrow: 1,
                minWidth: compactNumbers ? '44%' : 90,
                backgroundColor: 'rgba(8,8,12,0.96)',
                paddingVertical: 18,
                paddingHorizontal: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 30, fontWeight: '200', color: gold, marginBottom: 6 }}>{c.value}</Text>
              <Text style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: muted, textAlign: 'center', lineHeight: 14 }}>
                {c.label}
              </Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 11, lineHeight: 18, color: muted, marginTop: 8 }}>{numbers.footnote}</Text>
      </View>

      {/* Strategy why */}
      <View style={{ gap: spacing.md, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
        <Text style={[strategyEyebrow(muted), { letterSpacing: 3 }]}>{strategyWhy.sectionLabel}</Text>
        <Text style={{ fontSize: 32, fontWeight: '300', color: gold, marginBottom: spacing.md }}>{strategyWhy.sectionTitle}</Text>
        {strategyWhy.blocks.map((b, i) => (
          <View key={i} style={{ marginBottom: spacing.md }}>
            <Text style={{ fontSize: 14, lineHeight: 22, fontWeight: '600', color: base, marginBottom: 6 }}>{b.title}</Text>
            <RichParagraphBlock parts={b.bodyParts} baseColor={muted} mutedColor={muted} />
          </View>
        ))}
      </View>

      {/* Finale */}
      <View
        style={{
          alignItems: 'center',
          paddingVertical: spacing.xl * 2,
          paddingHorizontal: spacing.md,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Text style={[strategyEyebrow(muted), { letterSpacing: 3, marginBottom: spacing.lg, textAlign: 'center' }]}>
          {finale.dateLine}
        </Text>
        <Text style={{ fontSize: width > 400 ? 40 : 30, fontWeight: '200', color: gold, textAlign: 'center', lineHeight: 44, marginBottom: 8 }}>
          {finale.titleLine1}
          {'\n'}
          {finale.titleLine2}
        </Text>
        <View style={{ maxWidth: 500, marginTop: 8, marginBottom: spacing.xl }}>
          <RichParagraphBlock parts={finale.subtitle} baseColor={muted} mutedColor={muted} />
        </View>
        {finale.noteLines.map((line, i) => (
          <Text key={i} style={{ fontSize: 11, color: muted, letterSpacing: 1, textAlign: 'center', lineHeight: 20 }}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}
