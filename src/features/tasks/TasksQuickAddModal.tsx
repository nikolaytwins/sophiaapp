import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import type { BacklogPriority } from '@/features/tasks/backlog.types';
import { PLANNER_PRIORITY_OPTIONS, PLANNER_PRIORITY_WEB_HINT } from '@/features/tasks/taskPriorityUi';
import { addDays } from '@/features/habits/habitLogic';
import type { useAppTheme } from '@/theme/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

type Kind = 'task' | 'focus';

function formatDayChipLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return 'Сегодня';
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

type Props = {
  visible: boolean;
  kind: Kind;
  onClose: () => void;
  onSubmit: (payload: { kind: 'task'; title: string; dayKey: string; priority: BacklogPriority } | { kind: 'focus'; title: string; priority: BacklogPriority }) => void;
  submitting: boolean;
  /** Якорь для полоски дат в режиме задачи. */
  anchorDayKey: string;
  todayKey: string;
  /** Понедельник недели фокуса (для подписи в режиме focus). */
  weekMonday: string;
  colors: AppTheme['colors'];
  typography: AppTheme['typography'];
  radius: AppTheme['radius'];
  isLight: boolean;
};

export function TasksQuickAddModal({
  visible,
  kind,
  onClose,
  onSubmit,
  submitting,
  anchorDayKey,
  todayKey,
  weekMonday,
  colors,
  typography,
  radius,
  isLight,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const cardMax = Math.min(440, winW - 32);
  const [title, setTitle] = useState('');
  const [dayKey, setDayKey] = useState(anchorDayKey);
  const [priority, setPriority] = useState<BacklogPriority>('medium');

  const stripKeys = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(anchorDayKey, i - 5)), [anchorDayKey]);

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setDayKey(anchorDayKey);
    setPriority('medium');
  }, [visible, anchorDayKey, kind]);

  const webPtr = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {};

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              maxWidth: cardMax,
              width: '100%',
              borderRadius: radius.lg,
              backgroundColor: isLight ? '#FFFFFF' : '#F4F4F5',
              borderColor: isLight ? 'rgba(15,17,24,0.08)' : 'rgba(15,17,24,0.06)',
            },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginBottom: 4 }}>
            <Ionicons name="reorder-two-outline" size={20} color="rgba(15,17,24,0.35)" />
            <Ionicons name="pulse-outline" size={20} color="rgba(15,17,24,0.35)" />
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={kind === 'task' ? 'Название задачи' : 'Название фокуса'}
            placeholderTextColor="rgba(15,17,24,0.35)"
            style={[typography.title2, { fontSize: 20, fontWeight: '700', color: '#18181B', paddingVertical: 4 }]}
          />
          {kind === 'task' ? (
            <View style={{ marginTop: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
                {stripKeys.map((dk) => {
                  const sel = dk === dayKey;
                  const isToday = dk === todayKey;
                  return (
                    <Pressable
                      key={dk}
                      onPress={() => {
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                        setDayKey(dk);
                      }}
                      style={[
                        styles.chip,
                        {
                          borderColor: sel ? 'rgba(34,197,94,0.55)' : 'rgba(15,17,24,0.12)',
                          backgroundColor: sel ? 'rgba(34,197,94,0.08)' : '#FFFFFF',
                        },
                        webPtr,
                      ]}
                    >
                      <Ionicons name="calendar-outline" size={16} color={isToday || sel ? '#16A34A' : 'rgba(15,17,24,0.45)'} />
                      <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: sel ? '#15803D' : '#3F3F46' }}>
                        {formatDayChipLabel(dk, todayKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar-clear-outline" size={18} color="#7C3AED" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#3F3F46' }}>
                Неделя с {weekMonday.slice(8, 10)}.{weekMonday.slice(5, 7)}
              </Text>
            </View>
          )}

          <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <View style={[styles.chip, { borderColor: 'rgba(15,17,24,0.12)', backgroundColor: '#FFFFFF', opacity: 0.45 }]}>
              <Ionicons name="attach-outline" size={16} color="rgba(15,17,24,0.45)" />
              <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#71717A' }}>Вложение</Text>
            </View>

            <View style={{ position: 'relative' }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
                {PLANNER_PRIORITY_OPTIONS.map((p) => {
                  const on = priority === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      {...(Platform.OS === 'web' ? { title: PLANNER_PRIORITY_WEB_HINT[p.id] } : {})}
                      onPress={() => {
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                        setPriority(p.id);
                      }}
                      style={[
                        styles.chip,
                        {
                          borderColor: on ? 'rgba(124,58,237,0.45)' : 'rgba(15,17,24,0.12)',
                          backgroundColor: on ? 'rgba(124,58,237,0.08)' : '#FFFFFF',
                        },
                        webPtr,
                      ]}
                    >
                      <Ionicons name="flag-outline" size={16} color={on ? '#6D28D9' : 'rgba(15,17,24,0.45)'} />
                      <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: on ? '#5B21B6' : '#3F3F46' }}>{p.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(15,17,24,0.1)', marginTop: 18 }} />

          <View style={{ flexDirection: 'row', marginTop: 16, justifyContent: 'flex-end', gap: 10 }}>
            <Pressable
              onPress={onClose}
              style={[styles.footerBtn, { backgroundColor: 'rgba(15,17,24,0.06)' }, webPtr]}
              disabled={submitting}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#52525B' }}>Отмена</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const t = title.trim();
                if (!t) return;
                if (kind === 'task') onSubmit({ kind: 'task', title: t, dayKey, priority });
                else onSubmit({ kind: 'focus', title: t, priority });
              }}
              disabled={submitting || !title.trim()}
              style={[
                styles.footerBtn,
                { backgroundColor: '#6366F1', opacity: !title.trim() || submitting ? 0.5 : 1 },
                webPtr,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FAFAFC" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FAFAFC' }}>
                  {kind === 'task' ? 'Добавить задачу' : 'Добавить фокус'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 20px 50px rgba(0,0,0,0.25)' } as object)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.2,
          shadowRadius: 24,
          elevation: 16,
        }),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  footerBtn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
