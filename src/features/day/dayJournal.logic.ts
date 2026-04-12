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
  const fields = [...mergedFieldsById.values()].sort((a, b) => a.sortOrder - b.sortOrder);

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
  entries: Array<{ dateKey: string; mood?: JournalMoodId; values: Record<string, JournalFieldValue> }>;
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
      values: Object.fromEntries(fields.map((f) => [f.id, entry.values[f.id] ?? normalizeFieldValue(f.type, undefined)])),
    }))
    .filter(
      (row) =>
        Boolean(row.mood) ||
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
    return `${head}\n\nЗа эту дату нет записей (настроение, текст, числа, переключатели).`;
  }

  const lines: string[] = [head, ''];

  const moodMeta = entry?.mood ? getMoodMeta(entry.mood) : null;
  if (moodMeta) {
    lines.push(`Настроение: ${moodMeta.emoji} ${moodMeta.label}`, '');
  }

  const journalFields = getFieldsBySection(doc.fields, 'journal');
  if (journalFields.length) {
    lines.push('Записи', '—'.repeat(28), '');
    for (const f of journalFields) {
      lines.push(formatJournalFieldLine(f, entry?.values[f.id]), '');
    }
  }

  const healthFields = getFieldsBySection(doc.fields, 'health');
  if (healthFields.length) {
    lines.push('Здоровье', '—'.repeat(28), '');
    for (const f of healthFields) {
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
