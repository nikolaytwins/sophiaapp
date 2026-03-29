import type {
  AnnualGoalsDocument,
  AnnualSphere,
  AnnualSphereSection,
  AnnualSprintSlotConfig,
  AnnualSprintSlotId,
  QueuedAnnualSprintGoal,
} from '@/features/goals/annualGoals.types';

export function newAnnualCardId(): string {
  return `agc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newQueuedAnnualGoalId(): string {
  return `agq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const SPRINT_SLOT_IDS: AnnualSprintSlotId[] = [1, 2, 3, 4];

export function defaultSprintSlots(): AnnualSprintSlotConfig[] {
  return SPRINT_SLOT_IDS.map((id) => ({ id, startDate: null, endDate: null }));
}

export function emptyQueuedBySlot(): AnnualGoalsDocument['queuedBySprintSlot'] {
  return { '1': [], '2': [], '3': [], '4': [] };
}

function emptySection(sphere: AnnualSphere): AnnualSphereSection {
  return { sphere, visionText: '', cards: [] };
}

export function emptyAnnualDocument(year: number, nowIso: string): AnnualGoalsDocument {
  return {
    year,
    spheres: {
      relationships: emptySection('relationships'),
      energy: emptySection('energy'),
      work: emptySection('work'),
    },
    sprintSlots: defaultSprintSlots(),
    queuedBySprintSlot: emptyQueuedBySlot(),
    generalGoals: [],
    updatedAt: nowIso,
  };
}

/** Нормализация данных после загрузки из JSON / облака. */
export function normalizeAnnualDocument(raw: unknown): AnnualGoalsDocument {
  const now = new Date().toISOString();
  const y = new Date().getFullYear();
  if (!raw || typeof raw !== 'object') return emptyAnnualDocument(y, now);
  const o = raw as Record<string, unknown>;
  const year = typeof o.year === 'number' && o.year > 1999 ? o.year : y;
  const spheresIn = o.spheres;
  const base = emptyAnnualDocument(year, typeof o.updatedAt === 'string' ? o.updatedAt : now);
  if (!spheresIn || typeof spheresIn !== 'object') return base;

  const s = spheresIn as Record<string, unknown>;
  for (const key of ['relationships', 'energy', 'work'] as const) {
    const block = s[key];
    if (!block || typeof block !== 'object') continue;
    const b = block as Record<string, unknown>;
    const visionText = typeof b.visionText === 'string' ? b.visionText : '';
    const cardsRaw = Array.isArray(b.cards) ? b.cards : [];
    const cards = cardsRaw
      .filter((c): c is Record<string, unknown> => c != null && typeof c === 'object')
      .map((c, i) => ({
        id: typeof c.id === 'string' ? c.id : newAnnualCardId(),
        title: typeof c.title === 'string' ? c.title : '',
        problematica: typeof c.problematica === 'string' ? c.problematica : undefined,
        imageUri: typeof c.imageUri === 'string' ? c.imageUri : c.imageUri === null ? null : undefined,
        sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : i,
      }));
    const sorted = [...cards].sort((a, b) => a.sortOrder - b.sortOrder);
    /** Годовая цель — одна на сферу; лишние карточки отбрасываем при загрузке. */
    const oneCard = sorted.slice(0, 1);
    base.spheres[key] = { sphere: key, visionText, cards: oneCard };
  }

  const slotsRaw = o.sprintSlots;
  if (Array.isArray(slotsRaw) && slotsRaw.length > 0) {
    const byId = new Map<number, AnnualSprintSlotConfig>();
    for (const row of slotsRaw) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'number' && (r.id === 1 || r.id === 2 || r.id === 3 || r.id === 4) ? r.id : null;
      if (id == null) continue;
      const startDate =
        typeof r.startDate === 'string' && r.startDate.trim() ? r.startDate.trim() : null;
      const endDate = typeof r.endDate === 'string' && r.endDate.trim() ? r.endDate.trim() : null;
      byId.set(id, { id: id as AnnualSprintSlotId, startDate, endDate });
    }
    base.sprintSlots = SPRINT_SLOT_IDS.map((id) => byId.get(id) ?? { id, startDate: null, endDate: null });
  } else {
    base.sprintSlots = defaultSprintSlots();
  }

  const qIn = o.queuedBySprintSlot;
  const emptyQ = emptyQueuedBySlot();
  if (qIn && typeof qIn === 'object') {
    for (const k of ['1', '2', '3', '4'] as const) {
      const arr = Array.isArray((qIn as Record<string, unknown>)[k]) ? (qIn as Record<string, unknown>)[k] : [];
      const list: QueuedAnnualSprintGoal[] = (arr as unknown[])
        .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
        .map((c) => {
          const sphere: AnnualSphere | undefined =
            c.sphere === 'relationships' || c.sphere === 'energy' || c.sphere === 'work' ? c.sphere : undefined;
          return {
            id: typeof c.id === 'string' ? c.id : newQueuedAnnualGoalId(),
            title: typeof c.title === 'string' ? c.title : '',
            problematica: typeof c.problematica === 'string' ? c.problematica : undefined,
            ...(sphere ? { sphere } : {}),
          };
        });
      emptyQ[k] = list.filter((x) => x.title.trim());
    }
    base.queuedBySprintSlot = emptyQ;
  } else {
    base.queuedBySprintSlot = emptyQueuedBySlot();
  }

  const genRaw = o.generalGoals;
  if (Array.isArray(genRaw)) {
    base.generalGoals = genRaw
      .filter((c): c is Record<string, unknown> => c != null && typeof c === 'object')
      .map((c, i) => ({
        id: typeof c.id === 'string' ? c.id : newAnnualCardId(),
        title: typeof c.title === 'string' ? c.title : '',
        problematica: typeof c.problematica === 'string' ? c.problematica : undefined,
        imageUri: typeof c.imageUri === 'string' ? c.imageUri : c.imageUri === null ? null : undefined,
        sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : i,
      }))
      .filter((c) => c.title.trim());
  } else {
    base.generalGoals = [];
  }

  base.updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : now;
  base.year = year;
  return base;
}
