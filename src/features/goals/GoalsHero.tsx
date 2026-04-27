import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAppTheme } from '@/theme';

/** PNG с прозрачным фоном: София с доской «ЦЕЛИ». */
export const GOALS_HERO_VISION_IMAGE = require('../../assets/images/goals-hero-vision-board.png');

const STACK_BREAKPOINT = 420;

/**
 * Hero «Цели»: та же сетка, что на экране «День» (HabitHero) — правая колонка, картинка в рамке без обрезки (`contain`).
 */
export function GoalsHero() {
  const { radius, spacing } = useAppTheme();
  const cardRadius = radius.xl;
  const { width: windowWidth } = useWindowDimensions();
  const stackLayout = windowWidth < STACK_BREAKPOINT;

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
              style={StyleSheet.absoluteFillObject}
              contentFit="contain"
              contentPosition={{ right: '0%', bottom: '0%' }}
              accessibilityIgnoresInvertColors
              accessibilityLabel="Иллюстрация: доска желаний"
            />
          </View>
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(8,8,14,0.9)',
              'rgba(10,10,18,0.42)',
              'rgba(14,12,22,0.1)',
              'transparent',
            ]}
            locations={[0, 0.38, 0.72, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.figureBlendLeft}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(6,6,10,0.22)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.42 }}
            style={[StyleSheet.absoluteFillObject, styles.figureFeatherTop]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', 'rgba(6,6,10,0.5)', 'rgba(5,5,8,0.75)']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.figureFeatherRight}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', 'rgba(55,20,90,0.22)']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, styles.figureTint]}
          />
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
  figureBlendLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '78%',
    zIndex: 2,
  },
  figureFeatherTop: {
    zIndex: 2,
  },
  figureFeatherRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '36%',
    zIndex: 2,
  },
  figureTint: {
    zIndex: 1,
  },
});
