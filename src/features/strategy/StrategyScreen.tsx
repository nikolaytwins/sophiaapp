import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import { strategyPageConfig } from '@/features/strategy/strategy.config';
import { StrategyHeader } from '@/features/strategy/StrategyHeader';
import { StrategyPhaseAccordion } from '@/features/strategy/StrategyPhaseAccordion';
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

        <StrategyHeader config={strategyPageConfig.meta} />

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
            <View style={{ gap: spacing.xs }}>
              <Text style={[typography.title1, { letterSpacing: -0.2 }]}>
                {strategyPageConfig.strategySectionTitle}
              </Text>
              <View style={{ height: 1, backgroundColor: 'rgba(139,92,246,0.35)', borderRadius: 1 }} />
            </View>

            <View style={{ gap: spacing.md }}>
              {strategyPageConfig.phases.map((phase) => (
                <StrategyPhaseAccordion
                  key={phase.id}
                  phase={phase}
                  checkedMap={checked}
                  onToggleCheckpoint={onToggleCheckpoint}
                  readOnly={false}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenCanvas>
  );
}
