import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CAL_PRIMARY_GRADIENT,
  calendarSynaptixGlowWeb,
} from '@/features/calendar/calendarPremiumShell';
import { useAppTheme } from '@/theme';

type Option<T extends string> = { value: T; label: string };

type ActiveVariant = 'default' | 'brandGlow';

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  /** Активный сегмент: фирменный градиент + свечение (как календарь). */
  activeVariant?: ActiveVariant;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  activeVariant = 'default',
}: Props<T>) {
  const { colors, typography, radius, spacing, isLight, brand } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          flexDirection: 'row',
          backgroundColor: colors.surface2,
          borderRadius: radius.md,
          padding: 3,
          borderWidth: 1,
          borderColor: colors.border,
        },
        trackBrand: {
          backgroundColor: isLight ? 'rgba(255,255,255,0.65)' : 'rgba(8, 8, 14, 0.88)',
          borderColor: isLight ? 'rgba(15,17,24,0.1)' : 'rgba(255,255,255,0.08)',
        },
        trackBrandWeb: Platform.OS === 'web' && !isLight ? ({ overflow: 'visible' as const } as const) : {},
        segment: {
          flex: 1,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
        },
        segmentActive: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
        label: {
          ...typography.caption,
          color: colors.textMuted,
        },
        labelActive: {
          color: colors.text,
          fontWeight: '600',
        },
        labelBrandInactive: {
          color: isLight ? colors.textMuted : 'rgba(255,255,255,0.52)',
          fontWeight: '600',
        },
        labelBrandActive: {
          color: '#FAFAFC',
          fontWeight: '800',
          fontSize: 12,
          letterSpacing: 0.2,
        },
      }),
    [colors, typography, radius, spacing.sm, isLight]
  );

  const brandActiveNativeGlow = !isLight
    ? {
        shadowColor: '#7B5CFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 14,
        elevation: 8,
      }
    : {
        shadowColor: brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 4,
      };

  const activeGradientColors = (
    isLight ? ([brand.primary, '#6366F1'] as const) : ([...CAL_PRIMARY_GRADIENT] as readonly string[])
  ) as readonly [string, string, ...string[]];

  return (
    <View style={[styles.track, activeVariant === 'brandGlow' && styles.trackBrand, activeVariant === 'brandGlow' && styles.trackBrandWeb]}>
      {options.map((o) => {
        const active = o.value === value;
        const useBrand = activeVariant === 'brandGlow' && active;

        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              active && activeVariant === 'default' && styles.segmentActive,
              active && activeVariant === 'brandGlow' && { paddingVertical: 0, overflow: 'visible' as const },
            ]}
          >
            {useBrand ? (
              <LinearGradient
                colors={activeGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  {
                    width: '100%',
                    minHeight: spacing.sm * 2 + 18,
                    borderRadius: radius.sm,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: Platform.OS === 'web' ? 1 : 0,
                    borderColor: 'rgba(255,255,255,0.22)',
                  },
                  !isLight && Platform.OS === 'web' && calendarSynaptixGlowWeb('123, 92, 255'),
                  Platform.OS !== 'web' && brandActiveNativeGlow,
                ]}
              >
                <Text style={[styles.label, styles.labelBrandActive]} numberOfLines={1}>
                  {o.label}
                </Text>
              </LinearGradient>
            ) : (
              <Text
                style={[
                  styles.label,
                  active && activeVariant === 'default' && styles.labelActive,
                  activeVariant === 'brandGlow' && !active && styles.labelBrandInactive,
                ]}
                numberOfLines={1}
              >
                {o.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
