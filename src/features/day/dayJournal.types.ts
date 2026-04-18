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
  /** Отдельно от настроения: можно 0 энергии при нормальном настроении. */
  energy?: JournalMoodId;
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
    prompt: 'Во сколько лег/встал, как себя чувствовал?',
    type: 'text',
    section: 'journal',
    sortOrder: 3,
    builtIn: true,
  },
];
