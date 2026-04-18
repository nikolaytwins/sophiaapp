import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from '@/lib/zustandPersist';

import {
  emptyGlobalVisionDocument,
  newGlobalVisionBlockId,
  normalizeGlobalVisionDocument,
} from '@/features/goals/globalVision.logic';
import type { AnnualSphere } from '@/features/goals/annualGoals.types';
import type { GlobalVisionBlock, GlobalVisionDocument } from '@/features/goals/globalVision.types';

const STORAGE_KEY = 'sophia-os-global-vision-v1';

function touch(doc: GlobalVisionDocument): GlobalVisionDocument {
  return { ...doc, updatedAt: new Date().toISOString() };
}

type GlobalVisionState = {
  doc: GlobalVisionDocument;
  setBlockText: (id: string, text: string) => void;
  setBlockImageUri: (id: string, imageUri: string | null) => void;
  appendTextBlockImages: (blockId: string, uris: string[]) => void;
  removeTextBlockImageAt: (blockId: string, index: number) => void;
  appendGoalLevelPhotos: (levelId: string, uris: string[]) => void;
  removeGoalLevelPhotoAt: (levelId: string, index: number) => void;
  addBlock: (kind: 'text' | 'image') => void;
  removeBlock: (id: string) => void;
  setSphereVision: (sphere: AnnualSphere, visionText: string) => void;
  replaceDocument: (doc: GlobalVisionDocument) => void;
};

export const useGlobalVisionStore = create<GlobalVisionState>()(
  persist(
    (set, get) => ({
      doc: emptyGlobalVisionDocument(new Date().toISOString()),

      replaceDocument: (doc) => set({ doc: normalizeGlobalVisionDocument(doc) }),

      setBlockText: (id, text) => {
        const cur = get().doc.blocks.find((b) => b.id === id && b.kind === 'text');
        if (cur && cur.kind === 'text' && cur.text === text) return;
        set((state) => {
          const doc = touch(state.doc);
          return {
            doc: {
              ...doc,
              blocks: doc.blocks.map((b) => (b.id === id && b.kind === 'text' ? { ...b, text } : b)),
            },
          };
        });
      },

      setBlockImageUri: (id, imageUri) =>
        set((state) => {
          const doc = touch(state.doc);
          return {
            doc: {
              ...doc,
              blocks: doc.blocks.map((b) =>
                b.id === id && b.kind === 'image' ? { ...b, imageUri } : b
              ),
            },
          };
        }),

      appendTextBlockImages: (blockId, uris) => {
        if (uris.length === 0) return;
        set((state) => {
          const doc = touch(state.doc);
          return {
            doc: {
              ...doc,
              blocks: doc.blocks.map((b) => {
                if (b.id !== blockId || b.kind !== 'text') return b;
                const prev = b.imageUris ?? [];
                return { ...b, imageUris: [...prev, ...uris] };
              }),
            },
          };
        });
      },

      removeTextBlockImageAt: (blockId, index) =>
        set((state) => {
          const doc = touch(state.doc);
          return {
            doc: {
              ...doc,
              blocks: doc.blocks.map((b) => {
                if (b.id !== blockId || b.kind !== 'text') return b;
                const prev = b.imageUris ?? [];
                const next = prev.filter((_, i) => i !== index);
                return next.length > 0 ? { ...b, imageUris: next } : { ...b, imageUris: undefined };
              }),
            },
          };
        }),

      appendGoalLevelPhotos: (levelId, uris) => {
        if (uris.length === 0) return;
        set((state) => {
          const doc = touch(state.doc);
          const prev = doc.goalLevelPhotos[levelId] ?? [];
          return {
            doc: {
              ...doc,
              goalLevelPhotos: { ...doc.goalLevelPhotos, [levelId]: [...prev, ...uris] },
            },
          };
        });
      },

      removeGoalLevelPhotoAt: (levelId, index) =>
        set((state) => {
          const doc = touch(state.doc);
          const prev = doc.goalLevelPhotos[levelId] ?? [];
          const next = prev.filter((_, i) => i !== index);
          const goalLevelPhotos = { ...doc.goalLevelPhotos };
          if (next.length === 0) delete goalLevelPhotos[levelId];
          else goalLevelPhotos[levelId] = next;
          return { doc: { ...doc, goalLevelPhotos } };
        }),

      addBlock: (kind) =>
        set((state) => {
          const doc = touch(state.doc);
          const block: GlobalVisionBlock =
            kind === 'text'
              ? { id: newGlobalVisionBlockId(), kind: 'text', text: '' }
              : { id: newGlobalVisionBlockId(), kind: 'image', imageUri: null };
          return { doc: { ...doc, blocks: [...doc.blocks, block] } };
        }),

      removeBlock: (id) =>
        set((state) => {
          const doc = touch(state.doc);
          const next = doc.blocks.filter((b) => b.id !== id);
          return {
            doc: {
              ...doc,
              blocks: next.length > 0 ? next : [{ id: newGlobalVisionBlockId(), kind: 'text', text: '' }],
            },
          };
        }),

      setSphereVision: (sphere, visionText) => {
        if (get().doc.sphereVisions[sphere] === visionText) return;
        set((state) => {
          const doc = touch(state.doc);
          return {
            doc: {
              ...doc,
              sphereVisions: { ...doc.sphereVisions, [sphere]: visionText },
            },
          };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object' || !('doc' in persisted)) {
          return persisted as { doc: GlobalVisionDocument };
        }
        return { doc: normalizeGlobalVisionDocument((persisted as { doc: unknown }).doc) };
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ doc: normalizeGlobalVisionDocument(s.doc) }),
    }
  )
);

export function ensureGlobalVisionHydrated(): Promise<void> {
  if (useGlobalVisionStore.persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsub = useGlobalVisionStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
