import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { createElement, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Image as RNImage,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { useSupabaseConfigured } from '@/config/env';
import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { NikolayDayMoneyHeroCards, pickNikolayMoneyProgressGoals } from '@/features/accounts/nikolayHabitsUi';
import { GoalsHero } from '@/features/goals/GoalsHero';
import { pickVisionBoardImageUris } from '@/features/goals/pickGoalImage';
import { GoalsNavigatorBento, nearestCutoffForAugust } from '@/features/goals/GoalsNavigatorBento';
import { PersonalGoalsMasonryGrid, SideGoalPhotoLightboxModal } from '@/features/goals/PersonalGoalsMasonry';
import {
  getSideGoalPlacementKind,
  isSideGoalCompleted,
  normalizeDateKey,
  sideGoalDatedOutsideYear,
  sideGoalInCalendarYear,
  type SideGoalBoardTab,
  type SideGoalPlacementKind,
} from '@/features/goals/sideGoals.logic';
import { loadFinanceOverview } from '@/features/finance/financeApi';
import { FINANCE_QUERY_KEY } from '@/features/finance/queryKeys';
import { strategyPageConfig, type StrategyGoalsTabDef } from '@/features/strategy/strategy.config';
import { getSupabase } from '@/lib/supabase';
import { uploadSideGoalPhotoToSupabase } from '@/services/sideGoalsPhotoUpload';
import {
  ensureSideGoalsHydrated,
  type SideGoalDateMode,
  type SideGoalProgressKind,
  useSideGoalsStore,
} from '@/stores/sideGoals.store';
import { useSprintStore } from '@/stores/sprint.store';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { ScreenHeaderChrome } from '@/shared/ui/ScreenHeaderChrome';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';
import { alertInfo, confirmDestructive } from '@/shared/lib/confirmAction';

function parseAmount(raw: string): number {
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Фото в попапе просмотра цели: вписывается в экран, без гигантской высоты у портретных снимков. */
function ViewGoalDetailPhoto({
  uri,
  onPress,
  photoCount,
}: {
  uri: string;
  onPress: () => void;
  /** Сколько фото в цели — делим лимит высоты, чтобы несколько превью не раздували модалку. */
  photoCount: number;
}) {
  const { spacing } = useAppTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const [aspectWH, setAspectWH] = useState<number | null>(null);

  const applySize = useCallback((w: number, h: number) => {
    if (w > 0 && h > 0) setAspectWH(w / h);
  }, []);

  const ratio = aspectWH && aspectWH > 0 ? aspectWH : 4 / 3;

  const onLoadMeta = useCallback(
    (e: { source?: unknown }) => {
      const src = e.source;
      if (src && typeof src === 'object' && 'width' in src && 'height' in src) {
        const sw = Number((src as { width?: number }).width);
        const sh = Number((src as { height?: number }).height);
        if (sw > 0 && sh > 0) applySize(sw, sh);
      } else if (Platform.OS !== 'web') {
        RNImage.getSize(uri, (iw, ih) => applySize(iw, ih), () => {});
      }
    },
    [applySize, uri]
  );

  // Модалка: оставляем место под заголовок, описание и кнопки — фото не выше ~28% экрана (на фото делим бюджет).
  const gutterX = spacing.lg * 4 + spacing.sm;
  const maxContentW = Math.max(120, winW - gutterX);
  const heightBudget = Math.max(120, winH * (photoCount > 1 ? 0.22 : 0.28));
  const perPhotoCap = photoCount > 1 ? heightBudget / Math.min(photoCount, 3) : heightBudget;
  const maxPhotoH = Math.min(winH * 0.3, Math.max(100, perPhotoCap));
  const hAtFullWidth = maxContentW / Math.max(ratio, 0.02);
  const boxH = Math.min(hAtFullWidth, maxPhotoH);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Увеличить фото"
      style={{ width: '100%' }}
    >
      <View
        style={{
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: 'rgba(0,0,0,0.28)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.14)',
        }}
      >
        <View style={{ width: '100%', height: boxH }}>
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            onLoad={onLoadMeta}
          />
        </View>
      </View>
    </Pressable>
  );
}

const BOARD_TABS: { id: SideGoalBoardTab; label: string }[] = [
  { id: 'all', label: 'Все цели' },
  { id: 'nearest', label: 'Ближайшие' },
  { id: 'year', label: 'Год' },
  { id: 'wish', label: 'Доска желаний' },
  { id: 'horizon', label: 'Горизонт' },
  { id: 'done', label: 'Выполненные цели' },
];

const GOAL_PLACEMENT_OPTIONS: { id: SideGoalPlacementKind; label: string }[] = [
  { id: 'nearest', label: 'Ближайшая цель' },
  { id: 'wish', label: 'Доска желаний' },
  { id: 'horizon', label: 'Горизонт' },
  { id: 'year', label: 'Год' },
];

function GoalsBoardTabBar({
  boardTab,
  onBoardTab,
}: {
  boardTab: SideGoalBoardTab;
  onBoardTab: (t: SideGoalBoardTab) => void;
}) {
  const { colors } = useAppTheme();
  return (
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
  );
}

function SideGoalsBoardBlock({
  config,
  boardTab,
  nearestSlot = null,
}: {
  config: StrategyGoalsTabDef;
  boardTab: SideGoalBoardTab;
  nearestSlot?: ReactNode | null;
}) {
  const { typography, spacing, colors } = useAppTheme();
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const goals = useSideGoalsStore((s) => s.goals);
  const addSideGoal = useSideGoalsStore((s) => s.addSideGoal);
  const updateSideGoal = useSideGoalsStore((s) => s.updateSideGoal);
  const removeSideGoal = useSideGoalsStore((s) => s.removeSideGoal);
  const appendSideGoalPhotos = useSideGoalsStore((s) => s.appendSideGoalPhotos);
  const removeSideGoalPhotoAt = useSideGoalsStore((s) => s.removeSideGoalPhotoAt);

  const calendarYear = new Date().getFullYear();

  const activeGoals = useMemo(() => goals.filter((g) => !isSideGoalCompleted(g)), [goals]);
  const completedGoals = useMemo(() => goals.filter(isSideGoalCompleted), [goals]);

  const pinnedGoals = useMemo(
    () => activeGoals.filter((g) => !g.isHorizon && g.isNearestPinned),
    [activeGoals]
  );
  const yearGoals = useMemo(
    () => activeGoals.filter((g) => !g.isHorizon && !g.isNearestPinned && sideGoalInCalendarYear(g, calendarYear)),
    [activeGoals, calendarYear]
  );
  const otherYearGoals = useMemo(
    () => activeGoals.filter((g) => !g.isHorizon && !g.isNearestPinned && sideGoalDatedOutsideYear(g, calendarYear)),
    [activeGoals, calendarYear]
  );
  const wishGoals = useMemo(
    () => activeGoals.filter((g) => !g.isHorizon && !g.isNearestPinned && g.dateMode === 'none'),
    [activeGoals]
  );
  const horizonGoals = useMemo(() => activeGoals.filter((g) => g.isHorizon), [activeGoals]);

  const [editId, setEditId] = useState<string | null>(null);
  const editing = editId ? goals.find((g) => g.id === editId) : null;
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCurrent, setDraftCurrent] = useState('');
  const [draftTarget, setDraftTarget] = useState('');
  const [draftPlacement, setDraftPlacement] = useState<SideGoalPlacementKind>('wish');
  const [placementPickerOpen, setPlacementPickerOpen] = useState(false);
  const [draftDateMode, setDraftDateMode] = useState<SideGoalDateMode>('none');
  const [draftDateSingle, setDraftDateSingle] = useState('');
  const [draftDateFrom, setDraftDateFrom] = useState('');
  const [draftDateTo, setDraftDateTo] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftProgressKind, setDraftProgressKind] = useState<SideGoalProgressKind>('numeric');
  const [draftCheckboxDone, setDraftCheckboxDone] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [viewId, setViewId] = useState<string | null>(null);
  const [viewPhotoIdx, setViewPhotoIdx] = useState<number | null>(null);
  const viewingGoal = viewId ? goals.find((g) => g.id === viewId) ?? null : null;

  useEffect(() => {
    if (!editId) return;
    const g = useSideGoalsStore.getState().goals.find((x) => x.id === editId);
    if (!g) {
      setEditId(null);
      return;
    }
    setDraftTitle(g.title);
    setDraftDescription(g.description ?? '');
    setDraftProgressKind(g.progressKind ?? 'numeric');
    setDraftCheckboxDone(g.current >= g.target);
    setDraftCurrent(String(g.current));
    setDraftTarget(String(g.target));
    setDraftPlacement(getSideGoalPlacementKind(g));
    setDraftDateMode(g.dateMode);
    setDraftDateSingle(g.dateSingle ?? '');
    setDraftDateFrom(g.dateFrom ?? '');
    setDraftDateTo(g.dateTo ?? '');
  }, [editId]);

  const closeModal = useCallback(() => {
    setEditId(null);
    setPlacementPickerOpen(false);
  }, []);

  const save = useCallback(() => {
    if (!editId) return;
    const useCheckbox = draftProgressKind === 'checkbox';
    const t = useCheckbox ? 1 : Math.max(1, parseAmount(draftTarget));
    const c = useCheckbox ? (draftCheckboxDone ? 1 : 0) : Math.max(0, parseAmount(draftCurrent));
    let horizon = false;
    let nearest = false;
    let dateMode: SideGoalDateMode = draftDateMode;
    let dateSingle: string | null = draftDateSingle.trim() || null;
    let dateFrom: string | null = draftDateFrom.trim() || null;
    let dateTo: string | null = draftDateTo.trim() || null;

    if (draftPlacement === 'nearest') {
      horizon = false;
      nearest = true;
      dateMode = 'none';
      dateSingle = null;
      dateFrom = null;
      dateTo = null;
    } else if (draftPlacement === 'horizon') {
      horizon = true;
      nearest = false;
      dateMode = 'none';
      dateSingle = null;
      dateFrom = null;
      dateTo = null;
    } else if (draftPlacement === 'wish') {
      horizon = false;
      nearest = false;
      dateMode = 'none';
      dateSingle = null;
      dateFrom = null;
      dateTo = null;
    } else {
      horizon = false;
      nearest = false;
      if (dateMode === 'none') {
        alertInfo('Дата', 'Для типа «Год» выбери один день или период.');
        return;
      }
      if (dateMode === 'single' && !dateSingle) {
        alertInfo('Дата', 'Введи дату в формате ГГГГ-ММ-ДД, например 2026-08-14.');
        return;
      }
      if (dateMode === 'range' && (!dateFrom || !dateTo)) {
        alertInfo('Дата', 'Укажи начало и конец периода в формате ГГГГ-ММ-ДД.');
        return;
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
    }

    updateSideGoal(editId, {
      title: draftTitle.trim(),
      description: draftDescription.trim(),
      progressKind: draftProgressKind,
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
    draftCheckboxDone,
    draftCurrent,
    draftDateFrom,
    draftDateMode,
    draftDateSingle,
    draftDateTo,
    draftDescription,
    draftPlacement,
    draftProgressKind,
    draftTarget,
    draftTitle,
    editId,
    updateSideGoal,
  ]);

  const uploadPhotoUrisForEdit = useCallback(
    async (uris: string[]) => {
      if (!editId || uris.length === 0) return;
      setPhotoBusy(true);
      try {
        const uploaded: string[] = [];
        for (const uri of uris) {
          try {
            if (/^https?:\/\//i.test(uri)) {
              uploaded.push(uri);
              continue;
            }
            const res = await uploadSideGoalPhotoToSupabase(uri, editId);
            if ('publicUrl' in res) uploaded.push(res.publicUrl);
            else alertInfo('Фото', res.error);
          } finally {
            if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
          }
        }
        if (uploaded.length > 0) {
          appendSideGoalPhotos(editId, uploaded);
          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } finally {
        setPhotoBusy(false);
      }
    },
    [appendSideGoalPhotos, editId]
  );

  const addPhotos = useCallback(async () => {
    if (!editId) return;
    const uris = await pickVisionBoardImageUris();
    await uploadPhotoUrisForEdit(uris);
  }, [editId, uploadPhotoUrisForEdit]);

  const openAddForTab = (tab: SideGoalBoardTab) => {
    if (tab === 'done') return;
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
      if (!g) return;
      if (g.progressKind === 'checkbox' || g.target <= 1) {
        updateSideGoal(id, { current: done ? 1 : 0, target: g.progressKind === 'checkbox' ? 1 : g.target });
      }
    },
    [updateSideGoal]
  );

  const requestDeleteGoal = useCallback(() => {
    if (!editId) return;
    confirmDestructive({
      title: 'Удалить цель?',
      message: 'Цель исчезнет с доски. Это действие нельзя отменить.',
      confirmLabel: 'Удалить',
      onConfirm: () => {
        removeSideGoal(editId);
        setEditId(null);
        setViewId((v) => (v === editId ? null : v));
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  }, [editId, removeSideGoal]);

  return (
    <View style={{ gap: spacing.sm }}>
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
          onViewGoal={setViewId}
          onToggleOneShot={onToggleOneShot}
        />
      ) : boardTab === 'done' ? (
        <View style={{ gap: spacing.lg }}>
          <Text
            style={{
              fontSize: 11,
              lineHeight: 15,
              fontWeight: '700',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: 'rgba(167,243,208,0.85)',
              marginBottom: 2,
            }}
          >
            Выполненные цели
          </Text>
          {completedGoals.length === 0 ? (
            <Text style={{ fontSize: 13, lineHeight: 19, color: 'rgba(247,244,250,0.38)', fontWeight: '600' }}>
              Здесь появятся цели, у которых достигнут полный прогресс или отмечено «выполнено».
            </Text>
          ) : (
            <PersonalGoalsMasonryGrid
              goals={completedGoals}
              onEditGoal={setEditId}
              onViewGoal={setViewId}
              onToggleOneShot={onToggleOneShot}
            />
          )}
        </View>
      ) : (
        <>
          {boardTab === 'nearest' ? (
            <View style={{ gap: spacing.sm }}>
              {pinnedGoals.length === 0 ? (
                <Text style={{ fontSize: 13, lineHeight: 19, color: 'rgba(247,244,250,0.38)', fontWeight: '600' }}>
                  Пока нет закреплённых целей. Нажми «Добавить цель» и включи «Ближайшая цель».
                </Text>
              ) : (
                <PersonalGoalsMasonryGrid
                  goals={pinnedGoals}
                  onEditGoal={setEditId}
                  onViewGoal={setViewId}
                  onToggleOneShot={onToggleOneShot}
                />
              )}
              {nearestSlot ? nearestSlot : null}
            </View>
          ) : null}

          {boardTab === 'year' ? (
            <View style={{ gap: spacing.sm }}>
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
                  onViewGoal={setViewId}
                  onToggleOneShot={onToggleOneShot}
                />
              )}
              {otherYearGoals.length > 0 ? (
                <View style={{ gap: spacing.sm, marginTop: 4 }}>
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
                    onViewGoal={setViewId}
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
                  onViewGoal={setViewId}
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
                  onViewGoal={setViewId}
                  onToggleOneShot={onToggleOneShot}
                />
              )}
            </View>
          ) : null}
        </>
      )}

      {boardTab !== 'done' ? (
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
      ) : null}

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

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>Тип цели</Text>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  setPlacementPickerOpen(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: spacing.md,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.14)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                }}
              >
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: colors.text }}>
                  {GOAL_PLACEMENT_OPTIONS.find((o) => o.id === draftPlacement)?.label ?? '—'}
                </Text>
                <Ionicons name="chevron-down" size={22} color="rgba(248,250,252,0.55)" />
              </Pressable>

              {draftPlacement === 'year' ? (
                <>
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
                </>
              ) : null}

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>Фото</Text>
              {Platform.OS === 'web' ? (
                createElement(
                  'div',
                  {
                    style: {
                      marginBottom: 12,
                      padding: 12,
                      borderRadius: 14,
                      border: '1px dashed rgba(232,121,249,0.45)',
                      backgroundColor: 'rgba(232,121,249,0.08)',
                      opacity: photoBusy || !editId ? 0.55 : 1,
                    },
                    onDragOver: (e: DragEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                    },
                    onDrop: (e: DragEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!editId || photoBusy) return;
                      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
                      if (files.length === 0) return;
                      void uploadPhotoUrisForEdit(files.map((f) => URL.createObjectURL(f)));
                    },
                  },
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: 'rgba(248,250,252,0.45)',
                      textAlign: 'center',
                      marginBottom: 10,
                    }}
                  >
                    Перетащите изображения сюда или нажмите кнопку ниже
                  </Text>,
                  <Pressable
                    disabled={photoBusy || !editId}
                    onPress={() => void addPhotos()}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: 'rgba(232,121,249,0.4)',
                      backgroundColor: 'rgba(232,121,249,0.12)',
                    }}
                  >
                    <Text style={{ fontWeight: '800', color: '#F0ABFC', textAlign: 'center' }}>
                      {photoBusy ? 'Загрузка…' : 'Добавить фотографии (облако)'}
                    </Text>
                  </Pressable>
                )
              ) : (
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
              )}

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
                  marginBottom: 12,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 }}>Описание</Text>
              <TextInput
                value={draftDescription}
                onChangeText={setDraftDescription}
                placeholder="Коротко: зачем цель, что важно помнить"
                placeholderTextColor="rgba(255,255,255,0.28)"
                multiline
                textAlignVertical="top"
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  color: colors.text,
                  fontSize: 15,
                  minHeight: 88,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>Как отмечать</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
                {(
                  [
                    ['numeric', 'Шкала (числа и полоса)'] as const,
                    ['checkbox', 'Только галочка'] as const,
                  ] as const
                ).map(([kind, label]) => {
                  const on = draftProgressKind === kind;
                  return (
                    <Pressable
                      key={kind}
                      onPress={() => {
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                        if (kind === 'checkbox') {
                          setDraftProgressKind('checkbox');
                          const cur = parseAmount(draftCurrent);
                          const tgt = Math.max(1, parseAmount(draftTarget));
                          setDraftCheckboxDone(tgt > 0 && cur >= tgt);
                        } else {
                          setDraftProgressKind('numeric');
                          if (parseAmount(draftTarget) <= 1) {
                            setDraftTarget('1000');
                            setDraftCurrent(draftCheckboxDone ? '1000' : '0');
                          }
                        }
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: on ? 'rgba(168,85,247,0.55)' : 'rgba(255,255,255,0.12)',
                        backgroundColor: on ? 'rgba(168,85,247,0.15)' : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: on ? '#F5D0FE' : colors.textMuted }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {draftProgressKind === 'numeric' ? (
                <>
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
                </>
              ) : (
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    setDraftCheckboxDone((v) => !v);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 20,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: draftCheckboxDone ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.12)',
                    backgroundColor: draftCheckboxDone ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <Ionicons
                    name={draftCheckboxDone ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={draftCheckboxDone ? '#E9D5FF' : 'rgba(255,255,255,0.45)'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Цель выполнена</Text>
                    <Text style={{ fontSize: 12, marginTop: 3, color: colors.textMuted, lineHeight: 16 }}>
                      Без числового прогресса — только факт сделано / не сделано.
                    </Text>
                  </View>
                </Pressable>
              )}

              <Pressable
                onPress={requestDeleteGoal}
                style={{
                  marginBottom: 14,
                  minHeight: 48,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(248,113,113,0.55)',
                  backgroundColor: 'rgba(248,113,113,0.08)',
                }}
              >
                <Text style={{ fontWeight: '800', color: 'rgba(252,165,165,0.95)' }}>Удалить цель…</Text>
              </Pressable>

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

      <Modal
        visible={placementPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setPlacementPickerOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setPlacementPickerOpen(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                paddingTop: spacing.md,
                paddingBottom: spacing.lg + 12,
                paddingHorizontal: spacing.lg,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                backgroundColor: '#16161c',
                borderWidth: 1,
                borderColor: 'rgba(139,92,246,0.35)',
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '900', marginBottom: spacing.sm, color: colors.text }}>Тип цели</Text>
              {GOAL_PLACEMENT_OPTIONS.map((opt) => {
                const sel = draftPlacement === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setDraftPlacement(opt.id);
                      if (opt.id === 'year') {
                        setDraftDateMode((dm) => (dm === 'none' ? 'single' : dm));
                        setDraftDateSingle((s) => (s.trim() ? s : `${calendarYear}-06-01`));
                      } else {
                        setDraftDateMode('none');
                        setDraftDateSingle('');
                        setDraftDateFrom('');
                        setDraftDateTo('');
                      }
                      setPlacementPickerOpen(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: sel ? 'rgba(168,85,247,0.15)' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontWeight: sel ? '900' : '700',
                        color: sel ? '#F5D0FE' : colors.text,
                      }}
                    >
                      {opt.label}
                    </Text>
                    {sel ? <Ionicons name="checkmark-circle" size={22} color="#E879F9" /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(viewingGoal)}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setViewId(null);
          setViewPhotoIdx(null);
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: spacing.lg }}
          onPress={() => {
            setViewId(null);
            setViewPhotoIdx(null);
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              borderRadius: 20,
              padding: spacing.lg,
              backgroundColor: '#141418',
              borderWidth: 1,
              borderColor: 'rgba(139,92,246,0.45)',
              maxHeight: '90%',
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{
                maxHeight: Math.max(320, winH - insets.top - insets.bottom - spacing.lg * 4),
              }}
            >
              {viewingGoal ? (
                <>
                  <Text style={[typography.title2, { marginBottom: spacing.sm, color: colors.text, letterSpacing: -0.3 }]}>
                    {viewingGoal.title}
                  </Text>
                  {viewingGoal.description?.trim() ? (
                    <Text
                      numberOfLines={10}
                      ellipsizeMode="tail"
                      style={{
                        fontSize: 15,
                        lineHeight: 22,
                        fontWeight: '600',
                        color: 'rgba(248,250,252,0.72)',
                        marginBottom: spacing.md,
                      }}
                    >
                      {viewingGoal.description.trim()}
                    </Text>
                  ) : null}
                  {viewingGoal.photoUris.length > 0 ? (
                    <View style={{ width: '100%', gap: spacing.sm, marginBottom: spacing.md }}>
                      {viewingGoal.photoUris.map((uri, i) => (
                        <ViewGoalDetailPhoto
                          key={`vd-${uri}-${i}`}
                          uri={uri}
                          photoCount={viewingGoal.photoUris.length}
                          onPress={() => setViewPhotoIdx(i)}
                        />
                      ))}
                    </View>
                  ) : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm }}>
                    <Pressable
                      onPress={() => {
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                        const id = viewingGoal.id;
                        setViewId(null);
                        setViewPhotoIdx(null);
                        setEditId(id);
                      }}
                      style={{
                        flex: 1,
                        minWidth: 120,
                        minHeight: 48,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#9333EA',
                      }}
                    >
                      <Text style={{ fontWeight: '900', color: '#FAFAFC' }}>Редактировать</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setViewId(null);
                        setViewPhotoIdx(null);
                      }}
                      style={{
                        flex: 1,
                        minWidth: 120,
                        minHeight: 48,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.14)',
                      }}
                    >
                      <Text style={{ fontWeight: '800', color: colors.textMuted }}>Закрыть</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <SideGoalPhotoLightboxModal
        visible={viewPhotoIdx != null && (viewingGoal?.photoUris.length ?? 0) > 0}
        uris={viewingGoal?.photoUris ?? []}
        initialIndex={viewPhotoIdx ?? 0}
        onClose={() => setViewPhotoIdx(null)}
      />
    </View>
  );
}

/** Вкладка «Цели»: Китай/подушка + побочные цели с прогрессом (локально + облако). */
export function PersonalTargetsScreen() {
  const { typography, spacing, colors } = useAppTheme();
  const { width: layoutWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const supabaseOn = useSupabaseConfigured;
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [boardTab, setBoardTab] = useState<SideGoalBoardTab>('all');
  const activeSprint = useSprintStore((s) => s.sprints.find((x) => x.status === 'active') ?? null);
  const seedFromSeedsIfEmpty = useSideGoalsStore((s) => s.seedFromSeedsIfEmpty);

  const { china, cushion } = useMemo(
    () => pickNikolayMoneyProgressGoals(activeSprint?.goals ?? []),
    [activeSprint]
  );

  const cfg = strategyPageConfig.goalsTab;

  const financeMonthVm = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, []);

  const isNikolay = isNikolayPrimaryAccount(email);

  const financeOverviewQ = useQuery({
    queryKey: [...FINANCE_QUERY_KEY, 'overview', userId, financeMonthVm.year, financeMonthVm.month],
    queryFn: () => loadFinanceOverview(userId!, financeMonthVm),
    enabled: Boolean(supabaseOn && userId && isNikolay),
  });

  const invalidateFinance = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...FINANCE_QUERY_KEY] });
  }, [qc]);

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
      setUserId(null);
      return undefined;
    }
    void sb.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <ScreenCanvas>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 12) + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: 120,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeaderChrome marginBottom={spacing.sm} />

        <View style={{ overflow: 'hidden', paddingBottom: 8 }}>
          <GoalsHero />
        </View>

        {!isNikolay ? (
          <AppSurfaceCard>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Раздел «Цели» персональный. Войди под аккаунтом{' '}
              <Text style={{ color: colors.text }}>nikolaytwins@gmail.com</Text>, чтобы видеть цели и прогресс.
            </Text>
          </AppSurfaceCard>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <GoalsBoardTabBar boardTab={boardTab} onBoardTab={setBoardTab} />
            <View style={{ gap: 4 }}>
              {boardTab === 'all' || boardTab === 'nearest' ? (
                <NikolayDayMoneyHeroCards
                  sprintId={activeSprint?.id ?? null}
                  chinaGoal={china}
                  cushionGoal={cushion}
                  desktopTwoColumn={layoutWidth >= 560}
                  financeAccounts={financeOverviewQ.data?.accounts ?? null}
                  financeUserId={userId}
                  onFinanceAccountsUpdated={invalidateFinance}
                />
              ) : null}
              <SideGoalsBoardBlock config={cfg} boardTab={boardTab} nearestSlot={null} />
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenCanvas>
  );
}
