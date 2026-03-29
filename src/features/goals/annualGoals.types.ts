/** Сферы годовых целей (как в спринте). */
export type AnnualSphere = 'relationships' | 'energy' | 'work';

/** Карточка цели в стиле Notion: заголовок + обложка. */
export type AnnualGoalCard = {
  id: string;
  title: string;
  /** Контекст / почему это важно — в аккордеоне «Проблематика». */
  problematica?: string;
  /** file:// после выбора с устройства или https:// для облака */
  imageUri?: string | null;
  sortOrder: number;
};

export type AnnualSphereSection = {
  sphere: AnnualSphere;
  /** Длинный текст «видения» — по умолчанию пустой, пользователь вставляет сам. */
  visionText: string;
  cards: AnnualGoalCard[];
};

/** Четыре плановых спринта года: даты задают окно; пустые даты — только очередь. */
export type AnnualSprintSlotId = 1 | 2 | 3 | 4;

export type AnnualSprintSlotConfig = {
  id: AnnualSprintSlotId;
  /** YYYY-MM-DD */
  startDate: string | null;
  endDate: string | null;
};

/** Цель в очереди на будущий спринт (ещё не в sprint.store). */
export type QueuedAnnualSprintGoal = {
  id: string;
  title: string;
  problematica?: string;
  sphere?: AnnualSphere;
};

export type AnnualGoalsDocument = {
  year: number;
  spheres: Record<AnnualSphere, AnnualSphereSection>;
  /** Плановые окна спринтов 1–4. */
  sprintSlots: AnnualSprintSlotConfig[];
  /** Очередь целей по номеру спринта (ключи "1"…"4"). */
  queuedBySprintSlot: Record<'1' | '2' | '3' | '4', QueuedAnnualSprintGoal[]>;
  /** Цели без привязки к спринту (несколько карточек). */
  generalGoals: AnnualGoalCard[];
  updatedAt: string;
};

export const ANNUAL_SPHERE_TITLE: Record<AnnualSphere, string> = {
  relationships: 'ОТНОШЕНИЯ',
  energy: 'СОСТОЯНИЕ И ЭНЕРГИЯ',
  work: 'РАБОТА',
};
