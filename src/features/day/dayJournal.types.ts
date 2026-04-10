export type JournalFieldType = 'text' | 'number' | 'toggle';
export type JournalFieldSection = 'journal' | 'health';

/** Период выгрузки дневника в PDF. */
export type JournalExportPeriod = 'today' | 'month' | 'last90';

/** Настроение дня в дневнике (эмодзи + цвет в UI). */
export type JournalMoodId = 'death' | 'sad' | 'neutral' | 'smile' | 'stars';

export type JournalFieldDefinition = {
  id: string;
  label: string;
  prompt?: string;
  type: JournalFieldType;
  section: JournalFieldSection;
  sortOrder: number;
  builtIn?: boolean;
};

export type JournalFieldValue = string | number | boolean | null;

export type JournalEntry = {
  dateKey: string;
  values: Record<string, JournalFieldValue>;
  updatedAt: string;
  mood?: JournalMoodId;
};

export type JournalDocument = {
  fields: JournalFieldDefinition[];
  entries: Record<string, JournalEntry>;
  updatedAt: string;
};

export const DEFAULT_JOURNAL_FIELDS: JournalFieldDefinition[] = [
  {
    id: 'emotion_of_day',
    label: 'Эмоции дня',
    prompt: 'Что чувствовал сегодня?',
    type: 'text',
    section: 'journal',
    sortOrder: 0,
    builtIn: true,
  },
  {
    id: 'what_i_did',
    label: 'Что делал сегодня?',
    prompt: 'Что реально было через хочу, а что через надо',
    type: 'text',
    section: 'journal',
    sortOrder: 1,
    builtIn: true,
  },
  {
    id: 'proud_of_today',
    label: 'Чем горжусь сегодня, что получилось?',
    type: 'text',
    section: 'journal',
    sortOrder: 2,
    builtIn: true,
  },
  {
    id: 'body_and_resource',
    label: 'Тело и ресурс',
    prompt: 'Во сколько лег/встал, как себя чувствовал, какое настроение?',
    type: 'text',
    section: 'journal',
    sortOrder: 3,
    builtIn: true,
  },
  {
    id: 'health_steps',
    label: 'Сколько шагов прошел',
    type: 'number',
    section: 'health',
    sortOrder: 100,
    builtIn: true,
  },
  {
    id: 'health_calories',
    label: 'Калории',
    type: 'number',
    section: 'health',
    sortOrder: 101,
    builtIn: true,
  },
  {
    id: 'health_protein',
    label: 'Белок',
    type: 'number',
    section: 'health',
    sortOrder: 102,
    builtIn: true,
  },
  {
    id: 'health_fat',
    label: 'Жиры',
    type: 'number',
    section: 'health',
    sortOrder: 103,
    builtIn: true,
  },
  {
    id: 'health_carbs',
    label: 'Углеводы',
    type: 'number',
    section: 'health',
    sortOrder: 104,
    builtIn: true,
  },
];
