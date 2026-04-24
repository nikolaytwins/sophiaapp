import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { type Href, Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { useSupabaseConfigured } from '@/config/env';
import {
  deleteFinanceExpenseCategory,
  loadFinanceExpenseAnalytics,
  loadFinanceOverview,
  type FinanceCategoryInput,
} from '@/features/finance/financeApi';
import { confirmFinanceDestructive } from '@/features/finance/financeConfirm';
import { FinanceCategoryMonthMatrix } from '@/features/finance/FinanceCategoryMonthMatrix';
import { FinanceAddTransactionModal } from '@/features/finance/FinanceAddTransactionModal';
import { FinanceCategoryFormModal } from '@/features/finance/FinanceCategoryFormModal';
import { FinanceMonthTransactionsBlock } from '@/features/finance/FinanceMonthTransactionsBlock';
import {
  enrichMonthSnapshots,
  MonthHistoryCards,
  MonthHistoryTableTwin,
  type MonthHistoryViewMode,
} from '@/features/finance/FinanceMonthHistoryViews';
import { FINANCE_QUERY_KEY, financeExpenseAnalyticsKey } from '@/features/finance/queryKeys';
import type { FinanceBudgetLine } from '@/features/finance/finance.types';
import { getSupabase } from '@/lib/supabase';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useAppTheme } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');

type FinanceCategoryModalState =
  | null
  | { mode: 'create' }
  | { mode: 'edit'; id: string; initial: FinanceCategoryInput };

const FINANCE_HERO_IMAGE = require('../../assets/images/finance-hero-sophia.png');

/** Кроп маскота: справа в кадре, как на референсе «Финансы». */
const FINANCE_HERO_IMG_POS = { top: '10%', right: '6%' } as const;
const FINANCE_HERO_IMG_POS_STACK = { top: '6%', right: '4%' } as const;

const HERO_BASE_GRADIENT = ['#141018', '#0a090f', '#06060a'] as const;
const HERO_GLOW_A = ['rgba(76,29,149,0.45)', 'rgba(20,16,28,0.25)', 'transparent'] as const;
const HERO_GLOW_B = ['transparent', 'rgba(109,40,217,0.14)', 'rgba(167,139,250,0.22)'] as const;

const GREEN_BAR = '#4ADE80';
const RED_EXPENSE = '#FB7185';

const CLOUD_HREF = '/cloud' as Href;

