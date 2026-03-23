import type { CalendarEvent, EventCategory } from '@/entities/models';

export function inferEventTypeFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/созвон|#call|zoom|meet\b|teams|google meet|звонок|call:/i.test(t)) return 'call';
  if (/#фокус|фокус-блок|deep\s*work|спринт|#спринт/i.test(t)) return 'deepwork';
  return 'event';
}

export function inferCategoryFromTitle(title: string): CalendarEvent['category'] {
  const t = title.toLowerCase();
  if (/\[личн|#life|семья|врач|спорт|отдых/i.test(t)) return 'life';
  return 'work';
}

export function isMeetingLikeEvent(ev: { title: string; type: string }): boolean {
  if (ev.type === 'call') return true;
  return /созвон|звонок|zoom|meet|teams|google meet/i.test(ev.title);
}

/** Слоты колонки «Работа»: из календаря, не созвоны, не личное. */
export function isWorkBlockEvent(ev: {
  title: string;
  type: string;
  category: EventCategory;
}): boolean {
  if (isMeetingLikeEvent(ev)) return false;
  if (ev.category === 'life') return false;
  return true;
}
