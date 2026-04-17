import { mergeNikolayJournalFieldsIfNeeded } from '@/features/accounts/nikolayJournalFields';
import { mergeJournalDocuments, normalizeJournalDocument } from '@/features/day/dayJournal.logic';
import { useSupabaseConfigured } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import { ensureDayJournalHydrated, useDayJournalStore } from '@/stores/dayJournal.store';

const DEBOUNCE_MS = 900;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
/** Подавляет debounce-push при замене стора из pull/push (избегаем лишних upsert). */
let suppressJournalAutoPush = false;

async function requireSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session?.user ? session : null;
}

async function fetchRemoteJournalPayload(userId: string): Promise<unknown> {
  const sb = getSupabase()!;
  const { data, error } = await sb
    .from('day_journal_sync_state')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[day journal sync] fetch payload:', error.message);
    return undefined;
  }
  return data?.payload ?? data;
}

function withNikolay(doc: unknown, email: string | null | undefined) {
  return mergeNikolayJournalFieldsIfNeeded(normalizeJournalDocument(doc), email);
}

export async function pullDayJournalFromCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const rawRemote = await fetchRemoteJournalPayload(session.user.id);
  const remoteNik = withNikolay(rawRemote ?? {}, session.user.email);
  await ensureDayJournalHydrated();
  const localNik = withNikolay(useDayJournalStore.getState().doc, session.user.email);
  const merged = mergeJournalDocuments(localNik, remoteNik);

  suppressJournalAutoPush = true;
  try {
    useDayJournalStore.getState().replaceDocument(merged);
    if (JSON.stringify(merged) !== JSON.stringify(remoteNik)) {
      await pushDayJournalToCloud({ skipRemoteFetch: true, premergedDoc: merged });
    }
  } finally {
    suppressJournalAutoPush = false;
  }
}

type PushOpts = {
  /** Уже смерженный документ (из pull), повторно не читаем БД. */
  skipRemoteFetch?: boolean;
  premergedDoc?: ReturnType<typeof normalizeJournalDocument>;
};

export async function pushDayJournalToCloud(opts?: PushOpts): Promise<void> {
  if (!useSupabaseConfigured) {
    throw new Error('Supabase не настроен');
  }
  const session = await requireSession();
  if (!session) {
    throw new Error('Нет активной сессии Supabase');
  }

  const sb = getSupabase()!;
  const email = session.user.email;

  let merged: ReturnType<typeof normalizeJournalDocument>;
  if (opts?.skipRemoteFetch && opts.premergedDoc) {
    merged = normalizeJournalDocument(opts.premergedDoc);
  } else {
    const rawRemote = await fetchRemoteJournalPayload(session.user.id);
    const remoteNik = withNikolay(rawRemote ?? {}, email);
    const localNik = withNikolay(useDayJournalStore.getState().doc, email);
    merged = mergeJournalDocuments(localNik, remoteNik);
  }

  const { error } = await sb.from('day_journal_sync_state').upsert(
    {
      user_id: session.user.id,
      payload: { doc: merged },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn('[day journal sync] push:', error.message);
    throw new Error(error.message);
  }

  const localNow = withNikolay(useDayJournalStore.getState().doc, email);
  if (JSON.stringify(merged) !== JSON.stringify(localNow)) {
    suppressJournalAutoPush = true;
    try {
      useDayJournalStore.getState().replaceDocument(merged);
    } finally {
      suppressJournalAutoPush = false;
    }
  }
}

function schedulePush(): void {
  if (suppressJournalAutoPush) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushDayJournalToCloud().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[day journal sync] scheduled push failed:', message);
    });
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
      if (suppressJournalAutoPush) return;
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
