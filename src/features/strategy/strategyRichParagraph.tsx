import { Text } from 'react-native';

import type { StrategyRichParagraph } from '@/features/strategy/strategy.config';

type Props = {
  parts: StrategyRichParagraph;
  baseColor: string;
  mutedColor: string;
  fontSize?: number;
  lineHeight?: number;
};

export function RichParagraphBlock({ parts, baseColor, mutedColor, fontSize = 13, lineHeight }: Props) {
  const lh = lineHeight ?? Math.round(fontSize * 1.65);
  return (
    <Text style={{ fontSize, lineHeight: lh, color: baseColor }}>
      {parts.map((seg, i) => {
        const c =
          seg.variant === 'strong'
            ? baseColor
            : seg.variant === 'emphasis'
              ? 'rgba(196,181,253,0.95)'
              : mutedColor;
        const weight = seg.variant === 'strong' ? '600' : seg.variant === 'emphasis' ? '500' : '400';
        const fontStyle = seg.variant === 'emphasis' ? 'italic' : 'normal';
        return (
          <Text key={i} style={{ color: c, fontWeight: weight as '400' | '500' | '600', fontStyle }}>
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}
