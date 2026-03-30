import {
  isDayJournalEmpty,
  normalizeDayJournalEntriesMap,
} from '@/features/day/dayJournal.logic';
import { useSupabaseConfigured } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import { ensureDayJournalHydrated, useDayJournalStore } from '@/stores/dayJournal.store';

const DEBOUNCE_MS = 900;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let syncingFromCloud = false;


async function requireSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session?.user ? session : null;
}

export async function pullDayJournalFromCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const userId = session.user.id;

  const { data, error } = await sb
    .from('day_journal_sync_state')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[day journal sync] pull:', error.message);
    return;
  }

  const remote = normalizeDayJournalEntriesMap(data?.payload ?? data);
  await ensureDayJournalHydrated();
  const local = useDayJournalStore.getState().entries;

  syncingFromCloud = true;
  try {
    if (isDayJournalEmpty(remote) && !isDayJournalEmpty(local)) {
      await pushDayJournalToCloud();
      return;
    }
    if (!isDayJournalEmpty(remote)) {
      useDayJournalStore.getState().replaceEntries(remote);
    }
  } finally {
    syncingFromCloud = false;
  }
}

export async function pushDayJournalToCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const entries = normalizeDayJournalEntriesMap(useDayJournalStore.getState().entries);

  const { error } = await sb.from('day_journal_sync_state').upsert(
    {
      user_id: session.user.id,
      payload: { entries },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn('[day journal sync] push:', error.message);
  }
}

function schedulePush(): void {
  if (syncingFromCloud) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushDayJournalToCloud();
  }, DEBOUNCE_MS);
}

/** Дневник дня: pull после входа, debounced push при изменении записей. */
export function startDayJournalSupabaseSync(): () => void {
  if (!useSupabaseConfigured) {
    return () => {};
  }

  const sb = getSupabase();
  if (!sb) {
    return () => {};
  }

  let cancelled = false;
  let storeUnsub: (() => void) | undefined;

  void (async () => {
    await ensureDayJournalHydrated();
    if (cancelled) return;
    await pullDayJournalFromCloud();
    if (cancelled) return;

    storeUnsub = useDayJournalStore.subscribe((state, prev) => {
      if (state.entries === prev.entries) return;
      if (syncingFromCloud) return;
      schedulePush();
    });
  })();

  const {
    data: { subscription: authSub },
  } = sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
      }
      return;
    }
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      void pullDayJournalFromCloud();
    }
  });

  return () => {
    cancelled = true;
    authSub.unsubscribe();
    storeUnsub?.();
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
  };
}
