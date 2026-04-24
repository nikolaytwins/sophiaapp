import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  /** Все имена категорий из облака (как в транзакциях). */
  allCategoryNames: string[];
  /** Имена, входящие в корзину (канонические строки из списка). */
  initialSelected: string[];
  onClose: () => void;
  onSave: (names: string[]) => void | Promise<void>;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function FinanceBucketEditModal({
  visible,
  title,
  allCategoryNames,
  initialSelected,
  onClose,
  onSave,
}: Props) {
  const { colors, radius, typography, brand, spacing, isLight } = useAppTheme();
  const insets = useSafeAreaInsets();
  /** В darkPalette `colors.surface` почти прозрачный — для модалки нужен плотный фон. */
  const sheetBg = isLight ? colors.surface : '#14121A';
  const rowBgOff = isLight ? colors.surface2 : 'rgba(255,255,255,0.07)';
  const backdropBg = isLight ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.78)';
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const sortedNames = useMemo(
    () => [...new Set(allCategoryNames.map((n) => n.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru')),
    [allCategoryNames]
  );

  useEffect(() => {
    if (!visible) return;
    const next = new Set<string>();
    const lowerToCanonical = new Map(sortedNames.map((n) => [norm(n), n]));
    for (const s of initialSelected) {
      const c = lowerToCanonical.get(norm(s));
      if (c) next.add(c);
    }
    setSelected(next);
  }, [visible, initialSelected, sortedNames]);

  const toggle = useCallback((name: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  }, []);

  const onConfirm = useCallback(async () => {
    await onSave([...selected].sort((a, b) => a.localeCompare(b, 'ru')));
    onClose();
  }, [onClose, onSave, selected]);

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
        <Text style={[typography.caption, { color: colors.textMuted, paddingHorizontal: 16, paddingVertical: 10 }]}>
          Отметь категории, которые входят в эту сумму. Имена совпадают с полем «Категория» в транзакциях.
        </Text>
        <ScrollView
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {sortedNames.map((name) => {
            const on = selected.has(name);
            return (
              <Pressable
                key={name}
                onPress={() => toggle(name)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: radius.lg,
                  marginBottom: 6,
                  backgroundColor: on ? 'rgba(168,85,247,0.18)' : rowBgOff,
                  borderWidth: 1,
                  borderColor: on ? 'rgba(168,85,247,0.45)' : colors.border,
                  ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {}),
                }}
              >
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? brand.primary : colors.textMuted} />
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.text }}>{name}</Text>
              </Pressable>
            );
          })}
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
