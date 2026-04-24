import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import type { FinanceMonthSnapshot } from '@/features/finance/finance.types';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
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

/** Короткая подпись для оси Y (масштаб в рублях). */
function fmtYAxisTick(n: number): string {
  const sign = n < 0 ? '−' : '';
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${sign}${(v / 1_000_000).toFixed(1).replace('.', ',')} млн`;
  if (v >= 1000) return `${sign}${Math.round(v / 1000)} тыс.`;
  return `${sign}${Math.round(v)}`;
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

const CHART_MIN_POINT_GAP = 56;
const CHART_PAD_L = 46;
const CHART_PAD_R = 12;
const CHART_PAD_T = 18;
const CHART_PAD_B = 40;
const CHART_HEIGHT = 248;

type ChartPoint = { x: number; y: number; v: number };

/** График «всего на счетах»: хронология слева направо; ширина растёт с числом месяцев, скролл — смотреть прошлое; справа — последний снимок. */
function MonthHistoryCapitalLineChart({ rows, width: viewportW }: { rows: EnrichedMonthRow[]; width: number }) {
  const { colors, brand, isLight } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { values, labels, monthTitles } = useMemo(() => {
    const chrono = [...rows].reverse();
    return {
      values: chrono.map((r) => r.snapshot.totalBalance),
      labels: chrono.map((r) =>
        new Date(r.snapshot.year, r.snapshot.month - 1, 1).toLocaleDateString('ru-RU', {
          month: 'short',
          year: '2-digit',
        })
      ),
      monthTitles: chrono.map((r) => monthLabel(r.snapshot)),
    };
  }, [rows]);

  const padL = CHART_PAD_L;
  const padR = CHART_PAD_R;
  const padT = CHART_PAD_T;
  const padB = CHART_PAD_B;
  const height = CHART_HEIGHT;
  const innerH = Math.max(1, height - padT - padB);

  const minV = values.length ? Math.min(...values) : 0;
  const maxV = values.length ? Math.max(...values) : 1;
  const span = Math.max(maxV - minV, 1);
  const n = values.length;

  const plotInnerW = useMemo(() => {
    if (n <= 0) return 120;
    if (n === 1) return Math.max(120, viewportW - padL - padR);
    return (n - 1) * CHART_MIN_POINT_GAP;
  }, [n, viewportW]);

  const contentWidth = Math.max(viewportW, padL + padR + plotInnerW);
  const innerW = Math.max(1, contentWidth - padL - padR);
  const step = n <= 1 ? 0 : innerW / (n - 1);

  const points: ChartPoint[] = useMemo(() => {
    return values.map((v, i) => {
      const x = n === 1 ? padL + innerW / 2 : padL + i * step;
      const t = (v - minV) / span;
      const y = padT + innerH - t * innerH;
      return { x, y, v };
    });
  }, [values, n, padL, innerW, step, minV, span, innerH, padT]);

  const polylinePoints = useMemo(() => points.map((p) => `${p.x},${p.y}`).join(' '), [points]);

  const gridColor = isLight ? 'rgba(15,17,24,0.08)' : 'rgba(255,255,255,0.06)';
  const axisMuted = isLight ? 'rgba(15,17,24,0.5)' : 'rgba(196,181,253,0.5)';
  const labelColor = isLight ? 'rgba(15,17,24,0.5)' : 'rgba(255,255,255,0.5)';
  const baselineY = padT + innerH;

  useLayoutEffect(() => {
    if (viewportW < 40 || n === 0) return;
    const x = Math.max(0, contentWidth - viewportW);
    scrollRef.current?.scrollTo({ x, animated: false });
  }, [contentWidth, viewportW, n]);

  if (viewportW < 40 || values.length === 0) return null;

  const tooltip =
    hover != null &&
    points[hover] != null &&
    labels[hover] != null && (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: Math.min(
            contentWidth - 156,
            Math.max(padL, points[hover]!.x - 78)
          ),
          top: Math.max(6, points[hover]!.y - 58),
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isLight ? 'rgba(15,17,24,0.12)' : 'rgba(157,107,255,0.45)',
          backgroundColor: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(12,8,22,0.94)',
          ...(Platform.OS === 'web'
            ? ({
                boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 0 32px rgba(123,92,255,0.2)',
              } as object)
            : {}),
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: '800', color: axisMuted, letterSpacing: 0.4 }}>{monthTitles[hover]!}</Text>
        <Text
          style={{ fontSize: 15, fontWeight: '900', color: isLight ? '#0F1118' : '#F5F3FF', marginTop: 2 }}
          numberOfLines={1}
        >
          {fmtMoneyPlain(values[hover]!)}
        </Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color: axisMuted, marginTop: 2 }}>всего на счетах, ₽</Text>
      </View>
    );

  return (
    <View style={{ width: viewportW, marginTop: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 6,
          paddingLeft: padL - 4,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>ось: сумма, ₽</Text>
        {contentWidth > viewportW ? (
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, flexShrink: 1, textAlign: 'right' }}>
            листайте влево — прошлые месяцы
          </Text>
        ) : null}
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator
        nestedScrollEnabled
        style={{ width: viewportW }}
        contentContainerStyle={{ width: contentWidth }}
      >
        <View style={{ width: contentWidth, height, position: 'relative' }}>
          <Svg width={contentWidth} height={height}>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = padT + innerH * (1 - t);
              return (
                <Line key={t} x1={padL} y1={y} x2={contentWidth - padR} y2={y} stroke={gridColor} strokeWidth={1} />
              );
            })}
            <Line
              x1={padL}
              y1={baselineY}
              x2={contentWidth - padR}
              y2={baselineY}
              stroke={gridColor}
              strokeWidth={1.2}
            />
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={brand.primary}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p, i) => (
              <Circle
                key={`c-${i}`}
                cx={p.x}
                cy={p.y}
                r={hover === i ? 6 : 4}
                fill={brand.primary}
                stroke={isLight ? '#fff' : '#0c0a12'}
                strokeWidth={hover === i ? 2 : 1}
              />
            ))}
          </Svg>

          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + innerH * (1 - t);
            const val = minV + span * t;
            return (
              <Text
                key={`yt-${t}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 2,
                  top: y - 8,
                  width: padL - 8,
                  textAlign: 'right',
                  fontSize: 9,
                  fontWeight: '700',
                  color: axisMuted,
                }}
                numberOfLines={1}
              >
                {fmtYAxisTick(val)}
              </Text>
            );
          })}
          <Text
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 2,
              top: padT - 14,
              width: padL - 6,
              textAlign: 'right',
              fontSize: 9,
              fontWeight: '800',
              color: axisMuted,
            }}
          >
            ₽
          </Text>

          {labels.map((lab, i) => {
            const px = points[i]?.x ?? padL;
            return (
              <Text
                key={`${lab}-${i}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: px - 28,
                  top: padT + innerH + 6,
                  width: 56,
                  textAlign: 'center',
                  fontSize: 9,
                  fontWeight: hover === i ? '900' : '700',
                  color: hover === i ? brand.primary : labelColor,
                }}
                numberOfLines={2}
              >
                {lab}
              </Text>
            );
          })}

          {Platform.OS === 'web'
            ? points.map((p, i) => (
                <View
                  key={`hit-${i}`}
                  style={
                    {
                      position: 'absolute',
                      left: p.x - 22,
                      top: p.y - 22,
                      width: 44,
                      height: 44,
                      zIndex: 4,
                      ...(Platform.OS === 'web' ? ({ cursor: 'crosshair' } as object) : {}),
                    } as object
                  }
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                />
              ))
            : points.map((p, i) => (
                <Pressable
                  key={`hit-${i}`}
                  style={{
                    position: 'absolute',
                    left: p.x - 22,
                    top: p.y - 22,
                    width: 44,
                    height: 44,
                    zIndex: 4,
                  }}
                  onPressIn={() => setHover(i)}
                  onPressOut={() => setHover(null)}
                />
              ))}
          {tooltip}
        </View>
      </ScrollView>
    </View>
  );
}

type TableProps = {
  rows: EnrichedMonthRow[];
  screenInnerWidth: number;
};

export function MonthHistoryTableTwin({ rows, screenInnerWidth }: TableProps) {
  const { colors, typography, radius, isLight } = useAppTheme();
  const lineColor = colors.border;
  const line = StyleSheet.hairlineWidth;
  const headerBg = isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.05)';
  const tableMinW = Math.max(screenInnerWidth - 8, 360);

  const head = (t: string, flexGrow: number, align: 'left' | 'center' | 'right', last?: boolean) => (
    <View
      style={{
        flex: flexGrow,
        minWidth: align === 'left' ? 88 : 72,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRightWidth: last ? 0 : line,
        borderRightColor: lineColor,
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
    const text = v == null ? '—' : colorize ? fmtSignedRub(v) : fmtMoneyPlain(v);
    return (
      <View
        style={{
          flex: flexGrow,
          minWidth: 72,
          paddingVertical: 11,
          paddingHorizontal: 8,
          borderRightWidth: last ? 0 : line,
          borderRightColor: lineColor,
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
        borderRightColor: lineColor,
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
          overflow: 'hidden',
          borderRadius: radius.lg,
          backgroundColor: isLight ? 'rgba(15,17,24,0.02)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: headerBg,
            borderBottomWidth: 1,
            borderBottomColor: lineColor,
          }}
        >
          {head('Месяц', 1.05, 'left')}
          {head('Всего на счетах', 1.1, 'right')}
          {head('Динамика капитала', 1.15, 'right')}
          {head('Общая выручка', 1.05, 'right')}
          {head('Прибыль', 1, 'right', true)}
        </View>
        {rows.map(({ snapshot: s, capitalDelta }, i) => (
          <View
            key={s.id}
            style={{
              flexDirection: 'row',
              borderBottomWidth: i < rows.length - 1 ? line : 0,
              borderBottomColor: lineColor,
            }}
          >
            {cellMonth(s, 1.05)}
            <View
              style={{
                flex: 1.1,
                minWidth: 72,
                paddingVertical: 11,
                paddingHorizontal: 8,
                borderRightWidth: line,
                borderRightColor: lineColor,
                justifyContent: 'center',
              }}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    textAlign: 'right',
                    fontWeight: '800',
                    fontVariant: ['tabular-nums'],
                    color: colors.text,
                    fontSize: 12,
                  },
                ]}
              >
                {fmtMoneyPlain(s.totalBalance)}
              </Text>
            </View>
            {cellMoney(capitalDelta, 1.15, 'right', false, true)}
            {cellMoney(s.totalRevenue, 1.05, 'right', false, false)}
            {cellMoney(s.projectProfit, 1, 'right', true, true)}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function MonthHistoryCards({ rows }: { rows: EnrichedMonthRow[] }) {
  const { colors, typography, radius, brand, isLight } = useAppTheme();

  return (
    <View style={{ gap: 12 }}>
      {rows.map(({ snapshot: s, capitalDelta }) => (
        <View
          key={s.id}
          style={{
            borderRadius: radius.xl,
            padding: 16,
            backgroundColor: isLight ? colors.surface2 : 'rgba(255,255,255,0.04)',
          }}
        >
          <Text
            style={[
              typography.title2,
              { color: brand.primary, fontWeight: '900', textTransform: 'capitalize', marginBottom: 12 },
            ]}
          >
            {monthLabel(s)}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', marginBottom: 4 }]}>
                Всего на счетах
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] }}>
                {fmtMoneyPlain(s.totalBalance)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', marginBottom: 4 }]}>
                Динамика капитала
              </Text>
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
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', marginBottom: 4 }]}>
                Общая выручка
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
                {s.totalRevenue == null ? '—' : fmtMoneyPlain(s.totalRevenue)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', marginBottom: 4 }]}>
                Прибыль
              </Text>
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
          <View
            style={{
              flexDirection: 'row',
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
              gap: 16,
            }}
          >
            <View>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Личные расходы</Text>
              <Text style={{ fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], marginTop: 2 }}>
                {fmtMoneyPlain(s.personalExpenses)}
              </Text>
            </View>
            <View>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Бизнес-расходы</Text>
              <Text style={{ fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], marginTop: 2 }}>
                {fmtMoneyPlain(s.businessExpenses)}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

type HistorySectionProps = {
  rows: EnrichedMonthRow[];
  screenInnerWidth: number;
  viewMode: MonthHistoryViewMode;
  onViewModeChange: (v: MonthHistoryViewMode) => void;
};

/** История месяцев: оболочка как у «Таблицы расходов», график капитала, переключатель таблица/карточки. */
export function FinanceMonthHistorySection({
  rows,
  screenInnerWidth,
  viewMode,
  onViewModeChange,
}: HistorySectionProps) {
  const { colors, typography, spacing, radius, isLight } = useAppTheme();
  const [blockW, setBlockW] = useState(0);

  const onBlockLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setBlockW(w);
  }, []);

  const shellBg = isLight ? 'rgba(15,17,24,0.04)' : 'rgba(10,10,14,0.92)';
  const shellBorder = isLight ? colors.border : 'rgba(255,255,255,0.07)';

  const chartWidth = Math.max(160, (blockW > 40 ? blockW : screenInnerWidth) - spacing.md * 2);

  return (
    <View
      onLayout={onBlockLayout}
      style={{
        marginBottom: spacing.lg,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: shellBorder,
        backgroundColor: shellBg,
        overflow: 'hidden',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: '900',
          color: colors.text,
          letterSpacing: -0.5,
        }}
      >
        Динамика капитала
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6, lineHeight: 18 }]}>
        «Всего на счетах» по месяцам: на графике слева — прошлое, справа — последний снимок в базе; при появлении нового
        месяца линия продлевается. В таблице ниже новые месяцы по-прежнему сверху.
      </Text>
      <MonthHistoryCapitalLineChart rows={rows} width={chartWidth} />

      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md, lineHeight: 20 }]}>
        История по месяцам. Динамика капитала в таблице — изменение баланса к предыдущему месяцу в списке. Выручка и
        прибыль — если есть в Twinworks: миграция 010_finance_snapshot_revenue.sql в Supabase и при необходимости
        повторный импорт.
      </Text>

      <View style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
        <SegmentedControl<MonthHistoryViewMode>
          value={viewMode}
          onChange={onViewModeChange}
          activeVariant="brandGlow"
          options={[
            { value: 'table', label: 'Таблица' },
            { value: 'cards', label: 'Карточки' },
          ]}
        />
      </View>

      {viewMode === 'table' ? (
        <MonthHistoryTableTwin rows={rows} screenInnerWidth={screenInnerWidth} />
      ) : (
        <MonthHistoryCards rows={rows} />
      )}
    </View>
  );
}
