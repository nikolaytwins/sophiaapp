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

import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { NikolayDayMoneyHeroCards, pickNikolayMoneyProgressGoals } from '@/features/accounts/nikolayHabitsUi';
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

function SideGoalProgressCard({
  goal,
  onEdit,
}: {
  goal: SideGoalPersisted;
  onEdit: () => void;
}) {
  const { typography, spacing, colors } = useAppTheme();
  const pct = Math.min(1, Math.max(0, goal.target > 0 ? goal.current / goal.target : 0));

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
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg + 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <Text style={[typography.title2, { flex: 1, fontSize: 17, fontWeight: '800', color: colors.text }]}>
            {goal.title}
          </Text>
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
    </LinearGradient>
  );
}

function SideGoalsEditorBlock({ config }: { config: StrategyGoalsTabDef }) {
  const { typography, spacing, colors } = useAppTheme();
  const goals = useSideGoalsStore((s) => s.goals);
  const updateSideGoal = useSideGoalsStore((s) => s.updateSideGoal);

  const [editId, setEditId] = useState<string | null>(null);
  const editing = editId ? goals.find((g) => g.id === editId) : null;
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCurrent, setDraftCurrent] = useState('');
  const [draftTarget, setDraftTarget] = useState('');

  useEffect(() => {
    if (!editing) return;
    setDraftTitle(editing.title);
    setDraftCurrent(String(editing.current));
    setDraftTarget(String(editing.target));
  }, [editing]);

  const closeModal = useCallback(() => setEditId(null), []);

  const save = useCallback(() => {
    if (!editId) return;
    const t = Math.max(1, parseAmount(draftTarget));
    const c = Math.max(0, parseAmount(draftCurrent));
    updateSideGoal(editId, { title: draftTitle.trim(), target: t, current: Math.min(c, t) });
    setEditId(null);
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [draftCurrent, draftTarget, draftTitle, editId, updateSideGoal]);

  return (
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
        {config.sideSectionTitle}
      </Text>

      <View style={{ gap: spacing.lg }}>
        {goals.map((g) => (
          <SideGoalProgressCard key={g.id} goal={g} onEdit={() => setEditId(g.id)} />
        ))}
      </View>

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
            }}
          >
            <Text style={[typography.title2, { marginBottom: spacing.md, color: colors.text }]}>Цель</Text>

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
