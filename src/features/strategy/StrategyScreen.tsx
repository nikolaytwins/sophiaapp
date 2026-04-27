import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { STRATEGY } from '@/features/strategy/strategyDashboardUi';
import { strategyPageConfig, type StrategyMainTabId } from '@/features/strategy/strategy.config';
import { StrategyHero } from '@/features/strategy/StrategyHero';
import { StrategyAboutNotesPanel } from '@/features/strategy/StrategyAboutNotesPanel';
import { StrategyGlobalVisionPanel } from '@/features/strategy/StrategyGlobalVisionPanel';
import { StrategyInnerTabs } from '@/features/strategy/StrategyInnerTabs';
import { StrategyNewStrategyPanel } from '@/features/strategy/StrategyNewStrategyPanel';
import { StrategyStrategyTabPanel } from '@/features/strategy/StrategyStrategyTabPanel';
import { getSupabase } from '@/lib/supabase';
import { ensureStrategyCheckpointsHydrated, useStrategyCheckpointsStore } from '@/stores/strategyCheckpoints.store';
import { ensureStrategyMonthlyPlansHydrated } from '@/stores/strategyMonthlyPlans.store';
import { AppSurfaceCard } from '@/shared/ui/AppSurfaceCard';
import { ScreenHeaderChrome } from '@/shared/ui/ScreenHeaderChrome';
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
    void ensureStrategyMonthlyPlansHydrated();
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
          paddingTop: Math.max(insets.top, 12) + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: 140,
          gap: STRATEGY.sectionGap,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeaderChrome marginBottom={spacing.sm} avatarMarginTop={2} />

        {!isNikolay ? (
          <AppSurfaceCard glow style={{ borderRadius: STRATEGY.cardRadiusLg }}>
            <Text style={[typography.body, { color: colors.textMuted, lineHeight: 24 }]}>
              Этот раздел персональный: чекпоинты и контент привязаны к аккаунту{' '}
              <Text style={{ color: colors.text }}>nikolaytwins@gmail.com</Text>. Войди под этим пользователем, чтобы
              видеть дорожную карту и отмечать пункты.
            </Text>
          </AppSurfaceCard>
        ) : (
          <>
            <StrategyHero
              overline={strategyPageConfig.meta.headerBadge}
              headline={strategyPageConfig.meta.title}
              microcopy={`${strategyPageConfig.meta.subtitle}\n\n${strategyPageConfig.meta.lastContentUpdate}`}
            />
            <StrategyInnerTabs labels={strategyPageConfig.tabs} active={mainTab} onChange={setMainTab} />

            {mainTab === 'strategy' ? (
              <StrategyStrategyTabPanel checked={checked} onToggleCheckpoint={onToggleCheckpoint} />
            ) : null}
            {mainTab === 'vision' ? <StrategyGlobalVisionPanel config={strategyPageConfig.globalVision} /> : null}
            {mainTab === 'notes' ? <StrategyAboutNotesPanel config={strategyPageConfig.aboutMeNotes} /> : null}
            {mainTab === 'newStrategy' ? (
              <StrategyNewStrategyPanel config={strategyPageConfig.newStrategySynastry} />
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenCanvas>
  );
}
