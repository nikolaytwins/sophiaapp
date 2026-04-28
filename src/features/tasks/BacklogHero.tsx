import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const BACKLOG_HERO_IMAGE = require('../../assets/images/backlog-hero-sophia.png');

const STACK_BREAKPOINT = 520;

function tasksWordRu(n: number): string {
  const m = n % 100;
  if (m >= 11 && m <= 14) return 'задач';
  const k = n % 10;
  if (k === 1) return 'задача';
  if (k >= 2 && k <= 4) return 'задачи';
  return 'задач';
}

type Props = {
  backlogCount: number;
};

/**
 * Герой для бэклога: тёмная карточка, фото №2, текст «У вас N задач в бэклоге».
 */
export function BacklogHero({ backlogCount }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const stackLayout = windowWidth < STACK_BREAKPOINT;
  const cardRadius = 22;
  const headline = `У вас ${backlogCount} ${tasksWordRu(backlogCount)} в бэклоге`;

  return (
    <View style={[styles.wrap, { borderRadius: cardRadius }, { width: '100%' as const, alignSelf: 'stretch' }]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#08080c', '#0f0a14', '#050508']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.45 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(88,28,135,0.5)', 'rgba(0,0,0,0.12)', 'transparent']}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0.55, y: 0.55 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />

      <View style={[styles.row, stackLayout && styles.rowStack]}>
        <View style={[styles.copy, stackLayout && styles.copyStack]}>
          <Text style={styles.overline}>БЭКЛОГ</Text>
          <Text style={styles.title}>{headline}</Text>
        </View>

        <View style={[styles.figure, stackLayout && styles.figureStack]}>
          <View style={styles.figureFrame} collapsable={false}>
            <Image
              source={BACKLOG_HERO_IMAGE}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              contentPosition={{ top: '4%', right: '0%' }}
              accessibilityIgnoresInvertColors
            />
          </View>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.78)', 'rgba(0,0,0,0.15)', 'transparent']}
            locations={[0, 0.4, 1]}
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
          { borderRadius: cardRadius, borderWidth: 1, borderColor: 'rgba(167,139,250,0.32)' },
        ]}
      />
      {Platform.OS === 'web' ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: cardRadius,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 16px 40px rgba(0,0,0,0.5)',
            } as object,
          ]}
        />
      ) : null}
    </View>
  );
}

/** Минимум ×2 от прежних ~168px — как на экране «Задачи». */
const HERO_MIN_H = 336;
const HERO_STACK_MIN_H = 440;
const HERO_FIGURE_STACK_MIN_H = 400;

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
    color: 'rgba(196,181,253,0.78)',
    marginBottom: 10,
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.4,
    color: '#FAFAFC',
    lineHeight: 28,
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
