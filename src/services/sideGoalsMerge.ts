import type { SideGoalPersisted, SideGoalsSyncPayload } from '@/stores/sideGoals.store';

function touchNow(): string {
  return new Date().toISOString();
}

function goalRichness(g: SideGoalPersisted): number {
  let score = g.photoUris.length * 100;
  if (g.description.trim()) score += 5;
  if (g.current > 0) score += 3;
  if (g.dateMode !== 'none') score += 2;
  if (g.isHorizon || g.isNearestPinned) score += 1;
  return score;
}

function mergeOneGoal(a: SideGoalPersisted, b: SideGoalPersisted): SideGoalPersisted {
  const primary = goalRichness(a) >= goalRichness(b) ? a : b;
  const secondary = primary === a ? b : a;
  const photoUris = [...new Set([...primary.photoUris, ...secondary.photoUris])];
  return {
    ...primary,
    title: primary.title.trim() ? primary.title : secondary.title,
    description: primary.description.trim() ? primary.description : secondary.description,
    photoUris,
    current: Math.max(a.current, b.current),
    target: Math.max(a.target, b.target),
    isHorizon: a.isHorizon || b.isHorizon,
    isNearestPinned: a.isNearestPinned || b.isNearestPinned,
    dateMode: primary.dateMode !== 'none' ? primary.dateMode : secondary.dateMode,
    dateSingle: primary.dateSingle ?? secondary.dateSingle,
    dateFrom: primary.dateFrom ?? secondary.dateFrom,
    dateTo: primary.dateTo ?? secondary.dateTo,
  };
}

/** Объединяет локальные и облачные цели по id — не теряет фото и пользовательские поля. */
export function mergeSideGoalsPayload(
  local: SideGoalsSyncPayload,
  remote: SideGoalsSyncPayload
): SideGoalsSyncPayload {
  const byId = new Map<string, SideGoalPersisted>();

  for (const g of remote.goals) {
    byId.set(g.id, g);
  }
  for (const g of local.goals) {
    const prev = byId.get(g.id);
    byId.set(g.id, prev ? mergeOneGoal(prev, g) : g);
  }

  const localT = Date.parse(local.updatedAt);
  const remoteT = Date.parse(remote.updatedAt);
  let updatedAt = touchNow();
  if (Number.isFinite(localT) && Number.isFinite(remoteT)) {
    updatedAt = localT >= remoteT ? local.updatedAt : remote.updatedAt;
  } else if (Number.isFinite(localT)) {
    updatedAt = local.updatedAt;
  } else if (Number.isFinite(remoteT)) {
    updatedAt = remote.updatedAt;
  }

  return { goals: [...byId.values()], updatedAt };
}

export function sideGoalsPayloadsEqual(a: SideGoalsSyncPayload, b: SideGoalsSyncPayload): boolean {
  if (a.goals.length !== b.goals.length) return false;
  const sortKey = (g: SideGoalPersisted) => g.id;
  const ga = [...a.goals].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  const gb = [...b.goals].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  return JSON.stringify(ga) === JSON.stringify(gb);
}
