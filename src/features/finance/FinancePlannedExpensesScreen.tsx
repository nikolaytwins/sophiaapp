import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadFinanceDashboardPrefs, saveFinanceDashboardPrefs } from '@/features/finance/financeDashboardStorage';
import {
  computeExpectedMonthlyExpense,
  daysInCalendarMonth,
} from '@/features/finance/financeExpectedExpensePlan';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

function parseRubInput(s: string): number {
  const n = Number.parseInt(s.replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

export function FinancePlannedExpensesScreen() {
  const { colors, typography, spacing, radius, brand, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fixedDraft, setFixedDraft] = useState('');
  const [dailyDraft, setDailyDraft] = useState('');
  const [loading, setLoading] = useState(true);

  const now = useMemo(() => new Date(), []);
  const monthTitle = useMemo(
    () => now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
    [now]
  );
  const daysThisMonth = useMemo(() => daysInCalendarMonth(now.getFullYear(), now.getMonth() + 1), [now]);

  useEffect(() => {
    let c = false;
    void (async () => {
      const p = await loadFinanceDashboardPrefs();
      if (c) return;
      setFixedDraft(p.plannedFixedMonthlyRub > 0 ? String(Math.round(p.plannedFixedMonthlyRub)) : '');
      setDailyDraft(p.plannedDailyAllowanceRub > 0 ? String(Math.round(p.plannedDailyAllowanceRub)) : '');
      setLoading(false);
    })();
    return () => {
      c = true;
    };
  }, []);

  const previewFixed = parseRubInput(fixedDraft);
  const previewDaily = parseRubInput(dailyDraft);
  const previewTotal = computeExpectedMonthlyExpense(previewFixed, previewDaily, now);

  const onSave = useCallback(async () => {
    const fixed = parseRubInput(fixedDraft);
    const daily = parseRubInput(dailyDraft);
    await saveFinanceDashboardPrefs({
      plannedFixedMonthlyRub: fixed,
      plannedDailyAllowanceRub: daily,
    });
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Сохранено', 'Ожидаемый расход на дашборде пересчитается по формуле.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [fixedDraft, dailyDraft, router]);

  const shellBg = colors.surface2;
  const borderC = colors.border;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'План расходов',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12} style={{ paddingHorizontal: 8 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScreenCanvas>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 120,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typography.caption, { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md }]}>
            Ожидаемый расход за месяц на дашборде считается так:{' '}
            <Text style={{ fontWeight: '800', color: colors.text }}>фикс за месяц + лимит на 1 день × число дней</Text>
            . В текущем месяце ({monthTitle}) — {daysThisMonth} дн.
          </Text>

          <View
            style={{
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: borderC,
              backgroundColor: shellBg,
              padding: spacing.lg,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, marginBottom: 8 }}>
              Фиксированные расходы на месяц
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 10, lineHeight: 18 }]}>
              Одной суммой: всё обязательное на этот календарный месяц (без умножения на дни).
            </Text>
            <TextInput
              value={fixedDraft}
              onChangeText={(t) => setFixedDraft(t.replace(/[^\d]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={{
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: borderC,
                paddingVertical: 14,
                paddingHorizontal: 14,
                fontSize: 18,
                fontWeight: '800',
                color: colors.text,
                backgroundColor: colors.surface,
              }}
            />
          </View>

          <View
            style={{
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: borderC,
              backgroundColor: shellBg,
              padding: spacing.lg,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, marginBottom: 8 }}>
              Лимит трат на 1 день
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 10, lineHeight: 18 }]}>
              Планируемый «карман» на каждый день; в месяц учитывается как × {daysThisMonth}.
            </Text>
            <TextInput
              value={dailyDraft}
              onChangeText={(t) => setDailyDraft(t.replace(/[^\d]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={{
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: borderC,
                paddingVertical: 14,
                paddingHorizontal: 14,
                fontSize: 18,
                fontWeight: '800',
                color: colors.text,
                backgroundColor: colors.surface,
              }}
            />
          </View>

          <View
            style={{
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: brand.primaryMuted,
              backgroundColor: isLight ? brand.primaryMuted : 'rgba(168,85,247,0.12)',
              padding: spacing.lg,
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted }}>Предпросмотр</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, marginTop: 8 }}>
              {fmtMoney(previewTotal)}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 8, lineHeight: 18 }]}>
              = {fmtMoney(previewFixed)} + {fmtMoney(previewDaily)} × {daysThisMonth}
            </Text>
          </View>

          <Pressable
            onPress={onSave}
            disabled={loading}
            style={{
              paddingVertical: 16,
              borderRadius: radius.xl,
              backgroundColor: brand.primary,
              alignItems: 'center',
              opacity: loading ? 0.5 : 1,
            }}
          >
            <Text style={{ fontWeight: '900', color: '#fff', fontSize: 16 }}>Сохранить</Text>
          </Pressable>
        </ScrollView>
      </ScreenCanvas>
    </>
  );
}
