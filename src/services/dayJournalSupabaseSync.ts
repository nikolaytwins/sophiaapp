import { isJournalDocumentEmpty, normalizeJournalDocument } from '@/features/day/dayJournal.logic';
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

  const remote = normalizeJournalDocument(data?.payload ?? data);
  await ensureDayJournalHydrated();
  const local = normalizeJournalDocument(useDayJournalStore.getState().doc);

  syncingFromCloud = true;
  try {
    if (isJournalDocumentEmpty(remote) && !isJournalDocumentEmpty(local)) {
      await pushDayJournalToCloud();
      return;
    }
    if (!isJournalDocumentEmpty(remote)) {
      useDayJournalStore.getState().replaceDocument(remote);
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
  const doc = normalizeJournalDocument(useDayJournalStore.getState().doc);

  const { error } = await sb.from('day_journal_sync_state').upsert(
    {
      user_id: session.user.id,
      payload: { doc },
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
      if (state.doc === prev.doc) return;
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
