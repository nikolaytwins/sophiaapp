import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DayJournalEntry, RecoveryId } from '@/features/day/dayJournal.types';

const STORAGE_KEY = 'sophia-os-day-journal-v1';

function emptyEntry(dateKey: string): DayJournalEntry {
  return {
    dateKey,
    recoveryIds: [],
    note: '',
    updatedAt: new Date().toISOString(),
  };
}

type State = {
  entries: Record<string, DayJournalEntry>;
  getEntry: (dateKey: string) => DayJournalEntry;
  updateEntry: (dateKey: string, patch: Partial<Omit<DayJournalEntry, 'dateKey'>>) => void;
  toggleRecovery: (dateKey: string, id: RecoveryId) => void;
};

export const useDayJournalStore = create<State>()(
  persist(
    (set, get) => ({
      entries: {},

      getEntry: (dateKey) => {
        const e = get().entries[dateKey];
        return e ?? emptyEntry(dateKey);
      },

      updateEntry: (dateKey, patch) => {
        set((s) => {
          const cur = s.entries[dateKey] ?? emptyEntry(dateKey);
          const next: DayJournalEntry = {
            ...cur,
            ...patch,
            dateKey,
            recoveryIds: patch.recoveryIds ?? cur.recoveryIds,
            updatedAt: new Date().toISOString(),
          };
          return { entries: { ...s.entries, [dateKey]: next } };
        });
      },

      toggleRecovery: (dateKey, id) => {
        set((s) => {
          const cur = s.entries[dateKey] ?? emptyEntry(dateKey);
          const had = cur.recoveryIds.includes(id);
          let recoveryIds: RecoveryId[];
          if (had) {
            recoveryIds = cur.recoveryIds.filter((x) => x !== id);
          } else if (cur.recoveryIds.length < 2) {
            recoveryIds = [...cur.recoveryIds, id];
          } else {
            recoveryIds = [...cur.recoveryIds.slice(1), id];
          }
          const next: DayJournalEntry = {
            ...cur,
            dateKey,
            recoveryIds,
            updatedAt: new Date().toISOString(),
          };
          return { entries: { ...s.entries, [dateKey]: next } };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ entries: s.entries }),
    }
  )
);

export function getAllDayJournalEntriesSorted(): DayJournalEntry[] {
  const { entries } = useDayJournalStore.getState();
  return Object.values(entries).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export type DayJournalExportDoc = {
  schema: 'sophia.dayJournal.v1';
  exportedAt: string;
  entries: DayJournalEntry[];
};

export function buildDayJournalExportDoc(): DayJournalExportDoc {
  return {
    schema: 'sophia.dayJournal.v1',
    exportedAt: new Date().toISOString(),
    entries: getAllDayJournalEntriesSorted(),
  };
}
