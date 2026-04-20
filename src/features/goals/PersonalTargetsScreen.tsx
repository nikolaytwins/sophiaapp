import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { NikolayDayMoneyHeroCards, pickNikolayMoneyProgressGoals } from '@/features/accounts/nikolayHabitsUi';
import { pickVisionBoardImageUris } from '@/features/goals/pickGoalImage';
import { strategyPageConfig, type StrategyGoalsTabDef } from '@/features/strategy/strategy.config';
import { getSupabase } from '@/lib/supabase';
import { ensureSideGoalsHydrated, type SideGoalPersisted, useSideGoalsStore } from '@/stores/sideGoals.store';
import { useSprintStore } from '@/stores/sprint.store';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

function fmtRub(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}

function parseAmount(raw: string): number {
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function formatSideProgressLine(g: SideGoalPersisted): string {
  const { current, target } = g;
  if (target <= 1) return current >= target ? 'Выполнено' : 'В работе';
  if (target >= 100_000) return `${fmtRub(current)} из ${fmtRub(target)} ₽`;
  return `${current} из ${target}`;
}

const VISION_PHOTO_SIZE = 124;
const VISION_PHOTO_GAP = 10;

function SideGoalProgressCard({
  goal,
  onEdit,
}: {
  goal: SideGoalPersisted;
  onEdit: () => void;
}) {
  const { typography, spacing, colors } = useAppTheme();
  const pct = Math.min(1, Math.max(0, goal.target > 0 ? goal.current / goal.target : 0));
  const photos = goal.photoUris ?? [];

  return (
    <LinearGradient
      colors={['rgba(232,121,249,0.55)', 'rgba(139,92,246,0.35)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 22, padding: 2 }}
    >
      <View
        style={{
          borderRadius: 20,
          backgroundColor: '#0E0E12',
          paddingBottom: spacing.lg,
          overflow: 'hidden',
        }}
      >
        {photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: 'row',
              alignItems: 'stretch',
              paddingHorizontal: spacing.md,
              paddingTop: spacing.md,
              paddingBottom: 4,
              gap: VISION_PHOTO_GAP,
            }}
          >
            {photos.map((uri, i) => (
              <View
                key={`${uri}-${i}`}
                style={{
                  width: VISION_PHOTO_SIZE,
                  height: VISION_PHOTO_SIZE * 0.92,
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.14)',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                }}
              >
                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View
            style={{
              marginHorizontal: spacing.md,
              marginTop: spacing.md,
              paddingVertical: 18,
              paddingHorizontal: spacing.md,
              borderRadius: 16,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: 'rgba(255,255,255,0.14)',
              backgroundColor: 'rgba(255,255,255,0.03)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="images-outline" size={22} color="rgba(250,232,255,0.38)" />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: 'rgba(250,232,255,0.42)', lineHeight: 18 }}>
              Добавь фото в редактировании — доска без лимита по количеству.
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: spacing.lg + 2, paddingTop: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              {goal.isHorizon ? (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    paddingVertical: 3,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    backgroundColor: 'rgba(251,191,36,0.14)',
                    borderWidth: 1,
                    borderColor: 'rgba(251,191,36,0.35)',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: 'rgba(253,224,71,0.95)' }}>
                    ГОРИЗОНТ
                  </Text>
                </View>
              ) : null}
              <Text style={[typography.title2, { fontSize: 17, fontWeight: '800', color: colors.text }]}>{goal.title}</Text>
            </View>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                onEdit();
              }}
              accessibilityLabel="Редактировать цель"
              hitSlop={10}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? 'rgba(232,121,249,0.2)' : 'rgba(255,255,255,0.07)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
              })}
            >
              <Ionicons name="create-outline" size={22} color="#E879F9" />
            </Pressable>
          </View>

          <Text
            style={{
              marginTop: 10,
              fontSize: 14,
              fontWeight: '700',
              color: 'rgba(250,232,255,0.72)',
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatSideProgressLine(goal)}
          </Text>

          <View
            style={{
              marginTop: 14,
              height: 16,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['#E879F9', '#A855F7']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: `${Math.round(pct * 1000) / 10}%`, height: '100%', borderRadius: 999 }}
            />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

function subsectionHeadingStyle() {
  return {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: 'rgba(251,191,36,0.75)',
    marginBottom: 10,
    marginTop: 4,
  };
}

function SideGoalsEditorBlock({ config }: { config: StrategyGoalsTabDef }) {
  const { typography, spacing, colors } = useAppTheme();
  const goals = useSideGoalsStore((s) => s.goals);
  const addSideGoal = useSideGoalsStore((s) => s.addSideGoal);
  const updateSideGoal = useSideGoalsStore((s) => s.updateSideGoal);
  const appendSideGoalPhotos = useSideGoalsStore((s) => s.appendSideGoalPhotos);
  const removeSideGoalPhotoAt = useSideGoalsStore((s) => s.removeSideGoalPhotoAt);

  const nearGoals = useMemo(() => goals.filter((g) => !g.isHorizon), [goals]);
  const horizonGoals = useMemo(() => goals.filter((g) => g.isHorizon), [goals]);

  const [editId, setEditId] = useState<string | null>(null);
  const editing = editId ? goals.find((g) => g.id === editId) : null;
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCurrent, setDraftCurrent] = useState('');
  const [draftTarget, setDraftTarget] = useState('');
  const [draftHorizon, setDraftHorizon] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (!editId) return;
    const g = useSideGoalsStore.getState().goals.find((x) => x.id === editId);
    if (!g) {
      setEditId(null);
      return;
    }
    setDraftTitle(g.title);
    setDraftCurrent(String(g.current));
    setDraftTarget(String(g.target));
    setDraftHorizon(g.isHorizon);
  }, [editId]);

  const closeModal = useCallback(() => setEditId(null), []);

  const save = useCallback(() => {
    if (!editId) return;
    const t = Math.max(1, parseAmount(draftTarget));
    const c = Math.max(0, parseAmount(draftCurrent));
    updateSideGoal(editId, {
      title: draftTitle.trim(),
      target: t,
      current: Math.min(c, t),
      isHorizon: draftHorizon,
    });
    setEditId(null);
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [draftCurrent, draftHorizon, draftTarget, draftTitle, editId, updateSideGoal]);

  const addPhotos = useCallback(async () => {
    if (!editId) return;
    setPhotoBusy(true);
    try {
      const uris = await pickVisionBoardImageUris();
      if (uris.length > 0) {
        appendSideGoalPhotos(editId, uris);
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } finally {
      setPhotoBusy(false);
    }
  }, [appendSideGoalPhotos, editId]);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: 6 }}>
        <Text
          style={{
            fontSize: 11,
            lineHeight: 15,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: 'rgba(247,244,250,0.55)',
          }}
        >
          {config.sideSectionTitle}
        </Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: 'rgba(247,244,250,0.45)', fontWeight: '600' }}>
          Фотографий сколько угодно. Галочка «На горизонте» переносит цель в блок «Горизонт».
        </Text>
      </View>

      <Text style={subsectionHeadingStyle()}>{config.boardNearSubheading}</Text>
      <View style={{ gap: spacing.lg }}>
        {nearGoals.map((g) => (
          <SideGoalProgressCard key={g.id} goal={g} onEdit={() => setEditId(g.id)} />
        ))}
      </View>

      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const id = addSideGoal();
          setEditId(id);
        }}
        accessibilityRole="button"
        accessibilityLabel="Добавить новую цель"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginTop: spacing.sm,
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(232,121,249,0.45)',
          backgroundColor: pressed ? 'rgba(232,121,249,0.16)' : 'rgba(232,121,249,0.08)',
        })}
      >
        <Ionicons name="add-circle-outline" size={22} color="#F0ABFC" />
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#F5D0FE' }}>Добавить цель</Text>
      </Pressable>

      <Text style={[subsectionHeadingStyle(), { marginTop: spacing.md }]}>{config.boardHorizonSubheading}</Text>
      {horizonGoals.length > 0 ? (
        <View style={{ gap: spacing.lg }}>
          {horizonGoals.map((g) => (
            <SideGoalProgressCard key={g.id} goal={g} onEdit={() => setEditId(g.id)} />
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: 13, lineHeight: 19, color: 'rgba(247,244,250,0.38)', fontWeight: '600' }}>
          Пока пусто — открой карточку и включи «На горизонте».
        </Text>
      )}

      <Modal visible={Boolean(editing)} animationType="fade" transparent onRequestClose={closeModal}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: spacing.lg }}
          onPress={closeModal}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderRadius: 20,
              padding: spacing.lg,
              backgroundColor: '#141418',
              borderWidth: 1,
              borderColor: 'rgba(139,92,246,0.45)',
              maxHeight: '88%',
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[typography.title2, { marginBottom: spacing.md, color: colors.text }]}>Цель</Text>

              <Pressable
                onPress={() => {
                  setDraftHorizon((v) => !v);
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: spacing.md,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: draftHorizon ? 'rgba(251,191,36,0.45)' : 'rgba(255,255,255,0.12)',
                  backgroundColor: draftHorizon ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <Ionicons
                  name={draftHorizon ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={draftHorizon ? 'rgba(253,224,71,0.95)' : 'rgba(255,255,255,0.45)'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>На горизонте</Text>
                  <Text style={{ fontSize: 12, marginTop: 3, color: colors.textMuted, lineHeight: 16 }}>
                    Цель дальнего горизонта — показывается в блоке «Горизонт», не в ближайших.
                  </Text>
                </View>
              </Pressable>

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>Фото</Text>
              <Pressable
                disabled={photoBusy || !editId}
                onPress={() => void addPhotos()}
                style={{
                  marginBottom: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(232,121,249,0.4)',
                  backgroundColor: 'rgba(232,121,249,0.1)',
                  opacity: photoBusy ? 0.55 : 1,
                }}
              >
                <Text style={{ fontWeight: '800', color: '#F0ABFC', textAlign: 'center' }}>
                  {photoBusy ? 'Галерея…' : 'Добавить фотографии'}
                </Text>
              </Pressable>

              {editing && editing.photoUris.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                  {editing.photoUris.map((uri, i) => (
                    <View key={`${uri}-${i}`} style={{ position: 'relative' }}>
                      <Image
                        source={{ uri }}
                        style={{ width: 76, height: 76, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
                        contentFit="cover"
                      />
                      <Pressable
                        onPress={() => {
                          if (editId) removeSideGoalPhotoAt(editId, i);
                          if (Platform.OS !== 'web') void Haptics.selectionAsync();
                        }}
                        hitSlop={8}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(0,0,0,0.65)',
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.2)',
                        }}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>Название</Text>
              <TextInput
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Название"
                placeholderTextColor="rgba(255,255,255,0.28)"
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  color: colors.text,
                  fontSize: 16,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>Цель (число)</Text>
              <TextInput
                value={draftTarget}
                onChangeText={setDraftTarget}
                keyboardType="numeric"
                placeholder="1000"
                placeholderTextColor="rgba(255,255,255,0.28)"
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  color: colors.text,
                  fontSize: 16,
                  marginBottom: 16,
                  fontVariant: ['tabular-nums'],
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>Сейчас</Text>
              <TextInput
                value={draftCurrent}
                onChangeText={setDraftCurrent}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.28)"
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  color: colors.text,
                  fontSize: 16,
                  marginBottom: 20,
                  fontVariant: ['tabular-nums'],
                }}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={closeModal}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.14)',
                  }}
                >
                  <Text style={{ fontWeight: '800', color: colors.textMuted }}>Отмена</Text>
                </Pressable>
                <Pressable
                  onPress={save}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#9333EA',
                  }}
                >
                  <Text style={{ fontWeight: '900', color: '#FAFAFC' }}>Сохранить</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Вкладка «Цели»: Китай/подушка + побочные цели с прогрессом (локально). */
