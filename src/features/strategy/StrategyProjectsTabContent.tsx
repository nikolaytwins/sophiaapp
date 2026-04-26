import { Text, View, useWindowDimensions } from 'react-native';

import { STRATEGY, strategyEyebrow } from '@/features/strategy/strategyDashboardUi';
import { RichParagraphBlock } from '@/features/strategy/strategyRichParagraph';
import type {
  StrategyNewSynastryProjectsDef,
  StrategyProjectsChannelBadge,
  StrategyProjectsValuationProductAccent,
} from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

const BADGE: Record<
  StrategyProjectsChannelBadge,
  { bg: string; fg: string; border: string }
> = {
  free: { bg: 'rgba(34,197,94,0.14)', fg: 'rgba(134,239,172,0.95)', border: 'rgba(34,197,94,0.35)' },
  paid: { bg: 'rgba(59,130,246,0.16)', fg: 'rgba(147,197,253,0.98)', border: 'rgba(59,130,246,0.4)' },
  partner: { bg: 'rgba(168,85,247,0.16)', fg: 'rgba(233,213,255,0.95)', border: 'rgba(168,85,247,0.45)' },
  primary: { bg: 'rgba(232,121,249,0.16)', fg: 'rgba(250,232,255,0.96)', border: 'rgba(232,121,249,0.45)' },
};

const VAL_ACC: Record<
  StrategyProjectsValuationProductAccent,
  { border: string; headBg: string; overline: string }
> = {
  twilight: {
    border: 'rgba(232,121,249,0.85)',
    headBg: 'rgba(168,85,247,0.12)',
    overline: 'rgba(196,181,253,0.9)',
  },
  ocean: {
    border: 'rgba(96,165,250,0.85)',
    headBg: 'rgba(59,130,246,0.12)',
    overline: 'rgba(147,197,253,0.9)',
  },
  aurora: {
    border: 'rgba(34,211,238,0.8)',
    headBg: 'rgba(34,211,238,0.1)',
    overline: 'rgba(165,243,252,0.92)',
  },
  amber: {
    border: 'rgba(251,191,36,0.75)',
    headBg: 'rgba(251,191,36,0.1)',
    overline: 'rgba(253,224,71,0.88)',
  },
  mist: {
    border: 'rgba(148,163,184,0.55)',
    headBg: 'rgba(255,255,255,0.05)',
    overline: 'rgba(203,213,225,0.85)',
  },
};

