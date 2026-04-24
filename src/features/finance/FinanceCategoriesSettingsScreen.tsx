import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FinanceCategoryFormModal } from '@/features/finance/FinanceCategoryFormModal';
import {
  deleteFinanceExpenseCategory,
  loadFinanceOverview,
  type FinanceCategoryInput,
} from '@/features/finance/financeApi';
import { confirmFinanceDestructive } from '@/features/finance/financeConfirm';
import type { FinanceOverview } from '@/features/finance/finance.types';
import { FINANCE_QUERY_KEY } from '@/features/finance/queryKeys';
import { useSupabaseConfigured } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
}

type CatRow = {
  id: string;
  name: string;
  depth: 0 | 1;
  kind: 'personal' | 'business';
  expectedMonthly: number;
  parentId: string | null;
  spentMonth: number;
};

function buildCategoryRows(overview: FinanceOverview): CatRow[] {
  const oc = overview.expenseCategories;
  const spendMap = new Map<string, number>();
  for (const t of overview.transactionsThisMonth) {
    if (t.type !== 'expense') continue;
    const k = (t.category ?? '').trim();
    if (!k) continue;
    spendMap.set(k, (spendMap.get(k) ?? 0) + t.amount);
  }
  const roots = oc.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const out: CatRow[] = [];
  for (const r of roots) {
    out.push({
      id: r.id,
      name: r.name,
      depth: 0,
      kind: r.type === 'business' ? 'business' : 'personal',
      expectedMonthly: r.expectedMonthly,
      parentId: null,
      spentMonth: spendMap.get(r.name) ?? 0,
    });
    for (const ch of oc.filter((c) => c.parentId === r.id).sort((a, b) => a.name.localeCompare(b.name, 'ru'))) {
      out.push({
        id: ch.id,
        name: ch.name,
        depth: 1,
        kind: ch.type === 'business' ? 'business' : 'personal',
        expectedMonthly: ch.expectedMonthly,
        parentId: ch.parentId,
        spentMonth: spendMap.get(ch.name) ?? 0,
      });
    }
  }
  return out;
}

export function FinanceCategoriesSettingsScreen() {
  const { colors, typography, spacing, radius, brand } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const supabaseOn = useSupabaseConfigured;
  const [userId, setUserId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<string | undefined>();
  const [editInitial, setEditInitial] = useState<FinanceCategoryInput | undefined>();

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

  const overview = q.data;
  const sortedRows = useMemo(() => (overview ? buildCategoryRows(overview) : []), [overview]);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...FINANCE_QUERY_KEY] });
  }, [qc]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFinanceExpenseCategory(userId!, id),
    onSuccess: invalidate,
    onError: (e: Error) => Alert.alert('Ошибка', e.message ?? 'Не удалось удалить категорию'),
  });

  const openCreate = () => {
    setFormMode('create');
    setEditId(undefined);
    setEditInitial(undefined);
    setFormOpen(true);
  };

  const openEdit = (row: CatRow) => {
    setFormMode('edit');
    setEditId(row.id);
    setEditInitial({
      name: row.name,
      type: row.kind,
      expectedMonthly: row.expectedMonthly,
      parentId: row.parentId,
    });
    setFormOpen(true);
  };

  const confirmDelete = (row: CatRow) => {
    confirmFinanceDestructive(
      'Удалить категорию?',
      `«${row.name}». Транзакции потеряют привязку к этой категории (подкатегории при удалении родителя тоже удаляются).`,
      () => delMut.mutate(row.id)
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Категории расходов',
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
            padding: spacing.lg,
            paddingBottom: insets.bottom + 100,
          }}
        >
          {!supabaseOn || !userId ? (
            <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
              Включи облако и войди в аккаунт.
            </Text>
          ) : q.isLoading ? (
            <ActivityIndicator color={brand.primary} style={{ marginTop: 24 }} />
          ) : q.isError ? (
            <Text style={{ color: colors.danger }}>Не удалось загрузить категории.</Text>
          ) : (
            <>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 }]}>
                Лимит — план на месяц; факт за текущий месяц из транзакций. Подкатегория привязана к родителю; в
                транзакциях по-прежнему выбирается точное имя категории.
              </Text>
              {sortedRows.length === 0 ? (
                <Text style={{ color: colors.textMuted }}>Пока нет категорий — нажми «Добавить».</Text>
              ) : (
                sortedRows.map((row) => (
                  <View
                    key={row.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      paddingLeft: 14 + row.depth * 18,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[typography.body, { fontWeight: '800', color: colors.text }]} numberOfLines={2}>
                        {row.depth ? `· ${row.name}` : row.name}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
                        Лимит {fmtMoney(row.expectedMonthly)} · месяц {fmtMoney(row.spentMonth)} ·{' '}
                        {row.kind === 'business' ? 'Бизнес' : 'Личное'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => openEdit(row)}
                      hitSlop={8}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: 'rgba(168,85,247,0.15)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                      }}
                    >
                      <Ionicons name="pencil" size={18} color={brand.primary} />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(row)}
                      hitSlop={8}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: 'rgba(251,113,133,0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>

        {userId ? (
          <Pressable
            onPress={openCreate}
            style={{
              position: 'absolute',
              left: spacing.lg,
              right: spacing.lg,
              bottom: insets.bottom + 20,
              paddingVertical: 16,
              borderRadius: radius.xl,
              backgroundColor: brand.primary,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text style={{ fontWeight: '800', color: '#fff', fontSize: 16 }}>Добавить категорию</Text>
          </Pressable>
        ) : null}

        <FinanceCategoryFormModal
          visible={formOpen}
          onClose={() => setFormOpen(false)}
          userId={userId ?? ''}
          mode={formMode}
          categoryId={editId}
          initial={editInitial}
          allCategories={overview?.expenseCategories}
        />
      </ScreenCanvas>
    </>
  );
}
