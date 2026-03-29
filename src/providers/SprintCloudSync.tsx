import { useEffect } from 'react';

import { startSprintSupabaseSync } from '@/services/sprintSupabaseSync';

/** Синхронизация спринтов с Supabase (как habit_sync_state): pull при входе, push с debounce при изменениях. */
export function SprintCloudSync() {
  useEffect(() => {
    return startSprintSupabaseSync();
  }, []);
  return null;
}
