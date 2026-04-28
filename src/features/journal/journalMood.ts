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
    /** Календарь: чуть насыщеннее серой каши — день читается с первого взгляда. */
    circleBg: 'rgba(108, 96, 138, 0.72)',
    circleBorder: 'rgba(170, 158, 205, 0.42)',
  },
  {
    id: 'sad',
    label: 'Грустно',
    emoji: '☹️',
    circleBg: 'rgba(58, 118, 178, 0.68)',
    circleBorder: 'rgba(130, 185, 235, 0.45)',
  },
  {
    id: 'neutral',
    label: 'Покерфейс',
    emoji: '😐',
    circleBg: 'rgba(98, 110, 132, 0.62)',
    circleBorder: 'rgba(165, 175, 195, 0.4)',
  },
  {
    id: 'smile',
    label: 'Улыбка',
    emoji: '🙂',
    circleBg: 'rgba(52, 148, 118, 0.68)',
    circleBorder: 'rgba(130, 220, 188, 0.48)',
  },
  {
    id: 'stars',
    label: 'Звёзды',
    emoji: '🤩',
    circleBg: 'rgba(200, 132, 48, 0.62)',
    circleBorder: 'rgba(255, 210, 140, 0.52)',
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
