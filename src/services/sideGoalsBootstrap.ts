import { LIFE_SYSTEM_SIDE_GOAL_SEEDS } from '@/features/life-system/lifeSystem.config';
import { strategyPageConfig } from '@/features/strategy/strategy.config';
import { recoverSideGoalPhotosFromStorage } from '@/services/sideGoalsPhotoRecovery';
import { ensureSideGoalsHydrated, useSideGoalsStore } from '@/stores/sideGoals.store';

let bootstrapDone = false;
let bootstrapPromise: Promise<void> | null = null;

/** Сиды и восстановление фото — только после hydrate, до push в облако. */
export async function bootstrapSideGoalsAfterCloudPull(userId: string): Promise<void> {
  if (bootstrapDone) return;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    await ensureSideGoalsHydrated();
    const store = useSideGoalsStore.getState();

    if (store.goals.length === 0) {
      store.seedFromSeedsIfEmpty(strategyPageConfig.goalsTab.sideGoalSeeds);
    }
    store.ensureSideGoalsFromSeeds(LIFE_SYSTEM_SIDE_GOAL_SEEDS);

    const afterSeeds = useSideGoalsStore.getState().goals;
    const { goals: withPhotos, restoredCount, recoveredGoals } = await recoverSideGoalPhotosFromStorage(
      userId,
      afterSeeds
    );
    if (restoredCount > 0 || recoveredGoals > 0) {
      useSideGoalsStore.setState({ goals: withPhotos, payloadUpdatedAt: new Date().toISOString() });
      if (__DEV__) {
        console.info(
          `[side goals] restored ${restoredCount} photo(s), recovered ${recoveredGoals} goal(s) from storage`
        );
      }
    }

    bootstrapDone = true;
  })();

  try {
    await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
}

export function resetSideGoalsBootstrapForTests(): void {
  bootstrapDone = false;
  bootstrapPromise = null;
}
