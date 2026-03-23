import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { repos } from '@/services/repositories';
import type { EventCategory } from '@/entities/models';
import { GlassCard } from '@/shared/ui/GlassCard';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useAppTheme } from '@/theme';

export default function CreateEventScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [type, setType] = useState('focus');
  const [category, setCategory] = useState<EventCategory>('work');
  const [note, setNote] = useState('');

  const save = useMutation({
    mutationFn: async () => {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const start = new Date(date);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(date);
      end.setHours(eh, em, 0, 0);
      return repos.events.create({
        title: title.trim() || 'Без названия',
        start: start.toISOString(),
        end: end.toISOString(),
        type,
        category,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events'] });
      router.back();
    },
  });

  const screenOptions = useMemo(
    () => ({
      headerShown: true as const,
      headerTitle: 'Новое событие',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerRight: () => (
        <Pressable onPress={() => save.mutate()} disabled={save.isPending}>
          <Text style={{ color: colors.accent, fontWeight: '600' }}>Сохранить</Text>
        </Pressable>
      ),
    }),
    [colors.accent, colors.bg, colors.text, save.isPending, save.mutate]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        input: {
          ...typography.body,
          color: colors.text,
          marginTop: spacing.sm,
          paddingVertical: spacing.sm,
        },
      }),
    [colors.text, spacing.sm, typography.body]
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard>
          <Text style={typography.caption}>НАЗВАНИЕ</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Событие"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </GlassCard>

        <GlassCard style={{ marginTop: spacing.md }}>
          <Text style={typography.caption}>ДАТА (YYYY-MM-DD)</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="2026-03-20"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
          />
        </GlassCard>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
          <GlassCard style={{ flex: 1 }}>
            <Text style={typography.caption}>НАЧАЛО</Text>
            <TextInput
              value={startTime}
              onChangeText={setStartTime}
              placeholder="12:00"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </GlassCard>
          <GlassCard style={{ flex: 1 }}>
            <Text style={typography.caption}>КОНЕЦ</Text>
            <TextInput
              value={endTime}
              onChangeText={setEndTime}
              placeholder="13:00"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </GlassCard>
        </View>

        <GlassCard style={{ marginTop: spacing.md }}>
          <Text style={typography.caption}>ТИП</Text>
          <TextInput
            value={type}
            onChangeText={setType}
            placeholder="focus / call / ritual"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </GlassCard>

        <View style={{ marginTop: spacing.md }}>
          <Text style={[typography.caption, { marginBottom: spacing.sm }]}>КАТЕГОРИЯ</Text>
          <SegmentedControl
            value={category}
            onChange={setCategory}
            options={[
              { value: 'work', label: 'Работа' },
              { value: 'life', label: 'Жизнь' },
            ]}
          />
        </View>

        <GlassCard style={{ marginTop: spacing.md }}>
          <Text style={typography.caption}>ЗАМЕТКА</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Контекст для будущего Apple Calendar sync"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { minHeight: 80 }]}
            multiline
          />
        </GlassCard>
      </ScrollView>
    </>
  );
}
