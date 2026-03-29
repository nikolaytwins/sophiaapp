/** Стабильные id для экспорта и аналитики по дням. */

export type MorningStateId = 'charged' | 'ok' | 'flat' | 'dead';

export type EveningEnergyId = 'charged' | 'calm' | 'tension' | 'overload' | 'edge';

export type DayTypeId = 'super_productive' | 'focus' | 'chaos' | 'stuck' | 'dropped' | 'rest';

export type RecoveryId = 'walk' | 'nothing' | 'screen' | 'workout' | 'people' | 'scroll' | 'sleep';

export type DayJournalEntry = {
  dateKey: string;
  morningState?: MorningStateId;
  eveningEnergy?: EveningEnergyId;
  dayType?: DayTypeId;
  /** Не больше двух значений. */
  recoveryIds: RecoveryId[];
  note: string;
  updatedAt: string;
};

export const MORNING_STATE_OPTIONS: { id: MorningStateId; label: string }[] = [
  { id: 'charged', label: '🔥 заряжен' },
  { id: 'ok', label: '🙂 норм' },
  { id: 'flat', label: '😐 вялый' },
  { id: 'dead', label: '💀 убит' },
];

export const EVENING_ENERGY_OPTIONS: { id: EveningEnergyId; label: string }[] = [
  { id: 'charged', label: '🔥 заряжен' },
  { id: 'calm', label: '🧘 спокойно' },
  { id: 'tension', label: '⚠️ напряжение' },
  { id: 'overload', label: '💀 перегруз' },
  { id: 'edge', label: '🚨 на грани' },
];

export const DAY_TYPE_OPTIONS: { id: DayTypeId; label: string }[] = [
  { id: 'super_productive', label: '🚀 Суперпродуктив (много задач)' },
  { id: 'focus', label: '🎯 Фокус (1–2 ключевые задачи)' },
  { id: 'chaos', label: '🌀 Суета (работа без результата)' },
  { id: 'stuck', label: '🧱 Застрял (пытался, но не пошло)' },
  { id: 'dropped', label: '💤 Выпал (почти не работал)' },
  { id: 'rest', label: '🌿 Отдых (осознанный выходной)' },
];

export const RECOVERY_OPTIONS: { id: RecoveryId; label: string }[] = [
  { id: 'walk', label: '🚶 прогулка' },
  { id: 'nothing', label: '🧠 ничего не делал' },
  { id: 'screen', label: '🎬 кино / сериал' },
  { id: 'workout', label: '🏋️ тренировка' },
  { id: 'people', label: '👥 люди' },
  { id: 'scroll', label: '📱 залип' },
  { id: 'sleep', label: '😴 сон' },
];
