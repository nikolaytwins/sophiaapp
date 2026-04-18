import {
  emptyGlobalVisionDocument,
  normalizeGlobalVisionDocument,
} from '@/features/goals/globalVision.logic';
import type { GlobalVisionDocument } from '@/features/goals/globalVision.types';
import { useSupabaseConfigured } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import { ensureGlobalVisionHydrated, useGlobalVisionStore } from '@/stores/globalVision.store';

const DEBOUNCE_MS = 900;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let syncingFromCloud = false;

function isDocEmpty(d: GlobalVisionDocument): boolean {
  const hasBlockContent = d.blocks.some((b) => {
    if (b.kind === 'text') {
      const imgs = b.imageUris?.filter((u) => u.trim()) ?? [];
      return Boolean(b.text.trim()) || imgs.length > 0;
    }
    return Boolean(b.imageUri?.trim());
  });
  if (hasBlockContent) return false;
  const hasGoalPhotos = Object.values(d.goalLevelPhotos).some((arr) => arr.length > 0);
  if (hasGoalPhotos) return false;
  for (const k of ['relationships', 'energy', 'work'] as const) {
    if (d.sphereVisions[k].trim()) return false;
  }
  return true;
}

function normalizePayload(data: unknown): GlobalVisionDocument {
  if (!data || typeof data !== 'object') {
    return emptyGlobalVisionDocument(new Date().toISOString());
  }
  const o = data as Record<string, unknown>;
  if (o.doc != null && typeof o.doc === 'object') {
    return normalizeGlobalVisionDocument(o.doc);
  }
  return normalizeGlobalVisionDocument(data);
}

async function requireSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session?.user ? session : null;
}

export async function pullGlobalVisionFromCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const userId = session.user.id;

  const { data, error } = await sb
    .from('global_vision_sync_state')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[global vision sync] pull:', error.message);
    return;
  }

  const remoteDoc = normalizePayload(data?.payload);
  await ensureGlobalVisionHydrated();
  const local = useGlobalVisionStore.getState().doc;

  syncingFromCloud = true;
  try {
    if (isDocEmpty(remoteDoc) && !isDocEmpty(local)) {
      await pushGlobalVisionToCloud();
      return;
    }
    if (!isDocEmpty(remoteDoc)) {
      useGlobalVisionStore.getState().replaceDocument(remoteDoc);
    }
  } finally {
    syncingFromCloud = false;
  }
}

export async function pushGlobalVisionToCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const doc = normalizeGlobalVisionDocument(useGlobalVisionStore.getState().doc);
  const { error } = await sb.from('global_vision_sync_state').upsert(
    {
      user_id: session.user.id,
      payload: { doc },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn('[global vision sync] push:', error.message);
  }
}

function schedulePush(): void {
  if (syncingFromCloud) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushGlobalVisionToCloud();
  }, DEBOUNCE_MS);
}

/** Глобальное видение: pull после входа, push с debounce. */
export function startGlobalVisionSupabaseSync(): () => void {
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
    await ensureGlobalVisionHydrated();
    if (cancelled) return;
    await pullGlobalVisionFromCloud();
    if (cancelled) return;

    storeUnsub = useGlobalVisionStore.subscribe((state, prev) => {
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
      void pullGlobalVisionFromCloud();
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
