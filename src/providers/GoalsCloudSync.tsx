import { useEffect } from 'react';

import { startGlobalVisionSupabaseSync } from '@/services/globalVisionSupabaseSync';
import { startGoalsAnnualSupabaseSync } from '@/services/goalsAnnualSupabaseSync';
import { startSideGoalsSupabaseSync } from '@/services/sideGoalsSupabaseSync';

/** Годовые цели + глобальное видение + личные цели вкладки «Цели»: pull после входа, push с debounce. */
export function GoalsCloudSync() {
  useEffect(() => {
    const stopAnnual = startGoalsAnnualSupabaseSync();
    const stopVision = startGlobalVisionSupabaseSync();
    const stopSide = startSideGoalsSupabaseSync();
    return () => {
      stopAnnual();
      stopVision();
      stopSide();
    };
  }, []);
  return null;
}
