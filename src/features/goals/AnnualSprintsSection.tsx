import { Ionicons } from '@expo/vector-icons';
import { type Href, Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  formatSlotDateLabel,
  highlightedSprintSlotId,
  shouldShowSyncedSprintGoals,
} from '@/features/goals/annualSprints.logic';
import type { AnnualGoalCard, AnnualSphere, AnnualSprintSlotId } from '@/features/goals/annualGoals.types';
import {
  GOALS_ACCENT,
  GOALS_ACCENT_SOFT,
  GOALS_BORDER,
} from '@/features/goals/goalsNotionTheme';
import { goalDone, isValidDateKey } from '@/features/sprint/sprint.logic';
import { SPRINT_SPHERE_LABEL, type SprintGoal, type SprintSphere } from '@/features/sprint/sprint.types';
import { localDateKey } from '@/features/habits/habitLogic';
import { useAnnualGoalsStore } from '@/stores/annualGoals.store';
import { useSprintStore } from '@/stores/sprint.store';
import { useAppTheme } from '@/theme';

const SLOT_IDS: AnnualSprintSlotId[] = [1, 2, 3, 4];

const SPHERE_PICK: { key: AnnualSphere; label: string }[] = [
  { key: 'relationships', label: 'Отношения' },
  { key: 'energy', label: 'Энергия' },
  { key: 'work', label: 'Работа' },
];

function SprintGoalRow({ g }: { g: SprintGoal }) {
  const done = goalDone(g);
  const sphere = SPRINT_SPHERE_LABEL[g.sphere];
  const sub =
    g.kind === 'progress' && g.target != null && g.current != null
      ? `${g.current} / ${g.target}`
      : g.kind === 'checkpoint'
        ? done
          ? 'Готово'
          : 'Чекпоинт'
        : '';
  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginBottom: 10,
      }}
    >
      <Text style={{ fontSize: 12, color: GOALS_ACCENT_SOFT, fontWeight: '700', marginBottom: 4 }}>{sphere}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(248,250,252,0.94)' }}>{g.title}</Text>
      {sub ? (
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>{sub}</Text>
      ) : null}
    </View>
  );
}

