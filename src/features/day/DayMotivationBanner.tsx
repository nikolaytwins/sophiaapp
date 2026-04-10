import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';

export type DayMotivationPayload = {
  /** Крупная строка сверху (опционально). */
  headline?: string;
  body: string;
};

/**
 * Мотивационная заметка по месяцу календаря дня (`YYYY-MM-DD`).
 * Август — отдельный текст; во всех остальных месяцах — основной блок.
 */
export function dayMotivationForDateKey(dateKey: string): DayMotivationPayload | null {
  const part = dateKey.slice(5, 7);
  if (part.length !== 2) return null;
  const m = Number(part);
  if (!Number.isFinite(m) || m < 1 || m > 12) return null;

  if (m === 8) {
    return { body: 'Полный газ в контент.' };
  }
  return {
    headline: 'НЕ СДАВАТЬСЯ.',
    body: 'результата не будет, но главное не слиться и продолжать.',
  };
}

type Props = {
  dateKey: string;
};

export function DayMotivationBanner({ dateKey }: Props) {
  const { spacing, radius, isLight, colors, brand, shadows } = useAppTheme();
  const payload = dayMotivationForDateKey(dateKey);
  if (!payload) return null;

  const headlineColor = isLight ? brand.primary : colors.accent;
  const bodyColor = isLight ? colors.text : 'rgba(247,244,250,0.88)';

  const outerStyle = {
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: isLight ? brand.surfaceBorder : 'rgba(167,139,250,0.24)',
    backgroundColor: brand.surface,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    ...(Platform.OS === 'web'
      ? (isLight
          ? ({ boxShadow: '0 8px 28px rgba(15,17,24,0.07)' } as object)
          : ({ boxShadow: '0 14px 40px rgba(0,0,0,0.4)' } as object))
      : shadows.card),
  };

  return (
    <View style={outerStyle}>
      <LinearGradient
        pointerEvents="none"
        colors={
          isLight
            ? ['rgba(124,58,237,0.07)', 'rgba(124,58,237,0.02)', 'transparent']
            : ['rgba(168,85,247,0.11)', 'rgba(212,184,122,0.05)', 'transparent']
        }
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius.xl }]}
      />
      {Platform.OS === 'web' ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: radius.xl,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
            } as object,
          ]}
        />
      ) : null}
      <View
        style={{
          paddingVertical: spacing.md + 4,
          paddingHorizontal: spacing.lg,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {payload.headline ? (
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: headlineColor,
              marginBottom: 8,
            }}
          >
            {payload.headline}
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: payload.headline ? 15 : 16,
            fontWeight: '600',
            lineHeight: payload.headline ? 22 : 24,
            letterSpacing: -0.2,
            color: bodyColor,
          }}
        >
          {payload.body}
        </Text>
      </View>
    </View>
  );
}
