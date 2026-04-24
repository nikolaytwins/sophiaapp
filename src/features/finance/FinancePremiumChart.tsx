import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

function fmtRub(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

type Props = {
  values: number[];
  labels: string[];
  color: string;
  height: number;
  isLight: boolean;
};

/**
 * Линейный график с узлами: на web — наведение и подсказка с суммой в ₽;
 * на native — без hover, узлы видны как опоры линии.
 */
export function FinancePremiumChart({ values, labels, color, height, isLight }: Props) {
  const [width, setWidth] = useState(360);
  const [hover, setHover] = useState<number | null>(null);

  const padL = 36;
  const padR = 12;
  const padT = 14;
  const padB = 28;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = Math.max(1, height - padT - padB);

  const { minV, maxV, points, baselineY } = useMemo(() => {
    const minV = values.length ? Math.min(...values) : 0;
    const maxV = values.length ? Math.max(...values) : 1;
    const span = Math.max(maxV - minV, 1);
    const n = values.length;
    const step = n <= 1 ? innerW : innerW / (n - 1);
    const pts = values.map((v, i) => {
      const x = padL + i * step;
      const t = (v - minV) / span;
      const y = padT + innerH - t * innerH;
      return { x, y, v };
    });
    return { minV, maxV, points: pts, baselineY: padT + innerH };
  }, [values, innerW, innerH, padL, padT]);

  const polylinePoints = useMemo(() => points.map((p) => `${p.x},${p.y}`).join(' '), [points]);

  const gridColor = isLight ? 'rgba(15,17,24,0.08)' : 'rgba(255,255,255,0.06)';
  const axisMuted = isLight ? 'rgba(15,17,24,0.45)' : 'rgba(196,181,253,0.45)';
  const yMaxLabel = maxV >= 1_000_000 ? `${(maxV / 1_000_000).toFixed(1).replace('.', ',')} млн` : maxV >= 1000 ? `${Math.round(maxV / 1000)} тыс.` : `${Math.round(maxV)}`;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 40) setWidth(w);
  };

  const tooltip = hover != null && points[hover] != null && labels[hover] != null && (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: Math.min(width - 148, Math.max(8, points[hover]!.x - 72)),
        top: Math.max(6, points[hover]!.y - 52),
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isLight ? 'rgba(15,17,24,0.1)' : 'rgba(157,107,255,0.45)',
        backgroundColor: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(12,8,22,0.94)',
        ...(Platform.OS === 'web'
          ? ({
              boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 0 32px rgba(123,92,255,0.2)',
            } as object)
          : {}),
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: axisMuted, letterSpacing: 0.4 }}>{labels[hover]!}</Text>
      <Text style={{ fontSize: 15, fontWeight: '900', color: isLight ? '#0F1118' : '#F5F3FF', marginTop: 2 }} numberOfLines={1}>
        {fmtRub(values[hover]!)}
      </Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: axisMuted, marginTop: 2 }}>руб., по снимку месяца</Text>
    </View>
  );

  return (
    <View style={{ width: '100%', height }} onLayout={onLayout}>
      <Svg width={width} height={height}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + innerH * (1 - t);
          return <Line key={t} x1={padL} y1={y} x2={width - padR} y2={y} stroke={gridColor} strokeWidth={1} />;
        })}
        <Line x1={padL} y1={baselineY} x2={width - padR} y2={baselineY} stroke={gridColor} strokeWidth={1.2} />
        <Polyline points={polylinePoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={hover === i ? 6 : 4} fill={color} stroke={isLight ? '#fff' : '#0c0a12'} strokeWidth={hover === i ? 2 : 1} />
        ))}
      </Svg>
      {Platform.OS === 'web'
        ? points.map((p, i) => (
            <View
              key={`hit-${i}`}
              style={
                {
                  position: 'absolute',
                  left: p.x - 20,
                  top: p.y - 20,
                  width: 40,
                  height: 40,
                  zIndex: 2,
                  ...(Platform.OS === 'web' ? ({ cursor: 'crosshair' } as object) : {}),
                } as object
              }
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            />
          ))
        : null}
      {tooltip}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: padT - 2,
          width: padL - 4,
          alignItems: 'flex-end',
        }}
        pointerEvents="none"
      >
        <Text style={{ fontSize: 9, fontWeight: '700', color: axisMuted }} numberOfLines={1}>
          {yMaxLabel}
        </Text>
        <Text style={{ fontSize: 8, fontWeight: '700', color: axisMuted, marginTop: 2 }}>₽</Text>
      </View>
      <View
        style={{
          position: 'absolute',
          left: padL,
          right: padR,
          bottom: 2,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
        pointerEvents="none"
      >
        {labels.map((lab, i) => (
          <Text
            key={`${i}-${lab}`}
            style={{
              fontSize: 9,
              fontWeight: hover === i ? '900' : '700',
              color: hover === i ? color : axisMuted,
              maxWidth: innerW / Math.max(labels.length, 1),
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {lab}
          </Text>
        ))}
      </View>
    </View>
  );
}