/** Диффузное фиолетовое свечение (как rail календаря), слой под контентом — плашки таблицы выше. */
function FinancePageGlow({ isLight }: { isLight: boolean }) {
  if (isLight) {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}>
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(124, 58, 237, 0.06)', 'rgba(167, 139, 250, 0.05)']}
          locations={[0, 0.62, 1]}
          start={{ x: 0.45, y: 0 }}
          end={{ x: 0.55, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    );
  }
  if (Platform.OS === 'web') {
    const blur = { filter: 'blur(92px)', WebkitFilter: 'blur(92px)' } as const;
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}>
        <View
          style={{
            position: 'absolute',
            width: 620,
            height: 460,
            borderRadius: 310,
            bottom: '-14%',
            left: '-8%',
            backgroundColor: 'rgba(123, 92, 255, 0.26)',
            opacity: 0.75,
            ...blur,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 480,
            height: 420,
            borderRadius: 240,
            bottom: '2%',
            right: '-18%',
            backgroundColor: 'rgba(167, 139, 250, 0.18)',
            opacity: 0.65,
            ...blur,
          }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(99, 102, 241, 0.06)', 'transparent']}
          start={{ x: 0.5, y: 0.35 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}>
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(123, 92, 255, 0.1)', 'rgba(99, 102, 241, 0.05)']}
        locations={[0, 0.72, 1]}
        start={{ x: 0.35, y: 0.2 }}
        end={{ x: 0.55, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

type MainTab = 'overview' | 'transactions' | 'categories' | 'history';

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

function BudgetCard({
  line,
  editable,
  onEdit,
  onDelete,
  onQuickExpense,
}: {
  line: FinanceBudgetLine;
  editable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Быстрый расход в этой категории (Twinworks). */
  onQuickExpense?: () => void;
}) {
  const { colors, radius, isLight, brand, shadows } = useAppTheme();
  const barColor = line.kind === 'personal' ? brand.primary : brand.primarySoft;
  const iconBg = line.kind === 'personal' ? brand.primaryMuted : 'rgba(167,139,250,0.2)';
  const iconName = line.kind === 'personal' ? 'cash-outline' : 'briefcase-outline';

  const over = Boolean(line.overLimit);
  const shell = isLight
    ? {
        backgroundColor: colors.surface,
        borderColor: over ? 'rgba(251,113,133,0.55)' : brand.surfaceBorderStrong,
        ...shadows.card,
      }
    : {
        backgroundColor: colors.surface,
        borderColor: over ? 'rgba(251,113,133,0.45)' : brand.surfaceBorderStrong,
      };

  return (
    <View
      style={{
        borderRadius: radius.xl,
        borderWidth: over ? 2 : 1,
        padding: 18,
        marginBottom: 14,
        ...shell,
        ...(over && !isLight
          ? ({ boxShadow: '0 0 0 1px rgba(251,113,133,0.35), 0 8px 28px rgba(251,113,133,0.12)' } as object)
          : {}),
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
              {line.title}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }} numberOfLines={3}>
              {line.subtitle}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '800',
              color: over ? colors.danger : colors.text,
              fontVariant: ['tabular-nums'],
            }}
          >
            {fmtMoney(line.spent)}
            {line.expectedMonthly > 0 ? (
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>{` / ${fmtMoney(line.expectedMonthly)}`}</Text>
            ) : null}
          </Text>
          {editable && onEdit && onDelete ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {onQuickExpense ? (
                <Pressable
                  onPress={onQuickExpense}
                  hitSlop={6}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: brand.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="add" size={20} color={brand.primary} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={onEdit}
                hitSlop={6}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: 'rgba(168,85,247,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="pencil" size={17} color={brand.primary} />
              </Pressable>
              <Pressable
                onPress={onDelete}
                hitSlop={6}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: 'rgba(251,113,133,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
      <View
        style={{
          marginTop: 16,
          height: 8,
          borderRadius: 8,
          backgroundColor: isLight ? brand.callout : 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(Math.min(100, line.progress01 * 100))}%`,
            height: '100%',
            borderRadius: 8,
            backgroundColor: over ? colors.danger : barColor,
          }}
        />
      </View>
    </View>
  );
}

export function FinanceScreen() {
  const { colors, typography, spacing, radius, isLight, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const supabaseOn = useSupabaseConfigured;
  const [userId, setUserId] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [mainTab, setMainTab] = useState<MainTab>('overview');
  const [catModal, setCatModal] = useState<FinanceCategoryModalState>(null);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [addTxPrefill, setAddTxPrefill] = useState<string | null>(null);
  const [historyViewMode, setHistoryViewMode] = useState<MonthHistoryViewMode>('table');

  const padH = spacing.xl;
  const heroPageW = SCREEN_W - padH * 2;
  const stackFinanceHero = heroPageW < 430;
  const balanceHeroFont = Math.min(38, Math.max(24, Math.round(heroPageW * 0.09)));

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setUserId(null);
      return undefined;
    }
    void sb.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const q = useQuery({
    queryKey: [...FINANCE_QUERY_KEY, 'overview', userId],
    queryFn: () => loadFinanceOverview(userId!),
    enabled: Boolean(supabaseOn && userId),
  });

  const expenseAnalyticsQ = useQuery({
    queryKey: financeExpenseAnalyticsKey(userId),
    queryFn: () => loadFinanceExpenseAnalytics(userId!),
    enabled: Boolean(supabaseOn && userId && mainTab === 'categories'),
  });

  const overview = q.data;

  const monthHistoryRows = useMemo(
    () => (overview ? enrichMonthSnapshots(overview.snapshots) : []),
    [overview?.snapshots]
  );

  const onHeroScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / heroPageW);
      setHeroIndex(Math.max(0, Math.min(1, idx)));
    },
    [heroPageW]
  );

  const monthLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }, []);

  const openDetail = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    router.push('/finance-detail' as Href);
  }, [router]);

  const invalidateFinance = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...FINANCE_QUERY_KEY] });
  }, [qc]);

  const delCatMut = useMutation({
    mutationFn: (id: string) => deleteFinanceExpenseCategory(userId!, id),
    onSuccess: invalidateFinance,
    onError: (e: Error) => Alert.alert('Ошибка', e.message ?? 'Не удалось удалить категорию'),
  });

  const openCategoryEdit = useCallback(
    (line: FinanceBudgetLine) => {
      const cat = overview?.expenseCategories.find((c) => c.id === line.id);
      setCatModal({
        mode: 'edit',
        id: line.id,
        initial: {
          name: line.title,
          type: line.kind === 'business' ? 'business' : 'personal',
          expectedMonthly: line.expectedMonthly,
          parentId: cat?.parentId ?? null,
        },
      });
    },
    [overview]
  );

  const openAddCategory = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setCatModal({ mode: 'create' });
  }, []);

  const confirmDeleteCategory = useCallback(
    (line: FinanceBudgetLine) => {
      confirmFinanceDestructive(
        'Удалить категорию?',
        `«${line.title}». Транзакции потеряют эту метку категории (включая подкатегории, если есть).`,
        () => delCatMut.mutate(line.id)
      );
    },
    [delCatMut]
  );

  const openCategorySettings = useCallback(() => {
    router.push('/finance-category-settings' as Href);
  }, [router]);

  const openAddTransaction = useCallback((categoryTitle?: string | null) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setAddTxPrefill(categoryTitle != null && categoryTitle !== '' ? categoryTitle : null);
    setAddTxOpen(true);
  }, []);

  return (
    <ScreenCanvas>
      <View style={{ flex: 1, position: 'relative' }}>
        <FinancePageGlow isLight={isLight} />
        <ScrollView
          style={{ flex: 1, zIndex: 1 }}
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

        <View style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
          <SegmentedControl<MainTab>
            value={mainTab}
            onChange={setMainTab}
            activeVariant="brandGlow"
            options={[
              { value: 'overview', label: 'Обзор' },
              { value: 'transactions', label: 'Транзакции' },
              { value: 'categories', label: 'Категории' },
              { value: 'history', label: 'История' },
            ]}
          />
        </View>

        {!supabaseOn || !userId ? (
          <View
            style={{
              marginTop: spacing.lg,
              padding: spacing.lg,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
              Чтобы увидеть реальные финансы из Supabase, подключи облако и войди в аккаунт.
            </Text>
            <Link href={CLOUD_HREF} asChild>
              <Pressable
                style={{
                  marginTop: spacing.md,
                  paddingVertical: 14,
                  borderRadius: radius.lg,
                  backgroundColor: 'rgba(168,85,247,0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(168,85,247,0.45)',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '800', color: brand.primary }}>Облако и вход</Text>
              </Pressable>
            </Link>
          </View>
        ) : q.isLoading ? (
          <ActivityIndicator color={brand.primary} style={{ marginTop: 32 }} />
        ) : q.isError ? (
          <Text style={{ marginTop: spacing.lg, color: colors.danger }}>
            Не удалось загрузить финансы. Проверь миграцию 009_finance и данные в Supabase.
          </Text>
        ) : overview ? (
          <>
            {mainTab === 'overview' ? (
              <>
                <View style={{ marginTop: spacing.md, width: heroPageW, alignSelf: 'center' }}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onHeroScrollEnd}
                    decelerationRate="fast"
                    style={{ width: heroPageW }}
                  >
                    {/* Слайд 1: баланс */}
                    <View
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
                      <View style={{ paddingVertical: 18, paddingHorizontal: 16, position: 'relative', zIndex: 1 }}>
                        <View
                          style={{
                            flexDirection: stackFinanceHero ? 'column' : 'row',
                            alignItems: 'stretch',
                            gap: stackFinanceHero ? 12 : 6,
                            minHeight: stackFinanceHero ? undefined : 236,
                          }}
                        >
                          <View
                            style={{
                              flex: stackFinanceHero ? undefined : 1,
                              minWidth: 0,
                              justifyContent: 'center',
                              paddingRight: stackFinanceHero ? 0 : 6,
                              alignItems: stackFinanceHero ? 'center' : 'flex-start',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '800',
                                letterSpacing: 2,
                                color: 'rgba(255,255,255,0.82)',
                                textAlign: stackFinanceHero ? 'center' : 'left',
                              }}
                            >
                              ТВОЙ БАЛАНС
                            </Text>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: stackFinanceHero ? 'center' : 'flex-start',
                                gap: 10,
                                marginTop: 10,
                                flexWrap: 'wrap',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: balanceHeroFont,
                                  fontWeight: '800',
                                  color: '#FAFAFC',
                                  letterSpacing: -1,
                                  fontVariant: ['tabular-nums'],
                                }}
                              >
                                {fmtMoney(overview.totalBalance)}
                              </Text>
                              <Pressable
                                onPress={openDetail}
                                hitSlop={10}
                                accessibilityRole="button"
                                accessibilityLabel="Редактировать структуру счетов"
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
                            <Text
                              style={{
                                textAlign: stackFinanceHero ? 'center' : 'left',
                                marginTop: 8,
                                fontSize: 12,
                                color: 'rgba(255,255,255,0.55)',
                              }}
                            >
                              {monthLabel}
                            </Text>
                          </View>

                          <View
                            style={{
                              width: stackFinanceHero ? '100%' : Math.min(Math.round(heroPageW * 0.42), 220),
                              minHeight: stackFinanceHero ? 200 : 236,
                              alignSelf: 'stretch',
                              position: 'relative',
                              overflow: 'hidden',
                              borderRadius: stackFinanceHero ? 18 : 14,
                            }}
                          >
                            <View style={StyleSheet.absoluteFillObject}>
                              <Image
                                source={FINANCE_HERO_IMAGE}
                                style={StyleSheet.absoluteFillObject}
                                contentFit="cover"
                                contentPosition={stackFinanceHero ? FINANCE_HERO_IMG_POS_STACK : FINANCE_HERO_IMG_POS}
                                accessibilityIgnoresInvertColors
                              />
                            </View>
                            <LinearGradient
                              pointerEvents="none"
                              colors={['rgba(8,8,14,0.88)', 'rgba(10,10,18,0.35)', 'rgba(14,12,22,0.08)', 'transparent']}
                              locations={[0, 0.35, 0.65, 1]}
                              start={{ x: 0, y: 0.5 }}
                              end={{ x: 1, y: 0.5 }}
                              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '72%', zIndex: 2 }}
                            />
                            <LinearGradient
                              pointerEvents="none"
                              colors={['rgba(6,6,10,0.2)', 'transparent']}
                              start={{ x: 0.5, y: 0 }}
                              end={{ x: 0.5, y: 0.4 }}
                              style={[StyleSheet.absoluteFillObject, { zIndex: 2 }]}
                            />
                            <LinearGradient
                              pointerEvents="none"
                              colors={['transparent', 'rgba(6,6,10,0.45)', 'rgba(5,5,8,0.7)']}
                              locations={[0, 0.55, 1]}
                              start={{ x: 0, y: 0.5 }}
                              end={{ x: 1, y: 0.5 }}
                              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '38%', zIndex: 2 }}
                            />
                            <LinearGradient
                              pointerEvents="none"
                              colors={['transparent', 'rgba(55,20,90,0.18)']}
                              start={{ x: 0.12, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]}
                            />
                          </View>
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
                                style={{
                                  fontSize: 18,
                                  fontWeight: '800',
                                  color: '#FAFAFC',
                                  fontVariant: ['tabular-nums'],
                                }}
                              >
                                {fmtMoney(overview.monthIncome)}
                              </Text>
                              <Text
                                style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.68)', marginTop: 2 }}
                              >
                                Доход (мес.)
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
                                style={{
                                  fontSize: 18,
                                  fontWeight: '800',
                                  color: '#FAFAFC',
                                  fontVariant: ['tabular-nums'],
                                }}
                              >
                                {fmtMoney(overview.monthExpense)}
                              </Text>
                              <Text
                                style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.68)', marginTop: 2 }}
                              >
                                Траты (мес.)
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Слайд 2: прогноз */}
                    <View
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
                          ПРОГНОЗ НА КОНЕЦ МЕСЯЦА
                        </Text>
                        <Text
                          style={{
                            fontSize: 36,
                            fontWeight: '800',
                            color: '#FAFAFC',
                            letterSpacing: -1,
                            textAlign: 'center',
                            marginTop: 12,
                          }}
                        >
                          {fmtMoney(overview.forecastEndOfMonth)}
                        </Text>
                        <Text
                          style={{
                            marginTop: 14,
                            fontSize: 12,
                            lineHeight: 18,
                            color: 'rgba(255,255,255,0.62)',
                            textAlign: 'center',
                          }}
                        >
                          Упрощённая модель: текущий баланс минус неоплаченные разовые расходы за месяц и ориентир{' '}
                          {fmtMoney(overview.dailyExpenseLimit)} × дней до конца месяца (лимит из настроек Twinworks).
                        </Text>
                      </View>
                    </View>
                  </ScrollView>
                  <PaginationDots count={2} active={heroIndex} isLight={isLight} />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: spacing.xl + 4,
                    marginBottom: spacing.md,
                    gap: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '800',
                      color: colors.text,
                      letterSpacing: -0.4,
                      flex: 1,
                    }}
                  >
                    Месячный бюджет
                  </Text>
                  <Pressable onPress={openCategorySettings} hitSlop={8}>
                    <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 14 }}>Все категории</Text>
                  </Pressable>
                </View>

                {overview.budgetLines.length === 0 ? (
                  <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
                    Категории расходов не загружены. Импортируй таблицу{' '}
                    <Text style={{ fontWeight: '700' }}>expense_categories</Text> в{' '}
                    <Text style={{ fontWeight: '700' }}>finance_expense_categories</Text> (см. scripts/FINANCE_IMPORT.md).
                  </Text>
                ) : (
                  overview.budgetLines.map((line) => (
                    <BudgetCard
                      key={line.id}
                      line={line}
                      editable
                      onEdit={() => openCategoryEdit(line)}
                      onDelete={() => confirmDeleteCategory(line)}
                      onQuickExpense={() => openAddTransaction(line.title)}
                    />
                  ))
                )}
              </>
            ) : null}

            {mainTab === 'transactions' ? (
              <FinanceMonthTransactionsBlock
                userId={userId}
                overview={overview}
                onSaved={invalidateFinance}
                prefillCategoryName={addTxPrefill}
              />
            ) : null}

            {mainTab === 'categories' ? (
              <View style={{ marginTop: spacing.md }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: spacing.sm,
                    gap: 12,
                  }}
                >
                  <Text style={[typography.caption, { color: colors.textMuted, flex: 1, lineHeight: 20 }]}>
                    Расходы по категориям за текущий месяц (к плану). Карандаш — лимит и название, корзина — удалить.
                  </Text>
                  <Pressable onPress={openCategorySettings} hitSlop={8}>
                    <Text style={{ fontWeight: '800', color: brand.primary, fontSize: 13 }}>Настройки</Text>
                  </Pressable>
                </View>
                {expenseAnalyticsQ.isLoading ? (
                  <ActivityIndicator color={brand.primary} style={{ marginBottom: spacing.lg }} />
                ) : expenseAnalyticsQ.isError ? (
                  <Text style={{ color: colors.danger, marginBottom: spacing.lg }}>
                    Не удалось загрузить сравнение по месяцам.
                  </Text>
                ) : expenseAnalyticsQ.data ? (
                  <FinanceCategoryMonthMatrix
                    analytics={expenseAnalyticsQ.data}
                    budgetRootTitles={overview.budgetLines.map((l) => l.title)}
                    expenseCategories={overview.expenseCategories}
                  />
                ) : null}

                <Pressable
                  onPress={openAddCategory}
                  style={{
                    marginTop: spacing.md,
                    marginBottom: spacing.md,
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRadius: radius.xl,
                    backgroundColor: brand.primary,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    ...(Platform.OS === 'web'
                      ? ({
                          boxShadow: '0 0 28px rgba(168, 85, 247, 0.45), 0 10px 28px rgba(0,0,0,0.4)',
                        } as object)
                      : {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.25,
                          shadowRadius: 10,
                          elevation: 6,
                        }),
                  }}
                >
                  <Ionicons name="add-circle" size={24} color="#fff" />
                  <Text style={{ fontWeight: '900', color: '#fff', fontSize: 16, letterSpacing: 0.2 }}>
                    Добавить категорию
                  </Text>
                </Pressable>

                {overview.budgetLines.length === 0 ? (
                  <Text style={{ color: colors.textMuted, lineHeight: 22, marginBottom: spacing.sm }}>
                    Пока нет категорий в бюджете. Импорт: scripts/FINANCE_IMPORT.md.
                  </Text>
                ) : (
                  overview.budgetLines.map((line) => (
                    <BudgetCard
                      key={`cat-${line.id}`}
                      line={line}
                      editable
                      onEdit={() => openCategoryEdit(line)}
                      onDelete={() => confirmDeleteCategory(line)}
                      onQuickExpense={() => openAddTransaction(line.title)}
                    />
                  ))
                )}
              </View>
            ) : null}

            {mainTab === 'history' ? (
              <View style={{ marginTop: spacing.md }}>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 20 }]}>
                  История по месяцам (новые сверху). Динамика капитала — изменение баланса к предыдущему месяцу в списке.
                  Выручка и прибыль — если есть в Twinworks: миграция 010_finance_snapshot_revenue.sql в Supabase и при
                  необходимости повторный импорт.
                </Text>
                {overview.snapshots.length === 0 ? (
                  <Text style={{ color: colors.textMuted, lineHeight: 22 }}>
                    Снимков нет. После импорта таблицы finance_month_snapshots здесь появится история.
                  </Text>
                ) : (
                  <>
                    <View style={{ marginBottom: spacing.md }}>
                      <SegmentedControl<MonthHistoryViewMode>
                        value={historyViewMode}
                        onChange={setHistoryViewMode}
                        activeVariant="brandGlow"
                        options={[
                          { value: 'table', label: 'Таблица' },
                          { value: 'cards', label: 'Карточки' },
                        ]}
                      />
                    </View>
                    {historyViewMode === 'table' ? (
                      <MonthHistoryTableTwin rows={monthHistoryRows} screenInnerWidth={SCREEN_W - padH * 2} />
                    ) : (
                      <MonthHistoryCards rows={monthHistoryRows} />
                    )}
                  </>
                )}
              </View>
            ) : null}
          </>
        ) : null}
        </ScrollView>
      </View>

      <FinanceCategoryFormModal
        visible={catModal != null}
        onClose={() => setCatModal(null)}
        userId={userId ?? ''}
        mode={catModal?.mode === 'edit' ? 'edit' : 'create'}
        categoryId={catModal?.mode === 'edit' ? catModal.id : undefined}
        initial={catModal?.mode === 'edit' ? catModal.initial : undefined}
        allCategories={overview?.expenseCategories}
      />

      {overview && userId ? (
        <FinanceAddTransactionModal
          visible={addTxOpen}
          onClose={() => {
            setAddTxOpen(false);
            setAddTxPrefill(null);
          }}
          userId={userId}
          overview={overview}
          prefillCategoryName={addTxPrefill}
        />
      ) : null}

    </ScreenCanvas>
  );
}
