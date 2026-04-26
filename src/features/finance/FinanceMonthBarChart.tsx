import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

type Props = {
  values: number[];
  labels: string[];
  height: number;
  isLight: boolean;
  /** Столбцы от нуля (Δ капитала): вверх зелёный, вниз красный. */
  signedFromZero?: boolean;
};

const GREEN = '#4ADE80';
const RED = '#FB7185';
const PURPLE = '#A855F7';

export function FinanceMonthBarChart({ values, labels, height, isLight, signedFromZero }: Props) {
  const [width, setWidth] = useState(360);
  const padL = 36;
  const padR = 8;
  const padT = 10;
  const padB = 26;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = Math.max(1, height - padT - padB);

  const { minV, maxV, y0, bars } = useMemo(() => {
    if (!values.length) {
      return { minV: 0, maxV: 1, y0: padT + innerH, bars: [] as { x: number; y: number; w: number; h: number; fill: string }[] };
    }
    let minV = Math.min(...values);
    let maxV = Math.max(...values);
    if (signedFromZero) {
      minV = Math.min(0, minV);
      maxV = Math.max(0, maxV);
    } else {
      minV = 0;
      maxV = Math.max(maxV, 1);
    }
    const span = Math.max(maxV - minV, 1);
    const y0 = padT + innerH - ((0 - minV) / span) * innerH;
    const n = values.length;
    const gap = 4;
    const bw = Math.max(4, (innerW - gap * (n + 1)) / n);
    const bars = values.map((v, i) => {
      const x = padL + gap + i * (bw + gap);
      const yTop = padT + innerH - ((v - minV) / span) * innerH;
      const yBot = y0;
      const top = Math.min(yTop, yBot);
      const h = Math.max(2, Math.abs(yBot - yTop));
      let fill = PURPLE;
      if (signedFromZero) {
        fill = v >= 0 ? GREEN : RED;
      }
      return { x, y: top, w: bw, h, fill };
    });
    return { minV, maxV, y0, bars };
  }, [values, innerW, innerH, padL, padT, signedFromZero]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 40) setWidth(w);
  };

  const axisMuted = isLight ? 'rgba(15,17,24,0.45)' : 'rgba(196,181,253,0.45)';
  const gridColor = isLight ? 'rgba(15,17,24,0.1)' : 'rgba(255,255,255,0.08)';
  const zeroLine = isLight ? 'rgba(15,17,24,0.35)' : 'rgba(250,250,252,0.35)';

  return (
    <View style={{ width: '100%', height }} onLayout={onLayout}>
      <Svg width={width} height={height}>
        <Rect x={padL} y={padT} width={innerW} height={innerH} fill="transparent" />
        {signedFromZero && minV < 0 && maxV > 0 ? (
          <Rect x={padL} y={y0} width={innerW} height={1.5} fill={zeroLine} />
        ) : null}
        {!signedFromZero ? <Rect x={padL} y={padT + innerH - 1} width={innerW} height={1} fill={gridColor} /> : null}
        {bars.map((b, i) => (
          <Rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={4} fill={b.fill} opacity={0.92} />
        ))}
      </Svg>
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
              fontWeight: '700',
              color: axisMuted,
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
