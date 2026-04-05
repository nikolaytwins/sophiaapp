import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from '@/lib/zustandPersist';

import {
  emptyAnnualDocument,
  newAnnualCardId,
  newQueuedAnnualGoalId,
  normalizeAnnualDocument,
} from '@/features/goals/annualGoals.logic';
import type {
  AnnualGoalsDocument,
  AnnualSphere,
  AnnualSphereSection,
  AnnualSprintSlotId,
  QueuedAnnualSprintGoal,
} from '@/features/goals/annualGoals.types';

const STORAGE_KEY = 'sophia-os-annual-goals-v1';

type AnnualGoalsState = {
  doc: AnnualGoalsDocument;

  setVisionText: (sphere: AnnualSphere, visionText: string) => void;
  addCard: (sphere: AnnualSphere, input: { title: string; imageUri?: string | null; problematica?: string }) => { ok: true; id: string } | { ok: false; error: string };
  updateCard: (
    sphere: AnnualSphere,
    cardId: string,
    patch: Partial<{ title: string; imageUri: string | null; problematica: string }>
  ) => void;
  removeCard: (sphere: AnnualSphere, cardId: string) => void;
  replaceDocument: (doc: AnnualGoalsDocument) => void;

  setSprintSlotDates: (
    slotId: AnnualSprintSlotId,
    patch: { startDate: string | null; endDate: string | null }
  ) => void;
  addQueuedSprintGoal: (
    slotId: AnnualSprintSlotId,
    input: { title: string; sphere?: AnnualSphere; problematica?: string }
  ) => { ok: true; id: string } | { ok: false; error: string };
  removeQueuedSprintGoal: (slotId: AnnualSprintSlotId, goalId: string) => void;
  addGeneralGoal: (input: {
    title: string;
    problematica?: string;
    imageUri?: string | null;
  }) => { ok: true; id: string } | { ok: false; error: string };
  updateGeneralGoal: (
    goalId: string,
    patch: Partial<{ title: string; imageUri: string | null; problematica: string }>
  ) => void;
  removeGeneralGoal: (goalId: string) => void;
};

function touch(doc: AnnualGoalsDocument): AnnualGoalsDocument {
  return { ...doc, updatedAt: new Date().toISOString() };
}

