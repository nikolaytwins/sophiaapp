import { getSupabase } from '@/lib/supabase';
import type { SideGoalPersisted } from '@/stores/sideGoals.store';

const BUCKET = 'side_goal_assets';

async function listPhotoUrlsForGoal(userId: string, goalId: string): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: files } = await sb.storage.from(BUCKET).list(`${userId}/${goalId}`, { limit: 200 });
  if (!files?.length) return [];
  const urls: string[] = [];
  for (const f of files) {
    if (!f.name || f.name === '.emptyFolderPlaceholder') continue;
    const { data } = sb.storage.from(BUCKET).getPublicUrl(`${userId}/${goalId}/${f.name}`);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }
  return urls;
}

/** Восстанавливает photoUris из Storage и цели, пропавшие из JSON, но с файлами в bucket. */
export async function recoverSideGoalPhotosFromStorage(
  userId: string,
  goals: SideGoalPersisted[]
): Promise<{ goals: SideGoalPersisted[]; restoredCount: number; recoveredGoals: number }> {
  const sb = getSupabase();
  if (!sb) return { goals, restoredCount: 0, recoveredGoals: 0 };

  const { data: goalFolders, error: listErr } = await sb.storage.from(BUCKET).list(userId, {
    limit: 500,
  });
  if (listErr || !goalFolders?.length) return { goals, restoredCount: 0, recoveredGoals: 0 };

  const urlsByGoalId = new Map<string, string[]>();
  for (const folder of goalFolders) {
    if (!folder.name || folder.name.includes('.')) continue;
    const urls = await listPhotoUrlsForGoal(userId, folder.name);
    if (urls.length > 0) urlsByGoalId.set(folder.name, urls);
  }

  if (urlsByGoalId.size === 0) return { goals, restoredCount: 0, recoveredGoals: 0 };

  let restoredCount = 0;
  const known = new Set(goals.map((g) => g.id));
  const next = goals.map((g) => {
    const stored = urlsByGoalId.get(g.id);
    if (!stored?.length) return g;
    const merged = [...new Set([...g.photoUris, ...stored])];
    if (merged.length === g.photoUris.length) return g;
    restoredCount += merged.length - g.photoUris.length;
    return { ...g, photoUris: merged };
  });

  let recoveredGoals = 0;
  for (const [goalId, urls] of urlsByGoalId) {
    if (known.has(goalId)) continue;
    next.push({
      id: goalId,
      title: 'Восстановленная цель',
      description: 'Восстановлено из облачного хранилища фото',
      current: 0,
      target: 1,
      progressKind: 'checkbox',
      photoUris: urls,
      isHorizon: false,
      isNearestPinned: false,
      dateMode: 'none',
      dateSingle: null,
      dateFrom: null,
      dateTo: null,
    });
    recoveredGoals += 1;
    restoredCount += urls.length;
  }

  return { goals: next, restoredCount, recoveredGoals };
}
