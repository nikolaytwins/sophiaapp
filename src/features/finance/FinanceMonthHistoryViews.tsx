import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { FinanceMonthSnapshot } from '@/features/finance/finance.types';
import { useAppTheme } from '@/theme';

export type MonthHistoryViewMode = 'table' | 'cards';

export type EnrichedMonthRow = {
  snapshot: FinanceMonthSnapshot;
  /** Изменение «всего на счетах» к предыдущему (более раннему) месяцу в списке. */
  capitalDelta: number | null;
};

export function enrichMonthSnapshots(snapshots: FinanceMonthSnapshot[]): EnrichedMonthRow[] {
  return snapshots.map((s, i) => {
    const older = snapshots[i + 1];
    const capitalDelta = older != null ? s.totalBalance - older.totalBalance : null;
    return { snapshot: s, capitalDelta };
  });
}

function fmtMoneyPlain(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

function fmtSignedRub(n: number) {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  const v = Math.abs(n);
  return sign + v.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

function monthLabel(s: FinanceMonthSnapshot) {
  return new Date(s.year, s.month - 1, 1).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
}

const GREEN_UP = '#22C55E';
const RED_DOWN = '#FB7185';

function signedColor(n: number | null | undefined): string | undefined {
  if (n == null || Number.isNaN(n)) return undefined;
  if (n > 0) return GREEN_UP;
  if (n < 0) return RED_DOWN;
  return undefined;
}

type TableProps = {
  rows: EnrichedMonthRow[];
  screenInnerWidth: number;
};

export function MonthHistoryTableTwin({ rows, screenInnerWidth }: TableProps) {
  const { colors, typography, radius, brand, isLight } = useAppTheme();
  const border = brand.surfaceBorderStrong;
  const line = StyleSheet.hairlineWidth;
  const headerBg = brand.primaryMuted;
  const tableMinW = Math.max(screenInnerWidth - 8, 360);

  const head = (t: string, flexGrow: number, align: 'left' | 'center' | 'right', last?: boolean) => (
    <View
      style={{
        flex: flexGrow,
        minWidth: align === 'left' ? 88 : 72,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRightWidth: last ? 0 : line,
        borderRightColor: border,
        justifyContent: 'center',
      }}
    >
      <Text
        style={[
          typography.caption,
          {
            fontWeight: '800',
            color: colors.textMuted,
            textAlign: align,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            fontSize: 10,
          },
        ]}
        numberOfLines={2}
      >
        {t}
      </Text>
    </View>
  );

  const cellMoney = (v: number | null, flexGrow: number, align: 'right', last: boolean, colorize?: boolean) => {
    const c = colorize && v != null ? signedColor(v) ?? colors.text : colors.text;
    const text =
      v == null ? '—' : colorize ? fmtSignedRub(v) : fmtMoneyPlain(v);
    return (
      <View
        style={{
          flex: flexGrow,
          minWidth: 72,
          paddingVertical: 11,
          paddingHorizontal: 8,
          borderRightWidth: last ? 0 : line,
          borderRightColor: border,
          justifyContent: 'center',
        }}
      >
        <Text
          style={[
            typography.caption,
            {
              color: c,
              textAlign: align,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
              fontSize: 12,
            },
          ]}
          numberOfLines={2}
        >
          {text}
        </Text>
      </View>
    );
  };

  const cellMonth = (s: FinanceMonthSnapshot, flexGrow: number) => (
    <View
      style={{
        flex: flexGrow,
        minWidth: 88,
        paddingVertical: 11,
        paddingHorizontal: 8,
        borderRightWidth: line,
        borderRightColor: border,
        justifyContent: 'center',
      }}
    >
      <Text
        style={[
          typography.caption,
          {
            color: colors.text,
            textAlign: 'left',
            fontWeight: '800',
            fontSize: 13,
            textTransform: 'capitalize',
          },
        ]}
        numberOfLines={2}
      >
        {monthLabel(s)}
      </Text>
    </View>
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
      <View
        style={{
          minWidth: tableMinW,
          borderWidth: 1,
          borderColor: border,
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', backgroundColor: headerBg, borderBottomWidth: 1, borderBottomColor: border }}>
          {head('Месяц', 1.05, 'left')}
          {head('Всего на счетах', 1.1, 'right')}
          {head('Динамика капитала', 1.15, 'right')}
          {head('Общая выручка', 1.05, 'right')}
          {head('Прибыль', 1, 'right', true)}
        </View>
        {rows.map(({ snapshot: s, capitalDelta }, i) => {
          const zebra = i % 2 === 1;
          return (
            <View
              key={s.id}
              style={{
                flexDirection: 'row',
                borderBottomWidth: i < rows.length - 1 ? line : 0,
                borderBottomColor: border,
                backgroundColor: zebra
                  ? isLight
                    ? 'rgba(124,58,237,0.04)'
                    : 'rgba(168,85,247,0.06)'
                  : 'transparent',
              }}
            >
              {cellMonth(s, 1.05)}
              <View style={{ flex: 1.1, minWidth: 72, paddingVertical: 11, paddingHorizontal: 8, borderRightWidth: line, borderRightColor: border, justifyContent: 'center' }}>
                <Text style={[typography.caption, { textAlign: 'right', fontWeight: '800', fontVariant: ['tabular-nums'], color: colors.text, fontSize: 12 }]}>
                  {fmtMoneyPlain(s.totalBalance)}
                </Text>
              </View>
              {cellMoney(capitalDelta, 1.15, 'right', false, true)}
              {cellMoney(s.totalRevenue, 1.05, 'right', false, false)}
              {cellMoney(s.projectProfit, 1, 'right', true, true)}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function MonthHistoryCards({ rows }: { rows: EnrichedMonthRow[] }) {
  const { colors, typography, radius, brand, isLight, shadows } = useAppTheme();

  return (
    <View style={{ gap: 12 }}>
      {rows.map(({ snapshot: s, capitalDelta }) => (
        <View
          key={s.id}
          style={[
            {
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: brand.surfaceBorderStrong,
              backgroundColor: colors.surface,
              padding: 16,
            },
            isLight ? shadows.card : {},
          ]}
        >
          <Text style={[typography.title2, { color: brand.primary, fontWeight: '900', textTransform: 'capitalize', marginBottom: 12 }]}>
            {monthLabel(s)}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', marginBottom: 4 }]}>Всего на счетах</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] }}>{fmtMoneyPlain(s.totalBalance)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', marginBottom: 4 }]}>Динамика капитала</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '900',
                  fontVariant: ['tabular-nums'],
                  color: capitalDelta == null ? colors.textMuted : signedColor(capitalDelta) ?? colors.text,
                }}
              >
                {capitalDelta == null ? '—' : fmtSignedRub(capitalDelta)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', marginBottom: 4 }]}>Общая выручка</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
                {s.totalRevenue == null ? '—' : fmtMoneyPlain(s.totalRevenue)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', marginBottom: 4 }]}>Прибыль</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                  color: s.projectProfit == null ? colors.textMuted : signedColor(s.projectProfit) ?? colors.text,
                }}
              >
                {s.projectProfit == null ? '—' : fmtSignedRub(s.projectProfit)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: 16 }}>
            <View>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Личные расходы</Text>
              <Text style={{ fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], marginTop: 2 }}>{fmtMoneyPlain(s.personalExpenses)}</Text>
            </View>
            <View>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Бизнес-расходы</Text>
              <Text style={{ fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], marginTop: 2 }}>{fmtMoneyPlain(s.businessExpenses)}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
