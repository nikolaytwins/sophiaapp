import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FinanceBucketEditModal } from '@/features/finance/FinanceBucketEditModal';
import { computeFinanceMonthTxStats } from '@/features/finance/financeMonthTxStats';
import { loadFinanceTransactionsForMonth } from '@/features/finance/financeApi';
import {
  DEFAULT_FINANCE_LIFE_BUCKET_NAMES,
  DEFAULT_FINANCE_WORK_BUCKET_NAMES,
  loadFinanceTxBucketLife,
  loadFinanceTxBucketWork,
  saveFinanceTxBucketLife,
  saveFinanceTxBucketWork,
} from '@/features/finance/financeTxDashboardStorage';
import { FinanceTransactionTable } from '@/features/finance/FinanceTransactionTable';
import type { FinanceOverview } from '@/features/finance/finance.types';
import { financeTransactionsMonthKey } from '@/features/finance/queryKeys';
import { useAppTheme } from '@/theme';

function fmtMoneyBig(n: number) {
  return Math.round(n)
    .toLocaleString('ru-RU', { maximumFractionDigits: 0 })
    .replace(/\u00A0/g, ' ');
}

function monthTitleRu(y: number, m: number): string {
  const s = new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  if (!s) return `${m}.${y}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function clampMonth(y: number, mo: number): { y: number; m: number } {
  let yy = y;
  let mm = mo;
  while (mm < 1) {
    mm += 12;
    yy -= 1;
  }
  while (mm > 12) {
    mm -= 12;
    yy += 1;
  }
  return { y: yy, m: mm };
}

const MONTH_NAMES_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'] as const;

type Props = {
  userId: string;
  overview: FinanceOverview;
  onSaved: () => void;
  prefillCategoryName?: string | null;
};

export function FinanceMonthTransactionsBlock({ userId, overview, onSaved, prefillCategoryName }: Props) {
  const { colors, typography, spacing, radius, isLight, brand } = useAppTheme();
  const now = useMemo(() => new Date(), []);
  const [y, setY] = useState(() => now.getFullYear());
  const [m, setM] = useState(() => now.getMonth() + 1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYearDraft, setPickerYearDraft] = useState(String(now.getFullYear()));
  const [lifeNames, setLifeNames] = useState<string[]>(() => [...DEFAULT_FINANCE_LIFE_BUCKET_NAMES]);
  const [workNames, setWorkNames] = useState<string[]>(() => [...DEFAULT_FINANCE_WORK_BUCKET_NAMES]);
  const [lifeEditOpen, setLifeEditOpen] = useState(false);
  const [workEditOpen, setWorkEditOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [life, work] = await Promise.all([loadFinanceTxBucketLife(), loadFinanceTxBucketWork()]);
      if (!cancelled) {
        setLifeNames(life);
        setWorkNames(work);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const txQ = useQuery({
    queryKey: financeTransactionsMonthKey(userId, y, m),
    queryFn: () => loadFinanceTransactionsForMonth(userId, y, m),
    enabled: Boolean(userId),
  });

  const transactions = txQ.data ?? [];
  const stats = useMemo(() => computeFinanceMonthTxStats(transactions, lifeNames, workNames), [transactions, lifeNames, workNames]);

  const allCategoryNames = useMemo(
    () => overview.expenseCategories.map((c) => c.name).filter(Boolean),
    [overview.expenseCategories]
  );

  const shiftMonth = useCallback((delta: number) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    const nm = m + delta;
    const c = clampMonth(y, nm);
    setY(c.y);
    setM(c.m);
  }, [m, y]);

  const openPicker = useCallback(() => {
    setPickerYearDraft(String(y));
    setPickerOpen(true);
  }, [y]);

  const applyPickerMonth = useCallback(
    (month: number) => {
      const year = Number.parseInt(pickerYearDraft.replace(/\D/g, ''), 10);
      if (!Number.isFinite(year) || year < 1970 || year > 2100) return;
      const c = clampMonth(year, month);
      setY(c.y);
      setM(c.m);
      setPickerOpen(false);
    },
    [pickerYearDraft]
  );

  const title = monthTitleRu(y, m);
  const deltaColor = stats.delta >= 0 ? '#22C55E' : '#FB7185';

  const cardShell = () =>
    ({
      flex: 1,
      minWidth: 152,
      maxWidth: Platform.OS === 'web' ? 220 : undefined,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: isLight ? colors.border : 'rgba(255,255,255,0.1)',
      backgroundColor: isLight ? colors.surface2 : 'rgba(255,255,255,0.04)',
      position: 'relative' as const,
    }) as const;

  return (
    <View style={{ marginTop: spacing.md, position: 'relative', zIndex: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          hitSlop={12}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isLight ? colors.surface2 : 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="chevron-back" size={22} color={brand.primary} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '900',
              color: colors.text,
              letterSpacing: -0.6,
              textAlign: 'center',
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            onPress={openPicker}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isLight ? colors.surface2 : 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: colors.border,
            }}
            accessibilityLabel="Выбрать месяц"
          >
            <Ionicons name="calendar-outline" size={20} color={brand.primary} />
          </Pressable>
          <Pressable
            onPress={() => shiftMonth(1)}
            hitSlop={12}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isLight ? colors.surface2 : 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="chevron-forward" size={22} color={brand.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          gap: 10,
          paddingVertical: 4,
          paddingBottom: 12,
        }}
      >
        <View style={cardShell()}>
          <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '800', marginBottom: 6 }]}>Всего за месяц</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.8 }}>{fmtMoneyBig(stats.totalExpense)}</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 4 }}>₽ · все траты</Text>
        </View>

        <View style={cardShell()}>
          <Pressable
            onPress={() => setLifeEditOpen(true)}
            hitSlop={6}
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, padding: 4, opacity: 0.55 }}
            accessibilityLabel="Редактировать категории «на жизнь»"
          >
            <Ionicons name="pencil" size={16} color={colors.textMuted} />
          </Pressable>
          <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '800', marginBottom: 6, paddingRight: 22 }]}>
            На жизнь
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.8 }}>{fmtMoneyBig(stats.lifeExpense)}</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 4 }}>₽</Text>
        </View>

        <View style={cardShell()}>
          <Pressable
            onPress={() => setWorkEditOpen(true)}
            hitSlop={6}
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, padding: 4, opacity: 0.55 }}
            accessibilityLabel="Редактировать категории «на работу»"
          >
            <Ionicons name="pencil" size={16} color={colors.textMuted} />
          </Pressable>
          <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '800', marginBottom: 6, paddingRight: 22 }]}>
            На работу
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.8 }}>{fmtMoneyBig(stats.workExpense)}</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 4 }}>₽</Text>
        </View>

        <View
          style={{
            ...cardShell(),
            borderColor: stats.delta >= 0 ? 'rgba(34,197,94,0.35)' : 'rgba(251,113,133,0.45)',
          }}
        >
          <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '800', marginBottom: 6 }]}>Дельта</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: deltaColor, letterSpacing: -0.8 }}>
            {stats.delta >= 0 ? '+' : ''}
            {fmtMoneyBig(stats.delta)}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 4 }}>₽ · доход − траты</Text>
        </View>
      </ScrollView>

      {txQ.isLoading ? (
        <ActivityIndicator color={brand.primary} style={{ marginVertical: 16 }} />
      ) : txQ.isError ? (
        <Text style={{ color: colors.danger, marginBottom: 12 }}>Не удалось загрузить операции за месяц.</Text>
      ) : (
        <FinanceTransactionTable
          userId={userId}
          overview={overview}
          transactions={transactions}
          onSaved={onSaved}
          prefillCategoryName={prefillCategoryName}
        />
      )}

      <Modal visible={pickerOpen} animationType="fade" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: spacing.lg }} onPress={() => setPickerOpen(false)}>
          <View style={{ borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg }} onStartShouldSetResponder={() => true}>
            <Text style={[typography.title2, { fontWeight: '900', color: colors.text, marginBottom: spacing.md }]}>Месяц и год</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 6 }]}>Год</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md }}>
              <Pressable
                onPress={() => {
                  const cur = Number.parseInt(pickerYearDraft, 10);
                  const base = Number.isFinite(cur) ? cur : y;
                  setPickerYearDraft(String(Math.max(1970, base - 1)));
                }}
                style={{ padding: 10, borderRadius: 12, backgroundColor: colors.surface2 }}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </Pressable>
              <TextInput
                value={pickerYearDraft}
                onChangeText={(t) => setPickerYearDraft(t.replace(/[^\d]/g, '').slice(0, 4))}
                keyboardType="number-pad"
                placeholder="2026"
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 20,
                  fontWeight: '900',
                  color: colors.text,
                  paddingVertical: 12,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface2,
                }}
              />
              <Pressable
                onPress={() => {
                  const cur = Number.parseInt(pickerYearDraft, 10);
                  const base = Number.isFinite(cur) ? cur : y;
                  setPickerYearDraft(String(Math.min(2100, base + 1)));
                }}
                style={{ padding: 10, borderRadius: 12, backgroundColor: colors.surface2 }}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MONTH_NAMES_SHORT.map((label, i) => {
                const mi = i + 1;
                const yr = Number.parseInt(pickerYearDraft, 10);
                const sel = Number.isFinite(yr) && yr === y && mi === m;
                return (
                  <Pressable
                    key={label}
                    onPress={() => applyPickerMonth(mi)}
                    style={{
                      width: '30%',
                      flexGrow: 1,
                      paddingVertical: 12,
                      borderRadius: radius.lg,
                      backgroundColor: sel ? brand.primary : colors.surface2,
                      borderWidth: 1,
                      borderColor: sel ? brand.primary : colors.border,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontWeight: '800', color: sel ? '#fff' : colors.text }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setPickerOpen(false)}
              style={{ marginTop: spacing.md, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
            >
              <Text style={{ fontWeight: '800', color: colors.textMuted }}>Закрыть</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <FinanceBucketEditModal
        visible={lifeEditOpen}
        title="Категории «на жизнь»"
        allCategoryNames={allCategoryNames}
        initialSelected={lifeNames}
        onClose={() => setLifeEditOpen(false)}
        onSave={async (names) => {
          await saveFinanceTxBucketLife(names);
          setLifeNames(names);
        }}
      />
      <FinanceBucketEditModal
        visible={workEditOpen}
        title="Категории «на работу»"
        allCategoryNames={allCategoryNames}
        initialSelected={workNames}
        onClose={() => setWorkEditOpen(false)}
        onSave={async (names) => {
          await saveFinanceTxBucketWork(names);
          setWorkNames(names);
        }}
      />
    </View>
  );
}
