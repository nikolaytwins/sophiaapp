import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSupabaseConfigured } from '@/config/env';
import { sprintEndDateKey } from '@/features/sprint/sprint.logic';
import { useSprintStore } from '@/stores/sprint.store';
import { useAppTheme } from '@/theme';

const ACCENT = '#A855F7';

export function SprintSettingsScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cloudConfigured = useSupabaseConfigured;

  const active = useSprintStore((s) => s.sprints.find((x) => x.status === 'active') ?? null);
  const updateSprintSchedule = useSprintStore((s) => s.updateSprintSchedule);

  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');

  useEffect(() => {
    if (active) {
      setDraftStart(active.startDate);
      setDraftEnd(sprintEndDateKey(active));
    }
  }, [active?.id, active?.startDate, active?.durationDays]);

  const save = useCallback(() => {
    if (!active) return;
    const r = updateSprintSchedule(active.id, { startDate: draftStart, endDate: draftEnd });
    if (!r.ok) {
      Alert.alert('Расписание спринта', r.error);
      setDraftStart(active.startDate);
      setDraftEnd(sprintEndDateKey(active));
      return;
    }
    router.back();
  }, [active, draftStart, draftEnd, router, updateSprintSchedule]);

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: '#030304', paddingTop: insets.top + 12, paddingHorizontal: spacing.md }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Назад</Text>
        </Pressable>
        <Text style={{ color: colors.textMuted }}>Нет активного спринта.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#030304' }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: spacing.md,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Спринт</Text>
        </Pressable>

        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 }}>Настройки</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 20, lineHeight: 20 }}>
          Даты начала и конца спринта (ГГГГ-ММ-ДД). Длительность считается автоматически по этим датам.
        </Text>

        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>Дата старта</Text>
        <TextInput
          value={draftStart}
          onChangeText={setDraftStart}
          placeholder="2026-03-30"
          placeholderTextColor="rgba(255,255,255,0.28)"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            borderRadius: radius.md,
            paddingVertical: 14,
            paddingHorizontal: 14,
            color: colors.text,
            fontSize: 16,
            marginBottom: 16,
          }}
        />

        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>Дата конца</Text>
        <TextInput
          value={draftEnd}
          onChangeText={setDraftEnd}
          placeholder="2026-04-12"
          placeholderTextColor="rgba(255,255,255,0.28)"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            borderRadius: radius.md,
            paddingVertical: 14,
            paddingHorizontal: 14,
            color: colors.text,
            fontSize: 16,
            marginBottom: 20,
          }}
        />

        <Pressable
          onPress={save}
          style={{
            backgroundColor: ACCENT,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Сохранить</Text>
        </Pressable>

        <View
          style={{
            marginTop: 32,
            padding: 16,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <Text style={{ fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,0.42)' }}>
            {cloudConfigured
              ? 'Данные спринта сохраняются на устройстве и синхронизируются с Supabase после входа.'
              : 'Спринт только локально. Укажите Supabase в .env для синхронизации.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
