import { isValidDateKey, sprintEndDateKey } from '@/features/sprint/sprint.logic';
import type { Sprint } from '@/features/sprint/sprint.types';
import type { AnnualSprintSlotConfig, AnnualSprintSlotId } from '@/features/goals/annualGoals.types';

/** Сегодня внутри [start,end] включительно. */
export function todayInSlotRange(start: string | null, end: string | null, today: string): boolean {
  if (!start || !end || !isValidDateKey(start) || !isValidDateKey(end)) return false;
  if (end < start) return false;
  return today >= start && today <= end;
}

export function activeSprintOverlapsSlot(
  active: Sprint,
  slotStart: string | null,
  slotEnd: string | null
): boolean {
  if (!slotStart || !slotEnd || !isValidDateKey(slotStart) || !isValidDateKey(slotEnd)) return false;
  const aStart = active.startDate;
  const aEnd = sprintEndDateKey(active);
  return aStart <= slotEnd && aEnd >= slotStart;
}

/** Подсветка слота: сначала календарь окна слота, иначе пересечение с активным спринтом, иначе слот 1 при активном спринте «сегодня». */
export function highlightedSprintSlotId(
  slots: AnnualSprintSlotConfig[],
  active: Sprint | null,
  today: string
): AnnualSprintSlotId | null {
  for (const s of slots) {
    if (todayInSlotRange(s.startDate, s.endDate, today)) return s.id;
  }
  if (active && active.status === 'active') {
    const aEnd = sprintEndDateKey(active);
    if (today >= active.startDate && today <= aEnd) {
      for (const s of slots) {
        if (activeSprintOverlapsSlot(active, s.startDate, s.endDate)) return s.id;
      }
      return 1;
    }
  }
  return null;
}

/**
 * Показывать живые цели из sprint.store для слота k: сегодня в периоде активного спринта
 * и (окно слота содержит сегодня и пересекается со спринтом, либо окно не задано и k === подсвеченному слоту).
 */
export function shouldShowSyncedSprintGoals(
  slotId: AnnualSprintSlotId,
  slot: AnnualSprintSlotConfig,
  active: Sprint | null,
  today: string,
  highlightId: AnnualSprintSlotId | null
): boolean {
  if (!active || active.status !== 'active') return false;
  const aEnd = sprintEndDateKey(active);
  if (today < active.startDate || today > aEnd) return false;

  const hasWindow =
    Boolean(slot.startDate && slot.endDate && isValidDateKey(slot.startDate) && isValidDateKey(slot.endDate));

  if (hasWindow) {
    if (!todayInSlotRange(slot.startDate, slot.endDate, today)) return false;
    return activeSprintOverlapsSlot(active, slot.startDate, slot.endDate);
  }

  return highlightId != null && slotId === highlightId;
}

export function formatSlotDateLabel(slot: AnnualSprintSlotConfig): string | null {
  if (slot.startDate && slot.endDate && isValidDateKey(slot.startDate) && isValidDateKey(slot.endDate)) {
    return `${slot.startDate} — ${slot.endDate}`;
  }
  if (slot.startDate && isValidDateKey(slot.startDate)) {
    return `с ${slot.startDate}`;
  }
  return null;
}
