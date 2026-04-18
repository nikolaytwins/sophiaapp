import { Text, View } from 'react-native';

import type { AboutMeNotesDef, NotesPatternAccent, NotesScenarioItemDef } from '@/features/strategy/strategy.config';
import { useAppTheme } from '@/theme';

const PINK = {
  bg: '#FCE7E7',
  text: '#5c2138',
  textSoft: 'rgba(92,33,56,0.88)',
  divider: 'rgba(92,33,56,0.14)',
  bullet: '#6b2d42',
};

const MINT = {
  bg: '#ecfdf5',
  border: 'rgba(22,101,52,0.45)',
  text: '#14532d',
  textSoft: 'rgba(20,83,45,0.9)',
  divider: 'rgba(20,83,45,0.16)',
  bullet: '#166534',
};

const PATTERN_ACCENT: Record<NotesPatternAccent, string> = {
  violet: '#c4b5fd',
  coral: '#fca5a5',
  amber: '#fcd34d',
  slate: '#94a3b8',
  blue: '#7dd3fc',
};

const RULE_COLOR = '#fdba74';

type Props = {
  config: AboutMeNotesDef;
};

function ScenarioListItem({
  item,
  isLast,
  colors,
}: {
  item: NotesScenarioItemDef;
  isLast: boolean;
  colors: { text: string; textSoft: string; divider: string; bullet: string };
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        paddingBottom: isLast ? 0 : 16,
        marginBottom: isLast ? 0 : 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.divider,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.bullet,
          marginTop: 7,
        }}
      />
      <Text style={{ flex: 1, fontSize: 15, lineHeight: 23, color: colors.textSoft }}>
        <Text style={{ fontWeight: '700', color: colors.text }}>{item.lead}</Text>
        {'\n'}
        {item.body}
      </Text>
    </View>
  );
}

function PatternCard({
  accent,
  title,
  description,
  rule,
}: {
  accent: NotesPatternAccent;
  title: string;
  description: string;
  rule: string;
}) {
  const line = PATTERN_ACCENT[accent];
  return (
    <View
      style={{
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        paddingLeft: 14,
        backgroundColor: 'rgba(22,22,28,0.96)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        borderLeftWidth: 4,
        borderLeftColor: line,
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: '700', color: line }}>{title}</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: 'rgba(247,244,250,0.92)' }}>{description}</Text>
      <Text
        style={{
          fontSize: 14,
          lineHeight: 20,
          fontStyle: 'italic',
          color: RULE_COLOR,
        }}
      >
        {rule}
      </Text>
    </View>
  );
}

export function StrategyAboutNotesPanel({ config }: Props) {
  const { typography, spacing, colors } = useAppTheme();

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.md }}>
        <Text style={[typography.title1, { letterSpacing: -0.2 }]}>{config.pageTitle}</Text>
        <View style={{ height: 1, backgroundColor: 'rgba(139,92,246,0.35)', borderRadius: 1 }} />
        <Text style={[typography.title2, { fontSize: 20, fontWeight: '800', color: colors.text }]}>
          {config.sectionTitle}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
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
          {config.tragic.capsAboveCard}
        </Text>

        <View
          style={{
            borderRadius: 22,
            backgroundColor: PINK.bg,
            paddingHorizontal: 22,
            paddingVertical: 22,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: PINK.text,
              marginBottom: 18,
            }}
          >
            {config.tragic.cardTitle}
          </Text>
          {config.tragic.items.map((item, i) => (
            <ScenarioListItem
              key={i}
              item={item}
              isLast={i === config.tragic.items.length - 1}
              colors={{
                text: PINK.text,
                textSoft: PINK.textSoft,
                divider: PINK.divider,
                bullet: PINK.bullet,
              }}
            />
          ))}
        </View>
      </View>

      <View
        style={{
          borderRadius: 22,
          backgroundColor: MINT.bg,
          borderWidth: 1,
          borderColor: MINT.border,
          paddingHorizontal: 22,
          paddingVertical: 22,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: MINT.text,
            marginBottom: 18,
          }}
        >
          {config.healthy.cardTitle}
        </Text>
        {config.healthy.items.map((item, i) => (
          <ScenarioListItem
            key={i}
            item={item}
            isLast={i === config.healthy.items.length - 1}
            colors={{
              text: MINT.text,
              textSoft: MINT.textSoft,
              divider: MINT.divider,
              bullet: MINT.bullet,
            }}
          />
        ))}
      </View>

      <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
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
          {config.patterns.heading}
        </Text>
        <View style={{ gap: 14 }}>
          {config.patterns.cards.map((c) => (
            <PatternCard
              key={c.id}
              accent={c.accent}
              title={c.title}
              description={c.description}
              rule={c.rule}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
