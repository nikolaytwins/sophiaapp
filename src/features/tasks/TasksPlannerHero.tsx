import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const TASKS_HERO_IMAGE = require('../../assets/images/tasks-hero-sophia.png');

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
  taskCount: number;
  selectedDay: string;
  todayKey: string;
};

/**
 * Герой под календарём выбора даты: фон с фото, текст с количеством задач на выбранный день.
 */
export function TasksPlannerHero({ taskCount, selectedDay, todayKey }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const stackLayout = windowWidth < STACK_BREAKPOINT;
  const cardRadius = 22;
  const headline =
    selectedDay === todayKey
      ? `Сегодня у вас ${taskCount} ${tasksWordRu(taskCount)}`
      : `На этот день — ${taskCount} ${tasksWordRu(taskCount)}`;

  return (
    <View style={[styles.wrap, { borderRadius: cardRadius }, { width: '100%' as const, alignSelf: 'stretch' }]}>
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
          <Text style={styles.overline}>ПЛАН</Text>
          <Text style={styles.title}>{headline}</Text>
        </View>

        <View style={[styles.figure, stackLayout && styles.figureStack]}>
          <View style={styles.figureFrame} collapsable={false}>
            <Image
              source={TASKS_HERO_IMAGE}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              contentPosition={{ top: '6%', right: '0%' }}
              accessibilityIgnoresInvertColors
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
    minHeight: 168,
    overflow: 'hidden',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 168,
  },
  rowStack: {
    flexDirection: 'column',
    minHeight: 220,
  },
  copy: {
    flex: 1,
    paddingVertical: 22,
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
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    color: '#FAFAFC',
    lineHeight: 28,
  },
  figure: {
    width: '48%',
    minHeight: 168,
    position: 'relative',
  },
  figureStack: {
    width: '100%',
    minHeight: 200,
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
