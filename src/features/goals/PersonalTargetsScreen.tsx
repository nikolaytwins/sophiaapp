import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type Href, Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { GoalsNavigatorBento, nearestCutoffForAugust } from '@/features/goals/GoalsNavigatorBento';
import { PersonalGoalsMasonryGrid } from '@/features/goals/PersonalGoalsMasonry';
import { GOALS_ACCENT } from '@/features/goals/goalsNotionTheme';
import { normalizeDateKey, sideGoalDatedOutsideYear, sideGoalInCalendarYear, type SideGoalBoardTab } from '@/features/goals/sideGoals.logic';
import { strategyPageConfig, type StrategyGoalsTabDef } from '@/features/strategy/strategy.config';
import { getSupabase } from '@/lib/supabase';
import { uploadSideGoalPhotoToSupabase } from '@/services/sideGoalsPhotoUpload';
import { ensureSideGoalsHydrated, type SideGoalDateMode, type SideGoalPersisted, useSideGoalsStore } from '@/stores/sideGoals.store';
import { useSprintStore } from '@/stores/sprint.store';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';
import { alertInfo } from '@/shared/lib/confirmAction';

function parseAmount(raw: string): number {
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

const BOARD_TABS: { id: SideGoalBoardTab; label: string }[] = [
  { id: 'all', label: 'Все цели' },
  { id: 'nearest', label: 'Ближайшие' },
  { id: 'year', label: 'Год' },
  { id: 'wish', label: 'Доска желаний' },
  { id: 'horizon', label: 'Горизонт' },
];

function SideGoalsBoardBlock({
  config,
  boardTab,
  onBoardTab,
  nearestSlot,
}: {
  config: StrategyGoalsTabDef;
  boardTab: SideGoalBoardTab;
  onBoardTab: (t: SideGoalBoardTab) => void;
  nearestSlot: ReactNode;
}) {
  const { typography, spacing, colors } = useAppTheme();
  const goals = useSideGoalsStore((s) => s.goals);
  const addSideGoal = useSideGoalsStore((s) => s.addSideGoal);
  const updateSideGoal = useSideGoalsStore((s) => s.updateSideGoal);
  const appendSideGoalPhotos = useSideGoalsStore((s) => s.appendSideGoalPhotos);
  const removeSideGoalPhotoAt = useSideGoalsStore((s) => s.removeSideGoalPhotoAt);

  const calendarYear = new Date().getFullYear();

  const pinnedGoals = useMemo(
    () => goals.filter((g) => !g.isHorizon && g.isNearestPinned),
    [goals]
  );
  const yearGoals = useMemo(
    () => goals.filter((g) => !g.isHorizon && !g.isNearestPinned && sideGoalInCalendarYear(g, calendarYear)),
    [goals, calendarYear]
  );
  const otherYearGoals = useMemo(
    () => goals.filter((g) => !g.isHorizon && !g.isNearestPinned && sideGoalDatedOutsideYear(g, calendarYear)),
    [goals, calendarYear]
  );
  const wishGoals = useMemo(
    () => goals.filter((g) => !g.isHorizon && !g.isNearestPinned && g.dateMode === 'none'),
    [goals]
  );
  const horizonGoals = useMemo(() => goals.filter((g) => g.isHorizon), [goals]);

  const [editId, setEditId] = useState<string | null>(null);
  const editing = editId ? goals.find((g) => g.id === editId) : null;
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCurrent, setDraftCurrent] = useState('');
  const [draftTarget, setDraftTarget] = useState('');
  const [draftHorizon, setDraftHorizon] = useState(false);
  const [draftNearest, setDraftNearest] = useState(false);
  const [draftDateMode, setDraftDateMode] = useState<SideGoalDateMode>('none');
  const [draftDateSingle, setDraftDateSingle] = useState('');
  const [draftDateFrom, setDraftDateFrom] = useState('');
  const [draftDateTo, setDraftDateTo] = useState('');
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
    setDraftNearest(g.isNearestPinned);
    setDraftDateMode(g.dateMode);
    setDraftDateSingle(g.dateSingle ?? '');
    setDraftDateFrom(g.dateFrom ?? '');
    setDraftDateTo(g.dateTo ?? '');
  }, [editId]);

  const closeModal = useCallback(() => setEditId(null), []);

  const save = useCallback(() => {
    if (!editId) return;
    const t = Math.max(1, parseAmount(draftTarget));
    const c = Math.max(0, parseAmount(draftCurrent));
    let horizon = draftHorizon;
    let nearest = draftNearest;
    if (horizon) nearest = false;
    if (nearest) horizon = false;

    let dateMode: SideGoalDateMode = draftDateMode;
    let dateSingle: string | null = draftDateSingle.trim() || null;
    let dateFrom: string | null = draftDateFrom.trim() || null;
    let dateTo: string | null = draftDateTo.trim() || null;

    if (dateMode === 'single' && !dateSingle) dateMode = 'none';
    if (dateMode === 'range' && (!dateFrom || !dateTo)) dateMode = 'none';
    if (dateMode === 'none') {
      dateSingle = null;
      dateFrom = null;
      dateTo = null;
    }
    if (dateMode === 'single' && dateSingle) {
      const norm = normalizeDateKey(dateSingle);
      if (!norm) {
        alertInfo('Дата', 'Введи дату в формате ГГГГ-ММ-ДД, например 2026-08-14.');
        return;
      }
      dateSingle = norm;
    }
    if (dateMode === 'range' && dateFrom && dateTo) {
      const nf = normalizeDateKey(dateFrom);
      const nt = normalizeDateKey(dateTo);
      if (!nf || !nt) {
        alertInfo('Дата', 'Проверь обе даты в формате ГГГГ-ММ-ДД.');
        return;
      }
      dateFrom = nf;
      dateTo = nt;
    }
    if (dateMode === 'range' && dateFrom && dateTo && dateFrom > dateTo) {
      const x = dateFrom;
      dateFrom = dateTo;
      dateTo = x;
    }

    updateSideGoal(editId, {
      title: draftTitle.trim(),
      target: t,
      current: Math.min(c, t),
      isHorizon: horizon,
      isNearestPinned: nearest,
      dateMode,
      dateSingle,
      dateFrom,
      dateTo,
    });
    setEditId(null);
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [
    draftCurrent,
    draftDateFrom,
    draftDateMode,
    draftDateSingle,
    draftDateTo,
    draftHorizon,
    draftNearest,
    draftTarget,
    draftTitle,
    editId,
    updateSideGoal,
  ]);

  const addPhotos = useCallback(async () => {
    if (!editId) return;
    setPhotoBusy(true);
    try {
      const uris = await pickVisionBoardImageUris();
      if (uris.length === 0) return;
      const uploaded: string[] = [];
      for (const uri of uris) {
        if (/^https?:\/\//i.test(uri)) {
          uploaded.push(uri);
          continue;
        }
        const res = await uploadSideGoalPhotoToSupabase(uri, editId);
        if ('publicUrl' in res) uploaded.push(res.publicUrl);
        else alertInfo('Фото', res.error);
      }
      if (uploaded.length > 0) {
        appendSideGoalPhotos(editId, uploaded);
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } finally {
      setPhotoBusy(false);
    }
  }, [appendSideGoalPhotos, editId]);

  const openAddForTab = (tab: SideGoalBoardTab) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const y = calendarYear;
    if (tab === 'all') {
      const id = addSideGoal({ dateMode: 'none', isHorizon: false, isNearestPinned: false });
      setEditId(id);
      return;
    }
    if (tab === 'horizon') {
      const id = addSideGoal({ isHorizon: true, isNearestPinned: false, dateMode: 'none' });
      setEditId(id);
      return;
    }
    if (tab === 'nearest') {
      const id = addSideGoal({ isNearestPinned: true, isHorizon: false, dateMode: 'none' });
      setEditId(id);
      return;
    }
    if (tab === 'year') {
      const id = addSideGoal({
        isHorizon: false,
        isNearestPinned: false,
        dateMode: 'single',
        dateSingle: `${y}-06-01`,
        dateFrom: null,
        dateTo: null,
      });
      setEditId(id);
      return;
    }
    const id = addSideGoal({ dateMode: 'none', isHorizon: false, isNearestPinned: false });
    setEditId(id);
  };

  const onToggleOneShot = useCallback(
    (id: string, done: boolean) => {
      const g = useSideGoalsStore.getState().goals.find((x) => x.id === id);
      if (!g || g.target > 1) return;
      updateSideGoal(id, { current: done ? Math.max(1, g.target) : 0 });
    },
    [updateSideGoal]
  );

  const tabIntro =
    boardTab === 'all'
      ? 'Режим «все»: одна Masonry-сетка — цели из всех разделов перемешаны; внизу блок накоплений. Остальные вкладки — фильтр по одному разделу.'
      : boardTab === 'nearest'
        ? 'Закреплённые «ближайшие» карточки + Китай и подушка.'
        : boardTab === 'year'
          ? `Цели с датой в ${calendarYear} году (один день или период).`
          : boardTab === 'wish'
            ? 'Цели без даты — доска желаний.'
            : 'Дальний горизонт: отдельный список.';

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
          Фото загружаются в Supabase и не пропадают на вебе. По умолчанию видны все цели; вкладка — фильтр по одному разделу.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}
      >
        {BOARD_TABS.map(({ id, label }) => {
          const on = boardTab === id;
          return (
            <Pressable
              key={id}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                onBoardTab(id);
              }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: on ? 'rgba(168,85,247,0.55)' : 'rgba(255,255,255,0.1)',
                backgroundColor: on ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: on ? '900' : '700', color: on ? '#FAFAFC' : colors.textMuted }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(247,244,250,0.42)', lineHeight: 17 }}>{tabIntro}</Text>

      {boardTab === 'all' ? (
        <GoalsNavigatorBento
          calendarYear={calendarYear}
          nearestDeadlineCutoffKey={nearestCutoffForAugust(calendarYear)}
          pinnedGoals={pinnedGoals}
          yearGoals={yearGoals}
          wishGoals={wishGoals}
          horizonGoals={horizonGoals}
          otherYearGoals={otherYearGoals}
          nearestSlot={nearestSlot}
          onEditGoal={setEditId}
          onToggleOneShot={onToggleOneShot}
        />
      ) : (
        <>
          {boardTab === 'nearest' ? (
            <View style={{ gap: spacing.lg }}>
              {pinnedGoals.length === 0 ? (
                <Text style={{ fontSize: 13, lineHeight: 19, color: 'rgba(247,244,250,0.38)', fontWeight: '600' }}>
                  Пока нет закреплённых целей. Нажми «Добавить цель» и включи «Ближайшая цель».
                </Text>
              ) : (
                <PersonalGoalsMasonryGrid
                  goals={pinnedGoals}
                  onEditGoal={setEditId}
                  onToggleOneShot={onToggleOneShot}
                />
              )}
              {nearestSlot}
            </View>
          ) : null}

          {boardTab === 'year' ? (
            <View style={{ gap: spacing.lg }}>
              <Text
                style={{
                  fontSize: 11,
                  lineHeight: 15,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'rgba(251,191,36,0.75)',
                  marginBottom: 2,
                }}
              >
                {config.boardYearSubheading} · {calendarYear}
              </Text>
              {yearGoals.length === 0 ? (
                <Text style={{ fontSize: 13, lineHeight: 19, color: 'rgba(247,244,250,0.38)', fontWeight: '600' }}>
                  Пока пусто — добавь цель с датой в этом году.
                </Text>
              ) : (
                <PersonalGoalsMasonryGrid
                  goals={yearGoals}
                  onEditGoal={setEditId}
                  onToggleOneShot={onToggleOneShot}
                />
              )}
              {otherYearGoals.length > 0 ? (
                <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
                  <Text
                    style={{
                      fontSize: 11,
                      lineHeight: 15,
                      fontWeight: '700',
                      letterSpacing: 1.1,
                      textTransform: 'uppercase',
                      color: 'rgba(247,244,250,0.4)',
                    }}
                  >
                    Другие года
                  </Text>
                  <PersonalGoalsMasonryGrid
                    goals={otherYearGoals}
                    onEditGoal={setEditId}
                    onToggleOneShot={onToggleOneShot}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {boardTab === 'wish' ? (
            <View style={{ gap: spacing.lg }}>
              <Text
                style={{
                  fontSize: 11,
                  lineHeight: 15,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'rgba(251,191,36,0.75)',
                  marginBottom: 2,
                }}
              >
                Без даты
              </Text>
              {wishGoals.length === 0 ? (
                <Text style={{ fontSize: 13, lineHeight: 19, color: 'rgba(247,244,250,0.38)', fontWeight: '600' }}>
                  Пока пусто — добавь цель и оставь режим даты «без даты».
                </Text>
              ) : (
                <PersonalGoalsMasonryGrid
                  goals={wishGoals}
                  onEditGoal={setEditId}
                  onToggleOneShot={onToggleOneShot}
                />
              )}
            </View>
          ) : null}

          {boardTab === 'horizon' ? (
            <View style={{ gap: spacing.lg }}>
              <Text
                style={{
                  fontSize: 11,
                  lineHeight: 15,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'rgba(251,191,36,0.75)',
                  marginBottom: 2,
                }}
              >
                {config.boardHorizonSubheading}
              </Text>
              {horizonGoals.length === 0 ? (
                <Text style={{ fontSize: 13, lineHeight: 19, color: 'rgba(247,244,250,0.38)', fontWeight: '600' }}>
                  Пока пусто — добавь цель и включи «На горизонте».
                </Text>
              ) : (
                <PersonalGoalsMasonryGrid
                  goals={horizonGoals}
                  onEditGoal={setEditId}
                  onToggleOneShot={onToggleOneShot}
                />
              )}
            </View>
          ) : null}
        </>
      )}

      <Pressable
        onPress={() => openAddForTab(boardTab)}
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
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  setDraftHorizon((v) => {
                    const next = !v;
                    if (next) setDraftNearest(false);
                    return next;
                  });
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: spacing.sm,
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
                    Отдельная вкладка «Горизонт». Несовместимо с «ближайшая».
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  setDraftNearest((v) => {
                    const next = !v;
                    if (next) setDraftHorizon(false);
                    return next;
                  });
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
                  borderColor: draftNearest ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.12)',
                  backgroundColor: draftNearest ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <Ionicons
                  name={draftNearest ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={draftNearest ? '#E9D5FF' : 'rgba(255,255,255,0.45)'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Ближайшая цель</Text>
                  <Text style={{ fontSize: 12, marginTop: 3, color: colors.textMuted, lineHeight: 16 }}>
                    Крупная карточка во вкладке «Ближайшие» (вместе с Китаем и подушкой).
                  </Text>
                </View>
              </Pressable>

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>Дата</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm }}>
                {(
                  [
                    ['none', 'Без даты'],
                    ['single', 'Один день'],
                    ['range', 'Период'],
                  ] as const
                ).map(([mode, label]) => {
                  const on = draftDateMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => {
                        setDraftDateMode(mode);
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      }}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: on ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.12)',
                        backgroundColor: on ? 'rgba(168,85,247,0.12)' : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: on ? '#F5D0FE' : colors.textMuted }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {draftDateMode === 'single' ? (
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>
                    Формат ГГГГ-ММ-ДД
                  </Text>
                  <TextInput
                    value={draftDateSingle}
                    onChangeText={setDraftDateSingle}
                    placeholder={`${calendarYear}-08-14`}
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    autoCapitalize="none"
                    style={{
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: 14,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      color: colors.text,
                      fontSize: 16,
                      fontVariant: ['tabular-nums'],
                    }}
                  />
                </View>
              ) : null}

              {draftDateMode === 'range' ? (
                <View style={{ marginBottom: spacing.md, gap: 10 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>С даты</Text>
                    <TextInput
                      value={draftDateFrom}
                      onChangeText={setDraftDateFrom}
                      placeholder={`${calendarYear}-01-01`}
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      autoCapitalize="none"
                      style={{
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: 14,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        color: colors.text,
                        fontSize: 16,
                        fontVariant: ['tabular-nums'],
                      }}
                    />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>По дату</Text>
                    <TextInput
                      value={draftDateTo}
                      onChangeText={setDraftDateTo}
                      placeholder={`${calendarYear}-12-31`}
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      autoCapitalize="none"
                      style={{
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: 14,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        color: colors.text,
                        fontSize: 16,
                        fontVariant: ['tabular-nums'],
                      }}
                    />
                  </View>
                </View>
              ) : null}

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
                  {photoBusy ? 'Загрузка…' : 'Добавить фотографии (облако)'}
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

/** Вкладка «Цели»: Китай/подушка + побочные цели с прогрессом (локально + облако). */
export function PersonalTargetsScreen() {
  const { typography, spacing, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState<string | null>(null);
  const [boardTab, setBoardTab] = useState<SideGoalBoardTab>('all');
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
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4 }}>
                <Link href={'/annual-goals' as Href} asChild>
                  <Pressable hitSlop={6}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: GOALS_ACCENT, textDecorationLine: 'underline' }}>
                      Годовые цели (карточки)
                    </Text>
                  </Pressable>
                </Link>
                <Link href={'/global-vision' as Href} asChild>
                  <Pressable hitSlop={6}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: GOALS_ACCENT, textDecorationLine: 'underline' }}>
                      Глобальное видение
                    </Text>
                  </Pressable>
                </Link>
              </View>
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
            </View>

            <SideGoalsBoardBlock
              config={cfg}
              boardTab={boardTab}
              onBoardTab={setBoardTab}
              nearestSlot={
                <NikolayDayMoneyHeroCards sprintId={activeSprint?.id ?? null} chinaGoal={china} cushionGoal={cushion} />
              }
            />
          </>
        )}
      </ScrollView>
    </ScreenCanvas>
  );
}