function ChannelGroupBlock({
  group,
  baseColor,
  mutedColor,
}: {
  group: StrategyNewSynastryProjectsDef['channels']['groups'][0];
  baseColor: string;
  mutedColor: string;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'rgba(203,213,225,0.55)',
          marginBottom: 12,
        }}
      >
        {group.sectionCaps}
      </Text>
      <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: STRATEGY.cardRadiusMd, overflow: 'hidden' }}>
        {group.items.map((ch, i) => {
          const b = BADGE[ch.badge];
          return (
            <View
              key={`${ch.name}-${i}`}
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: 'rgba(255,255,255,0.08)',
                alignItems: 'flex-start',
              }}
            >
              <Text style={{ fontSize: 20, width: 28, textAlign: 'center', paddingTop: 2 }}>{ch.icon}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    paddingVertical: 2,
                    paddingHorizontal: 7,
                    borderRadius: 6,
                    backgroundColor: b.bg,
                    borderWidth: 1,
                    borderColor: b.border,
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, color: b.fg, textTransform: 'uppercase' }}>
                    {ch.badgeLabel}
                  </Text>
                </View>
                <Text style={{ fontWeight: '600', color: baseColor, marginBottom: 2, fontSize: 12 }}>{ch.name}</Text>
                <Text
                  style={{
                    fontSize: 9,
                    color: 'rgba(196,181,253,0.75)',
                    marginBottom: 4,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {ch.typeLine}
                </Text>
                <RichParagraphBlock parts={ch.body} baseColor={baseColor} mutedColor={mutedColor} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ValuationProductBlock({
  product,
  baseColor,
  mutedColor,
  compactGrid,
}: {
  product: StrategyNewSynastryProjectsDef['valuation']['products'][0];
  baseColor: string;
  mutedColor: string;
  compactGrid: boolean;
}) {
  const a = VAL_ACC[product.accent];
  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{
          borderLeftWidth: 2,
          borderLeftColor: a.border,
          backgroundColor: a.headBg,
          paddingVertical: 14,
          paddingHorizontal: 18,
          borderRadius: STRATEGY.cardRadiusMd,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: a.overline, marginBottom: 6 }}>
          {product.overline}
        </Text>
        <Text style={{ fontSize: 19, fontWeight: '600', color: baseColor, lineHeight: 24 }}>{product.title}</Text>
      </View>
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
        {product.grid.map((cell, idx) => (
          <View
            key={idx}
            style={{
              flexBasis: compactGrid ? '48%' : '32%',
              flexGrow: 1,
              minWidth: compactGrid ? '44%' : 100,
              backgroundColor: 'rgba(8,8,12,0.94)',
              paddingVertical: 16,
              paddingHorizontal: 12,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: '300',
                color: 'rgba(196,181,253,0.95)',
                marginBottom: 4,
                textAlign: 'center',
              }}
            >
              {cell.value}
            </Text>
            <Text
              style={{
                fontSize: 9,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: mutedColor,
                textAlign: 'center',
                lineHeight: 14,
              }}
            >
              {cell.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 8 }}>
        <RichParagraphBlock parts={product.footnote} baseColor={baseColor} mutedColor={mutedColor} />
      </View>
    </View>
  );
}

type Props = {
  config: StrategyNewSynastryProjectsDef;
};

export function StrategyProjectsTabContent({ config }: Props) {
  const { typography, spacing, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const compactGrid = width < 480;
  const baseColor = colors.text;
  const mutedColor = colors.textMuted;
  const { channels, valuation, geo } = config;

  return (
    <View style={{ gap: spacing.xl + 8 }}>
      {/* Каналы */}
      <View style={{ gap: spacing.md }}>
        <Text style={[typography.title1, { fontSize: 26, fontWeight: '700', color: baseColor, letterSpacing: -0.3 }]}>
          {channels.sectionTitle}
        </Text>
        <Text style={[strategyEyebrow(mutedColor), { letterSpacing: 2 }]}>{channels.sectionSubtitle}</Text>

        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: 'rgba(196,181,253,0.65)',
            backgroundColor: 'rgba(168,85,247,0.1)',
            paddingVertical: 16,
            paddingHorizontal: 18,
            borderRadius: STRATEGY.cardRadiusMd,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            marginBottom: 4,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(196,181,253,0.85)', marginBottom: 8 }}>
            {channels.leadBlock.overline}
          </Text>
          <RichParagraphBlock parts={channels.leadBlock.body} baseColor={baseColor} mutedColor={mutedColor} />
        </View>

        {channels.groups.map((g) => (
          <ChannelGroupBlock key={g.sectionCaps} group={g} baseColor={baseColor} mutedColor={mutedColor} />
        ))}
      </View>

      {/* Оценка */}
      <View style={{ gap: spacing.md, paddingTop: spacing.lg }}>
        <Text style={[typography.title1, { fontSize: 26, fontWeight: '700', color: baseColor, letterSpacing: -0.3 }]}>
          {valuation.sectionTitle}
        </Text>
        <Text style={[strategyEyebrow(mutedColor), { letterSpacing: 2 }]}>{valuation.sectionSubtitle}</Text>

        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: 'rgba(148,163,184,0.5)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            paddingVertical: 16,
            paddingHorizontal: 18,
            borderRadius: STRATEGY.cardRadiusMd,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(203,213,225,0.75)' }}>
            {valuation.methodology.overline}
          </Text>
          {valuation.methodology.paragraphs.map((para, i) => (
            <RichParagraphBlock key={i} parts={para} baseColor={baseColor} mutedColor={mutedColor} />
          ))}
        </View>

        {valuation.products.map((p) => (
          <ValuationProductBlock
            key={p.id}
            product={p}
            baseColor={baseColor}
            mutedColor={mutedColor}
            compactGrid={compactGrid}
          />
        ))}

        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: VAL_ACC.amber.border,
            backgroundColor: VAL_ACC.amber.headBg,
            paddingVertical: 16,
            paddingHorizontal: 18,
            borderRadius: STRATEGY.cardRadiusMd,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: VAL_ACC.amber.overline }}>
            {valuation.packageBlock.overline}
          </Text>
          <Text style={{ fontSize: 19, fontWeight: '600', color: baseColor }}>{valuation.packageBlock.title}</Text>
          {valuation.packageBlock.paragraphs.map((para, i) => (
            <RichParagraphBlock key={i} parts={para} baseColor={baseColor} mutedColor={mutedColor} />
          ))}
        </View>

        <View
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            borderRadius: STRATEGY.cardRadiusMd,
            marginTop: 4,
          }}
        >
          <RichParagraphBlock parts={valuation.closingNote} baseColor={baseColor} mutedColor={mutedColor} />
        </View>
      </View>

      {/* РФ vs зарубеж */}
      <View style={{ gap: spacing.md, paddingTop: spacing.lg }}>
        <Text style={[typography.title1, { fontSize: 26, fontWeight: '700', color: baseColor, letterSpacing: -0.3 }]}>
          {geo.sectionTitle}
        </Text>
        <Text style={[strategyEyebrow(mutedColor), { letterSpacing: 2 }]}>{geo.sectionSubtitle}</Text>

        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: 'rgba(34,211,238,0.75)',
            backgroundColor: 'rgba(34,211,238,0.08)',
            paddingVertical: 16,
            paddingHorizontal: 18,
            borderRadius: STRATEGY.cardRadiusMd,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(165,243,252,0.88)' }}>
            {geo.ruleBlock.overline}
          </Text>
          <Text style={{ fontSize: 19, fontWeight: '600', color: baseColor, lineHeight: 24 }}>{geo.ruleBlock.title}</Text>
          <RichParagraphBlock parts={geo.ruleBlock.body} baseColor={baseColor} mutedColor={mutedColor} />
        </View>

        {geo.products.map((block, bi) => (
          <View key={block.sectionCaps} style={{ marginTop: bi > 0 ? spacing.lg : spacing.sm }}>
            {bi > 0 ? <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: spacing.md }} /> : null}
            <Text
              style={{
                fontSize: 9,
                fontWeight: '700',
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: 'rgba(203,213,225,0.55)',
                marginBottom: 10,
              }}
            >
              {block.sectionCaps}
            </Text>
            {block.rows.map((row, ri) => (
              <View
                key={`${row.lead}-${ri}`}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingVertical: 9,
                  borderBottomWidth: ri < block.rows.length - 1 ? 1 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.08)',
                  alignItems: 'flex-start',
                }}
              >
                <Text style={{ width: 108, fontSize: 11, fontWeight: '600', color: 'rgba(196,181,253,0.85)' }}>{row.lead}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <RichParagraphBlock parts={row.body} baseColor={baseColor} mutedColor={mutedColor} />
                </View>
              </View>
            ))}
          </View>
        ))}

        <View
          style={{
            marginTop: spacing.lg,
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            borderRadius: STRATEGY.cardRadiusMd,
          }}
        >
          <RichParagraphBlock parts={geo.closingNote} baseColor={baseColor} mutedColor={mutedColor} />
        </View>
      </View>
    </View>
  );
}