export function AnnualSprintsSection() {
  const { colors, spacing, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const todayKey = localDateKey();

  const sprintSlots = useAnnualGoalsStore((s) => s.doc.sprintSlots);
  const queuedBySprintSlot = useAnnualGoalsStore((s) => s.doc.queuedBySprintSlot);
  const generalGoals = useAnnualGoalsStore((s) => s.doc.generalGoals);
  const setSprintSlotDates = useAnnualGoalsStore((s) => s.setSprintSlotDates);
  const addQueuedSprintGoal = useAnnualGoalsStore((s) => s.addQueuedSprintGoal);
  const removeQueuedSprintGoal = useAnnualGoalsStore((s) => s.removeQueuedSprintGoal);
  const addGeneralGoal = useAnnualGoalsStore((s) => s.addGeneralGoal);
  const removeGeneralGoal = useAnnualGoalsStore((s) => s.removeGeneralGoal);

  const sprints = useSprintStore((s) => s.sprints);
  const addGoal = useSprintStore((s) => s.addGoal);
  const active = useMemo(() => sprints.find((x) => x.status === 'active') ?? null, [sprints]);

  const highlightId = useMemo(
    () => highlightedSprintSlotId(sprintSlots, active, todayKey),
    [sprintSlots, active, todayKey]
  );

  const [open, setOpen] = useState<Record<AnnualSprintSlotId, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  const [queueModal, setQueueModal] = useState<{ slotId: AnnualSprintSlotId } | null>(null);
  const [queueDraft, setQueueDraft] = useState({ title: '', problematica: '', sphere: null as AnnualSphere | null });
  const [generalModal, setGeneralModal] = useState(false);
  const [generalDraft, setGeneralDraft] = useState({ title: '', problematica: '' });
  const [sprintGoalModal, setSprintGoalModal] = useState<{ slotId: AnnualSprintSlotId } | null>(null);
  const [sprintGoalDraft, setSprintGoalDraft] = useState({ title: '', sphere: 'relationships' as SprintSphere });

  const toggle = useCallback((id: AnnualSprintSlotId) => {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const commitSlotDates = useCallback(
    (slotId: AnnualSprintSlotId, startDraft: string, endDraft: string) => {
      const start = startDraft.trim() || null;
      const end = endDraft.trim() || null;
      if (start && !isValidDateKey(start)) {
        Alert.alert('Дата', 'Начало: формат ГГГГ-ММ-ДД.');
        return;
      }
      if (end && !isValidDateKey(end)) {
        Alert.alert('Дата', 'Конец: формат ГГГГ-ММ-ДД.');
        return;
      }
      if (start && end && end < start) {
        Alert.alert('Дата', 'Конец не может быть раньше начала.');
        return;
      }
      setSprintSlotDates(slotId, { startDate: start, endDate: end });
    },
    [setSprintSlotDates]
  );

  const submitQueue = () => {
    if (!queueModal) return;
    const r = addQueuedSprintGoal(queueModal.slotId, {
      title: queueDraft.title,
      problematica: queueDraft.problematica,
      ...(queueDraft.sphere ? { sphere: queueDraft.sphere } : {}),
    });
    if (!r.ok) {
      Alert.alert('Цель', r.error);
      return;
    }
    setQueueModal(null);
    setQueueDraft({ title: '', problematica: '', sphere: null });
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const submitGeneral = () => {
    const r = addGeneralGoal({ title: generalDraft.title, problematica: generalDraft.problematica });
    if (!r.ok) {
      Alert.alert('Цель', r.error);
      return;
    }
    setGeneralModal(false);
    setGeneralDraft({ title: '', problematica: '' });
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const submitSprintGoal = () => {
    if (!sprintGoalModal || !active) return;
    const r = addGoal(active.id, {
      sphere: sprintGoalDraft.sphere,
      title: sprintGoalDraft.title,
      kind: 'checkpoint',
    });
    if (!r.ok) {
      Alert.alert('Спринт', r.error);
      return;
    }
    setSprintGoalModal(null);
    setSprintGoalDraft({ title: '', sphere: 'relationships' });
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={{ marginTop: 8, marginBottom: 8 }}>
      <Text
        style={{
          fontSize: 26,
          fontWeight: '800',
          letterSpacing: -0.8,
          color: colors.text,
          marginBottom: 6,
        }}
      >
        Спринты
      </Text>
      <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 20 }}>
        Окна дат задают «текущий» спринт (фиолетовая плашка). Цели активного периода совпадают с разделом «Спринт».
      </Text>

      {SLOT_IDS.map((slotId) => {
        const slot = sprintSlots.find((s) => s.id === slotId)!;
        const sk = String(slotId) as '1' | '2' | '3' | '4';
        const queued = queuedBySprintSlot[sk] ?? [];
        const expanded = open[slotId];
        const isHi = highlightId === slotId;
        const dateLabel = formatSlotDateLabel(slot);
        const showLive = shouldShowSyncedSprintGoals(slotId, slot, active, todayKey, highlightId);
        const liveGoals: SprintGoal[] | null =
          showLive && active ? active.goals.slice().sort((a, b) => a.sortOrder - b.sortOrder) : null;

        return (
          <View key={slotId} style={{ marginBottom: 12 }}>
            <Pressable
              onPress={() => toggle(slotId)}
              style={({ pressed }) => ({
                borderRadius: 16,
                borderWidth: 1,
                borderColor: isHi ? 'rgba(168,85,247,0.65)' : 'rgba(255,255,255,0.1)',
                backgroundColor: isHi
                  ? 'rgba(168,85,247,0.14)'
                  : pressed
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(255,255,255,0.04)',
                paddingVertical: 16,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                  Спринт {slotId}
                  {dateLabel ? (
                    <Text style={{ fontWeight: '600', color: 'rgba(255,255,255,0.55)' }}> · {dateLabel}</Text>
                  ) : null}
                </Text>
                {isHi ? (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: GOALS_ACCENT_SOFT, marginTop: 6 }}>
                    Сейчас по дате
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={22}
                color={isHi ? GOALS_ACCENT_SOFT : 'rgba(255,255,255,0.45)'}
              />
            </Pressable>

            {expanded ? (
              <View
                style={{
                  marginTop: 10,
                  paddingHorizontal: 4,
                  paddingBottom: 8,
                }}
              >
                <SlotDateFields
                  startDate={slot.startDate}
                  endDate={slot.endDate}
                  onCommit={(s, e) => commitSlotDates(slotId, s, e)}
                />

                <Link href={'/sprint' as Href} asChild>
                  <Pressable
                    style={{
                      alignSelf: 'flex-start',
                      marginBottom: 14,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(168,85,247,0.35)',
                      backgroundColor: 'rgba(168,85,247,0.08)',
                    }}
                  >
                    <Text style={{ color: GOALS_ACCENT_SOFT, fontWeight: '700', fontSize: 13 }}>
                      Открыть раздел «Спринт» →
                    </Text>
                  </Pressable>
                </Link>

                {showLive && liveGoals ? (
                  <>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                      Цели в приложении (как на вкладке «Спринт»)
                    </Text>
                    {liveGoals.length === 0 ? (
                      <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 12 }}>Пока нет целей.</Text>
                    ) : (
                      liveGoals.map((g) => <SprintGoalRow key={g.id} g={g} />)
                    )}
                    {active ? (
                      <Pressable
                        onPress={() => {
                          setSprintGoalModal({ slotId });
                          setSprintGoalDraft({ title: '', sphere: 'relationships' });
                        }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: GOALS_BORDER,
                          marginBottom: 16,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>+ Цель в текущий спринт</Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : null}

                <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                  {showLive ? 'Запланировано на этот спринт заранее' : 'Очередь на этот спринт'}
                </Text>
                {queued.length === 0 ? (
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Пусто.</Text>
                ) : (
                  queued.map((q) => (
                    <View
                      key={q.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.07)',
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{q.title}</Text>
                        {q.sphere ? (
                          <Text style={{ fontSize: 12, color: GOALS_ACCENT_SOFT, marginTop: 4 }}>
                            {SPHERE_PICK.find((x) => x.key === q.sphere)?.label ?? q.sphere}
                          </Text>
                        ) : null}
                        {q.problematica ? (
                          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>{q.problematica}</Text>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => {
                          Alert.alert('Удалить из очереди?', '', [
                            { text: 'Отмена', style: 'cancel' },
                            {
                              text: 'Удалить',
                              style: 'destructive',
                              onPress: () => removeQueuedSprintGoal(slotId, q.id),
                            },
                          ]);
                        }}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={18} color="rgba(255,120,120,0.55)" />
                      </Pressable>
                    </View>
                  ))
                )}
                <Pressable
                  onPress={() => {
                    setQueueModal({ slotId });
                    setQueueDraft({ title: '', problematica: '', sphere: null });
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.35)',
                    backgroundColor: 'rgba(168,85,247,0.06)',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: GOALS_ACCENT_SOFT, fontWeight: '800', fontSize: 14 }}>+ В очередь на спринт</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      <View style={{ marginTop: 28, marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 }}>Общие цели</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 14 }}>
          Без привязки к спринтам — например, долгий горизонт или контекст года.
        </Text>
        {generalGoals.length === 0 ? (
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Пока нет.</Text>
        ) : (
          generalGoals.map((c: AnnualGoalCard) => (
            <View
              key={c.id}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: GOALS_BORDER,
                marginBottom: 10,
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{c.title}</Text>
                {c.problematica ? (
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 8 }}>{c.problematica}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => {
                  Alert.alert('Удалить цель?', '', [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Удалить', style: 'destructive', onPress: () => removeGeneralGoal(c.id) },
                  ]);
                }}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color="rgba(255,120,120,0.55)" />
              </Pressable>
            </View>
          ))
        )}
        <Pressable
          onPress={() => {
            setGeneralModal(true);
            setGeneralDraft({ title: '', problematica: '' });
          }}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: GOALS_BORDER,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>+ Общая цель</Text>
        </Pressable>
      </View>

      <Modal visible={queueModal != null} animationType="slide" transparent onRequestClose={() => setQueueModal(null)}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={() => setQueueModal(null)} />
          <View
            style={{
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              backgroundColor: '#121218',
              borderTopWidth: 1,
              borderColor: GOALS_BORDER,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 }}>
              В очередь на спринт {queueModal?.slotId}
            </Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.45)', marginBottom: 6 }]}>Название</Text>
            <TextInput
              value={queueDraft.title}
              onChangeText={(t) => setQueueDraft((d) => ({ ...d, title: t }))}
              placeholder="Цель"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={{
                borderWidth: 1,
                borderColor: GOALS_BORDER,
                borderRadius: 12,
                padding: 14,
                color: colors.text,
                fontSize: 16,
                marginBottom: 14,
              }}
            />
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.45)', marginBottom: 8 }]}>Сфера (опционально)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {SPHERE_PICK.map(({ key, label }) => {
                const on = queueDraft.sphere === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setQueueDraft((d) => ({ ...d, sphere: on ? null : key }))}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: on ? 'rgba(168,85,247,0.55)' : GOALS_BORDER,
                      backgroundColor: on ? 'rgba(168,85,247,0.12)' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: on ? GOALS_ACCENT_SOFT : colors.textMuted }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.45)', marginBottom: 6 }]}>Контекст</Text>
            <TextInput
              multiline
              value={queueDraft.problematica}
              onChangeText={(t) => setQueueDraft((d) => ({ ...d, problematica: t }))}
              placeholder="Зачем эта цель в этом спринте"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={{
                minHeight: 80,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: GOALS_BORDER,
                borderRadius: 12,
                padding: 14,
                color: colors.text,
                fontSize: 15,
                marginBottom: 18,
              }}
            />
            <Pressable
              onPress={submitQueue}
              disabled={!queueDraft.title.trim()}
              style={{
                paddingVertical: 15,
                borderRadius: 14,
                backgroundColor: !queueDraft.title.trim() ? 'rgba(168,85,247,0.35)' : GOALS_ACCENT,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Сохранить</Text>
            </Pressable>
            <Pressable onPress={() => setQueueModal(null)} style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Отмена</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={generalModal} animationType="slide" transparent onRequestClose={() => setGeneralModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={() => setGeneralModal(false)} />
          <View
            style={{
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              backgroundColor: '#121218',
              borderTopWidth: 1,
              borderColor: GOALS_BORDER,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 }}>Общая цель</Text>
            <TextInput
              value={generalDraft.title}
              onChangeText={(t) => setGeneralDraft((d) => ({ ...d, title: t }))}
              placeholder="Название"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={{
                borderWidth: 1,
                borderColor: GOALS_BORDER,
                borderRadius: 12,
                padding: 14,
                color: colors.text,
                fontSize: 16,
                marginBottom: 14,
              }}
            />
            <TextInput
              multiline
              value={generalDraft.problematica}
              onChangeText={(t) => setGeneralDraft((d) => ({ ...d, problematica: t }))}
              placeholder="Контекст (опционально)"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={{
                minHeight: 80,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: GOALS_BORDER,
                borderRadius: 12,
                padding: 14,
                color: colors.text,
                fontSize: 15,
                marginBottom: 18,
              }}
            />
            <Pressable
              onPress={submitGeneral}
              disabled={!generalDraft.title.trim()}
              style={{
                paddingVertical: 15,
                borderRadius: 14,
                backgroundColor: !generalDraft.title.trim() ? 'rgba(168,85,247,0.35)' : GOALS_ACCENT,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Сохранить</Text>
            </Pressable>
            <Pressable onPress={() => setGeneralModal(false)} style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Отмена</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={sprintGoalModal != null} animationType="slide" transparent onRequestClose={() => setSprintGoalModal(null)}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={() => setSprintGoalModal(null)} />
          <View
            style={{
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              backgroundColor: '#121218',
              borderTopWidth: 1,
              borderColor: GOALS_BORDER,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 }}>Цель в спринте</Text>
            <TextInput
              value={sprintGoalDraft.title}
              onChangeText={(t) => setSprintGoalDraft((d) => ({ ...d, title: t }))}
              placeholder="Название"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={{
                borderWidth: 1,
                borderColor: GOALS_BORDER,
                borderRadius: 12,
                padding: 14,
                color: colors.text,
                fontSize: 16,
                marginBottom: 14,
              }}
            />
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.45)', marginBottom: 8 }]}>Сфера</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {(['relationships', 'energy', 'work'] as const).map((k) => {
                const on = sprintGoalDraft.sphere === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setSprintGoalDraft((d) => ({ ...d, sphere: k }))}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: on ? 'rgba(168,85,247,0.55)' : GOALS_BORDER,
                      backgroundColor: on ? 'rgba(168,85,247,0.12)' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: on ? GOALS_ACCENT_SOFT : colors.textMuted }}>
                      {SPRINT_SPHERE_LABEL[k]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={submitSprintGoal}
              disabled={!sprintGoalDraft.title.trim() || !active}
              style={{
                paddingVertical: 15,
                borderRadius: 14,
                backgroundColor: !sprintGoalDraft.title.trim() ? 'rgba(168,85,247,0.35)' : GOALS_ACCENT,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Добавить в спринт</Text>
            </Pressable>
            <Pressable onPress={() => setSprintGoalModal(null)} style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Отмена</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SlotDateFields({
  startDate,
  endDate,
  onCommit,
}: {
  startDate: string | null;
  endDate: string | null;
  onCommit: (start: string, end: string) => void;
}) {
  const [startDraft, setStartDraft] = useState(startDate ?? '');
  const [endDraft, setEndDraft] = useState(endDate ?? '');

  useEffect(() => {
    setStartDraft(startDate ?? '');
    setEndDraft(endDate ?? '');
  }, [startDate, endDate]);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
        Окно спринта (ГГГГ-ММ-ДД)
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <TextInput
          value={startDraft}
          onChangeText={setStartDraft}
          onBlur={() => onCommit(startDraft, endDraft)}
          placeholder="Начало"
          placeholderTextColor="rgba(255,255,255,0.28)"
          autoCapitalize="none"
          style={{
            flex: 1,
            minWidth: 120,
            borderWidth: 1,
            borderColor: GOALS_BORDER,
            borderRadius: 12,
            padding: 12,
            color: 'rgba(248,250,252,0.94)',
            fontSize: 14,
          }}
        />
        <TextInput
          value={endDraft}
          onChangeText={setEndDraft}
          onBlur={() => onCommit(startDraft, endDraft)}
          placeholder="Конец"
          placeholderTextColor="rgba(255,255,255,0.28)"
          autoCapitalize="none"
          style={{
            flex: 1,
            minWidth: 120,
            borderWidth: 1,
            borderColor: GOALS_BORDER,
            borderRadius: 12,
            padding: 12,
            color: 'rgba(248,250,252,0.94)',
            fontSize: 14,
          }}
        />
      </View>
    </View>
  );
}
