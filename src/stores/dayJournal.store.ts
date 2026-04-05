import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from '@/lib/zustandPersist';

import {
  buildHealthExport,
  buildNarrativeExport,
  emptyJournalDocument,
  getFieldsBySection,
  newJournalFieldId,
  nextSortOrder,
  normalizeJournalDocument,
  normalizeJournalEntry,
  type JournalHealthExportDoc,
  type JournalNarrativeExportDoc,
} from '@/features/day/dayJournal.logic';
import type {
  JournalDocument,
  JournalEntry,
  JournalFieldDefinition,
  JournalFieldSection,
  JournalFieldType,
  JournalFieldValue,
  JournalMoodId,
} from '@/features/day/dayJournal.types';

const STORAGE_KEY = 'sophia-os-day-journal-v3';

function touch(doc: JournalDocument): JournalDocument {
  return { ...doc, updatedAt: new Date().toISOString() };
}

type State = {
  doc: JournalDocument;
  getEntry: (dateKey: string) => JournalEntry;
  setFieldValue: (dateKey: string, fieldId: string, value: JournalFieldValue) => void;
  setMood: (dateKey: string, mood: JournalMoodId | null) => void;
  addField: (input: {
    label: string;
    prompt?: string;
    type: JournalFieldType;
    section: JournalFieldSection;
  }) => { ok: true; id: string } | { ok: false; error: string };
  removeField: (fieldId: string) => void;
  replaceDocument: (doc: JournalDocument) => void;
};

export const useDayJournalStore = create<State>()(
  persist(
    (set, get) => ({
      doc: emptyJournalDocument(),

      getEntry: (dateKey) => {
        const { doc } = get();
        return doc.entries[dateKey] ?? normalizeJournalEntry(dateKey, undefined, doc.fields);
      },

      setFieldValue: (dateKey, fieldId, value) => {
        set((state) => {
          const doc = touch(state.doc);
          const current = doc.entries[dateKey] ?? normalizeJournalEntry(dateKey, undefined, doc.fields);
          return {
            doc: {
              ...doc,
              entries: {
                ...doc.entries,
                [dateKey]: {
                  ...current,
                  values: { ...current.values, [fieldId]: value },
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          };
        });
      },

      setMood: (dateKey, mood) => {
        set((state) => {
          const doc = touch(state.doc);
          const current = doc.entries[dateKey] ?? normalizeJournalEntry(dateKey, undefined, doc.fields);
          const next: JournalEntry = {
            ...current,
            updatedAt: new Date().toISOString(),
          };
          if (mood == null) {
            delete next.mood;
          } else {
            next.mood = mood;
          }
          return {
            doc: {
              ...doc,
              entries: {
                ...doc.entries,
                [dateKey]: next,
              },
            },
          };
        });
      },

      addField: (input) => {
        const label = input.label.trim();
        if (!label) return { ok: false, error: 'Введите название поля.' };
        const id = newJournalFieldId();
        set((state) => {
          const doc = touch(state.doc);
          const field: JournalFieldDefinition = {
            id,
            label,
            ...(input.prompt?.trim() ? { prompt: input.prompt.trim() } : {}),
            type: input.type,
            section: input.section,
            sortOrder: nextSortOrder(doc.fields, input.section),
          };
          const nextFields = [...doc.fields, field].sort((a, b) => a.sortOrder - b.sortOrder);
          const nextEntries = Object.fromEntries(
            Object.entries(doc.entries).map(([dateKey, entry]) => [
              dateKey,
              {
                ...entry,
                values: {
                  ...entry.values,
                  [field.id]: input.type === 'toggle' ? false : input.type === 'number' ? null : '',
                },
              },
            ])
          );
          return { doc: { ...doc, fields: nextFields, entries: nextEntries } };
        });
        return { ok: true, id };
      },

      removeField: (fieldId) => {
        set((state) => {
          const doc = touch(state.doc);
          const field = doc.fields.find((f) => f.id === fieldId);
          if (!field || field.builtIn) return { doc };
          const nextFields = doc.fields.filter((f) => f.id !== fieldId);
          const nextEntries = Object.fromEntries(
            Object.entries(doc.entries).map(([dateKey, entry]) => {
              const values = { ...entry.values };
              delete values[fieldId];
              return [dateKey, { ...entry, values }];
            })
          );
          return { doc: { ...doc, fields: nextFields, entries: nextEntries } };
        });
      },

      replaceDocument: (doc) => set({ doc: normalizeJournalDocument(doc) }),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ doc: normalizeJournalDocument(s.doc) }),
      migrate: (persisted) => {
        const p = persisted as { doc?: unknown; entries?: unknown } | undefined;
        if (p?.doc) return { doc: normalizeJournalDocument(p.doc) };
        if (p && 'entries' in p) return { doc: normalizeJournalDocument({ entries: p.entries }) };
        return { doc: emptyJournalDocument() };
      },
    }
  )
);

export function ensureDayJournalHydrated(): Promise<void> {
  if (useDayJournalStore.persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsub = useDayJournalStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

export function getDayJournalDocument(): JournalDocument {
  return normalizeJournalDocument(useDayJournalStore.getState().doc);
}

export function getDayJournalFields(section?: JournalFieldSection): JournalFieldDefinition[] {
  const doc = getDayJournalDocument();
  return section ? getFieldsBySection(doc.fields, section) : doc.fields;
}

export function buildDayJournalNarrativeExportDoc(): JournalNarrativeExportDoc {
  return buildNarrativeExport(getDayJournalDocument());
}

export function buildDayJournalHealthExportDoc(): JournalHealthExportDoc {
  return buildHealthExport(getDayJournalDocument());
}
