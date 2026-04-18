import type { JournalDocument, JournalFieldDefinition } from '@/features/day/dayJournal.types';

import { isNikolayPrimaryAccount } from '@/features/accounts/nikolayProfile';

/** Раньше добавлялись доп. поля — оставляем хук на будущее (массив пустой). */
const NIKOLAY_EXTRA_FIELDS: JournalFieldDefinition[] = [];

/** Добавляет поля в документ дневника (идемпотентно). */
export function mergeNikolayJournalFields(doc: JournalDocument): JournalDocument {
  const existing = new Set(doc.fields.map((f) => f.id));
  const toAdd = NIKOLAY_EXTRA_FIELDS.filter((f) => !existing.has(f.id));
  if (toAdd.length === 0) return doc;

  const fields = [...doc.fields, ...toAdd].sort((a, b) => a.sortOrder - b.sortOrder);
  const entries = Object.fromEntries(
    Object.entries(doc.entries).map(([dk, entry]) => {
      const values = { ...entry.values };
      for (const f of toAdd) {
        if (!(f.id in values)) {
          values[f.id] = f.type === 'number' ? null : '';
        }
      }
      return [dk, { ...entry, values }];
    })
  );

  return {
    ...doc,
    fields,
    entries,
    updatedAt: new Date().toISOString(),
  };
}

export function mergeNikolayJournalFieldsIfNeeded(
  doc: JournalDocument,
  email: string | null | undefined
): JournalDocument {
  if (!isNikolayPrimaryAccount(email)) return doc;
  return mergeNikolayJournalFields(doc);
}
