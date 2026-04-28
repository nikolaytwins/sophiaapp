import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAppTheme } from '@/theme';

/** PNG с прозрачным фоном: София с доской «ЦЕЛИ». */
export const GOALS_HERO_VISION_IMAGE = require('../../assets/images/goals-hero-vision-board.png');

/** Как в `TasksPlannerHero` — один брейкпоинт стека и те же высоты. */
const STACK_BREAKPOINT = 520;

const HERO_MIN_H = 336;
const HERO_STACK_MIN_H = 440;
const HERO_FIGURE_STACK_MIN_H = 400;

/**
 * Hero «Цели»: тот же каркас, градиенты и типографика, что у героя «Задачи» (`TasksPlannerHero`).
 */
export function GoalsHero() {
  const { spacing } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const stackLayout = windowWidth < STACK_BREAKPOINT;
  const cardRadius = 22;

  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: cardRadius, marginBottom: spacing.sm },
        { width: '100%' as const, alignSelf: 'stretch' },
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['#000000', '#0a0a0c', '#050508']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.4 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(88,28,135,0.45)', 'rgba(0,0,0,0.15)', 'transparent']}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0.55, y: 0.5 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />

      <View style={[styles.row, stackLayout && styles.rowStack]}>
        <View style={[styles.copy, stackLayout && styles.copyStack]}>
          <Text style={styles.overline}>ЦЕЛИ</Text>
          <Text style={styles.title}>Цели и доска желаний</Text>
        </View>

        <View style={[styles.figure, stackLayout && styles.figureStack]}>
          <View style={styles.figureFrame} collapsable={false}>
            <Image
              source={GOALS_HERO_VISION_IMAGE}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              contentPosition={{ top: '6%', right: '0%' }}
              accessibilityIgnoresInvertColors
              accessibilityLabel="Иллюстрация: доска желаний"
            />
          </View>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.2)', 'transparent']}
            locations={[0, 0.35, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.figureBlend}
          />
        </View>
      </View>

      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { borderRadius: cardRadius, borderWidth: 1, borderColor: 'rgba(167,139,250,0.28)' },
        ]}
      />
      {Platform.OS === 'web' ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: cardRadius,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 16px 36px rgba(0,0,0,0.55)',
            } as object,
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: HERO_MIN_H,
    overflow: 'hidden',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: HERO_MIN_H,
  },
  rowStack: {
    flexDirection: 'column',
    minHeight: HERO_STACK_MIN_H,
  },
  copy: {
    flex: 1,
    paddingVertical: 28,
    paddingLeft: 22,
    paddingRight: 12,
    justifyContent: 'center',
    zIndex: 2,
    maxWidth: '52%',
  },
  copyStack: {
    maxWidth: '100%',
    paddingRight: 22,
    paddingBottom: 8,
  },
  overline: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
    color: 'rgba(196,181,253,0.75)',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.45,
    color: '#FAFAFC',
    lineHeight: 30,
  },
  figure: {
    width: '48%',
    minHeight: HERO_MIN_H,
    position: 'relative',
  },
  figureStack: {
    width: '100%',
    minHeight: HERO_FIGURE_STACK_MIN_H,
    flex: 1,
  },
  figureFrame: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  figureBlend: {
    ...StyleSheet.absoluteFillObject,
  },
});
