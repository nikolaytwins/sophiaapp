import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_V2 = 'sophia:final:event-done:v2';
const LEGACY_V1 = 'sophia:final:meeting-done:v1';

/** dateKey -> eventId -> done */
type StoreV2 = Record<string, Record<string, boolean>>;

async function loadStore(): Promise<StoreV2> {
  const raw = await AsyncStorage.getItem(STORAGE_V2);
  if (raw) {
    try {
      return JSON.parse(raw) as StoreV2;
    } catch {
      /* fallthrough */
    }
  }
  const leg = await AsyncStorage.getItem(LEGACY_V1);
  if (leg) {
    try {
      const parsed = JSON.parse(leg) as Record<string, boolean>;
      const today = new Date().toISOString().slice(0, 10);
      const inner: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (v) inner[k] = true;
      }
      const store: StoreV2 = { [today]: inner };
      await AsyncStorage.setItem(STORAGE_V2, JSON.stringify(store));
      await AsyncStorage.removeItem(LEGACY_V1);
      return store;
    } catch {
      /* ignore */
    }
  }
  return {};
}

async function saveStore(store: StoreV2): Promise<void> {
  await AsyncStorage.setItem(STORAGE_V2, JSON.stringify(store));
}

export function usePersistedFinalEventDone(dateKey: string) {
  const [doneForDay, setDoneForDay] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const store = await loadStore();
      if (!cancelled) {
        setDoneForDay(store[dateKey] ?? {});
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const isDone = useCallback(
    (eventId: string) => Boolean(doneForDay[eventId]),
    [doneForDay]
  );

  const toggle = useCallback(
    async (eventId: string) => {
      const nextVal = !doneForDay[eventId];
      const store = await loadStore();
      const day = { ...(store[dateKey] ?? {}), [eventId]: nextVal };
      if (!nextVal) {
        delete day[eventId];
      }
      store[dateKey] = day;
      await saveStore(store);
      setDoneForDay(day);
    },
    [dateKey, doneForDay]
  );

  return { isDone, toggle, ready };
}
