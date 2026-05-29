import { useSupabaseConfigured } from '@/config/env';
import { bootstrapSideGoalsAfterCloudPull } from '@/services/sideGoalsBootstrap';
import { mergeSideGoalsPayload, sideGoalsPayloadsEqual } from '@/services/sideGoalsMerge';
import { recoverSideGoalPhotosFromStorage } from '@/services/sideGoalsPhotoRecovery';
import { normalizeSideGoalsPayload, type SideGoalsSyncPayload } from '@/stores/sideGoals.store';
import { getSupabase } from '@/lib/supabase';
import { ensureSideGoalsHydrated, useSideGoalsStore } from '@/stores/sideGoals.store';

const DEBOUNCE_MS = 850;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let syncingFromCloud = false;
let initialSyncDone = false;

async function requireSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session?.user ? session : null;
}

function isPayloadEmpty(p: SideGoalsSyncPayload): boolean {
  return (p.goals?.length ?? 0) === 0;
}

async function fetchRemotePayload(userId: string): Promise<SideGoalsSyncPayload> {
  const sb = getSupabase()!;
  const { data, error } = await sb
    .from('side_goals_sync_state')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[side goals sync] fetch:', error.message);
    return { goals: [], updatedAt: '' };
  }
  return normalizeSideGoalsPayload(data?.payload);
}

export async function pullSideGoalsFromCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const userId = session.user.id;
  const remote = await fetchRemotePayload(userId);
  await ensureSideGoalsHydrated();
  const local = useSideGoalsStore.getState().exportPayload();

  syncingFromCloud = true;
  try {
    if (isPayloadEmpty(remote) && !isPayloadEmpty(local)) {
      await pushSideGoalsToCloud();
      return;
    }

    if (!isPayloadEmpty(remote) || !isPayloadEmpty(local)) {
      let merged = mergeSideGoalsPayload(local, remote);
      const { goals: withPhotos, restoredCount } = await recoverSideGoalPhotosFromStorage(userId, merged.goals);
      if (restoredCount > 0) {
        merged = { ...merged, goals: withPhotos, updatedAt: new Date().toISOString() };
      }

      if (!sideGoalsPayloadsEqual(merged, local)) {
        useSideGoalsStore.getState().replaceFromCloud(merged);
      }

      if (!sideGoalsPayloadsEqual(merged, remote)) {
        await upsertPayload(userId, merged);
      }
    }
  } finally {
    syncingFromCloud = false;
  }
}

async function upsertPayload(userId: string, payload: SideGoalsSyncPayload): Promise<void> {
  const sb = getSupabase()!;
  const { error } = await sb.from('side_goals_sync_state').upsert(
    {
      user_id: userId,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    console.warn('[side goals sync] upsert:', error.message);
  }
}

export async function pushSideGoalsToCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const userId = session.user.id;
  const local = useSideGoalsStore.getState().exportPayload();
  const remote = await fetchRemotePayload(userId);
  const merged = mergeSideGoalsPayload(local, remote);

  if (!sideGoalsPayloadsEqual(merged, local)) {
    syncingFromCloud = true;
    try {
      useSideGoalsStore.getState().replaceFromCloud(merged);
    } finally {
      syncingFromCloud = false;
    }
  }

  if (!sideGoalsPayloadsEqual(merged, remote)) {
    await upsertPayload(userId, merged);
  }
}

function schedulePush(): void {
  if (syncingFromCloud) return;
  if (!initialSyncDone) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushSideGoalsToCloud();
  }, DEBOUNCE_MS);
}

export function startSideGoalsSupabaseSync(): () => void {
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
    await ensureSideGoalsHydrated();
    if (cancelled) return;

    const session = await requireSession();
    if (session && !cancelled) {
      await pullSideGoalsFromCloud();
      if (!cancelled) {
        await bootstrapSideGoalsAfterCloudPull(session.user.id);
        await pushSideGoalsToCloud();
      }
    }

    if (cancelled) return;
    initialSyncDone = true;

    storeUnsub = useSideGoalsStore.subscribe((state, prev) => {
      if (state.goals === prev.goals && state.payloadUpdatedAt === prev.payloadUpdatedAt) return;
      if (syncingFromCloud) return;
      schedulePush();
    });
  })();

  const {
    data: { subscription: authSub },
  } = sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      initialSyncDone = false;
      if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
      }
      return;
    }
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      void (async () => {
        const s = await requireSession();
        if (!s) return;
        await pullSideGoalsFromCloud();
        await bootstrapSideGoalsAfterCloudPull(s.user.id);
        initialSyncDone = true;
        await pushSideGoalsToCloud();
      })();
    }
  });

  return () => {
    cancelled = true;
    initialSyncDone = false;
    authSub.unsubscribe();
    storeUnsub?.();
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
  };
}
