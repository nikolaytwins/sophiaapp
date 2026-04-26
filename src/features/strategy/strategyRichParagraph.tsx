import { Text } from 'react-native';

import type { StrategyRichParagraph } from '@/features/strategy/strategy.config';

type Props = {
  parts: StrategyRichParagraph;
  baseColor: string;
  mutedColor: string;
};

export function RichParagraphBlock({ parts, baseColor, mutedColor }: Props) {
  return (
    <Text style={{ fontSize: 13, lineHeight: 22, color: baseColor }}>
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
