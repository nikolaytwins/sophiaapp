import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { compareExpenseCategories } from '@/features/finance/financeApi';
import {
  canonicalizeBucketSelectionNames,
  collectDescendantCategoryNames,
  hasSelectedAncestorInBucket,
} from '@/features/finance/financeBudgetTree';
import type { FinanceExpenseCategory } from '@/features/finance/finance.types';
import { useAppTheme } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  expenseCategories: FinanceExpenseCategory[];
  /** Минимальный набор имён (после сохранения родитель заменяет отмеченных детей). */
  initialSelected: string[];
  onClose: () => void;
  onSave: (names: string[]) => void | Promise<void>;
};

function rowChecked(selected: Set<string>, cat: FinanceExpenseCategory, categories: FinanceExpenseCategory[]): boolean {
  if (selected.has(cat.name.trim())) return true;
  return hasSelectedAncestorInBucket(categories, selected, cat);
}

export function FinanceBucketEditModal({
  visible,
  title,
  expenseCategories,
  initialSelected,
  onClose,
  onSave,
}: Props) {
  const { colors, radius, typography, brand, spacing, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const sheetBg = isLight ? colors.surface : '#14121A';
  const rowBgOff = isLight ? colors.surface2 : 'rgba(255,255,255,0.07)';
  const backdropBg = isLight ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.78)';
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const roots = useMemo(
    () => expenseCategories.filter((c) => !c.parentId).sort(compareExpenseCategories),
    [expenseCategories]
  );

  useEffect(() => {
    if (!visible) return;
    const canonical = canonicalizeBucketSelectionNames(expenseCategories, initialSelected);
    setSelected(new Set(canonical));
  }, [visible, initialSelected, expenseCategories]);

  const toggle = useCallback((cat: FinanceExpenseCategory) => {
    setSelected((prev) => {
      if (cat.parentId && hasSelectedAncestorInBucket(expenseCategories, prev, cat)) return prev;
      const next = new Set(prev);
      const selfOn = next.has(cat.name.trim());
      if (!cat.parentId) {
        if (selfOn) next.delete(cat.name.trim());
        else {
          next.add(cat.name.trim());
          for (const d of collectDescendantCategoryNames(expenseCategories, cat.id)) {
            next.delete(d.trim());
          }
        }
      } else if (selfOn) {
        next.delete(cat.name.trim());
        for (const d of collectDescendantCategoryNames(expenseCategories, cat.id)) {
          next.delete(d.trim());
        }
      } else {
        next.add(cat.name.trim());
        for (const d of collectDescendantCategoryNames(expenseCategories, cat.id)) {
          next.delete(d.trim());
        }
      }
      return new Set(canonicalizeBucketSelectionNames(expenseCategories, [...next]));
    });
  }, [expenseCategories]);

  const onConfirm = useCallback(async () => {
    const out = canonicalizeBucketSelectionNames(expenseCategories, [...selected]);
    await onSave(out);
    onClose();
  }, [onClose, onSave, selected, expenseCategories]);

  function renderRow(cat: FinanceExpenseCategory, depth: number) {
    const on = rowChecked(selected, cat, expenseCategories);
    const locked = Boolean(cat.parentId && hasSelectedAncestorInBucket(expenseCategories, selected, cat));
    return (
      <Pressable
        onPress={() => {
          if (locked) return;
          toggle(cat);
        }}
        disabled={locked}
        style={
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 11,
            paddingHorizontal: 12,
            paddingLeft: 12 + depth * 16,
            borderRadius: radius.lg,
            marginBottom: 4,
            backgroundColor: on ? 'rgba(168,85,247,0.18)' : rowBgOff,
            borderWidth: 1,
            borderColor: on ? 'rgba(168,85,247,0.45)' : colors.border,
            opacity: locked ? 0.55 : 1,
            ...(Platform.OS === 'web' ? { cursor: locked ? 'default' : 'pointer' } : {}),
          } as ViewStyle
        }
      >
        <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? brand.primary : colors.textMuted} />
        <Text style={{ flex: 1, fontSize: depth > 0 ? 14 : 15, fontWeight: depth > 0 ? '600' : '800', color: colors.text }}>
          {depth > 0 ? `· ${cat.name}` : cat.name}
        </Text>
      </Pressable>
    );
  }

  function renderSubtree(parentId: string, depth: number): ReactNode {
    return expenseCategories
      .filter((c) => c.parentId === parentId)
      .sort(compareExpenseCategories)
      .map((ch) => (
        <View key={ch.id}>
          {renderRow(ch, depth)}
          {renderSubtree(ch.id, depth + 1)}
        </View>
      ));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1, backgroundColor: backdropBg }} onPress={onClose} />
        <View
          style={{
            maxHeight: '88%',
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            backgroundColor: sheetBg,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 16,
            ...(Platform.OS === 'web' ? ({ boxShadow: '0 -8px 40px rgba(0,0,0,0.45)' } as const) : {}),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={[typography.title2, { color: colors.text, fontWeight: '900', flex: 1 }]} numberOfLines={2}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Закрыть">
              <Ionicons name="close" size={26} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={[typography.caption, { color: colors.textMuted, paddingHorizontal: 16, paddingVertical: 10, lineHeight: 18 }]}>
            Отметь корневую категорию — все подкатегории попадут в корзину автоматически. Подкатегории отдельно не суммируются с
            родителем: в списках и на графике суммы сворачиваются в родителя.
          </Text>
          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {roots.map((root) => (
              <View key={root.id} style={{ marginBottom: 10 }}>
                {renderRow(root, 0)}
                {renderSubtree(root.id, 1)}
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 8 }}>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '800', color: colors.textMuted }}>Отмена</Text>
            </Pressable>
            <Pressable
              onPress={() => void onConfirm()}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: radius.lg,
                backgroundColor: brand.primary,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '900', color: '#fff' }}>Сохранить</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
