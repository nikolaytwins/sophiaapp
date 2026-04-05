import { applyNikolaySprintProfile } from '@/features/accounts/nikolaySprintMigration';
import type { Sprint } from '@/features/sprint/sprint.types';
import { normalizeSingleActiveSprint } from '@/features/sprint/sprint.logic';
import { useSupabaseConfigured } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import { ensureSprintStoreHydrated, useSprintStore } from '@/stores/sprint.store';

const DEBOUNCE_MS = 900;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let syncingFromCloud = false;

function normalizePayload(data: unknown): Sprint[] {
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  const raw = Array.isArray(o.sprints) ? (o.sprints as Sprint[]) : [];
  return normalizeSingleActiveSprint(raw);
}

async function requireSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session?.user ? session : null;
}

/** Загрузить спринты из облака и применить к стору. */
export async function pullSprintStateFromCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const userId = session.user.id;

  const { data, error } = await sb
    .from('sprint_sync_state')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[sprint sync] pull:', error.message);
    return;
  }

  const rawRemote = normalizePayload(data?.payload);
  const remote = applyNikolaySprintProfile(rawRemote, session.user.email);
  await ensureSprintStoreHydrated();
  const local = useSprintStore.getState().sprints;

  syncingFromCloud = true;
  try {
    if (remote.length === 0 && local.length > 0) {
      await pushSprintStateToCloud();
      return;
    }
    if (remote.length > 0) {
      useSprintStore.setState({ sprints: remote });
      if (JSON.stringify(remote) !== JSON.stringify(rawRemote)) {
        syncingFromCloud = false;
        await pushSprintStateToCloud();
        syncingFromCloud = true;
      }
    }
  } finally {
    syncingFromCloud = false;
  }
}

export async function pushSprintStateToCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const sprints = normalizeSingleActiveSprint(useSprintStore.getState().sprints);
  const { error } = await sb.from('sprint_sync_state').upsert(
    {
      user_id: session.user.id,
      payload: { sprints },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn('[sprint sync] push:', error.message);
  }
}

function schedulePushSprintState(): void {
  if (syncingFromCloud) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushSprintStateToCloud();
  }, DEBOUNCE_MS);
}

/**
 * После гидратации: pull. Изменения sprints — debounced push.
 * Смена сессии: pull (без TOKEN_REFRESHED, чтобы не затирать локаль без нужды).
 */
export function startSprintSupabaseSync(): () => void {
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
    await ensureSprintStoreHydrated();
    if (cancelled) return;
    await pullSprintStateFromCloud();
    if (cancelled) return;

    storeUnsub = useSprintStore.subscribe((state, prev) => {
      if (state.sprints === prev.sprints) return;
      if (syncingFromCloud) return;
      schedulePushSprintState();
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
      void pullSprintStateFromCloud();
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
