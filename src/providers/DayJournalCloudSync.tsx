import { useEffect } from 'react';

import { startDayJournalSupabaseSync } from '@/services/dayJournalSupabaseSync';

/** Дневник (состояние, заметки): pull после входа, push с debounce. */
export function DayJournalCloudSync() {
  useEffect(() => {
    return startDayJournalSupabaseSync();
  }, []);
  return null;
}
