import { type Href, Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { createElement, useCallback, useState } from 'react';
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

import { AnnualGoalsSphereSection } from '@/features/goals/AnnualGoalsSphereSection';
import { AnnualSprintsSection } from '@/features/goals/AnnualSprintsSection';
import type { AnnualGoalCard, AnnualSphere } from '@/features/goals/annualGoals.types';
import { ImageEmbed } from '@/features/goals/ImageEmbed';
import { GoalImageLightbox } from '@/features/goals/GoalImageLightbox';
import {
  GOALS_ACCENT,
  GOALS_ACCENT_SOFT,
  GOALS_BORDER,
} from '@/features/goals/goalsNotionTheme';
import { pickGoalCoverImageUri } from '@/features/goals/pickGoalImage';
import { useSupabaseConfigured } from '@/config/env';
import { useAnnualGoalsStore } from '@/stores/annualGoals.store';
import { useAppTheme } from '@/theme';

const SPHERE_ORDER: AnnualSphere[] = ['relationships', 'energy', 'work'];

type GoalDraft = { title: string; problematica: string; url: string; localUri: string | null };

const emptyDraft = (): GoalDraft => ({ title: '', problematica: '', url: '', localUri: null });

export function AnnualGoalsScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const supabaseOn = useSupabaseConfigured;

  const addCard = useAnnualGoalsStore((s) => s.addCard);
  const updateCard = useAnnualGoalsStore((s) => s.updateCard);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [modalImagePreviewUri, setModalImagePreviewUri] = useState<string | null>(null);
  const [goalModalMode, setGoalModalMode] = useState<'add' | 'edit'>('add');
  const [modalSphere, setModalSphere] = useState<AnnualSphere>('relationships');
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(emptyDraft());

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
      updateCard(modalSphere, existing.id, {
        title: goalDraft.title.trim(),
        problematica: goalDraft.problematica.trim(),
        imageUri: imageUri ?? null,
      });
    }
    closeGoalModal();
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

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

        {SPHERE_ORDER.map((sphere) => (
          <AnnualGoalsSphereSection
            key={sphere}
            sphere={sphere}
            onOpenAddGoal={openAddGoal}
            onOpenEditGoal={openEditGoal}
          />
        ))}

        <AnnualSprintsSection />
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
