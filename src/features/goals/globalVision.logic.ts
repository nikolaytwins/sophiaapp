import type { AnnualSphere } from '@/features/goals/annualGoals.types';
import type { GlobalVisionBlock, GlobalVisionDocument } from '@/features/goals/globalVision.types';

export function newGlobalVisionBlockId(): string {
  return `gvb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function emptySphereVisions(): Record<AnnualSphere, string> {
  return { relationships: '', energy: '', work: '' };
}

export function emptyGlobalVisionDocument(nowIso: string): GlobalVisionDocument {
  return {
    blocks: [{ id: newGlobalVisionBlockId(), kind: 'text', text: '' }],
    sphereVisions: emptySphereVisions(),
    updatedAt: nowIso,
  };
}

export function normalizeGlobalVisionDocument(raw: unknown): GlobalVisionDocument {
  const now = new Date().toISOString();
  if (!raw || typeof raw !== 'object') return emptyGlobalVisionDocument(now);
  const o = raw as Record<string, unknown>;
  const blocksRaw = Array.isArray(o.blocks) ? o.blocks : [];
  const blocks: GlobalVisionBlock[] = blocksRaw
    .filter((b): b is Record<string, unknown> => b != null && typeof b === 'object')
    .map((b, i) => {
      const id = typeof b.id === 'string' ? b.id : newGlobalVisionBlockId();
      const kind = b.kind === 'image' ? 'image' : 'text';
      if (kind === 'image') {
        const uri = b.imageUri;
        return {
          id,
          kind: 'image' as const,
          imageUri: typeof uri === 'string' ? uri : uri === null ? null : null,
        };
      }
      return {
        id,
        kind: 'text' as const,
        text: typeof b.text === 'string' ? b.text : '',
      };
    });
  const base = emptyGlobalVisionDocument(typeof o.updatedAt === 'string' ? o.updatedAt : now);
  base.blocks = blocks.length > 0 ? blocks : base.blocks;
  const sv = o.sphereVisions;
  if (sv && typeof sv === 'object') {
    const r = sv as Record<string, unknown>;
    for (const k of ['relationships', 'energy', 'work'] as const) {
      if (typeof r[k] === 'string') base.sphereVisions[k] = r[k];
    }
  }
  base.updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : now;
  return base;
}
