import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import type { FinanceBudgetLine } from '@/features/finance/finance.types';
import { FINANCE_QUERY_KEY } from '@/features/finance/queryKeys';
import { useSupabaseConfigured } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ') + ' ₽';
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

  const lines = q.data?.budgetLines ?? [];

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...FINANCE_QUERY_KEY] });
  }, [qc]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFinanceExpenseCategory(userId!, id),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setFormMode('create');
    setEditId(undefined);
    setEditInitial(undefined);
    setFormOpen(true);
  };

  const openEdit = (line: FinanceBudgetLine) => {
    setFormMode('edit');
    setEditId(line.id);
    setEditInitial({
      name: line.title,
      type: line.kind === 'business' ? 'business' : 'personal',
      expectedMonthly: line.expectedMonthly,
    });
    setFormOpen(true);
  };

  const confirmDelete = (line: FinanceBudgetLine) => {
    Alert.alert('Удалить категорию?', `«${line.title}». Транзакции потеряют привязку к этой категории.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => delMut.mutate(line.id),
      },
    ]);
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
                Создавай и переименовывай категории здесь. Лимит — план на месяц; факт тянется из транзакций по названию
                категории.
              </Text>
              {lines.length === 0 ? (
                <Text style={{ color: colors.textMuted }}>Пока нет категорий — нажми «Добавить».</Text>
              ) : (
                lines.map((line) => (
                  <View
                    key={line.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[typography.body, { fontWeight: '800', color: colors.text }]} numberOfLines={2}>
                        {line.title}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
                        Лимит {fmtMoney(line.expectedMonthly)} · {line.kind === 'business' ? 'Бизнес' : 'Личное'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => openEdit(line)}
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
                      onPress={() => confirmDelete(line)}
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
        />
      </ScreenCanvas>
    </>
  );
}
