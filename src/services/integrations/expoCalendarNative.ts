/**
 * Чтение событий с устройства (expo-calendar). На web — [].
 */
import type { CalendarEvent } from '@/entities/models';
import { inferCategoryFromTitle, inferEventTypeFromTitle } from '@/shared/calendarEventHints';
import { Platform } from 'react-native';

function mapExpoToModel(ev: {
  id: string;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  notes?: string;
  location?: string | null;
}): CalendarEvent {
  const title = ev.title?.trim() || '(без названия)';
  const start =
    ev.startDate instanceof Date ? ev.startDate.toISOString() : new Date(ev.startDate).toISOString();
  const end = ev.endDate instanceof Date ? ev.endDate.toISOString() : new Date(ev.endDate).toISOString();

  return {
    id: `device_${ev.id}`,
    title,
    start,
    end,
    type: inferEventTypeFromTitle(title),
    category: inferCategoryFromTitle(title),
    note: ev.notes || undefined,
    location: ev.location || undefined,
    source: 'device',
  };
}

export async function listDeviceCalendarEvents(range: {
  startISO: string;
  endISO: string;
}): Promise<CalendarEvent[]> {
  if (Platform.OS === 'web') {
    return [];
  }

  try {
    const Calendar = await import('expo-calendar');
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      return [];
    }

    const startDate = new Date(range.startISO);
    const endDate = new Date(range.endISO);

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const ids = calendars.filter((c) => c.isVisible !== false).map((c) => c.id);
    if (ids.length === 0) {
      return [];
    }

    const raw = await Calendar.getEventsAsync(ids, startDate, endDate);
    return raw.map(mapExpoToModel);
  } catch (e) {
    console.warn('[expo-calendar]', e);
    return [];
  }
}