export const useAnnualGoalsStore = create<AnnualGoalsState>()(
  persist(
    (set, get) => ({
      doc: emptyAnnualDocument(new Date().getFullYear(), new Date().toISOString()),

      replaceDocument: (doc) => set({ doc: normalizeAnnualDocument(doc) }),

      setVisionText: (sphere, visionText) => {
        /** Иначе web TextInput в цикле: onChange → set → re-render → onChange (тот же текст). */
        if (get().doc.spheres[sphere].visionText === visionText) return;
        set((state) => {
          const doc = touch(state.doc);
          return {
            doc: {
              ...doc,
              spheres: {
                ...doc.spheres,
                [sphere]: { ...doc.spheres[sphere], visionText, sphere },
              },
            },
          };
        });
      },

      addCard: (sphere, input) => {
        const title = input.title.trim();
        if (!title) return { ok: false, error: 'Введите название цели.' };
        const sec = get().doc.spheres[sphere];
        if (sec.cards.length >= 1) {
          return { ok: false, error: 'Годовая цель по этой сфере уже задана. Отредактируйте её или удалите.' };
        }
        const sortOrder = 0;
        const id = newAnnualCardId();
        const prob = input.problematica?.trim() ?? '';
        const card = {
          id,
          title,
          sortOrder,
          ...(prob ? { problematica: prob } : {}),
          ...(input.imageUri != null && input.imageUri !== '' ? { imageUri: input.imageUri } : {}),
        };
        set((state) => {
          const doc = touch(state.doc);
          const nextSec: AnnualSphereSection = {
            ...doc.spheres[sphere],
            cards: [...doc.spheres[sphere].cards, card],
          };
          return {
            doc: {
              ...doc,
              spheres: { ...doc.spheres, [sphere]: nextSec },
            },
          };
        });
        return { ok: true, id };
      },

      updateCard: (sphere, cardId, patch) =>
        set((state) => {
          const doc = touch(state.doc);
          const sec = doc.spheres[sphere];
          return {
            doc: {
              ...doc,
              spheres: {
                ...doc.spheres,
                [sphere]: {
                  ...sec,
                  cards: sec.cards.map((c) =>
                    c.id === cardId
                      ? {
                          ...c,
                          ...(patch.title != null ? { title: patch.title } : {}),
                          ...(patch.imageUri !== undefined ? { imageUri: patch.imageUri } : {}),
                          ...(patch.problematica !== undefined
                            ? { problematica: patch.problematica.trim() }
                            : {}),
                        }
                      : c
                  ),
                },
              },
            },
          };
        }),

      removeCard: (sphere, cardId) =>
        set((state) => {
          const doc = touch(state.doc);
          const sec = doc.spheres[sphere];
          return {
            doc: {
              ...doc,
              spheres: {
                ...doc.spheres,
                [sphere]: { ...sec, cards: sec.cards.filter((c) => c.id !== cardId) },
              },
            },
          };
        }),

      setSprintSlotDates: (slotId, patch) =>
        set((state) => {
          const doc = touch(state.doc);
          return {
            doc: {
              ...doc,
              sprintSlots: doc.sprintSlots.map((s) =>
                s.id === slotId ? { ...s, ...patch } : s
              ),
            },
          };
        }),

      addQueuedSprintGoal: (slotId, input) => {
        const title = input.title.trim();
        if (!title) return { ok: false, error: 'Введите название цели.' };
        const id = newQueuedAnnualGoalId();
        const sk = String(slotId) as '1' | '2' | '3' | '4';
        const row: QueuedAnnualSprintGoal = {
          id,
          title,
          ...(input.problematica?.trim() ? { problematica: input.problematica.trim() } : {}),
          ...(input.sphere ? { sphere: input.sphere } : {}),
        };
        set((state) => {
          const doc = touch(state.doc);
          const prev = doc.queuedBySprintSlot[sk] ?? [];
          return {
            doc: {
              ...doc,
              queuedBySprintSlot: { ...doc.queuedBySprintSlot, [sk]: [...prev, row] },
            },
          };
        });
        return { ok: true, id };
      },

      removeQueuedSprintGoal: (slotId, goalId) => {
        const sk = String(slotId) as '1' | '2' | '3' | '4';
        set((state) => {
          const doc = touch(state.doc);
          const prev = doc.queuedBySprintSlot[sk] ?? [];
          return {
            doc: {
              ...doc,
              queuedBySprintSlot: {
                ...doc.queuedBySprintSlot,
                [sk]: prev.filter((g) => g.id !== goalId),
              },
            },
          };
        });
      },

      addGeneralGoal: (input) => {
        const title = input.title.trim();
        if (!title) return { ok: false, error: 'Введите название цели.' };
        const id = newAnnualCardId();
        const sortOrder =
          get().doc.generalGoals.length === 0
            ? 0
            : Math.max(...get().doc.generalGoals.map((g) => g.sortOrder)) + 1;
        set((state) => {
          const doc = touch(state.doc);
          const card = {
            id,
            title,
            sortOrder,
            ...(input.problematica?.trim() ? { problematica: input.problematica.trim() } : {}),
            ...(input.imageUri != null && input.imageUri !== '' ? { imageUri: input.imageUri } : {}),
          };
          return { doc: { ...doc, generalGoals: [...doc.generalGoals, card] } };
        });
        return { ok: true, id };
      },

      updateGeneralGoal: (goalId, patch) =>
        set((state) => {
          const doc = touch(state.doc);
          return {
            doc: {
              ...doc,
              generalGoals: doc.generalGoals.map((c) =>
                c.id === goalId
                  ? {
                      ...c,
                      ...(patch.title != null ? { title: patch.title } : {}),
                      ...(patch.imageUri !== undefined ? { imageUri: patch.imageUri } : {}),
                      ...(patch.problematica !== undefined
                        ? { problematica: patch.problematica.trim() }
                        : {}),
                    }
                  : c
              ),
            },
          };
        }),

      removeGeneralGoal: (goalId) =>
        set((state) => {
          const doc = touch(state.doc);
          return { doc: { ...doc, generalGoals: doc.generalGoals.filter((c) => c.id !== goalId) } };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ doc: normalizeAnnualDocument(s.doc) }),
      migrate: (persisted) => {
        const p = persisted as { doc?: unknown } | undefined;
        if (p && 'doc' in p) {
          return { doc: normalizeAnnualDocument(p.doc) };
        }
        return persisted;
      },
    }
  )
);

export function ensureAnnualGoalsHydrated(): Promise<void> {
  if (useAnnualGoalsStore.persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsub = useAnnualGoalsStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
