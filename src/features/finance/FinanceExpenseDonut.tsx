import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

export type DonutSegment = { label: string; value: number; color?: string };

const PALETTE = ['#A855F7', '#C084FC', '#7C3AED', '#E879F9', '#38BDF8', '#34D399', '#FBBF24'];

type Props = {
  segments: DonutSegment[];
  height: number;
  isLight: boolean;
};

function donutPath(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => {
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    return { x, y };
  };
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const o0 = p(rOut, a0);
  const o1 = p(rOut, a1);
  const i1 = p(rIn, a1);
  const i0 = p(rIn, a0);
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${o1.x} ${o1.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${i0.x} ${i0.y}`,
    'Z',
  ].join(' ');
}

/** Кольцевая диаграмма долей расхода по категориям. */
export function FinanceExpenseDonut({ segments, height, isLight }: Props) {
  const [width, setWidth] = useState(320);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 60) setWidth(w);
  };

  const { paths, total, colored, size } = useMemo(() => {
    const size = Math.min(width, height);
    const cx = size / 2;
    const cy = size / 2 - 4;
    const rOut = size * 0.34;
    const rIn = size * 0.2;
    const raw = segments.filter((s) => s.value > 0);
    const total = raw.reduce((a, s) => a + s.value, 0);
    if (total <= 0) return { paths: [] as { d: string; fill: string }[], total: 0, colored: [] as DonutSegment[], size };
    const colored = raw.map((s, i) => ({ ...s, color: s.color || PALETTE[i % PALETTE.length]! }));
    let ang = -Math.PI / 2;
    const paths: { d: string; fill: string }[] = [];
    for (const s of colored) {
      const frac = s.value / total;
      const a1 = ang + frac * Math.PI * 2;
      if (frac > 0.001) {
        paths.push({ d: donutPath(cx, cy, rOut, rIn, ang, a1), fill: s.color });
      }
      ang = a1;
    }
    return { paths, total, colored, size };
  }, [segments, width, height]);

  const muted = isLight ? 'rgba(15,17,24,0.5)' : 'rgba(196,181,253,0.55)';
  const text = isLight ? '#0F1118' : '#FAFAFC';

  return (
    <View style={{ width: '100%', minHeight: height }} onLayout={onLayout}>
      <View style={{ flexDirection: width > 420 ? 'row' : 'column', alignItems: 'center', gap: 16 }}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size}>
            <G>
              {paths.map((p, i) => (
                <Path key={i} d={p.d} fill={p.fill} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
              ))}
            </G>
          </Svg>
          <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
            <Text style={{ fontSize: 10, fontWeight: '700', color: muted }}>всего</Text>
            <Text style={{ fontSize: 15, fontWeight: '900', color: text, marginTop: 2, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
              {Math.round(total).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} ₽
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', gap: 8 }}>
          {colored.length === 0 ? (
            <Text style={{ fontSize: 13, color: muted }}>Нет данных расходов за выбранный месяц.</Text>
          ) : (
            colored.slice(0, 8).map((s) => {
              const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
              return (
                <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: text }} numberOfLines={1}>
                      {s.label}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: muted, fontVariant: ['tabular-nums'] }}>{pct}%</Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    </View>
  );
}
