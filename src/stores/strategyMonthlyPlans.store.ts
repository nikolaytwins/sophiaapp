import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from '@/lib/zustandPersist';

import type {
  StrategyMonthlyPlanCardDef,
  StrategyMonthlyPlanDef,
} from '@/features/strategy/strategyMonthlyPlanTypes';

const STORAGE_KEY = 'sophia-strategy-monthly-plans-v1';

export type MonthlyPlanCardPatch = Partial<
  Omit<StrategyMonthlyPlanCardDef, 'id' | 'tag'> & {
    tag?: Partial<StrategyMonthlyPlanCardDef['tag']>;
  }
>;

export type StrategyMonthlyPlansPersistedSlice = {
  cardPatches: Record<string, MonthlyPlanCardPatch>;
  deletedCardIds: string[];
  extraCardsByPlanId: Record<string, StrategyMonthlyPlanCardDef[]>;
};

function mergeCard(base: StrategyMonthlyPlanCardDef, patch?: MonthlyPlanCardPatch): StrategyMonthlyPlanCardDef {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    tag: { ...base.tag, ...(patch.tag ?? {}) },
  };
}

export function buildEffectiveMonthlyPlans(
  baseline: StrategyMonthlyPlanDef[],
  overlay: StrategyMonthlyPlansPersistedSlice
): StrategyMonthlyPlanDef[] {
  return baseline.map((plan) => {
    const extras = overlay.extraCardsByPlanId[plan.id] ?? [];
    const fromBase = plan.cards
      .filter((c) => !overlay.deletedCardIds.includes(c.id))
      .map((c) => mergeCard(c, overlay.cardPatches[c.id]));
    const fromExtras = extras
      .filter((c) => !overlay.deletedCardIds.includes(c.id))
      .map((c) => mergeCard(c, overlay.cardPatches[c.id]));
    return { ...plan, cards: [...fromBase, ...fromExtras] };
  });
}

function newUserCardId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `mp-u-${crypto.randomUUID()}`;
  }
  return `mp-u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type StrategyMonthlyPlansOverlayState = StrategyMonthlyPlansPersistedSlice & {
  patchCard: (cardId: string, partial: MonthlyPlanCardPatch) => void;
  deleteCard: (planId: string, cardId: string) => void;
  addCardToPlan: (planId: string) => void;
};

export const useStrategyMonthlyPlansStore = create<StrategyMonthlyPlansOverlayState>()(
  persist(
    (set) => ({
      cardPatches: {},
      deletedCardIds: [],
      extraCardsByPlanId: {},

      patchCard: (cardId, partial) =>
        set((s) => {
          const prev = s.cardPatches[cardId] ?? {};
          const merged: MonthlyPlanCardPatch = {
            ...prev,
            ...partial,
            tag: partial.tag !== undefined ? { ...prev.tag, ...partial.tag } : prev.tag,
          };
          return { cardPatches: { ...s.cardPatches, [cardId]: merged } };
        }),

      deleteCard: (planId, cardId) =>
        set((s) => {
          const extras = s.extraCardsByPlanId[planId] ?? [];
          const idx = extras.findIndex((c) => c.id === cardId);
          const restPatches = { ...s.cardPatches };
          delete restPatches[cardId];

          if (idx >= 0) {
            const nextExtrasList = extras.filter((_, i) => i !== idx);
            const nextExtrasMap = { ...s.extraCardsByPlanId };
            if (nextExtrasList.length) nextExtrasMap[planId] = nextExtrasList;
            else delete nextExtrasMap[planId];
            return {
              extraCardsByPlanId: nextExtrasMap,
              cardPatches: restPatches,
              deletedCardIds: s.deletedCardIds.filter((id) => id !== cardId),
            };
          }

          if (s.deletedCardIds.includes(cardId)) {
            return { cardPatches: restPatches };
          }

          return {
            deletedCardIds: [...s.deletedCardIds, cardId],
            cardPatches: restPatches,
          };
        }),

      addCardToPlan: (planId) =>
        set((s) => {
          const card: StrategyMonthlyPlanCardDef = {
            id: newUserCardId(),
            emoji: '📝',
            title: 'Новая плашка',
            description: 'Опиши фокус или срок.',
            tag: { label: 'срок', variant: 'slate' },
            accent: 'slate',
          };
          return {
            extraCardsByPlanId: {
              ...s.extraCardsByPlanId,
              [planId]: [...(s.extraCardsByPlanId[planId] ?? []), card],
            },
          };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        cardPatches: s.cardPatches,
        deletedCardIds: s.deletedCardIds,
        extraCardsByPlanId: s.extraCardsByPlanId,
      }),
    }
  )
);

export function ensureStrategyMonthlyPlansHydrated(): Promise<void> {
  if (useStrategyMonthlyPlansStore.persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsub = useStrategyMonthlyPlansStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
