import type { StrategyMonthlyPlanCardDef } from '@/features/strategy/strategyMonthlyPlanTypes';
import { useSupabaseConfigured } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import type { MonthlyPlansCloudPayload } from '@/stores/strategyMonthlyPlans.store';
import {
  ensureStrategyMonthlyPlansHydrated,
  useStrategyMonthlyPlansStore,
} from '@/stores/strategyMonthlyPlans.store';
import type { StrategyCheckpointsCloudPayload } from '@/stores/strategyCheckpoints.store';
import {
  ensureStrategyCheckpointsHydrated,
  useStrategyCheckpointsStore,
} from '@/stores/strategyCheckpoints.store';

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

function normalizeMonthlyPayload(data: unknown): MonthlyPlansCloudPayload {
  const empty: MonthlyPlansCloudPayload = {
    cardPatches: {},
    deletedCardIds: [],
    extraCardsByPlanId: {},
    updatedAt: '',
  };
  if (!data || typeof data !== 'object') return empty;
  const o = data as Record<string, unknown>;
  const cardPatches =
    o.cardPatches && typeof o.cardPatches === 'object' && !Array.isArray(o.cardPatches)
      ? (o.cardPatches as MonthlyPlansCloudPayload['cardPatches'])
      : {};
  const deletedCardIds = Array.isArray(o.deletedCardIds)
    ? o.deletedCardIds.filter((id): id is string => typeof id === 'string')
    : [];
  const extraCardsByPlanId: MonthlyPlansCloudPayload['extraCardsByPlanId'] = {};
  const extraRaw = o.extraCardsByPlanId;
  if (extraRaw && typeof extraRaw === 'object' && !Array.isArray(extraRaw)) {
    for (const [planId, arr] of Object.entries(extraRaw as Record<string, unknown>)) {
      if (Array.isArray(arr)) {
        const cards = arr.filter(
          (c): c is StrategyMonthlyPlanCardDef =>
            Boolean(c) && typeof c === 'object' && typeof (c as { id?: unknown }).id === 'string'
        );
        if (cards.length) extraCardsByPlanId[planId] = cards;
      }
    }
  }
  const updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : '';
  return { cardPatches, deletedCardIds, extraCardsByPlanId, updatedAt };
}

function normalizeCheckpointsPayload(data: unknown): StrategyCheckpointsCloudPayload {
  const empty: StrategyCheckpointsCloudPayload = { checked: {}, updatedAt: '' };
  if (!data || typeof data !== 'object') return empty;
  const o = data as Record<string, unknown>;
  const checked: Record<string, boolean> = {};
  const raw = o.checked;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'boolean') checked[k] = v;
    }
  }
  const updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : '';
  return { checked, updatedAt };
}

function isMonthlyEmpty(p: MonthlyPlansCloudPayload): boolean {
  return (
    Object.keys(p.cardPatches).length === 0 &&
    p.deletedCardIds.length === 0 &&
    Object.keys(p.extraCardsByPlanId).length === 0
  );
}

function monthlyWeight(p: MonthlyPlansCloudPayload): number {
  let extras = 0;
  for (const arr of Object.values(p.extraCardsByPlanId)) extras += arr.length;
  return Object.keys(p.cardPatches).length + p.deletedCardIds.length + extras;
}

function isCheckpointsEmpty(p: StrategyCheckpointsCloudPayload): boolean {
  return Object.keys(p.checked).length === 0;
}

export async function pushStrategyOverlaysToCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const uid = session.user.id;
  const now = new Date().toISOString();
  const monthly = useStrategyMonthlyPlansStore.getState().exportPayload();
  const checkpoints = useStrategyCheckpointsStore.getState().exportPayload();

  const [e1, e2] = await Promise.all([
    sb.from('strategy_monthly_plans_sync_state').upsert(
      { user_id: uid, payload: monthly, updated_at: now },
      { onConflict: 'user_id' }
    ),
    sb.from('strategy_checkpoints_sync_state').upsert(
      { user_id: uid, payload: checkpoints, updated_at: now },
      { onConflict: 'user_id' }
    ),
  ]);

  if (e1.error) console.warn('[strategy overlay sync] push monthly:', e1.error.message);
  if (e2.error) console.warn('[strategy overlay sync] push checkpoints:', e2.error.message);
}

