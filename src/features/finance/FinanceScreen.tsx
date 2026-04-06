import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FINANCE_HERO_MOCK,
  FINANCE_MONTHLY_BUDGET_MOCK,
  type FinanceBudgetCardMock,
} from '@/features/finance/financeUiMock';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');

/** Те же слои, что у херо-блока на экране «День» (`HabitHero`). */
const HERO_BASE_GRADIENT = ['#141018', '#0a090f', '#06060a'] as const;
const HERO_GLOW_A = ['rgba(76,29,149,0.45)', 'rgba(20,16,28,0.25)', 'transparent'] as const;
const HERO_GLOW_B = ['transparent', 'rgba(109,40,217,0.14)', 'rgba(167,139,250,0.22)'] as const;

const GREEN_BAR = '#4ADE80';
const RED_EXPENSE = '#FB7185';

function fmtMoney(n: number) {
  return (
    n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽'
  );
}

function PaginationDots({ count, active, isLight }: { count: number; active: number; isLight: boolean }) {
  const activeC = isLight ? 'rgba(15,17,24,0.85)' : 'rgba(255,255,255,0.95)';
  const idleC = isLight ? 'rgba(15,17,24,0.22)' : 'rgba(255,255,255,0.28)';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 8 : 6,
            height: i === active ? 8 : 6,
            borderRadius: 4,
            backgroundColor: i === active ? activeC : idleC,
          }}
        />
      ))}
    </View>
  );
}

function BudgetCard({ card }: { card: FinanceBudgetCardMock }) {
  const { colors, radius, isLight } = useAppTheme();
  const barColor = card.variant === 'budget' ? GREEN_BAR : '#A855F7';
  const iconBg =
    card.variant === 'budget' ? 'rgba(74,222,128,0.18)' : 'rgba(168,85,247,0.2)';
  const iconName = card.variant === 'budget' ? 'cash-outline' : 'wallet-outline';

  const shell = isLight
    ? {
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(15,17,24,0.08)',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }
    : {
        backgroundColor: 'rgba(18,18,24,0.88)',
        borderColor: 'rgba(255,255,255,0.08)',
      };

  return (
    <View
      style={{
        borderRadius: radius.xl,
        borderWidth: 1,
        padding: 18,
        marginBottom: 14,
        ...shell,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, paddingRight: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: iconBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={26} color={barColor} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
              {card.title}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }} numberOfLines={2}>
              {card.subtitle}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
          {fmtMoney(card.amountRight)}
        </Text>
      </View>
      <View
        style={{
          marginTop: 16,
          height: 8,
          borderRadius: 8,
          backgroundColor: isLight ? 'rgba(15,17,24,0.06)' : 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(Math.min(1, card.progress01) * 100)}%`,
            height: '100%',
            borderRadius: 8,
            backgroundColor: barColor,
          }}
        />
      </View>
    </View>
  );
}

export function FinanceScreen() {
  const { colors, typography, spacing, radius, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [heroIndex, setHeroIndex] = useState(0);

  const padH = spacing.xl;
  const heroPageW = SCREEN_W - padH * 2;

  const onHeroScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / heroPageW);
    setHeroIndex(Math.max(0, Math.min(FINANCE_HERO_MOCK.length - 1, idx)));
  }, [heroPageW]);

  const twinworksHint = useMemo(
    () =>
      'Данные демонстрационные. Интеграция с Twinworks потребует их API и ключей в окружении — к сервису у меня нет доступа; когда появится контракт эндпоинтов, можно подставить клиент вместо моков.',
    []
  );

  return (
    <ScreenCanvas>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: padH,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 6 },
              ]}
            >
              Обзор
            </Text>
            <Text style={[typography.hero, { fontSize: 32, letterSpacing: -0.8, color: colors.text }]}>Финансы</Text>
          </View>
          <HeaderProfileAvatar marginTop={4} />
        </View>

        <View style={{ marginTop: spacing.lg, width: heroPageW, alignSelf: 'center' }}>
          <ScrollView
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onHeroScrollEnd}
            decelerationRate="fast"
            style={{ width: heroPageW }}
          >
            {FINANCE_HERO_MOCK.map((item) => (
              <View
                key={item.id}
                style={{
                  width: heroPageW,
                  borderRadius: 26,
                  overflow: 'hidden',
                  position: 'relative',
                  borderWidth: 1,
                  borderColor: 'rgba(139,92,246,0.35)',
                }}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={[...HERO_BASE_GRADIENT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 26 }]}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[...HERO_GLOW_A]}
                  start={{ x: 0, y: 0.4 }}
                  end={{ x: 0.65, y: 0.6 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 26 }]}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[...HERO_GLOW_B]}
                  start={{ x: 0.4, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 26 }]}
                />
                <View style={{ paddingVertical: 22, paddingHorizontal: 22, position: 'relative', zIndex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      letterSpacing: 2,
                      color: 'rgba(255,255,255,0.82)',
                      textAlign: 'center',
                    }}
                  >
                    {item.eyebrow}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    <Text style={{ fontSize: 36, fontWeight: '800', color: '#FAFAFC', letterSpacing: -1 }}>
                      {fmtMoney(item.balance)}
                    </Text>
                    <Pressable
                      onPress={() => {
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      }}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Изменить баланс"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="pencil" size={18} color="rgba(255,255,255,0.9)" />
                    </Pressable>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      marginTop: 22,
                      paddingTop: 18,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: 'rgba(255,255,255,0.18)',
                    }}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="trending-up" size={22} color={GREEN_BAR} />
                      </View>
                      <View>
                        <Text
                          style={{ fontSize: 18, fontWeight: '800', color: '#FAFAFC', fontVariant: ['tabular-nums'] }}
                        >
                          {fmtMoney(item.income)}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.68)', marginTop: 2 }}>
                          Доход
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        width: StyleSheet.hairlineWidth,
                        backgroundColor: 'rgba(255,255,255,0.22)',
                        marginHorizontal: 8,
                      }}
                    />
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="trending-down" size={22} color={RED_EXPENSE} />
                      </View>
                      <View>
                        <Text
                          style={{ fontSize: 18, fontWeight: '800', color: '#FAFAFC', fontVariant: ['tabular-nums'] }}
                        >
                          {fmtMoney(item.expense)}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.68)', marginTop: 2 }}>
                          Траты
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          <PaginationDots count={FINANCE_HERO_MOCK.length} active={heroIndex} isLight={isLight} />
        </View>

        <Text
          style={{
            fontSize: 20,
            fontWeight: '800',
            color: colors.text,
            marginTop: spacing.xl + 4,
            marginBottom: spacing.md,
            letterSpacing: -0.4,
          }}
        >
          Месячный бюджет
        </Text>

        {FINANCE_MONTHLY_BUDGET_MOCK.map((c) => (
          <BudgetCard key={c.id} card={c} />
        ))}

        <View
          style={{
            marginTop: spacing.md,
            padding: spacing.md,
            borderRadius: radius.lg,
            backgroundColor: isLight ? 'rgba(91,75,255,0.06)' : 'rgba(168,85,247,0.08)',
            borderWidth: 1,
            borderColor: isLight ? 'rgba(91,75,255,0.15)' : 'rgba(168,85,247,0.22)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="briefcase-outline" size={18} color="#A855F7" />
            <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '800', color: '#A855F7' }}>Twinworks</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textMuted, lineHeight: 20 }]}>{twinworksHint}</Text>
        </View>
      </ScrollView>
    </ScreenCanvas>
  );
}
