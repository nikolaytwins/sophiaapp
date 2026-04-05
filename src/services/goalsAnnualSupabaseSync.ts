import { applyNikolayAnnualGoalsProfile } from '@/features/accounts/nikolayAnnualMigration';
import { emptyAnnualDocument, normalizeAnnualDocument } from '@/features/goals/annualGoals.logic';
import type { AnnualGoalsDocument } from '@/features/goals/annualGoals.types';
import { useSupabaseConfigured } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import { ensureAnnualGoalsHydrated, useAnnualGoalsStore } from '@/stores/annualGoals.store';

const DEBOUNCE_MS = 900;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let syncingFromCloud = false;

function isDocEmpty(d: AnnualGoalsDocument): boolean {
  for (const sp of ['relationships', 'energy', 'work'] as const) {
    if (d.spheres[sp].visionText.trim()) return false;
    if (d.spheres[sp].cards.length > 0) return false;
  }
  if (d.generalGoals.length > 0) return false;
  for (const k of ['1', '2', '3', '4'] as const) {
    if ((d.queuedBySprintSlot[k] ?? []).length > 0) return false;
  }
  for (const s of d.sprintSlots) {
    if (s.startDate || s.endDate) return false;
  }
  return true;
}

function normalizePayload(data: unknown): AnnualGoalsDocument {
  if (!data || typeof data !== 'object') {
    return emptyAnnualDocument(new Date().getFullYear(), new Date().toISOString());
  }
  const o = data as Record<string, unknown>;
  if (o.doc != null && typeof o.doc === 'object') {
    return normalizeAnnualDocument(o.doc);
  }
  return normalizeAnnualDocument(data);
}

async function requireSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session?.user ? session : null;
}

export async function pullAnnualGoalsFromCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const userId = session.user.id;

  const { data, error } = await sb
    .from('annual_goals_sync_state')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[annual goals sync] pull:', error.message);
    return;
  }

  const rawRemoteDoc = normalizePayload(data?.payload);
  const remoteDoc = applyNikolayAnnualGoalsProfile(rawRemoteDoc, session.user.email);
  await ensureAnnualGoalsHydrated();
  const local = useAnnualGoalsStore.getState().doc;

  syncingFromCloud = true;
  try {
    if (isDocEmpty(remoteDoc) && !isDocEmpty(local)) {
      await pushAnnualGoalsToCloud();
      return;
    }
    if (!isDocEmpty(remoteDoc)) {
      useAnnualGoalsStore.getState().replaceDocument(remoteDoc);
      if (JSON.stringify(remoteDoc) !== JSON.stringify(rawRemoteDoc)) {
        syncingFromCloud = false;
        await pushAnnualGoalsToCloud();
        syncingFromCloud = true;
      }
    }
  } finally {
    syncingFromCloud = false;
  }
}

export async function pushAnnualGoalsToCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const doc = normalizeAnnualDocument(useAnnualGoalsStore.getState().doc);
  const { error } = await sb.from('annual_goals_sync_state').upsert(
    {
      user_id: session.user.id,
      payload: { doc },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn('[annual goals sync] push:', error.message);
  }
}

function schedulePush(): void {
  if (syncingFromCloud) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushAnnualGoalsToCloud();
  }, DEBOUNCE_MS);
}

export function startGoalsAnnualSupabaseSync(): () => void {
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
    await ensureAnnualGoalsHydrated();
    if (cancelled) return;
    await pullAnnualGoalsFromCloud();
    if (cancelled) return;

    storeUnsub = useAnnualGoalsStore.subscribe((state, prev) => {
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
      void pullAnnualGoalsFromCloud();
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