export async function pullStrategyOverlaysFromCloud(): Promise<void> {
  if (!useSupabaseConfigured) return;
  const session = await requireSession();
  if (!session) return;

  const sb = getSupabase()!;
  const uid = session.user.id;

  const [mRes, cRes] = await Promise.all([
    sb.from('strategy_monthly_plans_sync_state').select('payload').eq('user_id', uid).maybeSingle(),
    sb.from('strategy_checkpoints_sync_state').select('payload').eq('user_id', uid).maybeSingle(),
  ]);

  if (mRes.error) console.warn('[strategy overlay sync] pull monthly:', mRes.error.message);
  if (cRes.error) console.warn('[strategy overlay sync] pull checkpoints:', cRes.error.message);

  await ensureStrategyMonthlyPlansHydrated();
  await ensureStrategyCheckpointsHydrated();

  const localM = useStrategyMonthlyPlansStore.getState().exportPayload();
  const localC = useStrategyCheckpointsStore.getState().exportPayload();
  const remoteM = normalizeMonthlyPayload(mRes.data?.payload);
  const remoteC = normalizeCheckpointsPayload(cRes.data?.payload);

  syncingFromCloud = true;
  try {
    if (isMonthlyEmpty(remoteM) && !isMonthlyEmpty(localM)) {
      await pushStrategyOverlaysToCloud();
    } else if (!isMonthlyEmpty(remoteM)) {
      const remoteT = Date.parse(remoteM.updatedAt);
      const localT = Date.parse(localM.updatedAt);
      const remoteNewer = Number.isFinite(remoteT) && (!Number.isFinite(localT) || remoteT > localT);
      const remoteRicher = monthlyWeight(remoteM) > monthlyWeight(localM);
      if (remoteNewer || remoteRicher) {
        useStrategyMonthlyPlansStore.getState().replaceFromCloud(remoteM);
      }
    }

    if (isCheckpointsEmpty(remoteC) && !isCheckpointsEmpty(localC)) {
      await pushStrategyOverlaysToCloud();
    } else if (!isCheckpointsEmpty(remoteC)) {
      const remoteT = Date.parse(remoteC.updatedAt);
      const localT = Date.parse(localC.updatedAt);
      const remoteNewer = Number.isFinite(remoteT) && (!Number.isFinite(localT) || remoteT > localT);
      const remoteRicher = Object.keys(remoteC.checked).length > Object.keys(localC.checked).length;
      if (remoteNewer || remoteRicher) {
        useStrategyCheckpointsStore.getState().replaceFromCloud(remoteC);
      }
    }
  } finally {
    syncingFromCloud = false;
  }
}

function schedulePush(): void {
  if (syncingFromCloud) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushStrategyOverlaysToCloud();
  }, DEBOUNCE_MS);
}

export function startStrategyOverlaySupabaseSync(): () => void {
  if (!useSupabaseConfigured) {
    return () => {};
  }

  const sb = getSupabase();
  if (!sb) {
    return () => {};
  }

  let cancelled = false;
  let unsubMonthly: (() => void) | undefined;
  let unsubCheckpoints: (() => void) | undefined;

  void (async () => {
    await ensureStrategyMonthlyPlansHydrated();
    await ensureStrategyCheckpointsHydrated();
    if (cancelled) return;
    await pullStrategyOverlaysFromCloud();
    if (cancelled) return;

    unsubMonthly = useStrategyMonthlyPlansStore.subscribe((state, prev) => {
      if (
        state.cardPatches === prev.cardPatches &&
        state.deletedCardIds === prev.deletedCardIds &&
        state.extraCardsByPlanId === prev.extraCardsByPlanId &&
        state.payloadUpdatedAt === prev.payloadUpdatedAt
      ) {
        return;
      }
      if (syncingFromCloud) return;
      schedulePush();
    });

    unsubCheckpoints = useStrategyCheckpointsStore.subscribe((state, prev) => {
      if (state.checked === prev.checked && state.payloadUpdatedAt === prev.payloadUpdatedAt) return;
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
      void pullStrategyOverlaysFromCloud();
    }
  });

  return () => {
    cancelled = true;
    authSub.unsubscribe();
    unsubMonthly?.();
    unsubCheckpoints?.();
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
  };
}
