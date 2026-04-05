import type { JournalDocument, JournalMoodId } from '@/features/day/dayJournal.types';
import { addDays } from '@/features/habits/habitLogic';

export const JOURNAL_MOOD_IDS: JournalMoodId[] = ['death', 'sad', 'neutral', 'smile', 'stars'];

export const JOURNAL_MOODS: Array<{
  id: JournalMoodId;
  label: string;
  emoji: string;
  /** Фон кружка под датой */
  circleBg: string;
  /** Обводка, если настроение не выбрано (нейтральный плейсхолдер) */
  circleBorder: string;
}> = [
  { id: 'death', label: 'Смерть', emoji: '💀', circleBg: 'rgba(139,92,246,0.85)', circleBorder: 'rgba(139,92,246,0.35)' },
  { id: 'sad', label: 'Грустно', emoji: '☹️', circleBg: 'rgba(59,130,246,0.75)', circleBorder: 'rgba(59,130,246,0.35)' },
  { id: 'neutral', label: 'Покерфейс', emoji: '😐', circleBg: 'rgba(100,116,139,0.75)', circleBorder: 'rgba(148,163,184,0.35)' },
  { id: 'smile', label: 'Улыбка', emoji: '🙂', circleBg: 'rgba(163,230,53,0.9)', circleBorder: 'rgba(163,230,53,0.4)' },
  { id: 'stars', label: 'Звёзды', emoji: '🤩', circleBg: 'rgba(251,191,36,0.9)', circleBorder: 'rgba(251,191,36,0.45)' },
];

const MOOD_SET = new Set<JournalMoodId>(JOURNAL_MOOD_IDS);

export function isJournalMoodId(v: unknown): v is JournalMoodId {
  return typeof v === 'string' && MOOD_SET.has(v as JournalMoodId);
}

export function getMoodMeta(id: JournalMoodId | undefined | null) {
  return JOURNAL_MOODS.find((m) => m.id === id) ?? null;
}

/** Дни для горизонтальной ленты: центр — anchorKey, не дальше todayKey в будущее. */
export function journalMoodStripDayKeys(anchorKey: string, todayKey: string, radius = 8): string[] {
  const keys: string[] = [];
  for (let i = -radius; i <= radius; i++) {
    const dk = addDays(anchorKey, i);
    if (dk > todayKey) continue;
    keys.push(dk);
  }
  return keys;
}

export function aggregateMoodsInMonth(
  doc: JournalDocument,
  year: number,
  month: number,
  todayKey: string
): Record<JournalMoodId, number> {
  const init: Record<JournalMoodId, number> = {
    death: 0,
    sad: 0,
    neutral: 0,
    smile: 0,
    stars: 0,
  };
  const dim = new Date(year, month, 0).getDate();
  const ym = `${year}-${String(month).padStart(2, '0')}-`;
  for (let day = 1; day <= dim; day++) {
    const dk = `${ym}${String(day).padStart(2, '0')}`;
    if (dk > todayKey) break;
    const entry = doc.entries[dk];
    const m = entry?.mood;
    if (m && MOOD_SET.has(m)) init[m]++;
  }
  return init;
}

export function totalMoodDaysInMonth(counts: Record<JournalMoodId, number>): number {
  return JOURNAL_MOOD_IDS.reduce((s, id) => s + counts[id], 0);
}
