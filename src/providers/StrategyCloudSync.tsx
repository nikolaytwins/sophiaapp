import { useEffect } from 'react';

import { startStrategyOverlaySupabaseSync } from '@/services/strategyOverlaySupabaseSync';

/** Месячные планы стратегии (overlay) + чекпоинты: pull после входа, push с debounce. */
export function StrategyCloudSync() {
  useEffect(() => {
    return startStrategyOverlaySupabaseSync();
  }, []);
  return null;
}
