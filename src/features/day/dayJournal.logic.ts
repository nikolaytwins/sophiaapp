import { addDays, startOfCalendarMonthKey } from '@/features/habits/habitLogic';
import { getMoodMeta } from '@/features/journal/journalMood';
import {
  DEFAULT_JOURNAL_FIELDS,
  type JournalDocument,
  type JournalEntry,
  type JournalExportPeriod,
  type JournalFieldDefinition,
  type JournalFieldSection,
  type JournalFieldType,
  type JournalFieldValue,
  type JournalMoodId,
} from '@/features/day/dayJournal.types';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const FIELD_TYPE_SET: JournalFieldType[] = ['text', 'number', 'toggle'];
const FIELD_SECTION_SET: JournalFieldSection[] = ['journal', 'health'];
const VALID_MOODS = new Set<JournalMoodId>(['death', 'sad', 'neutral', 'smile', 'stars']);

/** Убраны из продукта: здоровье в дневнике и старые поля Николая. */
const STRIPPED_JOURNAL_FIELD_IDS = new Set<string>([
  'nikolay_reflect_justify',
  'nikolay_client_actions_count',
  'health_steps',
  'health_calories',
  'health_protein',
  'health_fat',
  'health_carbs',
]);

function normalizeMood(raw: unknown): JournalMoodId | undefined {
  if (raw === null || raw === '') return undefined;
  return typeof raw === 'string' && VALID_MOODS.has(raw as JournalMoodId) ? (raw as JournalMoodId) : undefined;
}

