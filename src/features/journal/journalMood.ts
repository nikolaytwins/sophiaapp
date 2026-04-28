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
  {
    id: 'death',
    label: 'Смерть',
    emoji: '💀',
    circleBg: 'rgba(88, 82, 110, 0.52)',
    circleBorder: 'rgba(120, 115, 145, 0.28)',
  },
  {
    id: 'sad',
    label: 'Грустно',
    emoji: '☹️',
    circleBg: 'rgba(72, 98, 128, 0.48)',
    circleBorder: 'rgba(100, 125, 155, 0.26)',
  },
  {
    id: 'neutral',
    label: 'Покерфейс',
    emoji: '😐',
    circleBg: 'rgba(95, 105, 120, 0.42)',
    circleBorder: 'rgba(130, 138, 152, 0.24)',
  },
  {
    id: 'smile',
    label: 'Улыбка',
    emoji: '🙂',
    circleBg: 'rgba(78, 112, 102, 0.46)',
    circleBorder: 'rgba(110, 140, 128, 0.26)',
  },
  {
    id: 'stars',
    label: 'Звёзды',
    emoji: '🤩',
    circleBg: 'rgba(118, 102, 88, 0.46)',
    circleBorder: 'rgba(150, 132, 108, 0.28)',
  },
];

const MOOD_SET = new Set<JournalMoodId>(JOURNAL_MOOD_IDS);

export function isJournalMoodId(v: unknown): v is JournalMoodId {
  return typeof v === 'string' && MOOD_SET.has(v as JournalMoodId);
}

export function getMoodMeta(id: JournalMoodId | undefined | null) {
  return JOURNAL_MOODS.find((m) => m.id === id) ?? null;
}

export function journalMoodForDateKey(doc: JournalDocument, dateKey: string): JournalMoodId | null {
  const m = doc.entries[dateKey]?.mood;
  return m && MOOD_SET.has(m) ? m : null;
}

export function journalEnergyForDateKey(doc: JournalDocument, dateKey: string): JournalMoodId | null {
  const e = doc.entries[dateKey]?.energy;
  return e && MOOD_SET.has(e) ? e : null;
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

export function aggregateEnergyInMonth(
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
    const e = entry?.energy;
    if (e && MOOD_SET.has(e)) init[e]++;
  }
  return init;
}
