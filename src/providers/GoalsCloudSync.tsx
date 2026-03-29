import { useEffect } from 'react';

import { startGlobalVisionSupabaseSync } from '@/services/globalVisionSupabaseSync';
import { startGoalsAnnualSupabaseSync } from '@/services/goalsAnnualSupabaseSync';

/** Годовые цели + глобальное видение: pull после входа, push с debounce (как спринты / привычки). */
export function GoalsCloudSync() {
  useEffect(() => {
    const stopAnnual = startGoalsAnnualSupabaseSync();
    const stopVision = startGlobalVisionSupabaseSync();
    return () => {
      stopAnnual();
      stopVision();
    };
  }, []);
  return null;
}
