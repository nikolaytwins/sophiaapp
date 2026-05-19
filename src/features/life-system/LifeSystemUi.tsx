import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { GOALS_ACCENT, GOALS_BORDER } from '@/features/goals/goalsNotionTheme';
import { SOPHIA_UI_ACCENT } from '@/navigation/navConstants';

export const LS_BG = '#0a0a0c';
export const LS_CARD = 'rgba(14,14,18,0.92)';
export const LS_MUTED = 'rgba(255,255,255,0.45)';
export const LS_TEXT = '#f0f0f8';
export const LS_ACCENT = SOPHIA_UI_ACCENT;
export const LS_ACCENT_SOFT = '#C084FC';

export function fmtRub(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}

export function LsSectionHead({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: LS_MUTED,
        marginBottom: 12,
        marginTop: 4,
      }}
    >
      {children}
    </Text>
  );
}

export function LsCard({
  children,
  style,
  accent,
  onPress,
}: {
  children: ReactNode;
  style?: ViewStyle;
  accent?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <View
      style={[
        {
          backgroundColor: LS_CARD,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: accent ? 'rgba(192,132,252,0.28)' : GOALS_BORDER,
          padding: 20,
          ...(accent
            ? {
                ...(Platform.OS === 'web'
                  ? ({ boxShadow: '0 0 40px rgba(115,55,221,0.12)' } as ViewStyle)
                  : {}),
              }
            : {}),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      {inner}
    </Pressable>
  );
}

export function LsLabel({ children, dotColor = LS_ACCENT_SOFT }: { children: string; dotColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: dotColor }} />
      <Text
        style={{
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          color: LS_MUTED,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

export function LsValue({ children, color = LS_TEXT }: { children: string; color?: string }) {
  return (
    <Text
      style={{
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -1.2,
        color,
        lineHeight: 34,
      }}
    >
      {children}
    </Text>
  );
}

export function LsProgressBar({ pct, color = GOALS_ACCENT }: { pct: number; color?: string }) {
  const w = Math.min(1, Math.max(0, pct));
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <View style={{ width: `${w * 100}%`, height: '100%', borderRadius: 2, backgroundColor: color }} />
      </View>
    </View>
  );
}

export function LsLinkRow({
  label,
  hint,
  onPress,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: LS_ACCENT_SOFT }}>{label}</Text>
      {hint ? <Text style={{ fontSize: 11, color: LS_MUTED }}>{hint}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={LS_MUTED} />
    </Pressable>
  );
}

export function LsSticky({ children }: { children: string }) {
  return (
    <View
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(192,132,252,0.2)',
        backgroundColor: 'rgba(115,55,221,0.08)',
      }}
    >
      <Text style={{ fontSize: 12, lineHeight: 18, color: 'rgba(196,181,253,0.9)' }}>{children}</Text>
    </View>
  );
}

export const lsStyles = StyleSheet.create({
  row2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  col: { flexGrow: 1, flexShrink: 1 },
});
