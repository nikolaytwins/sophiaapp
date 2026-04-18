import type { AnnualSphere } from '@/features/goals/annualGoals.types';
import type { GlobalVisionBlock, GlobalVisionDocument, GlobalVisionTextBlock } from '@/features/goals/globalVision.types';

export function newGlobalVisionBlockId(): string {
  return `gvb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function emptySphereVisions(): Record<AnnualSphere, string> {
  return { relationships: '', energy: '', work: '' };
}

export function emptyGlobalVisionDocument(nowIso: string): GlobalVisionDocument {
  return {
    blocks: [{ id: newGlobalVisionBlockId(), kind: 'text', text: '' }],
    goalLevelPhotos: {},
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
    .map((b) => {
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
      const imgsRaw = (b as { imageUris?: unknown }).imageUris;
      const imageUris =
        Array.isArray(imgsRaw) && imgsRaw.length > 0
          ? imgsRaw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
          : undefined;
      const textBlock: GlobalVisionTextBlock = {
        id,
        kind: 'text',
        text: typeof b.text === 'string' ? b.text : '',
        ...(imageUris && imageUris.length > 0 ? { imageUris } : {}),
      };
      return textBlock;
    });
  const base = emptyGlobalVisionDocument(typeof o.updatedAt === 'string' ? o.updatedAt : now);
  base.blocks = blocks.length > 0 ? blocks : base.blocks;
  const glpRaw = (o as { goalLevelPhotos?: unknown }).goalLevelPhotos;
  if (glpRaw && typeof glpRaw === 'object' && !Array.isArray(glpRaw)) {
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(glpRaw as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        const uris = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
        if (uris.length > 0) out[k] = uris;
      }
    }
    base.goalLevelPhotos = out;
  }
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
