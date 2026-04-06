import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAppTheme } from '@/theme';

const DEFAULT_HERO_IMAGE = require('../../assets/images/habit-hero-sophia.png');

export type HabitHeroProps = {
  totalHabits: number;
  doneToday: number;
  imageSource?: ImageSourcePropType;
  /** false — подпись «день в календаре», не «сегодня» (экран «День» с прошлой датой). */
  isTodayContext?: boolean;
};

const STACK_BREAKPOINT = 420;

/**
 * Wide hero: персонаж справа, лицо в верхней части кадра.
 * Фиксированные якоря — без translate/overscale; кроп только cover + contentPosition.
 */
const HERO_IMAGE_POSITION_ROW = { top: '14%', right: '0%' } as const;
const HERO_IMAGE_POSITION_STACK = { top: '10%', right: '0%' } as const;

export function HabitHero({
  totalHabits,
  doneToday,
  imageSource = DEFAULT_HERO_IMAGE,
  isTodayContext = true,
}: HabitHeroProps) {
  const { radius } = useAppTheme();
  const cardRadius = radius.xl;
  const { width: windowWidth } = useWindowDimensions();
  const isEmpty = totalHabits === 0;
  const progress = isEmpty ? 0 : Math.min(1, doneToday / totalHabits);
  const stackLayout = windowWidth < STACK_BREAKPOINT;
  const pctDay = Math.round(progress * 100);

  const imgPosition = stackLayout ? HERO_IMAGE_POSITION_STACK : HERO_IMAGE_POSITION_ROW;

  return (
    <View style={[styles.banner, { borderRadius: cardRadius }]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#141018', '#0a090f', '#06060a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(76,29,149,0.45)', 'rgba(20,16,28,0.25)', 'transparent']}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0.65, y: 0.6 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(109,40,217,0.14)', 'rgba(167,139,250,0.22)']}
        start={{ x: 0.4, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />

      <View style={[styles.contentRow, stackLayout && styles.contentRowStack]}>
        <View style={[styles.copyZone, stackLayout && styles.copyZoneStack]}>
          <Text style={styles.overline}>
            {isEmpty ? 'НАЧНИ СЕЙЧАС' : isTodayContext ? 'СЕГОДНЯ В РИТМЕ' : 'ДЕНЬ В КАЛЕНДАРЕ'}
          </Text>
          {isEmpty ? (
            <>
              <Text style={styles.headline}>Начни свой ритм</Text>
              <Text style={styles.microcopy}>
                Добавь первую привычку — дисциплина начинается с одного шага.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.headline}>
                {doneToday} / {totalHabits} привычек выполнено
              </Text>
              <Text style={styles.microcopy}>
                {doneToday === totalHabits
                  ? 'Отличный день — ритм в твоих руках.'
                  : 'Осталось немного — доведи ритм до конца.'}
              </Text>
            </>
          )}

          <View style={styles.trackWrap}>
            <View style={styles.track}>
              <LinearGradient
                colors={['#C084FC', '#9333EA', '#6D28D9']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[
                  styles.fill,
                  { width: `${progress * 100}%` },
                  Platform.OS !== 'web' ? styles.fillShadowNative : null,
                ]}
              />
            </View>
            {!isEmpty ? <Text style={styles.progressHint}>{pctDay}% дня</Text> : null}
          </View>
        </View>

        <View style={[styles.figureZone, stackLayout && styles.figureZoneStack]}>
          <View style={styles.figureImageFrame} collapsable={false}>
            <Image
              source={imageSource}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              contentPosition={imgPosition}
              accessibilityIgnoresInvertColors
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
    marginTop: 20,
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
  overline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.2,
    color: 'rgba(196,181,253,0.58)',
  },
  headline: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.7,
    lineHeight: 32,
    color: '#FAFAFC',
  },
  microcopy: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.48)',
    maxWidth: 320,
  },
  trackWrap: {
    marginTop: 18,
  },
  track: {
    height: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  fillShadowNative: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
  progressHint: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: 'rgba(196,181,253,0.82)',
  },
  /** Правая колонка: фиксированная «рамка» под wide-asset, без процентной ширины самой картинки. */
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
