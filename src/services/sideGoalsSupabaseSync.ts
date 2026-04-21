import { useSupabaseConfigured } from '@/config/env';
import { normalizeSideGoalsPayload, type SideGoalsSyncPayload } from '@/stores/sideGoals.store';
import { getSupabase } from '@/lib/supabase';
import { ensureSideGoalsHydrated, useSideGoalsStore } from '@/stores/sideGoals.store';

const DEBOUNCE_MS = 850;

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

function isPayloadEmpty(p: SideGoalsSyncPayload): boolean {
  return (p.goals?.length ?? 0) === 0;
}

export async function pullSideGoalsFromCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const userId = session.user.id;

  const { data, error } = await sb.from('side_goals_sync_state').select('payload').eq('user_id', userId).maybeSingle();

  if (error) {
    console.warn('[side goals sync] pull:', error.message);
    return;
  }

  const remote = normalizeSideGoalsPayload(data?.payload);
  await ensureSideGoalsHydrated();
  const local = useSideGoalsStore.getState().exportPayload();

  syncingFromCloud = true;
  try {
    if (isPayloadEmpty(remote) && !isPayloadEmpty(local)) {
      await pushSideGoalsToCloud();
      return;
    }
    if (!isPayloadEmpty(remote)) {
      const remoteT = Date.parse(remote.updatedAt);
      const localT = Date.parse(local.updatedAt);
      const remoteNewer = Number.isFinite(remoteT) && (!Number.isFinite(localT) || remoteT > localT);
      const remoteRicher = (remote.goals?.length ?? 0) > (local.goals?.length ?? 0);
      if (remoteNewer || remoteRicher) {
        useSideGoalsStore.getState().replaceFromCloud(remote);
      }
    }
  } finally {
    syncingFromCloud = false;
  }
}

export async function pushSideGoalsToCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const payload = useSideGoalsStore.getState().exportPayload();
  const { error } = await sb.from('side_goals_sync_state').upsert(
    {
      user_id: session.user.id,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn('[side goals sync] push:', error.message);
  }
}

function schedulePush(): void {
  if (syncingFromCloud) return;
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
    await pullSideGoalsFromCloud();
    if (cancelled) return;

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
      if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
      }
      return;
    }
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      void pullSideGoalsFromCloud();
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
