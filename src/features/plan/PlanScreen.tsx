import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TaskRow } from '@/features/day/TaskRow';
import { usePlanViewStore } from '@/stores/planView.store';
import { repos } from '@/services/repositories';
import { GlassCard } from '@/shared/ui/GlassCard';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useAppTheme } from '@/theme';

export function PlanScreen() {
  const { colors, typography, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const segment = usePlanViewStore((s) => s.segment);
  const setSegment = usePlanViewStore((s) => s.setSegment);

  const dateKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const events = useQuery({
    queryKey: ['events', 'plan', dateKey],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
      return repos.events.listForRange(start.toISOString(), end.toISOString());
    },
  });

  const tasks = useQuery({
    queryKey: ['tasks', dateKey],
    queryFn: () => repos.tasks.listForDate(dateKey),
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      if (done) return repos.tasks.complete(id);
      return repos.tasks.uncomplete(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const sortedEvents = useMemo(() => {
    return [...(events.data ?? [])].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events.data]);

  const timedTasks = useMemo(() => (tasks.data ?? []).filter((t) => t.dueTime), [tasks.data]);
  const untimedTasks = useMemo(() => (tasks.data ?? []).filter((t) => !t.dueTime), [tasks.data]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: colors.bg,
          paddingHorizontal: spacing.xl,
        },
        top: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.lg,
        },
        createBtn: {
          width: 48,
          height: 48,
          borderRadius: 16,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        timelineRow: { flexDirection: 'row', gap: spacing.lg },
        timeCol: { width: 56 },
        time: { ...typography.title2, fontSize: 15 },
      }),
    [colors, typography, spacing]
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.top}>
        <View>
          <Text style={typography.caption}>План</Text>
          <Text style={typography.hero}>Неделя</Text>
        </View>
        <Pressable
          onPress={() => router.push('/create-event')}
          style={styles.createBtn}
          accessibilityLabel="Создать событие"
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      <SegmentedControl
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'schedule', label: 'Расписание' },
          { value: 'tasks', label: 'Задачи' },
        ]}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingTop: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {segment === 'schedule' ? (
          <>
            <SectionHeader title="Timeline" />
            <View style={{ gap: spacing.sm }}>
              {sortedEvents.map((ev) => (
                <GlassCard key={ev.id}>
                  <View style={styles.timelineRow}>
                    <View style={styles.timeCol}>
                      <Text style={styles.time}>
                        {new Date(ev.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={typography.caption}>
                        {new Date(ev.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={typography.title2}>{ev.title}</Text>
                      <Text style={typography.caption}>
                        {ev.type} · {ev.category === 'work' ? 'работа' : 'жизнь'}
                      </Text>
                      {ev.note ? <Text style={[typography.body, { marginTop: spacing.sm }]}>{ev.note}</Text> : null}
                    </View>
                  </View>
                </GlassCard>
              ))}
              {sortedEvents.length === 0 ? (
                <GlassCard>
                  <Text style={typography.body}>Событий пока нет — создай первое.</Text>
                </GlassCard>
              ) : null}
            </View>
          </>
        ) : (
          <>
            <SectionHeader title="С временем" />
            <View style={{ gap: spacing.sm }}>
              {timedTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggle={() =>
                    toggleTask.mutate({ id: t.id, done: t.status !== 'done' })
                  }
                />
              ))}
            </View>
            <View style={{ marginTop: spacing.xl }}>
              <SectionHeader title="Без времени" />
              <View style={{ gap: spacing.sm }}>
                {untimedTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={() =>
                      toggleTask.mutate({ id: t.id, done: t.status !== 'done' })
                    }
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
