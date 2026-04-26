import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

function fmtRub(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

const GREEN = '#4ADE80';
const RED = '#FB7185';

type Props = {
  values: number[];
  labels: string[];
  color: string;
  height: number;
  isLight: boolean;
  /** Ось Y через ноль, сегменты: плюс — зелёный, минус — красный. */
  signedDiverging?: boolean;
};

type Pt = { x: number; y: number; v: number };

function lineSegmentsSigned(p0: Pt, p1: Pt): { x1: number; y1: number; x2: number; y2: number; stroke: string }[] {
  const eps = 1e-9;
  if (Math.abs(p1.x - p0.x) < eps && Math.abs(p1.y - p0.y) < eps) return [];

  const bothPos = p0.v > 0 && p1.v > 0;
  const bothNonNeg = p0.v >= 0 && p1.v >= 0 && !(p0.v === 0 && p1.v === 0);
  const bothNeg = p0.v < 0 && p1.v < 0;
  const bothNonPos = p0.v <= 0 && p1.v <= 0 && !(p0.v === 0 && p1.v === 0);

  if (bothPos || (bothNonNeg && (p0.v > 0 || p1.v > 0))) {
    return [{ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, stroke: GREEN }];
  }
  if (bothNeg || (bothNonPos && (p0.v < 0 || p1.v < 0))) {
    return [{ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, stroke: RED }];
  }
  if (p0.v === 0 && p1.v === 0) {
    return [{ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, stroke: 'rgba(148,163,184,0.55)' }];
  }

  const denom = p0.v - p1.v;
  if (Math.abs(denom) < eps) {
    return [{ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, stroke: p0.v > 0 ? GREEN : p0.v < 0 ? RED : 'rgba(148,163,184,0.55)' }];
  }
  const u = p0.v / denom;
  if (!Number.isFinite(u) || u < 0 || u > 1) {
    return [{ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, stroke: p0.v > 0 ? GREEN : p0.v < 0 ? RED : 'rgba(148,163,184,0.55)' }];
  }
  if (u <= 1e-6) {
    return [{ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, stroke: p1.v > 0 ? GREEN : p1.v < 0 ? RED : 'rgba(148,163,184,0.55)' }];
  }
  if (u >= 1 - 1e-6) {
    return [{ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, stroke: p0.v > 0 ? GREEN : p0.v < 0 ? RED : 'rgba(148,163,184,0.55)' }];
  }
  const xz = p0.x + u * (p1.x - p0.x);
  const yz = p0.y + u * (p1.y - p0.y);
  const z: Pt = { x: xz, y: yz, v: 0 };
  return [...lineSegmentsSigned(p0, z), ...lineSegmentsSigned(z, p1)];
}

/**
 * Линейный график с узлами: на web — hover и тултип;
 * signedDiverging — шкала включает 0, линия нуля, зелёный/красный по знаку Δ капитала.
 */
export function FinancePremiumChart({ values, labels, color, height, isLight, signedDiverging }: Props) {
  const [width, setWidth] = useState(360);
  const [hover, setHover] = useState<number | null>(null);

  const padL = 40;
  const padR = 12;
  const padT = 14;
  const padB = 28;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = Math.max(1, height - padT - padB);

  const { minV, maxV, points, yZero, hasZeroInRange } = useMemo(() => {
    if (!values.length) {
      return { minV: 0, maxV: 1, points: [] as Pt[], yZero: padT + innerH, hasZeroInRange: false };
    }
    let minV = Math.min(...values);
    let maxV = Math.max(...values);
    if (signedDiverging) {
      minV = Math.min(0, minV);
      maxV = Math.max(0, maxV);
    }
    const span = Math.max(maxV - minV, 1);
    const n = values.length;
    const step = n <= 1 ? innerW : innerW / (n - 1);
    const pts = values.map((v, i) => {
      const x = padL + i * step;
      const t = (v - minV) / span;
      const y = padT + innerH - t * innerH;
      return { x, y, v };
    });
    const t0 = (0 - minV) / span;
    const yZero = padT + innerH - t0 * innerH;
    const hasZeroInRange = signedDiverging && minV < 0 && maxV > 0;
    return { minV, maxV, points: pts, yZero, hasZeroInRange };
  }, [values, innerW, innerH, padL, padT, signedDiverging]);

  const segments = useMemo(() => {
    if (!signedDiverging || points.length < 2) return [] as { x1: number; y1: number; x2: number; y2: number; stroke: string }[];
    const out: { x1: number; y1: number; x2: number; y2: number; stroke: string }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      out.push(...lineSegmentsSigned(points[i]!, points[i + 1]!));
    }
    return out;
  }, [points, signedDiverging]);

  const gridColor = isLight ? 'rgba(15,17,24,0.08)' : 'rgba(255,255,255,0.06)';
  const axisMuted = isLight ? 'rgba(15,17,24,0.45)' : 'rgba(196,181,253,0.45)';
  const zeroLineColor = isLight ? 'rgba(15,17,24,0.42)' : 'rgba(250,250,252,0.38)';
  const yMaxLabel =
    maxV >= 1_000_000 ? `${(maxV / 1_000_000).toFixed(1).replace('.', ',')} млн` : maxV >= 1000 ? `${Math.round(maxV / 1000)} тыс.` : `${Math.round(maxV)}`;
  const yMinLabel =
    minV <= -1_000_000
      ? `${(minV / 1_000_000).toFixed(1).replace('.', ',')} млн`
      : minV <= -1000
        ? `${Math.round(minV / 1000)} тыс.`
        : `${Math.round(minV)}`;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 40) setWidth(w);
  };

  const nodeColor = (v: number) => {
    if (!signedDiverging) return color;
    if (v > 0) return GREEN;
    if (v < 0) return RED;
    return axisMuted;
  };

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

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
      <Text
        style={{
          fontSize: 15,
          fontWeight: '900',
          color: isLight ? '#0F1118' : signedDiverging && values[hover]! < 0 ? '#FECDD3' : signedDiverging && values[hover]! > 0 ? '#BBF7D0' : '#F5F3FF',
          marginTop: 2,
        }}
        numberOfLines={1}
      >
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
          if (signedDiverging && hasZeroInRange && Math.abs(y - yZero) < 2) return null;
          return <Line key={t} x1={padL} y1={y} x2={width - padR} y2={y} stroke={gridColor} strokeWidth={1} />;
        })}
        {signedDiverging && hasZeroInRange ? (
          <Line x1={padL} y1={yZero} x2={width - padR} y2={yZero} stroke={zeroLineColor} strokeWidth={2.2} />
        ) : (
          <Line x1={padL} y1={padT + innerH} x2={width - padR} y2={padT + innerH} stroke={gridColor} strokeWidth={1.2} />
        )}
        {signedDiverging && segments.length > 0
          ? segments.map((s, i) => (
              <Line
                key={`seg-${i}`}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke={s.stroke}
                strokeWidth={2.8}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))
          : points.length > 0 ? (
              <Polyline points={polylinePoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            ) : null}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hover === i ? 6 : 4}
            fill={nodeColor(p.v)}
            stroke={isLight ? '#fff' : '#0c0a12'}
            strokeWidth={hover === i ? 2 : 1}
          />
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
          top: padT,
          width: padL - 4,
          height: innerH,
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
        pointerEvents="none"
      >
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: axisMuted }} numberOfLines={1}>
            {yMaxLabel}
          </Text>
        </View>
        {signedDiverging && hasZeroInRange ? (
          <Text style={{ fontSize: 9, fontWeight: '900', color: zeroLineColor }} numberOfLines={1}>
            0
          </Text>
        ) : (
          <View />
        )}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: axisMuted }} numberOfLines={1}>
            {yMinLabel}
          </Text>
          <Text style={{ fontSize: 8, fontWeight: '700', color: axisMuted, marginTop: 2 }}>₽</Text>
        </View>
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