export function newJournalFieldId(): string {
  return `jf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyJournalDocument(): JournalDocument {
  return {
    fields: DEFAULT_JOURNAL_FIELDS.map((f) => ({ ...f })),
    entries: {},
    updatedAt: new Date().toISOString(),
  };
}

function isFieldType(v: unknown): v is JournalFieldType {
  return typeof v === 'string' && FIELD_TYPE_SET.includes(v as JournalFieldType);
}

function isFieldSection(v: unknown): v is JournalFieldSection {
  return typeof v === 'string' && FIELD_SECTION_SET.includes(v as JournalFieldSection);
}

function normalizeField(raw: unknown, fallbackSortOrder: number): JournalFieldDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const type = isFieldType(o.type) ? o.type : 'text';
  const section = isFieldSection(o.section) ? o.section : 'journal';
  const label = typeof o.label === 'string' ? o.label.trim() : '';
  if (!label) return null;
  return {
    id: typeof o.id === 'string' && o.id.trim() ? o.id : newJournalFieldId(),
    label,
    ...(typeof o.prompt === 'string' && o.prompt.trim() ? { prompt: o.prompt.trim() } : {}),
    type,
    section,
    sortOrder: typeof o.sortOrder === 'number' ? o.sortOrder : fallbackSortOrder,
    ...(o.builtIn === true ? { builtIn: true } : {}),
  };
}

function normalizeFieldValue(type: JournalFieldType, raw: unknown): JournalFieldValue {
  if (type === 'toggle') return typeof raw === 'boolean' ? raw : false;
  if (type === 'number') return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  return typeof raw === 'string' ? raw : '';
}

export function normalizeJournalEntry(
  dateKey: string,
  raw: unknown,
  fields: JournalFieldDefinition[]
): JournalEntry {
  const base: JournalEntry = {
    dateKey,
    values: {},
    updatedAt: new Date().toISOString(),
  };
  if (!raw || typeof raw !== 'object') {
    for (const field of fields) {
      base.values[field.id] = normalizeFieldValue(field.type, undefined);
    }
    return base;
  }
  const o = raw as Record<string, unknown>;
  const valuesRaw = o.values && typeof o.values === 'object' ? (o.values as Record<string, unknown>) : {};
  for (const field of fields) {
    base.values[field.id] = normalizeFieldValue(field.type, valuesRaw[field.id]);
  }
  base.updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString();
  const mood = normalizeMood(o.mood);
  if (mood) base.mood = mood;
  const energy = normalizeMood(o.energy);
  if (energy) base.energy = energy;
  return base;
}

export function normalizeJournalDocument(raw: unknown): JournalDocument {
  const base = emptyJournalDocument();
  if (!raw || typeof raw !== 'object') return base;
  const root = raw as Record<string, unknown>;
  const o =
    root.doc && typeof root.doc === 'object' && !Array.isArray(root.doc)
      ? (root.doc as Record<string, unknown>)
      : root;

  const fieldsRaw = Array.isArray(o.fields) ? o.fields : [];
  const normalizedFields = fieldsRaw
    .map((f, i) => normalizeField(f, i))
    .filter((f): f is JournalFieldDefinition => Boolean(f));

  const mergedFieldsById = new Map<string, JournalFieldDefinition>();
  for (const f of DEFAULT_JOURNAL_FIELDS) mergedFieldsById.set(f.id, { ...f });
  for (const f of normalizedFields) {
    if (f.builtIn && mergedFieldsById.has(f.id)) {
      const baseField = mergedFieldsById.get(f.id)!;
      mergedFieldsById.set(f.id, { ...baseField, ...f, builtIn: true });
    } else {
      mergedFieldsById.set(f.id, f);
    }
  }
  const fields = [...mergedFieldsById.values()]
    .filter((f) => f.section !== 'health' && !STRIPPED_JOURNAL_FIELD_IDS.has(f.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const entriesRaw = o.entries && typeof o.entries === 'object' ? (o.entries as Record<string, unknown>) : {};
  const entries: Record<string, JournalEntry> = {};
  for (const [dateKey, row] of Object.entries(entriesRaw)) {
    if (!DATE_KEY_RE.test(dateKey)) continue;
    entries[dateKey] = normalizeJournalEntry(dateKey, row, fields);
  }

  return {
    fields,
    entries,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
  };
}

export function journalEntryHasContent(entry: JournalEntry | undefined, fields: JournalFieldDefinition[]): boolean {
  if (!entry) return false;
  if (entry.mood) return true;
  if (entry.energy) return true;
  for (const field of fields) {
    const value = entry.values[field.id];
    if (field.type === 'text' && typeof value === 'string' && value.trim()) return true;
    if (field.type === 'number' && typeof value === 'number' && Number.isFinite(value)) return true;
    if (field.type === 'toggle' && value === true) return true;
  }
  return false;
}

/**
 * Только поля дневника/здоровья (без настроения). Нужно, чтобы привычка «дневник» не засчитывалась
 * от одной только полоски настроения и не дублировала смысл с блоком «Дневник».
 */
export function journalEntryHasFieldContent(
  entry: JournalEntry | undefined,
  fields: JournalFieldDefinition[]
): boolean {
  if (!entry) return false;
  for (const field of fields) {
    const value = entry.values[field.id];
    if (field.type === 'text' && typeof value === 'string' && value.trim()) return true;
    if (field.type === 'number' && typeof value === 'number' && Number.isFinite(value)) return true;
    if (field.type === 'toggle' && value === true) return true;
  }
  return false;
}

export function isJournalDocumentEmpty(doc: JournalDocument): boolean {
  const keys = Object.keys(doc.entries);
  if (keys.length === 0) return true;
  return keys.every((k) => !journalEntryHasContent(doc.entries[k], doc.fields));
}

const DEFAULT_FIELD_IDS = new Set(DEFAULT_JOURNAL_FIELDS.map((f) => f.id));

function journalDocTimestamp(doc: JournalDocument): number {
  const t = Date.parse(doc.updatedAt);
  return Number.isFinite(t) ? t : 0;
}

function isFieldValueEmptyForMerge(field: JournalFieldDefinition, value: JournalFieldValue | undefined): boolean {
  if (field.type === 'text') return !(typeof value === 'string' && value.trim());
  if (field.type === 'number') return !(typeof value === 'number' && Number.isFinite(value));
  return value !== true;
}

function mergeFieldDefinitions(a: JournalDocument, b: JournalDocument): JournalFieldDefinition[] {
  const ta = journalDocTimestamp(a);
  const tb = journalDocTimestamp(b);
  const [older, newer] = ta <= tb ? [a, b] : [b, a];
  const byId = new Map<string, JournalFieldDefinition>();
  for (const f of DEFAULT_JOURNAL_FIELDS) {
    byId.set(f.id, { ...f });
  }
  const absorb = (doc: JournalDocument) => {
    for (const f of doc.fields) {
      const cur = byId.get(f.id);
      if (DEFAULT_FIELD_IDS.has(f.id)) {
        byId.set(f.id, { ...(cur ?? f), ...f, builtIn: true });
      } else {
        byId.set(f.id, { ...f });
      }
    }
  };
  absorb(older);
  absorb(newer);
  return [...byId.values()].sort((x, y) => x.sortOrder - y.sortOrder);
}

function mergeJournalEntriesTie(ea: JournalEntry, eb: JournalEntry, fields: JournalFieldDefinition[]): JournalEntry {
  const values: Record<string, JournalFieldValue> = {};
  for (const f of fields) {
    const va = ea.values[f.id];
    const vb = eb.values[f.id];
    const ha = !isFieldValueEmptyForMerge(f, va);
    const hb = !isFieldValueEmptyForMerge(f, vb);
    if (ha && !hb) values[f.id] = va as JournalFieldValue;
    else if (!ha && hb) values[f.id] = vb as JournalFieldValue;
    else if (ha && hb) {
      if (f.type === 'text') {
        const sa = String(va).trim();
        const sb = String(vb).trim();
        values[f.id] = sa.length >= sb.length ? (va as string) : (vb as string);
      } else if (f.type === 'number') {
        values[f.id] = Math.max(va as number, vb as number);
      } else {
        values[f.id] = Boolean(va || vb);
      }
    } else {
      values[f.id] = normalizeFieldValue(f.type, undefined);
    }
  }
  const mood = ea.mood ?? eb.mood;
  const energy = ea.energy ?? eb.energy;
  const ts = Math.max(Date.parse(ea.updatedAt) || 0, Date.parse(eb.updatedAt) || 0);
  return normalizeJournalEntry(
    ea.dateKey,
    { values, mood, energy, updatedAt: new Date(ts || Date.now()).toISOString() },
    fields
  );
}

function mergeJournalEntriesPreferNewer(ea: JournalEntry, eb: JournalEntry, fields: JournalFieldDefinition[]): JournalEntry {
  const ta = Date.parse(ea.updatedAt) || 0;
  const tb = Date.parse(eb.updatedAt) || 0;
  if (ta === tb) return mergeJournalEntriesTie(ea, eb, fields);
  const winner = ta > tb ? ea : eb;
  const loser = ta > tb ? eb : ea;
  const merged = normalizeJournalEntry(winner.dateKey, winner, fields);
  for (const f of fields) {
    if (isFieldValueEmptyForMerge(f, merged.values[f.id]) && !isFieldValueEmptyForMerge(f, loser.values[f.id])) {
      merged.values[f.id] = loser.values[f.id];
    }
  }
  if (!merged.mood && loser.mood) merged.mood = loser.mood;
  if (!merged.energy && loser.energy) merged.energy = loser.energy;
  return merged;
}

/**
 * Симметричное слияние двух снимков дневника (локальный кэш и облако).
 * По каждой дате побеждает запись с более новым `updatedAt`; при равенстве объединяются непустые поля.
 * Поля: встроенные из дефолта, затем оверлей старого документа, затем нового (по `doc.updatedAt`).
 * Нужно, чтобы «урезанный» клиент или пустой payload никогда не затирал историю целиком.
 */
export function mergeJournalDocuments(a: JournalDocument, b: JournalDocument): JournalDocument {
  const na = normalizeJournalDocument(a);
  const nb = normalizeJournalDocument(b);
  const fields = mergeFieldDefinitions(na, nb);
  const keys = new Set([...Object.keys(na.entries), ...Object.keys(nb.entries)]);
  const entries: Record<string, JournalEntry> = {};
  for (const dk of keys) {
    if (!DATE_KEY_RE.test(dk)) continue;
    const ea = na.entries[dk];
    const eb = nb.entries[dk];
    if (!ea) entries[dk] = normalizeJournalEntry(dk, eb, fields);
    else if (!eb) entries[dk] = normalizeJournalEntry(dk, ea, fields);
    else entries[dk] = mergeJournalEntriesPreferNewer(ea, eb, fields);
  }
  const mergedTs = Math.max(journalDocTimestamp(na), journalDocTimestamp(nb), 0);
  return normalizeJournalDocument({
    fields,
    entries,
    updatedAt: new Date(mergedTs || Date.now()).toISOString(),
  });
}

export function getFieldsBySection(fields: JournalFieldDefinition[], section: JournalFieldSection): JournalFieldDefinition[] {
  return fields.filter((f) => f.section === section).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function nextSortOrder(fields: JournalFieldDefinition[], section: JournalFieldSection): number {
  const inSection = fields.filter((f) => f.section === section);
  if (inSection.length === 0) return section === 'health' ? 200 : 10;
  return Math.max(...inSection.map((f) => f.sortOrder)) + 1;
}

export type JournalNarrativeExportDoc = {
  schema: 'sophia.journal.narrative.v1';
  exportedAt: string;
  fields: JournalFieldDefinition[];
  entries: Array<{ dateKey: string; mood?: JournalMoodId; energy?: JournalMoodId; values: Record<string, JournalFieldValue> }>;
};

export type JournalHealthExportDoc = {
  schema: 'sophia.journal.health.v1';
  exportedAt: string;
  fields: JournalFieldDefinition[];
  rows: Array<{ dateKey: string; values: Record<string, JournalFieldValue> }>;
};

export function buildNarrativeExport(doc: JournalDocument): JournalNarrativeExportDoc {
  const fields = getFieldsBySection(doc.fields, 'journal');
  const entries = Object.values(doc.entries)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map((entry) => ({
      dateKey: entry.dateKey,
      ...(entry.mood ? { mood: entry.mood } : {}),
      ...(entry.energy ? { energy: entry.energy } : {}),
      values: Object.fromEntries(fields.map((f) => [f.id, entry.values[f.id] ?? normalizeFieldValue(f.type, undefined)])),
    }))
    .filter(
      (row) =>
        Boolean(row.mood) ||
        Boolean(row.energy) ||
        Object.values(row.values).some((v) =>
          typeof v === 'string' ? v.trim().length > 0 : typeof v === 'number' ? Number.isFinite(v) : v === true
        )
    );
  return {
    schema: 'sophia.journal.narrative.v1',
    exportedAt: new Date().toISOString(),
    fields,
    entries,
  };
}

export function buildHealthExport(doc: JournalDocument): JournalHealthExportDoc {
  const fields = getFieldsBySection(doc.fields, 'health');
  const rows = Object.values(doc.entries)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map((entry) => ({
      dateKey: entry.dateKey,
      values: Object.fromEntries(fields.map((f) => [f.id, entry.values[f.id] ?? normalizeFieldValue(f.type, undefined)])),
    }))
    .filter((row) =>
      Object.values(row.values).some((v) =>
        typeof v === 'string' ? v.trim().length > 0 : typeof v === 'number' ? Number.isFinite(v) : v === true
      )
    );
  return {
    schema: 'sophia.journal.health.v1',
    exportedAt: new Date().toISOString(),
    fields,
    rows,
  };
}

function journalDayTitleRu(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Человекочитаемый текст дневника за одну дату (настроение, записи, здоровье).
 */
export function buildJournalDayPlainText(doc: JournalDocument, dateKey: string): string {
  const entry = doc.entries[dateKey];
  const longDate = journalDayTitleRu(dateKey);
  const head = `Sophia OS — дневник\n${longDate}\n(${dateKey})`;

  if (!journalEntryHasContent(entry, doc.fields)) {
    return `${head}\n\nЗа эту дату нет записей (настроение, энергия, текст, числа, переключатели).`;
  }

  const lines: string[] = [head, ''];

  const moodMeta = entry?.mood ? getMoodMeta(entry.mood) : null;
  if (moodMeta) {
    lines.push(`Настроение: ${moodMeta.emoji} ${moodMeta.label}`, '');
  }
  const energyMeta = entry?.energy ? getMoodMeta(entry.energy) : null;
  if (energyMeta) {
    lines.push(`Энергия: ${energyMeta.emoji} ${energyMeta.label}`, '');
  }

  const journalFields = getFieldsBySection(doc.fields, 'journal');
  if (journalFields.length) {
    lines.push('Записи', '—'.repeat(28), '');
    for (const f of journalFields) {
      lines.push(formatJournalFieldLine(f, entry?.values[f.id]), '');
    }
  }

  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

function formatJournalFieldLine(field: JournalFieldDefinition, value: JournalFieldValue | undefined): string {
  const label = field.label;
  const v = value ?? null;
  if (field.type === 'toggle') {
    return `${label}: ${v === true ? 'Да' : 'Нет'}`;
  }
  if (field.type === 'number') {
    if (typeof v === 'number' && Number.isFinite(v)) return `${label}: ${v}`;
    return `${label}: —`;
  }
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return `${label}: —`;
  return `${label}:\n${s}`;
}

export function journalExportDateRange(
  period: JournalExportPeriod,
  todayKey: string,
  opts?: { anchorDayKey?: string }
): { fromKey: string; toKey: string; label: string } {
  const toKey = todayKey;
  if (period === 'today') {
    const d = opts?.anchorDayKey ?? todayKey;
    const label = d === todayKey ? 'Сегодня' : journalDayTitleRu(d);
    return { fromKey: d, toKey: d, label };
  }
  if (period === 'month') {
    return { fromKey: startOfCalendarMonthKey(todayKey), toKey, label: 'Текущий месяц' };
  }
  return { fromKey: addDays(todayKey, -89), toKey, label: '90 дней' };
}

export function sliceJournalDocumentByDateRange(
  doc: JournalDocument,
  fromKey: string,
  toKey: string
): JournalDocument {
  const entries: Record<string, JournalEntry> = {};
  for (const [k, e] of Object.entries(doc.entries)) {
    if (k >= fromKey && k <= toKey) entries[k] = e;
  }
  return { ...doc, entries };
}
