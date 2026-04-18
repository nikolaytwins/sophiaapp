import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { strategyPageConfig, type StrategyMainTabId } from '@/features/strategy/strategy.config';
import { StrategyAboutNotesPanel } from '@/features/strategy/StrategyAboutNotesPanel';
import { StrategyGlobalVisionPanel } from '@/features/strategy/StrategyGlobalVisionPanel';
import { StrategyGoalsTabPanel } from '@/features/strategy/StrategyGoalsTabPanel';
import { StrategyInnerTabs } from '@/features/strategy/StrategyInnerTabs';
import { StrategyStrategyTabPanel } from '@/features/strategy/StrategyStrategyTabPanel';
import { getSupabase } from '@/lib/supabase';
import { ensureStrategyCheckpointsHydrated, useStrategyCheckpointsStore } from '@/stores/strategyCheckpoints.store';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { HeaderProfileAvatar } from '@/shared/ui/HeaderProfileAvatar';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

export function StrategyScreen() {
  const { typography, spacing, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<StrategyMainTabId>('strategy');

  const checked = useStrategyCheckpointsStore((s) => s.checked);
  const toggle = useStrategyCheckpointsStore((s) => s.toggle);

  useEffect(() => {
    void ensureStrategyCheckpointsHydrated();
  }, []);

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

  const onToggleCheckpoint = useCallback(
    (id: string) => {
      if (!isNikolay) return;
      toggle(id);
    },
    [isNikolay, toggle]
  );

  return (
    <ScreenCanvas>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 12) + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: 120,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <HeaderProfileAvatar />
        </View>

        {!isNikolay ? (
          <AppSurfaceCard>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Этот раздел персональный: чекпоинты и контент привязаны к аккаунту{' '}
              <Text style={{ color: colors.text }}>nikolaytwins@gmail.com</Text>. Войди под этим пользователем, чтобы
              видеть дорожную карту и отмечать пункты.
            </Text>
          </AppSurfaceCard>
        ) : (
          <>
            <StrategyInnerTabs labels={strategyPageConfig.tabs} active={mainTab} onChange={setMainTab} />

            {mainTab === 'strategy' ? (
              <StrategyStrategyTabPanel checked={checked} onToggleCheckpoint={onToggleCheckpoint} />
            ) : null}
            {mainTab === 'vision' ? <StrategyGlobalVisionPanel config={strategyPageConfig.globalVision} /> : null}
            {mainTab === 'notes' ? <StrategyAboutNotesPanel config={strategyPageConfig.aboutMeNotes} /> : null}
            {mainTab === 'goals' ? <StrategyGoalsTabPanel config={strategyPageConfig.goalsTab} /> : null}
          </>
        )}
      </ScrollView>
    </ScreenCanvas>
  );
}
