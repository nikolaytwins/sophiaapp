import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { type Href, Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { FinanceCategoryExpenseTableBlock } from '@/features/finance/FinanceCategoryExpenseTableBlock';
import { FinanceAddTransactionModal } from '@/features/finance/FinanceAddTransactionModal';
import { FinanceCategoryFormModal } from '@/features/finance/FinanceCategoryFormModal';
import { FinanceDashboardBento } from '@/features/finance/FinanceDashboardBento';
import { FinanceMonthTransactionsBlock } from '@/features/finance/FinanceMonthTransactionsBlock';
import {
  enrichMonthSnapshots,
  FinanceMonthHistorySection,
  type MonthHistoryViewMode,
} from '@/features/finance/FinanceMonthHistoryViews';
import { FINANCE_QUERY_KEY, financeExpenseAnalyticsKey } from '@/features/finance/queryKeys';
import { buildSpendByCategoryName, categoryToBudgetLine, childrenForRoot } from '@/features/finance/financeBudgetTree';
import type { FinanceBudgetLine, FinanceExpenseCategory, FinanceTransaction } from '@/features/finance/finance.types';
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

const CLOUD_HREF = '/cloud' as Href;

/** Фон без glow — спокойный canvas (редизайн финансов). */
function FinancePageGlow(_props: { isLight: boolean }) {
  return null;
}

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

type MainTab = 'dashboard' | 'transactions' | 'categories' | 'history';

function BudgetCard({
  line,
  editable,
  onEdit,
  onDelete,
  onQuickExpense,
  nested,
  embedded = false,
}: {
  line: FinanceBudgetLine;
  editable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Быстрый расход в этой категории (Twinworks). */
  onQuickExpense?: () => void;
  /** Подкатегория внутри аккордеона — компактнее и с отступом. */
  nested?: boolean;
  /** Внутри списка-аккордеона — без нижнего внешнего отступа карточки. */
  embedded?: boolean;
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

  const pad = nested ? 14 : 18;
  const iconBox = nested ? 40 : 48;
  const iconRadius = nested ? 12 : 14;
  const titleSize = nested ? 15 : 17;
  const ionSize = nested ? 22 : 26;

  return (
    <View
      style={{
        borderRadius: radius.xl,
        borderWidth: over ? 2 : 1,
        padding: pad,
        marginBottom: nested || embedded ? 0 : 14,
        ...shell,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, paddingRight: 12 }}>
          <View
            style={{
              width: iconBox,
              height: iconBox,
              borderRadius: iconRadius,
              backgroundColor: iconBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={ionSize} color={barColor} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: titleSize, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
              {line.title}
            </Text>
            <Text style={{ fontSize: nested ? 12 : 13, color: colors.textMuted, marginTop: 4 }} numberOfLines={3}>
              {line.subtitle}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Text
            style={{
              fontSize: nested ? 15 : 17,
              fontWeight: '800',
              color: over ? colors.danger : colors.text,
              fontVariant: ['tabular-nums'],
            }}
          >
            {fmtMoney(line.spent)}
            {line.expectedMonthly > 0 ? (
              <Text style={{ fontSize: nested ? 12 : 13, fontWeight: '700', color: colors.textMuted }}>{` / ${fmtMoney(line.expectedMonthly)}`}</Text>
            ) : null}
          </Text>
          {editable && onEdit && onDelete ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {onQuickExpense ? (
                <Pressable
                  onPress={onQuickExpense}
                  hitSlop={6}
                  style={{
                    width: nested ? 32 : 36,
                    height: nested ? 32 : 36,
                    borderRadius: 12,
                    backgroundColor: brand.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="add" size={nested ? 18 : 20} color={brand.primary} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={onEdit}
                hitSlop={6}
                style={{
                  width: nested ? 32 : 36,
                  height: nested ? 32 : 36,
                  borderRadius: 12,
                  backgroundColor: 'rgba(168,85,247,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="pencil" size={nested ? 16 : 17} color={brand.primary} />
              </Pressable>
              <Pressable
                onPress={onDelete}
                hitSlop={6}
                style={{
                  width: nested ? 32 : 36,
                  height: nested ? 32 : 36,
                  borderRadius: 12,
                  backgroundColor: 'rgba(251,113,133,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="trash-outline" size={nested ? 16 : 17} color={colors.danger} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
      <View
        style={{
          marginTop: nested ? 12 : 16,
          height: nested ? 6 : 8,
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

type FinanceBudgetAccordionListProps = {
  budgetLines: FinanceBudgetLine[];
  expenseCategories: FinanceExpenseCategory[];
  transactionsThisMonth: FinanceTransaction[];
  editable?: boolean;
  onEdit: (line: FinanceBudgetLine) => void;
  onDelete: (line: FinanceBudgetLine) => void;
  onQuickExpense: (categoryTitle: string) => void;
};

/** Корневые категории + подкатегории с раскрытием; лимиты и действия — на любом уровне. */
function FinanceBudgetAccordionList({
  budgetLines,
  expenseCategories,
  transactionsThisMonth,
  editable,
  onEdit,
  onDelete,
  onQuickExpense,
}: FinanceBudgetAccordionListProps) {
  const { colors } = useAppTheme();
  const spendMap = useMemo(() => buildSpendByCategoryName(transactionsThisMonth), [transactionsThisMonth]);
  const [collapsedRootIds, setCollapsedRootIds] = useState<Set<string>>(() => new Set());

  const toggleRoot = useCallback((rootId: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setCollapsedRootIds((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }, []);

  return (
    <>
      {budgetLines.map((line) => {
        const kids = childrenForRoot(expenseCategories, line.id);
        const hasKids = kids.length > 0;
        const collapsed = collapsedRootIds.has(line.id);
        return (
          <View key={line.id} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: 32, paddingTop: 20, alignItems: 'center' }}>
                {hasKids ? (
                  <Pressable
                    onPress={() => toggleRoot(line.id)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={collapsed ? 'Показать подкатегории' : 'Скрыть подкатегории'}
                  >
                    <Ionicons
                      name={collapsed ? 'chevron-forward' : 'chevron-down'}
                      size={22}
                      color={colors.textMuted}
                    />
                  </Pressable>
                ) : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <BudgetCard
                  embedded
                  line={line}
                  editable={editable}
                  onEdit={() => onEdit(line)}
                  onDelete={() => onDelete(line)}
                  onQuickExpense={editable ? () => onQuickExpense(line.title) : undefined}
                />
              </View>
            </View>
            {hasKids && !collapsed
              ? kids.map((ch) => {
                  const childLine = categoryToBudgetLine(ch, spendMap);
                  return (
                    <View
                      key={ch.id}
                      style={{
                        marginLeft: 32,
                        marginTop: 10,
                        paddingLeft: 10,
                        borderLeftWidth: 2,
                        borderLeftColor: 'rgba(168,85,247,0.35)',
                      }}
                    >
                      <BudgetCard
                        nested
                        line={childLine}
                        editable={editable}
                        onEdit={() => onEdit(childLine)}
                        onDelete={() => onDelete(childLine)}
                        onQuickExpense={editable ? () => onQuickExpense(ch.name) : undefined}
                      />
                    </View>
                  );
                })
              : null}
          </View>
        );
      })}
    </>
  );
}

export function FinanceScreen() {
  const { colors, typography, spacing, radius, isLight, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const supabaseOn = useSupabaseConfigured;
  const [userId, setUserId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('dashboard');
  const [catModal, setCatModal] = useState<FinanceCategoryModalState>(null);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [addTxPrefill, setAddTxPrefill] = useState<string | null>(null);
  const [historyViewMode, setHistoryViewMode] = useState<MonthHistoryViewMode>('table');

  const padH = spacing.xl;
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
    enabled: Boolean(supabaseOn && userId && (mainTab === 'categories' || mainTab === 'dashboard')),
  });

  const overview = q.data;

  const monthHistoryRows = useMemo(
    () => (overview ? enrichMonthSnapshots(overview.snapshots) : []),
    [overview?.snapshots]
  );

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
              Дашборд
            </Text>
            <Text style={[typography.hero, { fontSize: 32, letterSpacing: -0.8, color: colors.text }]}>Финансы</Text>
          </View>
          <HeaderProfileAvatar marginTop={4} />
        </View>

        <View style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
          <SegmentedControl<MainTab>
            value={mainTab}
            onChange={setMainTab}
            activeVariant="default"
            options={[
              { value: 'dashboard', label: 'Дашборд' },
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
            {mainTab === 'dashboard' ? (
              <FinanceDashboardBento
                overview={overview}
                userId={userId}
                monthHistoryRows={monthHistoryRows}
                expenseAnalytics={expenseAnalyticsQ.data}
                expenseAnalyticsLoading={expenseAnalyticsQ.isLoading}
                onRefresh={invalidateFinance}
              />
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
                <FinanceCategoryExpenseTableBlock
                  overview={overview}
                  analytics={expenseAnalyticsQ.data}
                  loading={expenseAnalyticsQ.isLoading}
                  error={expenseAnalyticsQ.isError}
                  onOpenSettings={openCategorySettings}
                />

                {overview.budgetLines.length === 0 ? (
                  <Text style={{ color: colors.textMuted, lineHeight: 22, marginTop: spacing.sm, marginBottom: spacing.sm }}>
                    Пока нет категорий в бюджете. Импорт: scripts/FINANCE_IMPORT.md.
                  </Text>
                ) : (
                  <FinanceBudgetAccordionList
                    budgetLines={overview.budgetLines}
                    expenseCategories={overview.expenseCategories}
                    transactionsThisMonth={overview.transactionsThisMonth}
                    editable
                    onEdit={openCategoryEdit}
                    onDelete={confirmDeleteCategory}
                    onQuickExpense={openAddTransaction}
                  />
                )}

                <Pressable
                  onPress={openAddCategory}
                  style={{
                    marginTop: spacing.lg,
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
                      ? ({ boxShadow: '0 4px 16px rgba(0,0,0,0.18)' } as object)
                      : {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.2,
                          shadowRadius: 8,
                          elevation: 4,
                        }),
                  }}
                >
                  <Ionicons name="add-circle" size={24} color="#fff" />
                  <Text style={{ fontWeight: '900', color: '#fff', fontSize: 16, letterSpacing: 0.2 }}>
                    Добавить категорию
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {mainTab === 'history' ? (
              <View style={{ marginTop: spacing.md }}>
                {overview.snapshots.length === 0 ? (
                  <Text style={{ color: colors.textMuted, lineHeight: 22 }}>
                    Снимков нет. После импорта таблицы finance_month_snapshots здесь появится история.
                  </Text>
                ) : (
                  <FinanceMonthHistorySection
                    rows={monthHistoryRows}
                    screenInnerWidth={SCREEN_W - padH * 2}
                    viewMode={historyViewMode}
                    onViewModeChange={setHistoryViewMode}
                  />
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
