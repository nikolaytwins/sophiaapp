import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAppTheme } from '@/theme';

/** PNG с прозрачным фоном: София с доской «ЦЕЛИ». */
export const GOALS_HERO_VISION_IMAGE = require('../../assets/images/goals-hero-vision-board.png');

const STACK_BREAKPOINT = 420;

/** Было bottom:0 — обрезало верх (лицо). Верх + лёгкий translateY показывают голову в кадре. */
const GOALS_IMG_POS_ROW = { top: '0%', right: '0%' } as const;
const GOALS_IMG_POS_STACK = { top: '0%', right: '0%' } as const;
const GOALS_IMG_NUDGE_Y = Platform.OS === 'web' ? 18 : 14;

/**
 * Hero «Цели»: сетка как на «День» — картинка заполняет правую колонку (cover), без градиентного затемнения поверх фото.
 */
export function GoalsHero() {
  const { radius, spacing } = useAppTheme();
  const cardRadius = radius.xl;
  const { width: windowWidth } = useWindowDimensions();
  const stackLayout = windowWidth < STACK_BREAKPOINT;
  const imgPos = stackLayout ? GOALS_IMG_POS_STACK : GOALS_IMG_POS_ROW;

  return (
    <View style={[styles.banner, { borderRadius: cardRadius, marginBottom: spacing.sm }]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#141018', '#0a090f', '#06060a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(109,40,217,0.42)', 'rgba(20,16,28,0.22)', 'transparent']}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0.65, y: 0.6 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(109,40,217,0.12)', 'rgba(167,139,250,0.2)']}
        start={{ x: 0.4, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />

      <View style={[styles.contentRow, stackLayout && styles.contentRowStack]}>
        <View style={[styles.copyZone, stackLayout && styles.copyZoneStack]}>
          <Text style={styles.headline}>Цели и доска желаний</Text>
        </View>

        <View style={[styles.figureZone, stackLayout && styles.figureZoneStack]}>
          <View style={styles.figureImageFrame} collapsable={false}>
            <Image
              source={GOALS_HERO_VISION_IMAGE}
              style={[StyleSheet.absoluteFillObject, { transform: [{ translateY: GOALS_IMG_NUDGE_Y }] }]}
              contentFit="cover"
              contentPosition={imgPos}
              accessibilityIgnoresInvertColors
              accessibilityLabel="Иллюстрация: доска желаний"
            />
          </View>
        </View>
      </View>

      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius: cardRadius,
            borderWidth: 1,
            borderColor: 'rgba(167,139,250,0.28)',
          },
        ]}
      />
      {Platform.OS === 'web' ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: cardRadius,
              boxShadow:
                'inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 80px rgba(120,60,200,0.22), 0 20px 56px rgba(0,0,0,0.55)',
            } as object,
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginTop: 0,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
    ...(Platform.OS === 'web'
      ? {
          boxShadow:
            'inset 0 0 0 1px rgba(255,255,255,0.05), 0 18px 52px rgba(0,0,0,0.58), 0 0 88px rgba(88,40,160,0.24)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 18 },
          shadowOpacity: 0.55,
          shadowRadius: 36,
          elevation: 14,
        }),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    position: 'relative',
    zIndex: 1,
    minHeight: 280,
  },
  contentRowStack: {
    flexDirection: 'column',
    minHeight: undefined,
  },
  copyZone: {
    flex: 1,
    minWidth: 0,
    maxWidth: '54%',
    paddingLeft: 22,
    paddingRight: 14,
    paddingVertical: 22,
    justifyContent: 'center',
  },
  copyZoneStack: {
    width: '100%',
    maxWidth: '100%',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 30,
    color: '#FAFAFC',
  },
  figureZone: {
    width: '48%',
    minWidth: 200,
    maxWidth: 340,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'stretch',
    minHeight: 280,
  },
  figureZoneStack: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    minHeight: 244,
    maxHeight: 252,
    alignSelf: 'stretch',
  },
  figureImageFrame: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
