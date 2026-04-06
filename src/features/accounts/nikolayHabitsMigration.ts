import type { HabitPersisted } from '@/entities/models';
import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';
import type { HabitsPersistSlice } from '@/features/habits/habitsPersistReducer';
import { normalizeHabitsSlice } from '@/features/habits/habitsPersistReducer';

/** Поднимите версию, если меняете набор привычек / правила миграции. */
export const NIKOLAY_HABITS_PROFILE_VERSION = 2;

const REMOVE_IDS = new Set([
  'seed_steps_10k',
  'seed_reels_daily',
  'seed_youtube_1',
  'seed_tg_threads_3',
  'seed_agency_sprint_5',
]);

const REMOVE_NAME_RES = [/90\s*рилс/i, /13\s*ролик/i, /40\s*пост/i];

const BODY_IDS = new Set([
  'seed_sleep_0100',
  'seed_walk_without_goal',
  'seed_protein_140',
  'seed_no_tarot_astro',
  'seed_workouts_3',
  'seed_bright_event_1',
  'seed_full_day_off_1',
]);

const LIFE_IDS = new Set(['seed_journal_daily', 'nikolay_journal_braindump', 'nikolay_no_savior_role']);

function shouldRemoveHabit(h: HabitPersisted): boolean {
  if (REMOVE_IDS.has(h.id)) return true;
  return REMOVE_NAME_RES.some((re) => re.test(h.name));
}

function blueprintRows(): HabitPersisted[] {
  const t = new Date().toISOString();
  return [
    {
      id: 'nikolay_client_outreach',
      name: '3–5 действий на привлечение клиентов (будни; в выходной — по желанию)',
      icon: 'megaphone-outline',
      cadence: 'daily',
      checkInKind: 'counter',
      dailyTarget: 3,
      counterUnit: 'действий',
      section: 'money',
      required: false,
      createdAt: t,
      completionDates: [],
      countsByDate: {},
    },
    {
      id: 'nikolay_journal_braindump',
      name: '10–15 минут дневника (выписать всё из головы)',
      icon: 'document-text-outline',
      cadence: 'daily',
      section: 'life',
      required: true,
      createdAt: t,
      completionDates: [],
    },
    {
      id: 'nikolay_no_savior_role',
      name: 'В отношениях: не отец/спасатель, без оправданий и подстройки',
      icon: 'heart-circle-outline',
      cadence: 'daily',
      section: 'life',
      required: true,
      createdAt: t,
      completionDates: [],
    },
  ];
}

function patchNikolaySections(h: HabitPersisted): HabitPersisted {
  if (h.section === 'media') return h;
  if (h.id === 'nikolay_client_outreach') return { ...h, section: 'money' };
  if (BODY_IDS.has(h.id)) return { ...h, section: 'body' };
  if (LIFE_IDS.has(h.id)) return { ...h, section: 'life' };
  return h;
}

/**
 * Удаляет старые медийные/шаговые цели, добавляет ритуалы по профилю, проставляет секции.
 */
export function applyNikolayHabitsProfile(
  slice: HabitsPersistSlice,
  email: string | null | undefined
): HabitsPersistSlice {
  if (!isNikolayPrimaryAccount(email)) return slice;
  if (slice.nikolayHabitsProfileVersion === NIKOLAY_HABITS_PROFILE_VERSION) {
    return slice;
  }

  let habits = slice.habits.filter((h) => !shouldRemoveHabit(h));
  const ids = new Set(habits.map((h) => h.id));
  for (const row of blueprintRows()) {
    if (!ids.has(row.id)) {
      habits.push({ ...row, completionDates: [...row.completionDates] });
      ids.add(row.id);
    }
  }
  habits = habits.map((h) => {
    const patched = patchNikolaySections(h);
    if (patched.id !== 'nikolay_client_outreach') return patched;
    if (patched.checkInKind === 'counter' && patched.dailyTarget != null) return patched;
    return {
      ...patched,
      checkInKind: 'counter' as const,
      dailyTarget: 3,
      counterUnit: 'действий',
      countsByDate: patched.countsByDate ?? {},
    };
  });

  return normalizeHabitsSlice({
    ...slice,
    habits,
    nikolayHabitsProfileVersion: NIKOLAY_HABITS_PROFILE_VERSION,
  });
}
