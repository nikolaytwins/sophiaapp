import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { type Href, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const FINANCE_HERO_IMAGE = require('../../assets/images/finance-hero-sophia.png');

const STACK_BREAKPOINT = 480;

type Props = {
  /** Максимальная ширина баннера на десктопе (если не fullWidth). */
  maxContentWidth?: number;
  /** На всю ширину контейнера (как остальные плашки бенто). */
  fullWidth?: boolean;
};

/**
 * Заметный герой-блок с Софией (как на экране «День»): градиенты, крупное фото.
 */
export function FinanceSophiaHero({ maxContentWidth = 640, fullWidth = true }: Props) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const stackLayout = windowWidth < STACK_BREAKPOINT;
  const cardRadius = 22;
  const constrained =
    fullWidth || Platform.OS !== 'web' ? undefined : Math.min(windowWidth - 40, maxContentWidth);

  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: cardRadius },
        fullWidth ? { width: '100%' as const, alignSelf: 'stretch' } : null,
        constrained != null ? { maxWidth: constrained, alignSelf: 'center' } : null,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['#141018', '#0a090f', '#030306']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(76,29,149,0.5)', 'rgba(20,16,28,0.2)', 'transparent']}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0.7, y: 0.55 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(109,40,217,0.2)', 'rgba(167,139,250,0.28)']}
        start={{ x: 0.35, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
      />

      <View style={[styles.row, stackLayout && styles.rowStack]}>
        <View style={[styles.copy, stackLayout && styles.copyStack]}>
          <Text style={styles.overline}>АССИСТЕНТ</Text>
          <Text style={styles.title}>София и финансы</Text>
          <Text style={styles.body}>
            Разберём доходы, расходы и лимиты: что срочно и куда смотреть в первую очередь.
          </Text>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              router.push('/goals' as Href);
            }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>К целям →</Text>
          </Pressable>
        </View>

        <View style={[styles.figure, stackLayout && styles.figureStack]}>
          <View style={styles.figureFrame} collapsable={false}>
            <Image
              source={FINANCE_HERO_IMAGE}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              contentPosition={stackLayout ? { top: '8%', right: '0%' } : { top: '12%', right: '0%' }}
              accessibilityIgnoresInvertColors
            />
          </View>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(8,8,14,0.88)', 'rgba(10,10,18,0.35)', 'transparent']}
            locations={[0, 0.45, 1]}
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
          { borderRadius: cardRadius, borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)' },
        ]}
      />
      {Platform.OS === 'web' ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: cardRadius,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 18px 40px rgba(0,0,0,0.45)',
            } as object,
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 18px 48px rgba(0,0,0,0.5)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.5,
          shadowRadius: 28,
          elevation: 12,
        }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 268,
    zIndex: 1,
  },
  rowStack: {
    flexDirection: 'column',
    minHeight: undefined,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    maxWidth: '52%',
    paddingLeft: 22,
    paddingRight: 12,
    paddingVertical: 22,
    justifyContent: 'center',
  },
  copyStack: {
    maxWidth: '100%',
    paddingBottom: 8,
  },
  overline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.4,
    color: 'rgba(196,181,253,0.65)',
  },
  title: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#FAFAFC',
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.52)',
    maxWidth: 340,
  },
  cta: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E9D5FF',
  },
  figure: {
    width: '46%',
    minWidth: 200,
    maxWidth: 300,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'stretch',
    minHeight: 268,
  },
  figureStack: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    minHeight: 220,
    maxHeight: 240,
  },
  figureFrame: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  figureBlend: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '72%',
    zIndex: 2,
  },
});
