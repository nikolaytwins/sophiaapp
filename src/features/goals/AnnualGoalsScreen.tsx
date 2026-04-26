import { Ionicons } from '@expo/vector-icons';
import { type Href, Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { createElement, useCallback, useMemo, useState } from 'react';
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

import { AnnualSprintsSection } from '@/features/goals/AnnualSprintsSection';
import {
  GoalsMasonryDashboard,
  type GoalStreamBucket,
  type GoalStreamCard,
} from '@/features/goals/GoalsMasonryDashboard';
import type { AnnualGoalCard, AnnualSphere } from '@/features/goals/annualGoals.types';
import { highlightedSprintSlotId } from '@/features/goals/annualSprints.logic';
import { ImageEmbed } from '@/features/goals/ImageEmbed';
import { GoalImageLightbox } from '@/features/goals/GoalImageLightbox';
import {
  GOALS_ACCENT,
  GOALS_ACCENT_SOFT,
  GOALS_BORDER,
} from '@/features/goals/goalsNotionTheme';
import { pickGoalCoverImageUri } from '@/features/goals/pickGoalImage';
import { localDateKey } from '@/features/habits/habitLogic';
import { useSprintStore } from '@/stores/sprint.store';
import { useSupabaseConfigured } from '@/config/env';
import { useAnnualGoalsStore } from '@/stores/annualGoals.store';
import { useAppTheme } from '@/theme';

const SPHERE_ORDER: AnnualSphere[] = ['relationships', 'energy', 'work'];
const SPHERE_TITLE: Record<AnnualSphere, string> = {
  relationships: 'Отношения',
  energy: 'Энергия',
  work: 'Работа',
};
type GoalsViewFilter = 'all' | 'near' | 'year' | 'horizon';

type GoalDraft = {
  title: string;
  problematica: string;
  url: string;
  localUri: string | null;
  savedRub: string;
  targetRub: string;
};

const emptyDraft = (): GoalDraft => ({ title: '', problematica: '', url: '', localUri: null, savedRub: '', targetRub: '' });

export function AnnualGoalsScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const supabaseOn = useSupabaseConfigured;
  const doc = useAnnualGoalsStore((s) => s.doc);
  const sprintSlots = useAnnualGoalsStore((s) => s.doc.sprintSlots);
  const queuedBySprintSlot = useAnnualGoalsStore((s) => s.doc.queuedBySprintSlot);
  const sprints = useSprintStore((s) => s.sprints);

  const addCard = useAnnualGoalsStore((s) => s.addCard);
  const updateCard = useAnnualGoalsStore((s) => s.updateCard);
  const removeCard = useAnnualGoalsStore((s) => s.removeCard);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [modalImagePreviewUri, setModalImagePreviewUri] = useState<string | null>(null);
  const [goalModalMode, setGoalModalMode] = useState<'add' | 'edit'>('add');
  const [modalSphere, setModalSphere] = useState<AnnualSphere>('relationships');
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(emptyDraft());
  const [viewFilter, setViewFilter] = useState<GoalsViewFilter>('all');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [showSprintManager, setShowSprintManager] = useState(false);

  const openAddGoal = useCallback((sphere: AnnualSphere) => {
    setModalSphere(sphere);
    setGoalModalMode('add');
    setGoalDraft(emptyDraft());
    setGoalModalOpen(true);
  }, []);

  const openEditGoal = useCallback((sphere: AnnualSphere, c: AnnualGoalCard) => {
    setModalSphere(sphere);
    setGoalModalMode('edit');
    setGoalDraft({
      title: c.title,
      problematica: c.problematica ?? '',
      url: c.imageUri?.startsWith('http') ? c.imageUri : '',
      localUri: c.imageUri && !c.imageUri.startsWith('http') ? c.imageUri : null,
      savedRub: c.savedRub != null && c.savedRub > 0 ? String(Math.round(c.savedRub)) : '',
      targetRub: c.targetRub != null && c.targetRub > 0 ? String(Math.round(c.targetRub)) : '',
    });
    setGoalModalOpen(true);
  }, []);

  const closeGoalModal = () => {
    setModalImagePreviewUri(null);
    setGoalModalOpen(false);
  };

  const pickImageForModal = async () => {
    const uri = await pickGoalCoverImageUri();
    if (uri) {
      setGoalDraft((d) => {
        if (d.localUri?.startsWith('blob:')) URL.revokeObjectURL(d.localUri);
        return { ...d, localUri: uri, url: '' };
      });
    }
  };

  const submitGoalModal = () => {
    const imageUri = goalDraft.url.trim() || goalDraft.localUri || undefined;
    if (goalModalMode === 'add') {
      const r = addCard(modalSphere, {
        title: goalDraft.title,
        problematica: goalDraft.problematica,
        imageUri: imageUri ?? null,
      });
      if (!r.ok) {
        Alert.alert('Цель', r.error);
        return;
      }
    } else {
      const existing = useAnnualGoalsStore.getState().doc.spheres[modalSphere].cards[0];
      if (!existing) {
        Alert.alert('Цель', 'Карточка не найдена.');
        return;
      }
      const parseRub = (s: string) => {
        const t = String(s).trim();
        if (!t) return 0;
        const n = Number(t.replace(/\s/g, '').replace(',', '.'));
        return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
      };
      updateCard(modalSphere, existing.id, {
        title: goalDraft.title.trim(),
        problematica: goalDraft.problematica.trim(),
        imageUri: imageUri ?? null,
        savedRub: parseRub(goalDraft.savedRub),
        targetRub: parseRub(goalDraft.targetRub),
      });
    }
    closeGoalModal();
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const today = localDateKey();
  const activeSprint = useMemo(() => sprints.find((x) => x.status === 'active') ?? null, [sprints]);
  const nearSlotId = useMemo(
    () => highlightedSprintSlotId(sprintSlots, activeSprint, today) ?? 1,
    [activeSprint, sprintSlots, today]
  );

  const parseImages = useCallback((imageUri: string | null | undefined): string[] => {
    if (!imageUri) return [];
    return imageUri
      .split(/[\n,;]+/g)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6);
  }, []);

  const yearCards = useMemo((): GoalStreamCard[] => {
    const out: GoalStreamCard[] = [];
    for (const sphere of SPHERE_ORDER) {
      const card = doc.spheres[sphere].cards[0];
      if (!card) continue;
      const target = Math.max(0, card.targetRub ?? 0);
      const saved = Math.max(0, card.savedRub ?? 0);
      out.push({
        id: `year-${sphere}-${card.id}`,
        title: card.title,
        subtitle: `${SPHERE_TITLE[sphere]}${card.problematica ? ` · ${card.problematica}` : ''}`,
        bucket: 'year',
        imageUris: parseImages(card.imageUri),
        progress01: target > 0 ? Math.min(1, saved / target) : undefined,
        progressLabel:
          target > 0
            ? `${saved.toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} ₽ / ${target.toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} ₽`
            : undefined,
        onEdit: () => openEditGoal(sphere, card),
        onPress: () => setModalImagePreviewUri(parseImages(card.imageUri)[0] ?? null),
      });
    }
    return out;
  }, [doc, openEditGoal, parseImages]);

  const horizonCards = useMemo((): GoalStreamCard[] => {
    return doc.generalGoals.map((g) => {
      const target = Math.max(0, g.targetRub ?? 0);
      const saved = Math.max(0, g.savedRub ?? 0);
      return {
        id: `horizon-${g.id}`,
        title: g.title,
        subtitle: g.problematica ?? undefined,
        bucket: 'horizon',
        imageUris: parseImages(g.imageUri),
        progress01: target > 0 ? Math.min(1, saved / target) : undefined,
        progressLabel:
          target > 0
            ? `${saved.toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} ₽ / ${target.toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} ₽`
            : undefined,
        checked: checks[`horizon-${g.id}`] ?? false,
      };
    });
  }, [checks, doc.generalGoals, parseImages]);

  const nearCards = useMemo((): GoalStreamCard[] => {
    const key = String(nearSlotId) as '1' | '2' | '3' | '4';
    const rows = queuedBySprintSlot[key] ?? [];
    return rows.map((q) => ({
      id: `near-${q.id}`,
      title: q.title,
      subtitle: q.problematica ?? `Спринт ${nearSlotId}`,
      bucket: 'near',
      imageUris: [],
      checked: checks[`near-${q.id}`] ?? false,
    }));
  }, [checks, nearSlotId, queuedBySprintSlot]);

  const mixedCards = useMemo(() => {
    const max = Math.max(nearCards.length, yearCards.length, horizonCards.length);
    const out: GoalStreamCard[] = [];
    for (let i = 0; i < max; i++) {
      if (nearCards[i]) out.push(nearCards[i]!);
      if (yearCards[i]) out.push(yearCards[i]!);
      if (horizonCards[i]) out.push(horizonCards[i]!);
    }
    return out;
  }, [horizonCards, nearCards, yearCards]);

  const visibleCards = useMemo(() => {
    if (viewFilter === 'near') return nearCards;
    if (viewFilter === 'year') return yearCards;
    if (viewFilter === 'horizon') return horizonCards;
    return mixedCards;
  }, [horizonCards, mixedCards, nearCards, viewFilter, yearCards]);

  const toggleCheck = useCallback((id: string) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.xs,
          paddingHorizontal: spacing.xl + 4,
          /** Запас под плавающий таббар, иначе нижние кнопки (напр. «Общая цель») не кликаются. */
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {supabaseOn ? (
          <Link href={'/profile?tab=settings' as Href} asChild>
            <Pressable
              style={{
                marginBottom: spacing.lg,
                alignSelf: 'flex-start',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: GOALS_BORDER,
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              <Text style={{ color: GOALS_ACCENT_SOFT, fontSize: 13, fontWeight: '600' }}>
                Настройки — войдите, чтобы данные жили на аккаунте
              </Text>
            </Pressable>
          </Link>
        ) : (
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.35)', marginBottom: spacing.lg }]}>
            Локально на устройстве. Подключите Supabase в .env для синхронизации по почте.
          </Text>
        )}

        <View style={{ marginBottom: spacing.md }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: 'rgba(226,232,240,0.8)', letterSpacing: 1.1 }}>
            ВИЗУАЛЬНЫЙ ПОТОК
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginTop: 6 }}>
            Bento goals dashboard
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 19 }}>
            Фото доминируют в карточках, а в «Все цели» лента смешивает ближайшие, годовые и долгосрочные планы.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {([
              { id: 'all' as const, label: 'Все цели' },
              { id: 'near' as const, label: 'Ближайшие' },
              { id: 'year' as const, label: 'Год' },
              { id: 'horizon' as const, label: 'Горизонт' },
            ] as const).map((f) => {
              const on = viewFilter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setViewFilter(f.id)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: on ? 'rgba(226,232,240,0.45)' : GOALS_BORDER,
                    backgroundColor: on ? 'rgba(148,163,184,0.2)' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <Text style={{ fontWeight: '800', fontSize: 13, color: on ? '#F8FAFC' : colors.textMuted }}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: 14 }}>
            <GoalsMasonryDashboard cards={visibleCards} onToggleCheck={toggleCheck} />
          </View>
        </View>

        <View style={{ marginBottom: 12, flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {SPHERE_ORDER.map((sphere) => (
            <Pressable
              key={sphere}
              onPress={() => openAddGoal(sphere)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: GOALS_BORDER,
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>
                + {SPHERE_TITLE[sphere]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => setShowSprintManager((v) => !v)}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: GOALS_BORDER,
            backgroundColor: 'rgba(255,255,255,0.03)',
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '800', color: colors.text }}>
            {showSprintManager ? 'Скрыть менеджер спринтов' : 'Показать менеджер спринтов'}
          </Text>
          <Ionicons name={showSprintManager ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </Pressable>
        {showSprintManager ? <AnnualSprintsSection /> : null}
      </ScrollView>

      <Modal visible={goalModalOpen} animationType="slide" transparent onRequestClose={closeGoalModal}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={closeGoalModal} />
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
              maxHeight: '88%',
            }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 }}>
              {goalModalMode === 'add' ? 'Новая годовая цель' : 'Редактировать цель'}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Название</Text>
              <TextInput
                value={goalDraft.title}
                onChangeText={(t) => setGoalDraft((d) => ({ ...d, title: t }))}
                placeholder="Заголовок цели"
                placeholderTextColor="rgba(255,255,255,0.28)"
                style={{
                  borderWidth: 1,
                  borderColor: GOALS_BORDER,
                  borderRadius: 12,
                  padding: 14,
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: '600',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Отложено / цель, ₽</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TextInput
                  value={goalDraft.savedRub}
                  onChangeText={(t) => setGoalDraft((d) => ({ ...d, savedRub: t }))}
                  placeholder="Отложено"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  keyboardType="number-pad"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: GOALS_BORDER,
                    borderRadius: 12,
                    padding: 12,
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: '700',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                  }}
                />
                <TextInput
                  value={goalDraft.targetRub}
                  onChangeText={(t) => setGoalDraft((d) => ({ ...d, targetRub: t }))}
                  placeholder="Цель"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  keyboardType="number-pad"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: GOALS_BORDER,
                    borderRadius: 12,
                    padding: 12,
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: '700',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                  }}
                />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Проблематика</Text>
              <TextInput
                multiline
                value={goalDraft.problematica}
                onChangeText={(t) => setGoalDraft((d) => ({ ...d, problematica: t }))}
                placeholder="Почему это важно, какой контекст"
                placeholderTextColor="rgba(255,255,255,0.28)"
                style={{
                  minHeight: 88,
                  textAlignVertical: 'top',
                  borderWidth: 1,
                  borderColor: GOALS_BORDER,
                  borderRadius: 12,
                  padding: 14,
                  color: colors.text,
                  fontSize: 15,
                  lineHeight: 22,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>Обложка</Text>
              {Platform.OS === 'web'
                ? createElement(
                    'div',
                    {
                      style: {
                        border: '1px dashed rgba(255,255,255,0.22)',
                        borderRadius: 12,
                        padding: '10px 12px',
                        marginBottom: 10,
                        color: 'rgba(255,255,255,0.48)',
                        fontSize: 13,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                      },
                      onDragOver: (e: DragEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                      },
                      onDrop: (e: DragEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const f = e.dataTransfer?.files?.[0];
                        if (f?.type?.startsWith('image/')) {
                          const uri = URL.createObjectURL(f);
                          setGoalDraft((d) => {
                            if (d.localUri?.startsWith('blob:')) URL.revokeObjectURL(d.localUri);
                            return { ...d, localUri: uri, url: '' };
                          });
                        }
                      },
                    },
                    'Перетащите изображение сюда или выберите в галерее'
                  )
                : null}
              {(goalDraft.url.trim() || goalDraft.localUri) ? (
                <Pressable onPress={() => setModalImagePreviewUri(goalDraft.url.trim() || goalDraft.localUri || null)}>
                  <ImageEmbed
                    uri={goalDraft.url.trim() || goalDraft.localUri}
                    height={132}
                    alignLeft
                    placeholder={<Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13 }}>Без изображения</Text>}
                  />
                </Pressable>
              ) : (
                <ImageEmbed
                  uri={null}
                  height={132}
                  alignLeft
                  placeholder={<Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13 }}>Без изображения</Text>}
                />
              )}
              <GoalImageLightbox
                uri={modalImagePreviewUri}
                visible={modalImagePreviewUri != null}
                onClose={() => setModalImagePreviewUri(null)}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, marginBottom: 8 }}>
                <Pressable
                  onPress={() => void pickImageForModal()}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(192,132,252,0.35)',
                    backgroundColor: 'rgba(168,85,247,0.08)',
                  }}
                >
                  <Text style={{ color: GOALS_ACCENT_SOFT, fontWeight: '700', fontSize: 14 }}>Галерея</Text>
                </Pressable>
              </View>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.38)', marginBottom: 6 }]}>Ссылка на изображение (лучше для синхронизации)</Text>
              <TextInput
                value={goalDraft.url}
                onChangeText={(t) =>
                  setGoalDraft((d) => {
                    if (t.trim() && d.localUri?.startsWith('blob:')) URL.revokeObjectURL(d.localUri);
                    return { ...d, url: t, localUri: t.trim() ? null : d.localUri };
                  })
                }
                placeholder="https://…"
                placeholderTextColor="rgba(255,255,255,0.28)"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  borderWidth: 1,
                  borderColor: GOALS_BORDER,
                  borderRadius: 12,
                  padding: 12,
                  color: colors.text,
                  fontSize: 14,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  marginBottom: 20,
                }}
              />

              <Pressable
                onPress={submitGoalModal}
                disabled={!goalDraft.title.trim()}
                style={({ pressed }) => ({
                  paddingVertical: 15,
                  borderRadius: 14,
                  backgroundColor:
                    !goalDraft.title.trim() ? 'rgba(168,85,247,0.35)' : pressed ? 'rgba(168,85,247,0.85)' : GOALS_ACCENT,
                  alignItems: 'center',
                  marginBottom: 8,
                })}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 }}>
                  {goalModalMode === 'add' ? 'Сохранить' : 'Сохранить изменения'}
                </Text>
              </Pressable>
              <Pressable onPress={closeGoalModal} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 15 }}>Отмена</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
