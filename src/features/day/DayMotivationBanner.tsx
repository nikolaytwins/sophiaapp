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
  const { spacing, radius, isLight } = useAppTheme();
  const payload = dayMotivationForDateKey(dateKey);
  if (!payload) return null;

  const titleColor = isLight ? '#1c1008' : '#fffef8';
  const bodyColor = isLight ? 'rgba(28,16,8,0.88)' : 'rgba(255,254,248,0.92)';

  return (
    <View
      style={[
        styles.wrap,
        {
          marginBottom: spacing.lg,
          borderRadius: radius.xl,
          ...(Platform.OS === 'web'
            ? ({ boxShadow: '0 0 28px rgba(251,191,36,0.55), 0 0 48px rgba(245,158,11,0.25)' } as object)
            : {
                shadowColor: '#fbbf24',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.65,
                shadowRadius: 18,
                elevation: 12,
              }),
        },
      ]}
    >
      <LinearGradient
        colors={['#fde68a', '#fbbf24', '#f59e0b', '#ea580c']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius: radius.xl }]}
      >
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.innerGlow, { borderRadius: radius.xl - 1 }]}
        />
        <View style={styles.content}>
          {payload.headline ? (
            <Text style={[styles.headline, { color: titleColor }]}>{payload.headline}</Text>
          ) : null}
          <Text style={[payload.headline ? styles.body : styles.bodySolo, { color: bodyColor }]}>
            {payload.body}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  gradient: {
    overflow: 'hidden',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  innerGlow: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  headline: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  body: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  bodySolo: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
});
