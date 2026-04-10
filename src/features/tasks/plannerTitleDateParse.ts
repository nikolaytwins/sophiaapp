import { addDays } from '@/features/habits/habitLogic';

function normalizeRu(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е');
}

/** Ближайший `dateKey` начиная с `anchorKey`, у которого `Date.getDay() === targetJsDay` (0 = вс … 6 = сб). */
export function nextDateKeyForWeekday(anchorKey: string, targetJsDay: number): string {
  for (let d = 0; d <= 21; d++) {
    const k = addDays(anchorKey, d);
    const [y, m, day] = k.split('-').map(Number);
    const dt = new Date(y, m - 1, day);
    if (dt.getDay() === targetJsDay) return k;
  }
  return addDays(anchorKey, 7);
}

type Rule = {
  /** Группы: (префикс)(ключевое_слово)(суффикс) — длина заголовка считается по 2-й группе. */
  re: RegExp;
  resolveDay: (anchor: string) => string;
};

const RULES: Rule[] = [
  {
    re: /(^|[^а-яёa-z])(послезавтра)([^а-яёa-z]|$)/i,
    resolveDay: (a) => addDays(a, 2),
  },
  {
    re: /(^|[^а-яёa-z])(завтра)([^а-яёa-z]|$)/i,
    resolveDay: (a) => addDays(a, 1),
  },
  {
    re: /(^|[^а-яёa-z])(понедельник)([^а-яёa-z]|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 1),
  },
  {
    re: /(^|[^а-яёa-z])(вторник)([^а-яёa-z]|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 2),
  },
  {
    re: /(^|[^а-яёa-z])(среда)([^а-яёa-z]|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 3),
  },
  {
    re: /(^|[^а-яёa-z])(четверг)([^а-яёa-z]|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 4),
  },
  {
    re: /(^|[^а-яёa-z])(пятница)([^а-яёa-z]|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 5),
  },
  {
    re: /(^|[^а-яёa-z])(суббота)([^а-яёa-z]|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 6),
  },
  {
    re: /(^|[^а-яёa-z])(воскресенье)([^а-яёa-z]|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 0),
  },
  {
    re: /(^|\s)(пн)(\s|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 1),
  },
  {
    re: /(^|\s)(вт)(\s|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 2),
  },
  {
    re: /(^|\s)(ср)(\s|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 3),
  },
  {
    re: /(^|\s)(чт)(\s|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 4),
  },
  {
    re: /(^|\s)(пт)(\s|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 5),
  },
  {
    re: /(^|\s)(сб)(\s|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 6),
  },
  {
    re: /(^|\s)(вс)(\s|$)/i,
    resolveDay: (a) => nextDateKeyForWeekday(a, 0),
  },
];

function collectMatches(norm: string): Array<{ start: number; end: number; resolveDay: (a: string) => string }> {
  const out: Array<{ start: number; end: number; resolveDay: (a: string) => string }> = [];
  for (const rule of RULES) {
    const re = new RegExp(rule.re.source, rule.re.flags.replace(/g/g, '') + 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(norm)) !== null) {
      const g1 = m[1] ?? '';
      const kw = m[2];
      if (kw === undefined) continue;
      const start = m.index + g1.length;
      const end = start + kw.length;
      out.push({ start, end, resolveDay: rule.resolveDay });
    }
  }
  return out;
}

/**
 * Ищет в названии слова «завтра», «послезавтра», дни недели (полностью или пн…вс).
 * Якорь — день, относительно которого считается дата (при добавлении: выбранный день на экране).
 * Удаляет найденное слово из заголовка. Несколько слов — берётся самое левое; при равном старте — более длинное.
 */
export function applyPlannerTitleDateHints(
  rawTitle: string,
  anchorDayKey: string
): { title: string; dayDate: string } {
  const trimmed = rawTitle.trim();
  if (!trimmed) return { title: '', dayDate: anchorDayKey };
  const norm = normalizeRu(trimmed);
  const matches = collectMatches(norm);
  if (matches.length === 0) {
    return { title: trimmed, dayDate: anchorDayKey };
  }
  matches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - b.start - (a.end - a.start);
  });
  const best = matches[0]!;
  const cleaned = (trimmed.slice(0, best.start) + ' ' + trimmed.slice(best.end)).replace(/\s+/g, ' ').trim();
  const title = cleaned.length > 0 ? cleaned : 'Задача';
  return { title, dayDate: best.resolveDay(anchorDayKey) };
}
