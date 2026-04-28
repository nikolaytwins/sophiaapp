import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STRATEGY } from '@/features/strategy/strategyDashboardUi';
import { strategyPageConfig } from '@/features/strategy/strategy.config';
import { StrategyHero } from '@/features/strategy/StrategyHero';
import { StrategyVisionHubEmbed } from '@/features/strategy/StrategyVisionHubEmbed';
import { ScreenHeaderChrome } from '@/shared/ui/ScreenHeaderChrome';
import { ScreenCanvas } from '@/shared/ui/ScreenCanvas';
import { useAppTheme } from '@/theme';

export function StrategyScreen() {
  const { spacing } = useAppTheme();
  const insets = useSafeAreaInsets();

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

        <StrategyHero
          overline={strategyPageConfig.meta.headerBadge}
          headline={strategyPageConfig.meta.title}
          microcopy={`${strategyPageConfig.meta.subtitle}\n\n${strategyPageConfig.meta.lastContentUpdate}`}
        />

        <StrategyVisionHubEmbed />
      </ScrollView>
    </ScreenCanvas>
  );
}
