import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAppTheme } from '@/theme';

/** PNG с прозрачным фоном: девушка с доской «ЦЕЛИ». */
export const GOALS_HERO_VISION_IMAGE = require('../../assets/images/goals-hero-vision-board.png');

const STACK_BREAKPOINT = 440;

/**
 * Hero для раздела «Цели»: плашка как на «День», крупное фото с alpha — «вылезает» за нижний край карточки.
 */
export function GoalsHero() {
  const { radius, spacing } = useAppTheme();
  const cardRadius = radius.xl;
  const { width: windowWidth } = useWindowDimensions();
  const stack = windowWidth < STACK_BREAKPOINT;

  return (
    <View style={[styles.root, { borderRadius: cardRadius, marginBottom: spacing.lg }]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#141018', '#0a090f', '#06060a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(109,40,217,0.42)', 'rgba(20,16,28,0.2)', 'transparent']}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0.7, y: 0.55 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(167,139,250,0.18)']}
        start={{ x: 0.35, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />

      <View style={[styles.row, stack && styles.rowStack]}>
        <View style={[styles.copy, stack && styles.copyStack]}>
          <Text style={styles.overline}>ЦЕЛИ</Text>
          <Text style={styles.headline}>Визионборд</Text>
          <Text style={styles.micro}>
            Доска с фото и заметками — цели на виду, как на настоящем визионборде.
          </Text>
        </View>

        <View style={[styles.figureSlot, stack && styles.figureSlotStack]} pointerEvents="none">
          <Image
            source={GOALS_HERO_VISION_IMAGE}
            style={stack ? styles.figureImgStack : styles.figureImgRow}
            contentFit="contain"
            accessibilityIgnoresInvertColors
            accessibilityLabel="Иллюстрация: девушка с доской целей"
          />
        </View>
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(8,8,14,0.35)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.45, y: 0.5 }}
        style={[styles.leftFeather, { borderRadius: cardRadius }]}
      />

      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius: cardRadius,
            borderWidth: 1,
            borderColor: 'rgba(167,139,250,0.32)',
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
                'inset 0 0 0 1px rgba(255,255,255,0.06), 0 0 80px rgba(120,60,200,0.2), 0 20px 56px rgba(0,0,0,0.5)',
            } as object,
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 4,
    overflow: 'visible',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.38)',
    minHeight: 248,
    ...(Platform.OS === 'web'
      ? {
          boxShadow:
            'inset 0 0 0 1px rgba(255,255,255,0.05), 0 18px 52px rgba(0,0,0,0.55), 0 0 88px rgba(88,40,160,0.22)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.5,
          shadowRadius: 32,
          elevation: 12,
        }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
    zIndex: 2,
    minHeight: 248,
    paddingLeft: 20,
    paddingRight: 8,
    paddingTop: 22,
    paddingBottom: 20,
  },
  rowStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
    minHeight: undefined,
    paddingBottom: 8,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    maxWidth: '52%',
    paddingRight: 8,
    justifyContent: 'center',
    paddingBottom: 8,
    zIndex: 4,
  },
  copyStack: {
    maxWidth: '100%',
    paddingBottom: 4,
  },
  overline: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: 'rgba(196,181,253,0.72)',
  },
  headline: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 30,
    color: '#FAFAFC',
  },
  micro: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.5)',
    maxWidth: 300,
  },
  figureSlot: {
    width: '46%',
    minWidth: 168,
    maxWidth: 300,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    marginBottom: -40,
    marginTop: -52,
    alignSelf: 'stretch',
    zIndex: 3,
  },
  figureSlotStack: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    marginBottom: -28,
    marginTop: -20,
    minHeight: 220,
    alignItems: 'center',
    zIndex: 3,
  },
  figureImgRow: {
    width: 248,
    height: 332,
    marginRight: -16,
  },
  figureImgStack: {
    width: '92%',
    maxWidth: 300,
    height: 288,
  },
  leftFeather: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    pointerEvents: 'none',
  },
});