export function PersonalTargetsScreen() {
  const { typography, spacing, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState<string | null>(null);
  const activeSprint = useSprintStore((s) => s.sprints.find((x) => x.status === 'active') ?? null);
  const seedFromSeedsIfEmpty = useSideGoalsStore((s) => s.seedFromSeedsIfEmpty);

  const { china, cushion } = useMemo(
    () => pickNikolayMoneyProgressGoals(activeSprint?.goals ?? []),
    [activeSprint]
  );

  const cfg = strategyPageConfig.goalsTab;

  useEffect(() => {
    void (async () => {
      await ensureSideGoalsHydrated();
      seedFromSeedsIfEmpty(strategyPageConfig.goalsTab.sideGoalSeeds);
    })();
  }, [seedFromSeedsIfEmpty]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setEmail(null);
      return undefined;
    }
    void sb.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isNikolay = isNikolayPrimaryAccount(email);

  return (
    <ScreenCanvas>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 12) + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: 120,
          gap: spacing.xl + 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <HeaderProfileAvatar />
        </View>

        {!isNikolay ? (
          <AppSurfaceCard>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Раздел «Цели» персональный. Войди под аккаунтом{' '}
              <Text style={{ color: colors.text }}>nikolaytwins@gmail.com</Text>, чтобы видеть цели и прогресс.
            </Text>
          </AppSurfaceCard>
        ) : (
          <>
            <View style={{ gap: spacing.sm }}>
              <Text style={[typography.title1, { letterSpacing: -0.2 }]}>{cfg.pageTitle}</Text>
              <View style={{ height: 1, backgroundColor: 'rgba(139,92,246,0.35)', borderRadius: 1 }} />
            </View>

            <View style={{ gap: spacing.md }}>
              <Text
                style={{
                  fontSize: 11,
                  lineHeight: 15,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'rgba(247,244,250,0.55)',
                }}
              >
                {cfg.nearestSectionTitle}
              </Text>
              <Text style={[typography.body, { fontSize: 14, lineHeight: 20, color: colors.textMuted }]}>
                {cfg.nearestDeadlineLine}
              </Text>
              <NikolayDayMoneyHeroCards
                sprintId={activeSprint?.id ?? null}
                chinaGoal={china}
                cushionGoal={cushion}
              />
            </View>

            <SideGoalsEditorBlock config={cfg} />
          </>
        )}
      </ScrollView>
    </ScreenCanvas>
  );
}
